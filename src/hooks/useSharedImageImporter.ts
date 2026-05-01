import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { compactStoredImages, useShelf } from "@/lib/storage";
import { getPendingSharedImages, clearSharedImages } from "@/lib/sharedImages";
import { categorizeScreenshot, getApiKey } from "@/lib/aiCategorize";
import { compressDataUrlForStorage } from "@/lib/imageCompression";
import { getStoredImage, storeImage } from "@/lib/imageStore";

export function useSharedImageImporter() {
  const { add, update, items } = useShelf();
  const runningRef = useRef(false);
  const categorizingRef = useRef(new Set<string>());

  useEffect(() => {
    if (getApiKey().length === 0) return;

    for (const item of items) {
      if (item.aiStatus !== "pending" || categorizingRef.current.has(item.id)) continue;
      categorizingRef.current.add(item.id);
      void getStoredImage(item.imageStorageKey)
        .then(image => categorizeScreenshot(image ?? item.image))
        .then(result => {
          update(item.id, {
            title: result.title,
            notes: [result.notes, item.notes].filter(Boolean).join("\n\n") || undefined,
            link: result.link || item.link,
            category: result.category,
            aiStatus: "done",
          });
        })
        .catch(() => {
          update(item.id, { aiStatus: "error" });
        })
        .finally(() => {
          categorizingRef.current.delete(item.id);
        });
    }
  }, [items, update]);

  useEffect(() => {
    localStorage.removeItem("screenshot-shelf:auto-import-paused");

    const importPending = async () => {
      if (runningRef.current) return;
      runningRef.current = true;
      try {
        const pending = await getPendingSharedImages();
        if (pending.length === 0) return;

        const hasApiKey = getApiKey().length > 0;

        const toastId = toast.loading(
          `Importing ${pending.length} screenshot${pending.length === 1 ? "" : "s"}…`
        );

        const processed: string[] = [];
        const errors: string[] = [];

        for (const img of pending) {
          try {
            const imageStorageKey = `shared-${crypto.randomUUID()}`;
            const displayImage = await compressDataUrlForStorage(img.dataUrl, 1_200_000);
            await storeImage(imageStorageKey, displayImage);
            const thumbnailImage = await compressDataUrlForStorage(img.dataUrl, 160_000);
            const baseItem = {
              image: thumbnailImage,
              imageStorageKey,
              title: hasApiKey ? "Categorizing..." : "Shared screenshot",
              notes: img.note || undefined,
              link: undefined,
              category: "other" as const,
              priority: "medium" as const,
              status: "saved" as const,
              aiStatus: hasApiKey ? ("pending" as const) : ("done" as const),
            };
            try {
              add(baseItem);
            } catch (error) {
              if (!(error instanceof Error) || !error.message.includes("Storage quota exceeded")) {
                throw error;
              }
              await compactStoredImages();
              add({
                ...baseItem,
                image: await compressDataUrlForStorage(thumbnailImage, 80_000),
              });
            }
            processed.push(img.id);
          } catch (e) {
            errors.push(e instanceof Error ? e.message : String(e));
            break;
          }
        }

        if (processed.length > 0) {
          await clearSharedImages(processed);
        }

        toast.dismiss(toastId);
        if (processed.length > 0 && errors.length === 0) {
          toast.success(`Saved ${processed.length} from share`, {
            description: hasApiKey ? "Categorizing in the background." : "Saved without AI categorization.",
          });
        } else if (processed.length > 0 && errors.length > 0) {
          toast.warning(`Imported ${processed.length}, ${errors.length} failed`, {
            description: errors[0],
          });
        } else if (errors.length > 0) {
          toast.error(`${errors.length} shared import failed`, {
            description: errors[0],
            duration: 10000,
          });
        }
      } finally {
        runningRef.current = false;
      }
    };

    importPending();

    const onVisible = () => {
      if (document.visibilityState === "visible") void importPending();
    };
    const onFocus = () => void importPending();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [add]);
}

export function useManualSharedImport() {
  const { add } = useShelf();
  return async () => {
    const pending = await getPendingSharedImages();
    if (pending.length === 0) {
      toast.info("No shared images waiting");
      return;
    }
    const hasApiKey = getApiKey().length > 0;
    const toastId = toast.loading(`Importing ${pending.length}…`);
    const processed: string[] = [];
    const errors: string[] = [];
    for (const img of pending) {
      try {
        const imageStorageKey = `manual-shared-${crypto.randomUUID()}`;
        const displayImage = await compressDataUrlForStorage(img.dataUrl, 1_200_000);
        await storeImage(imageStorageKey, displayImage);
        const thumbnailImage = await compressDataUrlForStorage(img.dataUrl, 160_000);
        add({
          image: thumbnailImage,
          imageStorageKey,
          title: hasApiKey ? "Categorizing..." : "Shared screenshot",
          notes: img.note || undefined,
          link: undefined,
          category: "other",
          priority: "medium",
          status: "saved",
          aiStatus: hasApiKey ? "pending" : "done",
        });
        processed.push(img.id);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
        break;
      }
    }
    if (processed.length > 0) {
      await clearSharedImages(processed);
    }
    toast.dismiss(toastId);
    if (processed.length > 0) {
      toast.success(`Imported ${processed.length}`, {
        description: hasApiKey ? undefined : "Saved without AI categorization.",
      });
    }
    if (errors.length > 0) {
      toast.error(`${errors.length} failed`, { description: errors[0], duration: 10000 });
    }
  };
}
