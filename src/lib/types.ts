export type Category = string;

export type Priority = "low" | "medium" | "high";

export type Status = "saved" | "considering" | "done" | "not_interested";

export interface ShelfItem {
  id: string;
  image: string;            // data URL
  imageStorageKey?: string;
  title: string;
  category: Category;
  notes?: string;
  link?: string;
  sourceCandidates?: SourceCandidate[];
  sourceConfidence?: number;
  sourceSearchQuery?: string;
  priority: Priority;
  status: Status;
  aiStatus?: "pending" | "done" | "error";
  reminderDate?: string;    // ISO
  createdAt: string;        // ISO
  updatedAt: string;        // ISO
  lastResurfacedAt?: string;
}

export interface SourceCandidate {
  title: string;
  url: string;
  source?: string;
  confidence?: number;
  reason?: string;
}

export interface CategoryDefinition {
  value: Category;
  label: string;
  tw: string;
  context?: string;
  custom?: boolean;
}

export const CATEGORIES: CategoryDefinition[] = [
  { value: "place",   label: "Places to go",       tw: "bg-cat-place text-cat-place-foreground" },
  { value: "watch",   label: "TV / Movie",         tw: "bg-cat-watch text-cat-watch-foreground" },
  { value: "read",    label: "Book / Article",     tw: "bg-cat-read text-cat-read-foreground" },
  { value: "style",   label: "Clothing / Style",   tw: "bg-cat-style text-cat-style-foreground" },
  { value: "product", label: "Products to buy",    tw: "bg-cat-product text-cat-product-foreground" },
  { value: "recipe",  label: "Recipe / Food",      tw: "bg-cat-recipe text-cat-recipe-foreground" },
  { value: "idea",    label: "Idea / Inspiration", tw: "bg-cat-idea text-cat-idea-foreground" },
  { value: "other",   label: "Other",              tw: "bg-cat-other text-cat-other-foreground" },
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

export const categoryMeta = (c: Category) =>
  CATEGORIES.find(x => x.value === c) ?? CATEGORIES.find(x => x.value === "other")!;
export const priorityMeta = (p: Priority) => PRIORITIES.find(x => x.value === p)!;
export const statusMeta   = (s: Status)   => STATUSES.find(x => x.value === s)!;
