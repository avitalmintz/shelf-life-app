import { useShelf } from "@/lib/storage";
import { CATEGORIES } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Profile() {
  const { items } = useShelf();
  const counts = CATEGORIES.map(c => ({ ...c, n: items.filter(i => i.category === c.value).length }));
  const done = items.filter(i => i.status === "done").length;
  const high = items.filter(i => i.priority === "high" && i.status !== "done").length;

  const exportData = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "screenshot-shelf-export.json"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported");
  };

  const wipe = () => {
    if (!confirm("Delete ALL saved items? This cannot be undone.")) return;
    localStorage.removeItem("screenshot-shelf:items:v1");
    window.dispatchEvent(new CustomEvent("shelf:changed"));
    toast.success("Shelf cleared");
  };

  return (
    <div className="px-4 pt-6 pb-6 space-y-6">
      <header className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-gradient-warm flex items-center justify-center text-2xl font-display text-primary-foreground shadow-pop">
          You
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold">Your Shelf</h1>
          <p className="text-sm text-muted-foreground">A second brain for your screenshots</p>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Saved" value={items.length} />
        <Stat label="Done"  value={done} />
        <Stat label="High prio" value={high} />
      </div>

      <section className="space-y-2">
        <h2 className="section-title">By category</h2>
        <div className="grid grid-cols-2 gap-2">
          {counts.map(c => (
            <div key={c.value} className={`rounded-2xl p-3 ${c.tw}`}>
              <div className="text-lg">{c.emoji}</div>
              <div className="font-semibold mt-1 text-sm">{c.label}</div>
              <div className="text-xs opacity-70">{c.n} item{c.n === 1 ? "" : "s"}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="section-title">Data</h2>
        <Button variant="outline" className="w-full rounded-full" onClick={exportData}>Export as JSON</Button>
        <Button variant="ghost" className="w-full rounded-full text-destructive hover:text-destructive" onClick={wipe}>
          Clear all items
        </Button>
      </section>

      <p className="text-center text-xs text-muted-foreground pt-2">
        Stored locally on this device. Cloud sync coming soon.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="shelf-card p-4 text-center">
      <div className="font-display text-3xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
