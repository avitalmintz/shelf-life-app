const DATA_URL_PREFIX_RE = /^data:image\/[a-zA-Z+.-]+;base64,/;

export function dataUrlSize(dataUrl: string): number {
  const base64 = dataUrl.replace(DATA_URL_PREFIX_RE, "");
  return Math.ceil((base64.length * 3) / 4);
}

export async function compressDataUrlForStorage(
  dataUrl: string,
  maxBytes = 260_000,
): Promise<string> {
  if (!DATA_URL_PREFIX_RE.test(dataUrl) || dataUrlSize(dataUrl) <= maxBytes) {
    return dataUrl;
  }

  const image = await loadImage(dataUrl);
  let maxDim = Math.min(maxStorageDimension(maxBytes), Math.max(image.naturalWidth, image.naturalHeight));

  while (maxDim >= 320) {
    const scale = Math.min(1, maxDim / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) break;

    ctx.drawImage(image, 0, 0, width, height);

    for (const quality of [0.88, 0.78, 0.66, 0.54, 0.42]) {
      const compressed = canvas.toDataURL("image/jpeg", quality);
      if (dataUrlSize(compressed) <= maxBytes) {
        return compressed;
      }
    }

    maxDim -= 160;
  }

  const fallback = document.createElement("canvas");
  const scale = Math.min(1, Math.min(900, maxStorageDimension(maxBytes)) / Math.max(image.naturalWidth, image.naturalHeight));
  fallback.width = Math.max(1, Math.round(image.naturalWidth * scale));
  fallback.height = Math.max(1, Math.round(image.naturalHeight * scale));
  fallback.getContext("2d")?.drawImage(image, 0, 0, fallback.width, fallback.height);
  return fallback.toDataURL("image/jpeg", 0.32);
}

function maxStorageDimension(maxBytes: number): number {
  if (maxBytes >= 2_000_000) return 2400;
  if (maxBytes >= 1_000_000) return 1800;
  if (maxBytes >= 250_000) return 1200;
  return 900;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not resize image for storage"));
    image.src = src;
  });
}
