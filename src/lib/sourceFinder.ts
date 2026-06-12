import type { CategoryDefinition, SourceCandidate } from "./types";

export interface SourceFinderResult {
  category: string;
  title: string;
  notes: string;
  link: string;
  linkConfirmed: boolean;
  confidence: number;
  searchQuery: string;
  candidates: SourceCandidate[];
}

export async function findScreenshotSource(input: {
  imageDataUrl: string;
  sourceURL?: string;
  note?: string;
  categories: CategoryDefinition[];
  mode?: "fast" | "source";
}): Promise<SourceFinderResult> {
  const baseUrl = import.meta.env.VITE_SOURCE_API_URL;
  if (!baseUrl) {
    throw new Error("Backend URL is not configured. Set VITE_SOURCE_API_URL.");
  }

  const endpoint = `${baseUrl.replace(/\/$/, "")}/api/analyze-screenshot`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const sharedKey = import.meta.env.VITE_APP_SHARED_SECRET;
  if (sharedKey) {
    headers["x-shelf-key"] = sharedKey;
  }
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    });
  } catch (error) {
    throw new Error(
      `Could not reach the source backend at ${baseUrl}. Make sure the backend is running and your iPhone is on the same Wi-Fi. ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || "Could not analyze screenshot.");
  }
  return body as SourceFinderResult;
}
