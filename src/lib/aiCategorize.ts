import type { Category, SourceCandidate } from "./types";
import { getCategories } from "./categories";
import { findScreenshotSource } from "./sourceFinder";

export interface AIResult {
  category: Category;
  title: string;
  notes: string;
  link: string;
  linkConfirmed: boolean;
  sourceCandidates?: SourceCandidate[];
  sourceConfidence?: number;
  sourceSearchQuery?: string;
}

export interface CategorizeContext {
  sourceURL?: string;
  note?: string;
}

export function isAIConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SOURCE_API_URL);
}

export async function categorizeScreenshot(dataUrl: string, context: CategorizeContext = {}): Promise<AIResult> {
  const result = await findScreenshotSource({
    imageDataUrl: dataUrl,
    sourceURL: context.sourceURL,
    note: context.note,
    categories: getCategories(),
    mode: "fast",
  });

  return {
    category: result.category,
    title: result.title,
    notes: result.notes,
    link: result.link,
    linkConfirmed: result.linkConfirmed,
    sourceCandidates: result.candidates,
    sourceConfidence: result.confidence,
    sourceSearchQuery: result.searchQuery,
  };
}
