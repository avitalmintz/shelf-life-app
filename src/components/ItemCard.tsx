import { Link } from "react-router-dom";
import { ShelfItem } from "@/lib/types";
import { categoryMeta } from "@/lib/categories";
import { timeAgo } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock } from "lucide-react";
import StoredImage from "./StoredImage";

export default function ItemCard({ item, compact = false }: { item: ShelfItem; compact?: boolean }) {
  const cat = categoryMeta(item.category);

  return (
    <Link
      to={`/item/${item.id}`}
      className="shelf-card block group animate-fade-in"
    >
      <div className="relative">
        <StoredImage item={item} className="w-full h-auto object-cover" />
        <span className={cn("chip absolute top-2 left-2 backdrop-blur bg-card/85", cat.tw, "shadow-sm")}>
          <span>{cat.label}</span>
        </span>
        {item.status === "done" && (
          <span className="chip absolute bottom-2 right-2 bg-card/90 text-foreground">
            <CheckCircle2 className="h-3 w-3 text-primary" /> Done
          </span>
        )}
      </div>
      <div className="px-3 py-2.5">
        <h3 className="font-semibold leading-snug line-clamp-2">
          {item.title || "Untitled"}
        </h3>
        {item.aiStatus === "pending" && (
          <p className="text-xs text-muted-foreground mt-1">Categorizing...</p>
        )}
        {item.aiStatus === "finding_source" && (
          <p className="text-xs text-muted-foreground mt-1">Finding link...</p>
        )}
        {!compact && item.notes && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.notes}</p>
        )}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-2">
          <Clock className="h-3 w-3" />
          {timeAgo(item.createdAt)}
        </div>
      </div>
    </Link>
  );
}
