import { registerPlugin, Capacitor } from "@capacitor/core";

interface PendingImage {
  id: string;
  dataUrl: string;
  note?: string;
}

interface PendingResult {
  images: PendingImage[];
  diagnostic?: string;
  extensionLog?: string;
}

interface SharedShelfImagesPlugin {
  getPending(): Promise<PendingResult>;
  clearPending(opts: { ids: string[] }): Promise<void>;
}

const SharedShelfImages = registerPlugin<SharedShelfImagesPlugin>("SharedShelfImages");

export async function getPendingSharedImages(): Promise<PendingImage[]> {
  if (!Capacitor.isNativePlatform()) return [];
  try {
    const result = await SharedShelfImages.getPending();
    return result.images ?? [];
  } catch {
    return [];
  }
}

export async function getPendingDiagnostic(): Promise<PendingResult> {
  if (!Capacitor.isNativePlatform()) return { images: [], diagnostic: "Not on native platform" };
  try {
    return await SharedShelfImages.getPending();
  } catch (err) {
    return {
      images: [],
      diagnostic: `Plugin call failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function clearSharedImages(ids: string[]): Promise<void> {
  if (!Capacitor.isNativePlatform() || ids.length === 0) return;
  try {
    await SharedShelfImages.clearPending({ ids });
  } catch {
    // ignore
  }
}

const PAUSE_KEY = "screenshot-shelf:auto-import-paused";

export function isAutoImportPaused(): boolean {
  return localStorage.getItem(PAUSE_KEY) === "true";
}

export function setAutoImportPaused(paused: boolean): void {
  if (paused) localStorage.setItem(PAUSE_KEY, "true");
  else localStorage.removeItem(PAUSE_KEY);
}
