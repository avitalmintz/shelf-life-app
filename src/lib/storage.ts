import { useCallback, useEffect, useState } from "react";
import type { ShelfItem } from "./types";
import { cancelReminder, scheduleReminder } from "./reminders";
import { compressDataUrlForStorage, dataUrlSize } from "./imageCompression";
import { deleteStoredImage } from "./imageStore";

const KEY = "screenshot-shelf:items:v1";

function read(): ShelfItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ShelfItem[];
  } catch {
    return [];
  }
}

function write(items: ShelfItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch (error) {
    const isQuotaError =
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED");

    if (isQuotaError) {
      throw new Error("Storage quota exceeded. Delete a few large screenshots or import a smaller image.");
    }

    throw error;
  }
  window.dispatchEvent(new CustomEvent("shelf:changed"));
}

export async function compactStoredImages(maxBytes = 140_000): Promise<number> {
  const items = read();
  let changed = 0;
  const compacted = await Promise.all(
    items.map(async item => {
      if (!item.image.startsWith("data:image/") || dataUrlSize(item.image) <= maxBytes) {
        return item;
      }
      const image = await compressDataUrlForStorage(item.image, maxBytes);
      if (image === item.image) return item;
      changed += 1;
      return { ...item, image, updatedAt: new Date().toISOString() };
    }),
  );
  if (changed > 0) write(compacted);
  return changed;
}

export function useShelf() {
  const [items, setItems] = useState<ShelfItem[]>(() => read());

  useEffect(() => {
    const onChange = () => setItems(read());
    window.addEventListener("shelf:changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("shelf:changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const add = useCallback((item: Omit<ShelfItem, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    const newItem: ShelfItem = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    const next = [newItem, ...read()];
    write(next);
    if (newItem.reminderDate) {
      void scheduleReminder({
        id: newItem.id,
        title: newItem.title || "Screenshot Shelf reminder",
        body: newItem.notes,
        date: newItem.reminderDate,
      }).catch(() => undefined);
    }
    return newItem;
  }, []);

  const update = useCallback((id: string, patch: Partial<ShelfItem>) => {
    let updatedItem: ShelfItem | undefined;
    const next = read().map(i =>
      i.id === id ? (updatedItem = { ...i, ...patch, updatedAt: new Date().toISOString() }) : i
    );
    write(next);
    if (updatedItem && "reminderDate" in patch) {
      if (updatedItem.reminderDate) {
        void scheduleReminder({
          id: updatedItem.id,
          title: updatedItem.title || "Screenshot Shelf reminder",
          body: updatedItem.notes,
          date: updatedItem.reminderDate,
        }).catch(() => undefined);
      } else {
        void cancelReminder(id).catch(() => undefined);
      }
    }
  }, []);

  const remove = useCallback((id: string) => {
    const item = read().find(i => i.id === id);
    write(read().filter(i => i.id !== id));
    void deleteStoredImage(item?.imageStorageKey).catch(() => undefined);
    void cancelReminder(id).catch(() => undefined);
  }, []);

  const get = useCallback((id: string) => read().find(i => i.id === id), []);

  return { items, add, update, remove, get };
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const wks = Math.floor(days / 7);
  if (wks < 5) return `${wks}w ago`;
  const mo = Math.floor(days / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
