import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useShelf } from "@/lib/storage";
import { ShelfItem } from "@/lib/types";
import { categoryMeta } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Sparkles, Heart, Check, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import StoredImage from "@/components/StoredImage";

const PROMPTS: Record<string, (i: ShelfItem) => string> = {
  watch:   i => `Want to watch this tonight?`,
  place:   i => `Still want to check out this place?`,
  read:    i => `Want to read this now?`,
  style:   i => `Still want this look?`,
  product: i => `Still want this?`,
  recipe:  i => `Cook this this week?`,
  idea:    i => `Still excited about this idea?`,
  other:   i => `Still interested?`,
};

function pickResurfaceItems(items: ShelfItem[]): ShelfItem[] {
  const eligible = items.filter(i => i.status === "saved" || i.status === "considering");
  if (eligible.length === 0) return [];
  const now = Date.now();
  const scored = eligible.map(i => {
    const ageDays = (now - new Date(i.createdAt).getTime()) / 86400000;
    const lastSeen = i.lastResurfacedAt ? (now - new Date(i.lastResurfacedAt).getTime()) / 86400000 : 999;
    return { i, score: ageDays + lastSeen * 2 + Math.random() * 5 };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, 5).map(s => s.i);
}

export default function Resurface() {
  const { items, update } = useShelf();
  const nav = useNavigate();
  const queue = useMemo(() => pickResurfaceItems(items), [items]);
  const [idx, setIdx] = useState(0);

  const current = queue[idx];

  const respond = (action: "interested" | "done" | "not" | "later") => {
    if (!current) return;
    const patch: Partial<ShelfItem> = { lastResurfacedAt: new Date().toISOString() };
    if (action === "done") patch.status = "done";
    if (action === "not") patch.status = "not_interested";
    if (action === "later") {
      const d = new Date(); d.setDate(d.getDate() + 7);
      patch.reminderDate = d.toISOString();
    }
    update(current.id, patch);
    toast.success(
      action === "interested" ? "Kept on your shelf" :
      action === "done"        ? "Marked as done" :
      action === "not"         ? "Removed from rotation" :
                                 "We'll bring it back later"
    );
    setIdx(i => i + 1);
  };

  if (queue.length === 0) {
    return (
      <div className="px-6 pt-20 text-center">
        <div className="h-20 w-20 mx-auto rounded-3xl bg-gradient-warm flex items-center justify-center text-3xl mb-5">
          <Sparkles className="h-9 w-9 text-primary-foreground" />
        </div>
        <h1 className="font-display text-2xl font-semibold mb-2">Nothing to resurface yet</h1>
        <p className="text-muted-foreground">Save some screenshots first, and we'll bring forgotten ones back.</p>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="px-6 pt-20 text-center">
        <div className="h-20 w-20 mx-auto rounded-3xl bg-gradient-warm flex items-center justify-center mb-5">
          <Check className="h-9 w-9 text-primary-foreground" />
        </div>
        <h1 className="font-display text-2xl font-semibold mb-2">All caught up</h1>
        <p className="text-muted-foreground mb-6">You've reviewed everything for now. Come back tomorrow.</p>
        <Button onClick={() => nav("/")} className="rounded-full">Back home</Button>
      </div>
    );
  }

  const cat = categoryMeta(current.category);
  const ageDays = Math.max(1, Math.floor((Date.now() - new Date(current.createdAt).getTime()) / 86400000));
  const prompt = PROMPTS[current.category]?.(current) ?? "Still interested?";

  return (
    <div className="px-4 pt-5 pb-4">
      <header className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Resurface</p>
          <h1 className="font-display text-2xl font-semibold">Remember this?</h1>
        </div>
        <span className="chip bg-primary-soft text-primary">
          {idx + 1} / {queue.length}
        </span>
      </header>

      <div className="shelf-card animate-pop-in">
        <div className="relative">
          <StoredImage item={current} className="w-full h-auto" />
          <span className={cn("chip absolute top-3 left-3 shadow-card", cat.tw)}>
            {cat.label}
          </span>
        </div>
        <div className="p-4">
          <p className="text-xs text-muted-foreground">You saved this {ageDays} day{ageDays === 1 ? "" : "s"} ago</p>
          <h2 className="font-display text-xl font-semibold mt-1">{current.title || "Untitled"}</h2>
          {current.notes && <p className="text-sm text-muted-foreground mt-2">{current.notes}</p>}
          <p className="mt-4 font-medium">{prompt}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <ActionBtn onClick={() => respond("interested")} icon={<Heart className="h-4 w-4" />} label="Still interested" tone="primary" />
        <ActionBtn onClick={() => respond("done")}       icon={<Check className="h-4 w-4" />} label="Done" tone="success" />
        <ActionBtn onClick={() => respond("later")}      icon={<Clock className="h-4 w-4" />} label="Remind me later" tone="muted" />
        <ActionBtn onClick={() => respond("not")}        icon={<X className="h-4 w-4" />} label="Not interested" tone="muted" />
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, tone }: { icon: React.ReactNode; label: string; onClick: () => void; tone: "primary" | "success" | "muted" }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-12 rounded-2xl font-medium text-sm flex items-center justify-center gap-2 transition active:scale-95",
        tone === "primary" && "bg-primary text-primary-foreground shadow-pop",
        tone === "success" && "bg-secondary text-secondary-foreground",
        tone === "muted"   && "bg-card border border-border text-foreground"
      )}
    >
      {icon}{label}
    </button>
  );
}
