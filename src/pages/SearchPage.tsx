import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useShelf } from "@/lib/storage";
import { Category, STATUSES, Status } from "@/lib/types";
import { useCategories } from "@/lib/categories";
import ItemCard from "@/components/ItemCard";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

type SortKey = "newest" | "oldest";

export default function SearchPage() {
  const { items } = useShelf();
  const categories = useCategories();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "all">((params.get("cat") as Category) || "all");
  const [status, setStatus] = useState<Status | "all">("all");
  const [sort, setSort] = useState<SortKey>("newest");

  useEffect(() => {
    const c = params.get("cat") as Category | null;
    if (c) setCat(c);
  }, [params]);

  const results = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const r = items.filter(i => {
      if (cat !== "all" && i.category !== cat) return false;
      if (status !== "all" && i.status !== status) return false;
      if (ql) {
        const hay = `${i.title} ${i.notes ?? ""} ${i.category}`.toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    });
    r.sort((a, b) =>
      sort === "newest"
        ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return r;
  }, [items, q, cat, status, sort]);

  const clearCat = () => { setCat("all"); setParams({}); };

  return (
    <div className="px-4 pt-5 pb-4 space-y-4">
      <h1 className="font-display text-2xl font-semibold">Search</h1>

      <div className="relative">
        <SearchIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search title, notes, category…"
          className="pl-9 h-11 rounded-full bg-card"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
        <FilterChip active={cat === "all"} onClick={clearCat} label="All" />
        {categories.map(c => (
          <FilterChip
            key={c.value}
            active={cat === c.value}
            onClick={() => setCat(c.value)}
            label={c.label}
            tone={c.tw}
          />
        ))}
      </div>

      {/* Status */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
        <FilterChip active={status === "all"} onClick={() => setStatus("all")} label="Any status" />
        {STATUSES.map(s => (
          <FilterChip key={s.value} active={status === s.value} onClick={() => setStatus(s.value)} label={s.label} />
        ))}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{results.length} result{results.length === 1 ? "" : "s"}</span>
        <button
          onClick={() => setSort(s => s === "newest" ? "oldest" : "newest")}
          className="chip bg-muted text-foreground"
        >
          Sort: {sort === "newest" ? "Newest" : "Oldest"}
        </button>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          Nothing matches yet. Try clearing filters.
        </div>
      ) : (
        <div className="masonry">
          {results.map(item => <ItemCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label, tone }: { active: boolean; onClick: () => void; label: string; tone?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 chip whitespace-nowrap px-3 py-1.5 text-sm border transition",
        active
          ? (tone ? cn(tone, "border-transparent ring-2 ring-primary") : "bg-primary text-primary-foreground border-transparent")
          : "bg-card text-foreground border-border"
      )}
    >
      {label}
      {active && <X className="h-3 w-3 ml-1 opacity-70" />}
    </button>
  );
}
