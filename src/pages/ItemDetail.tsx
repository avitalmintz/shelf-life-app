import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useShelf, timeAgo } from "@/lib/storage";
import { CATEGORIES, Category, PRIORITIES, Priority, STATUSES, Status, ShelfItem, categoryMeta, priorityMeta, statusMeta } from "@/lib/types";
import { ArrowLeft, Trash2, ExternalLink, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ItemDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { get, update, remove } = useShelf();
  const [item, setItem] = useState<ShelfItem | undefined>(undefined);

  useEffect(() => {
    if (id) setItem(get(id));
  }, [id, get]);

  if (!item) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Item not found.
        <div className="mt-4"><Button onClick={() => nav("/")}>Go home</Button></div>
      </div>
    );
  }

  const patch = (p: Partial<ShelfItem>) => {
    update(item.id, p);
    setItem({ ...item, ...p });
  };

  const cat = categoryMeta(item.category);

  return (
    <div className="pb-6">
      <div className="relative">
        <img src={item.image} alt={item.title} className="w-full h-auto" />
        <button
          onClick={() => nav(-1)}
          className="absolute top-3 left-3 h-10 w-10 rounded-full bg-card/90 backdrop-blur shadow-card flex items-center justify-center"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => { remove(item.id); toast.success("Deleted"); nav("/"); }}
          className="absolute top-3 right-3 h-10 w-10 rounded-full bg-card/90 backdrop-blur shadow-card flex items-center justify-center text-destructive"
          aria-label="Delete"
        >
          <Trash2 className="h-5 w-5" />
        </button>
        <span className={cn("chip absolute bottom-3 left-3 shadow-card", cat.tw)}>
          <span>{cat.emoji}</span><span>{cat.label}</span>
        </span>
      </div>

      <div className="px-4 pt-5 space-y-5">
        <div>
          <p className="text-xs text-muted-foreground">Saved {timeAgo(item.createdAt)}</p>
          <Input
            value={item.title}
            onChange={e => patch({ title: e.target.value })}
            placeholder="Add a title"
            className="mt-1 text-2xl font-display font-semibold border-0 px-0 focus-visible:ring-0 bg-transparent"
          />
        </div>

        <div>
          <Label>Notes</Label>
          <Textarea
            value={item.notes ?? ""}
            onChange={e => patch({ notes: e.target.value })}
            placeholder="Why did you save this?"
            rows={4}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="link">Link</Label>
          <div className="flex gap-2 mt-1.5">
            <Input
              id="link"
              value={item.link ?? ""}
              onChange={e => patch({ link: e.target.value })}
              placeholder="https://…"
            />
            {item.link && (
              <a
                href={item.link} target="_blank" rel="noreferrer"
                className="h-10 w-10 rounded-md bg-primary-soft text-primary flex items-center justify-center shrink-0"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>

        <div>
          <Label>Category</Label>
          <div className="grid grid-cols-2 gap-2 mt-1.5">
            {CATEGORIES.map(c => {
              const active = item.category === c.value;
              return (
                <button
                  key={c.value}
                  onClick={() => patch({ category: c.value as Category })}
                  className={cn(
                    "rounded-xl px-3 py-2 text-left text-sm font-medium border transition",
                    active ? cn(c.tw, "border-transparent ring-2 ring-primary") : "bg-card border-border"
                  )}
                >
                  <span className="text-base mr-1.5">{c.emoji}</span>{c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label>Priority</Label>
          <div className="grid grid-cols-3 gap-2 mt-1.5">
            {PRIORITIES.map(p => {
              const active = item.priority === p.value;
              return (
                <button
                  key={p.value}
                  onClick={() => patch({ priority: p.value as Priority })}
                  className={cn(
                    "rounded-xl py-2 text-sm font-medium border transition",
                    active ? cn(p.tw, "border-transparent ring-2 ring-primary") : "bg-card border-border"
                  )}
                >{p.label}</button>
              );
            })}
          </div>
        </div>

        <div>
          <Label>Status</Label>
          <div className="grid grid-cols-2 gap-2 mt-1.5">
            {STATUSES.map(s => {
              const active = item.status === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => patch({ status: s.value as Status })}
                  className={cn(
                    "rounded-xl py-2 text-sm font-medium border transition",
                    active ? "bg-primary text-primary-foreground border-transparent" : "bg-card border-border"
                  )}
                >{s.label}</button>
              );
            })}
          </div>
        </div>

        <div>
          <Label htmlFor="rem">Reminder date</Label>
          <Input
            id="rem"
            type="date"
            value={item.reminderDate?.slice(0, 10) ?? ""}
            onChange={e => patch({ reminderDate: e.target.value || undefined })}
            className="mt-1.5"
          />
        </div>

        {item.status !== "done" && (
          <Button
            onClick={() => { patch({ status: "done" }); toast.success("Marked as done 🎉"); }}
            className="w-full h-12 rounded-full text-base font-semibold shadow-pop"
          >
            <Check className="h-5 w-5 mr-1" /> Mark as done
          </Button>
        )}
        {item.status === "done" && (
          <p className="text-center text-sm text-muted-foreground">
            Completed — nice work ✨ ({statusMeta(item.status).label})
          </p>
        )}
      </div>
    </div>
  );
}
