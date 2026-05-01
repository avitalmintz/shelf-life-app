import { useEffect, useState } from "react";
import type { ShelfItem } from "@/lib/types";
import { getStoredImage } from "@/lib/imageStore";

export default function StoredImage({
  item,
  className,
}: {
  item: ShelfItem;
  className?: string;
}) {
  const [src, setSrc] = useState(item.image);

  useEffect(() => {
    let cancelled = false;
    setSrc(item.image);
    void getStoredImage(item.imageStorageKey).then(stored => {
      if (!cancelled && stored) setSrc(stored);
    });
    return () => {
      cancelled = true;
    };
  }, [item.image, item.imageStorageKey]);

  return <img src={src} alt={item.title || "Saved screenshot"} className={className} loading="lazy" />;
}
