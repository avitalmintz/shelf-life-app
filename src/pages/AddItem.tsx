import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { fileToDataUrl, useShelf } from "@/lib/storage";
import { isAIConfigured } from "@/lib/aiCategorize";
import { compressDataUrlForStorage } from "@/lib/imageCompression";
import { storeImage } from "@/lib/imageStore";
import { Button } from "@/components/ui/button";
import { ImagePlus, ArrowLeft, Sparkles, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function AddItem() {
  const nav = useNavigate();
  const { add } = useShelf();
  const [image, setImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveForAnalysis = async (dataUrl: string) => {
    setSaving(true);
    setError(null);
    try {
      const imageStorageKey = `upload-${crypto.randomUUID()}`;
      const displayImage = await compressDataUrlForStorage(dataUrl, 1_200_000);
      await storeImage(imageStorageKey, displayImage);
      const storageImage = await compressDataUrlForStorage(dataUrl, 160_000);
      const hasAI = isAIConfigured();
      const newItem = add({
        image: storageImage,
        imageStorageKey,
        title: hasAI ? "Categorizing..." : "Uploaded screenshot",
        notes: undefined,
        link: undefined,
        category: "other",
        priority: "medium",
        status: "saved",
        aiStatus: hasAI ? "pending" : "done",
      });
      toast.success("Screenshot saved", {
        description: hasAI ? "You can leave this screen. Categorizing will finish in the background." : undefined,
        action: { label: "Edit", onClick: () => nav(`/item/${newItem.id}`) },
      });
      nav("/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save screenshot";
      setError(msg);
      setSaving(false);
    }
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const url = await fileToDataUrl(f);
    setImage(url);
    void saveForAnalysis(url);
  };

  const reset = () => {
    setImage(null);
    setError(null);
  };

  return (
    <div className="px-4 pt-5 pb-6 space-y-5">
      <header className="flex items-center justify-between">
        <button onClick={() => nav(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-xl font-semibold">New screenshot</h1>
        <div className="w-9" />
      </header>

      <label
        className={cn(
          "block rounded-2xl border-2 border-dashed border-border bg-card overflow-hidden transition",
          saving ? "cursor-wait" : "cursor-pointer hover:border-primary",
          image ? "p-0" : "p-8",
        )}
      >
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={saving}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        {image ? (
          <div className="relative">
            <img src={image} alt="Preview" className="w-full h-auto" />
            {saving && (
              <div className="absolute inset-0 bg-card/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                <p className="font-semibold">Saving to your shelf…</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center text-center text-muted-foreground">
            <div className="h-14 w-14 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mb-3">
              <ImagePlus className="h-7 w-7" />
            </div>
            <p className="font-semibold text-foreground">Upload screenshot</p>
            <p className="text-xs mt-1">AI will figure out what it is and categorize it</p>
          </div>
        )}
      </label>

      {error && (
        <div className="rounded-2xl bg-destructive/10 text-destructive p-4 text-sm space-y-3">
          <p>{error}</p>
          <div className="flex gap-2">
            {image && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => image && void saveForAnalysis(image)}
                className="gap-1.5"
              >
                <RotateCw className="h-3.5 w-3.5" /> Try again
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={reset}>
              Pick different image
            </Button>
          </div>
        </div>
      )}

      {!image && !error && (
        <p className="text-center text-sm text-muted-foreground">
          We'll auto-detect the title, category, and details.
          <br />
          You can edit anything afterward.
        </p>
      )}
    </div>
  );
}
