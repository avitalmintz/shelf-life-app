import { useState } from "react";
import { useShelf } from "@/lib/storage";
import { getApiKey, setApiKey } from "@/lib/aiCategorize";
import {
  addCustomCategory,
  removeCustomCategory,
  setDefaultCategoryEnabled,
  useCategories,
  useDefaultCategories,
} from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const { items, update } = useShelf();
  const categories = useCategories();
  const defaultCategories = useDefaultCategories();
  const counts = categories.map(c => ({ ...c, n: items.filter(i => i.category === c.value).length }));
  const done = items.filter(i => i.status === "done").length;

  const [apiKey, setApiKeyInput] = useState(getApiKey());
  const [categoryName, setCategoryName] = useState("");
  const [categoryContext, setCategoryContext] = useState("");
  const hasKey = getApiKey().length > 0;

  const saveKey = () => {
    setApiKey(apiKey);
    toast.success(apiKey.trim() ? "API key saved" : "API key removed");
  };

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

  const addCategory = () => {
    try {
      const category = addCustomCategory({ label: categoryName, context: categoryContext });
      setCategoryName("");
      setCategoryContext("");
      toast.success(`Added ${category.label}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add category");
    }
  };

  const deleteCategory = (value: string, label: string) => {
    if (!confirm(`Delete ${label}? Saved items in this category will move to Other.`)) return;
    items.filter(item => item.category === value).forEach(item => update(item.id, { category: "other" }));
    removeCustomCategory(value);
    toast.success("Category deleted");
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

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Saved" value={items.length} />
        <Stat label="Done"  value={done} />
      </div>

      <section className="space-y-2">
        <h2 className="section-title">AI categorization</h2>
        <div className="rounded-2xl bg-card p-4 space-y-3">
          <div>
            <Label htmlFor="apikey">Anthropic API key</Label>
            <Input
              id="apikey"
              type="password"
              value={apiKey}
              onChange={e => setApiKeyInput(e.target.value)}
              placeholder="sk-ant-..."
              className="mt-1.5 font-mono text-sm"
              autoComplete="off"
            />
          </div>
          <Button onClick={saveKey} className="w-full rounded-full" size="sm">
            {hasKey ? "Update key" : "Save key"}
          </Button>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Get a key at{" "}
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="text-primary underline">
              console.anthropic.com
            </a>
            . Stored on this device only — used to auto-detect what your screenshots are.
          </p>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="section-title">Custom categories</h2>
        <div className="rounded-2xl bg-card p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-sm">Default categories</h3>
          </div>
          <div className="space-y-2">
            {defaultCategories.map(c => (
              <label
                key={c.value}
                className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
              >
                <span className="text-sm font-medium">{c.label}</span>
                <input
                  type="checkbox"
                  checked={c.enabled}
                  disabled={c.value === "other"}
                  onChange={e => setDefaultCategoryEnabled(c.value, e.target.checked)}
                  className="h-5 w-5 accent-primary"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-card p-4 space-y-3">
          <div>
            <Label htmlFor="category-name">Category name</Label>
            <Input
              id="category-name"
              value={categoryName}
              onChange={e => setCategoryName(e.target.value)}
              placeholder="Good news, Gift ideas, Work ideas..."
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="category-context">AI guidance</Label>
            <Textarea
              id="category-context"
              value={categoryContext}
              onChange={e => setCategoryContext(e.target.value)}
              placeholder="What should the AI look for in screenshots that belong here?"
              rows={3}
              className="mt-1.5"
            />
          </div>
          <Button onClick={addCategory} className="w-full rounded-full" size="sm">
            Add category
          </Button>
        </div>

        {categories.some(c => c.custom) && (
          <div className="space-y-2">
            {categories.filter(c => c.custom).map(c => (
              <div key={c.value} className="rounded-2xl bg-card p-3 flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-sm">{c.label}</div>
                  {c.context && <p className="text-xs text-muted-foreground mt-1">{c.context}</p>}
                </div>
                <button
                  onClick={() => deleteCategory(c.value, c.label)}
                  className="h-9 w-9 rounded-full bg-muted text-destructive flex items-center justify-center shrink-0"
                  aria-label={`Delete ${c.label}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="section-title">By category</h2>
        <div className="grid grid-cols-2 gap-2">
          {counts.map(c => (
            <div key={c.value} className={`rounded-2xl p-3 ${c.tw}`}>
              <div className="font-semibold text-sm">{c.label}</div>
              <div className="text-xs opacity-70 mt-1">{c.n} item{c.n === 1 ? "" : "s"}</div>
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
