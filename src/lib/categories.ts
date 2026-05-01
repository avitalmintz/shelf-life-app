import { useEffect, useState } from "react";
import { CATEGORIES, type CategoryDefinition } from "./types";

const KEY = "screenshot-shelf:custom-categories:v1";
const DEFAULTS_KEY = "screenshot-shelf:enabled-default-categories:v1";
const CHANGE_EVENT = "shelf:categories-changed";
const CUSTOM_TONES = [
  "bg-cat-place text-cat-place-foreground",
  "bg-cat-watch text-cat-watch-foreground",
  "bg-cat-read text-cat-read-foreground",
  "bg-cat-style text-cat-style-foreground",
  "bg-cat-product text-cat-product-foreground",
  "bg-cat-recipe text-cat-recipe-foreground",
  "bg-cat-idea text-cat-idea-foreground",
  "bg-cat-other text-cat-other-foreground",
];

export interface CustomCategoryInput {
  label: string;
  context?: string;
}

export function getCustomCategories(): CategoryDefinition[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CategoryDefinition[];
    return parsed.filter(c => c.value && c.label);
  } catch {
    return [];
  }
}

export function getDefaultCategories(): CategoryDefinition[] {
  const enabled = getEnabledDefaultCategoryValues();
  return CATEGORIES.filter(c => enabled.includes(c.value));
}

export function getCategories(): CategoryDefinition[] {
  return [...getDefaultCategories(), ...getCustomCategories()];
}

export function categoryMeta(value: string): CategoryDefinition {
  return (
    getCategories().find(c => c.value === value) ??
    CATEGORIES.find(c => c.value === value) ??
    CATEGORIES.find(c => c.value === "other")!
  );
}

export function addCustomCategory(input: CustomCategoryInput): CategoryDefinition {
  const existing = getCustomCategories();
  const label = input.label.trim();
  if (!label) throw new Error("Name the category first.");
  const value = uniqueSlug(label, existing.map(c => c.value));
  const next: CategoryDefinition = {
    value,
    label,
    context: input.context?.trim() || undefined,
    tw: CUSTOM_TONES[existing.length % CUSTOM_TONES.length],
    custom: true,
  };
  saveCustomCategories([...existing, next]);
  return next;
}

export function removeCustomCategory(value: string): void {
  saveCustomCategories(getCustomCategories().filter(c => c.value !== value));
}

export function isDefaultCategoryEnabled(value: string): boolean {
  return getEnabledDefaultCategoryValues().includes(value);
}

export function setDefaultCategoryEnabled(value: string, enabled: boolean): void {
  if (value === "other") return;
  const values = new Set(getEnabledDefaultCategoryValues());
  if (enabled) values.add(value);
  else values.delete(value);
  values.add("other");
  localStorage.setItem(DEFAULTS_KEY, JSON.stringify([...values]));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function useCategories(): CategoryDefinition[] {
  const [categories, setCategories] = useState(getCategories);
  useEffect(() => {
    const refresh = () => setCategories(getCategories());
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return categories;
}

export function useDefaultCategories(): (CategoryDefinition & { enabled: boolean })[] {
  const [categories, setCategories] = useState(() =>
    CATEGORIES.map(c => ({ ...c, enabled: isDefaultCategoryEnabled(c.value) })),
  );
  useEffect(() => {
    const refresh = () =>
      setCategories(CATEGORIES.map(c => ({ ...c, enabled: isDefaultCategoryEnabled(c.value) })));
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return categories;
}

function saveCustomCategories(categories: CategoryDefinition[]): void {
  localStorage.setItem(KEY, JSON.stringify(categories));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

function getEnabledDefaultCategoryValues(): string[] {
  try {
    const raw = localStorage.getItem(DEFAULTS_KEY);
    if (!raw) return CATEGORIES.map(c => c.value);
    const parsed = JSON.parse(raw) as string[];
    const known = new Set(CATEGORIES.map(c => c.value));
    const enabled = parsed.filter(value => known.has(value));
    if (!enabled.includes("other")) enabled.push("other");
    return enabled.length > 0 ? enabled : ["other"];
  } catch {
    return CATEGORIES.map(c => c.value);
  }
}

function uniqueSlug(label: string, existing: string[]): string {
  const base = `custom-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "category"}`;
  let slug = base;
  let n = 2;
  const taken = new Set([...CATEGORIES.map(c => c.value), ...existing]);
  while (taken.has(slug)) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}
