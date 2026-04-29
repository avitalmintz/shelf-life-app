export type Category =
  | "place"
  | "watch"
  | "read"
  | "style"
  | "product"
  | "recipe"
  | "idea"
  | "other";

export type Priority = "low" | "medium" | "high";

export type Status = "saved" | "considering" | "done" | "not_interested";

export interface ShelfItem {
  id: string;
  image: string;            // data URL
  title: string;
  category: Category;
  notes?: string;
  link?: string;
  priority: Priority;
  status: Status;
  reminderDate?: string;    // ISO
  createdAt: string;        // ISO
  updatedAt: string;        // ISO
  lastResurfacedAt?: string;
}

export const CATEGORIES: { value: Category; label: string; emoji: string; tw: string }[] = [
  { value: "place",   label: "Place to go",         emoji: "📍", tw: "bg-cat-place text-cat-place-foreground" },
  { value: "watch",   label: "TV / Movie",          emoji: "🎬", tw: "bg-cat-watch text-cat-watch-foreground" },
  { value: "read",    label: "Book / Article",      emoji: "📖", tw: "bg-cat-read text-cat-read-foreground" },
  { value: "style",   label: "Clothing / Style",    emoji: "👗", tw: "bg-cat-style text-cat-style-foreground" },
  { value: "product", label: "Product I want",      emoji: "🛍️", tw: "bg-cat-product text-cat-product-foreground" },
  { value: "recipe",  label: "Recipe / Food",       emoji: "🍳", tw: "bg-cat-recipe text-cat-recipe-foreground" },
  { value: "idea",    label: "Idea / Inspiration",  emoji: "💡", tw: "bg-cat-idea text-cat-idea-foreground" },
  { value: "other",   label: "Other",               emoji: "✨", tw: "bg-cat-other text-cat-other-foreground" },
];

export const PRIORITIES: { value: Priority; label: string; tw: string }[] = [
  { value: "low",    label: "Low",    tw: "bg-prio-low text-prio-low-foreground" },
  { value: "medium", label: "Medium", tw: "bg-prio-med text-prio-med-foreground" },
  { value: "high",   label: "High",   tw: "bg-prio-high text-prio-high-foreground" },
];

export const STATUSES: { value: Status; label: string }[] = [
  { value: "saved",          label: "Saved" },
  { value: "considering",    label: "Considering" },
  { value: "done",           label: "Done" },
  { value: "not_interested", label: "Not interested" },
];

export const categoryMeta = (c: Category) => CATEGORIES.find(x => x.value === c)!;
export const priorityMeta = (p: Priority) => PRIORITIES.find(x => x.value === p)!;
export const statusMeta   = (s: Status)   => STATUSES.find(x => x.value === s)!;
