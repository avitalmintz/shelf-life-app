import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useShelf } from "@/lib/storage";
import { CATEGORIES, Category } from "@/lib/types";
import ItemCard from "@/components/ItemCard";
import { Sparkles, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const sections: { title: string; filter: (i: ReturnType<typeof useShelf>["items"][number]) => boolean; emoji: string }[] = [
  { title: "Recently Added",       emoji: "🆕", filter: () => true },
  { title: "High Priority",        emoji: "⚡", filter: i => i.priority === "high" && i.status !== "done" && i.status !== "not_interested" },
  { title: "Things to Watch",      emoji: "🎬", filter: i => i.category === "watch" },
  { title: "Places to Go",         emoji: "📍", filter: i => i.category === "place" },
  { title: "Things to Buy",        emoji: "🛍️", filter: i => i.category === "product" || i.category === "style" },
  { title: "Things to Read",       emoji: "📖", filter: i => i.category === "read" },
  { title: "Random Saved Ideas",   emoji: "💡", filter: i => i.category === "idea" || i.category === "other" || i.category === "recipe" },
];

export default function Home() {
  const { items } = useShelf();

  const counts = useMemo(() => {
    const c: Record<Category, number> = {
      place: 0, watch: 0, read: 0, style: 0, product: 0, recipe: 0, idea: 0, other: 0,
    };
    items.forEach(i => { c[i.category]++; });
    return c;
  }, [items]);

  if (items.length === 0) return <Empty />;

  return (
    <div className="px-4 pt-6 pb-4 space-y-7">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Your shelf</p>
          <h1 className="text-3xl font-display font-semibold leading-tight">
            Things you<br/>didn't want to forget
          </h1>
        </div>
        <Link to="/resurface" className="chip bg-primary-soft text-primary font-semibold">
          <Sparkles className="h-3.5 w-3.5" /> Resurface
        </Link>
      </header>

      {/* Category quick chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
        {CATEGORIES.map(c => (
          <Link
            key={c.value}
            to={`/search?cat=${c.value}`}
            className={cn("chip whitespace-nowrap shrink-0 px-3 py-1.5 text-sm", c.tw)}
          >
            <span>{c.emoji}</span>
            <span>{c.label}</span>
            <span className="opacity-60 ml-1">{counts[c.value]}</span>
          </Link>
        ))}
      </div>

      {sections.map(section => {
        const list = items.filter(section.filter).slice(0, 8);
        if (list.length === 0) return null;
        return (
          <section key={section.title} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="section-title">
                <span className="mr-1.5">{section.emoji}</span>{section.title}
              </h2>
              <span className="text-xs text-muted-foreground">{list.length}</span>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
              {list.map(item => (
                <div key={item.id} className="w-44 shrink-0">
                  <ItemCard item={item} compact />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Empty() {
  return (
    <div className="px-6 pt-16 pb-24 flex flex-col items-center text-center">
      <div className="h-24 w-24 rounded-3xl bg-gradient-warm shadow-pop flex items-center justify-center text-4xl mb-6 animate-pop-in">
        📚
      </div>
      <h1 className="text-3xl font-display font-semibold mb-2">Welcome to your Shelf</h1>
      <p className="text-muted-foreground max-w-xs mb-8">
        Stop losing screenshots in your camera roll. Save them here, sort them once, and actually come back to them.
      </p>
      <Link
        to="/add"
        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold shadow-pop active:scale-95 transition"
      >
        <Plus className="h-5 w-5" /> Add your first screenshot
      </Link>
      <div className="mt-12 grid grid-cols-2 gap-3 w-full max-w-xs text-left">
        {CATEGORIES.slice(0, 4).map(c => (
          <div key={c.value} className={cn("rounded-2xl p-3", c.tw)}>
            <div className="text-xl">{c.emoji}</div>
            <div className="text-sm font-semibold mt-1">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
