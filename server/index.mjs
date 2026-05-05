import "dotenv/config";
import cors from "cors";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";

const app = express();
const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "0.0.0.0";

app.use(cors({ origin: true }));
app.use(express.json({ limit: "12mb" }));

app.get("/", (_req, res) => {
  res.type("text/plain").send("Shelf Life backend is running. Try /health.");
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    searchConfigured: Boolean(process.env.BRAVE_SEARCH_API_KEY),
  });
});

app.post("/api/analyze-screenshot", async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured on the backend." });
      return;
    }
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const { imageDataUrl, sourceURL, note, categories } = req.body ?? {};
    if (typeof imageDataUrl !== "string" || !imageDataUrl.startsWith("data:image/")) {
      res.status(400).json({ error: "imageDataUrl must be a data:image URL." });
      return;
    }

    const categoryLines = Array.isArray(categories)
      ? categories
          .filter(c => c && typeof c.value === "string" && typeof c.label === "string")
          .map(c => `- ${c.value}: ${c.label}${c.context ? ` (${c.context})` : ""}`)
          .join("\n")
      : "";

    const image = parseDataUrl(imageDataUrl);
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      max_tokens: 1200,
      system: [
        "You help a screenshot-saving app identify the source or best search strategy for screenshots.",
        "Analyze visual details, visible text, brand names, products, article headlines, prices, dates, social handles, domains, places, and UI context.",
        "You do not have live web browsing in this endpoint. Do not pretend you verified a URL online.",
        "If an exact source URL is supplied by the app, use it as the link.",
        "If no exact URL is supplied, create a highly specific searchQuery and useful candidates based on visible evidence.",
        "Never invent a definitive product/article URL from only a brand or domain. Domains alone are not enough.",
        "For candidates, include a url only when the exact full URL is supplied or clearly visible. Otherwise leave url empty but include title, source, reason, confidence, and searchQuery.",
        "Return only valid JSON matching the requested shape.",
        categoryLines ? `Available categories:\n${categoryLines}` : "",
      ].filter(Boolean).join("\n"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "Find the source or likely matches for this screenshot.",
                sourceURL ? `Known source URL from iOS share sheet: ${sourceURL}` : "No source URL was supplied by iOS.",
                note ? `User note: ${note}` : "",
                "Return JSON with: category, title, notes, link, confidence, searchQuery, candidates.",
                "candidates must be an array of up to 5 objects: title, url, source, confidence, reason, searchQuery.",
                "For candidates without a verified URL, leave url empty and put the likely title/source/reason/searchQuery.",
                "Use link only when it was supplied by iOS or a full exact URL is clearly visible in the image.",
              ].filter(Boolean).join("\n"),
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: image.mediaType,
                data: image.base64,
              },
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find(block => block.type === "text");
    if (!textBlock) throw new Error("Claude did not return text.");
    const parsed = parseJSON(textBlock.text);
    const normalized = normalizeResult(parsed);
    const searched = await enrichWithSearch(normalized);
    res.json(searched);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Screenshot analysis failed.",
    });
  }
});

app.listen(port, host, () => {
  console.log(`Shelf Life backend listening on http://${host}:${port}`);
});

function parseJSON(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI did not return JSON.");
    return JSON.parse(match[0]);
  }
}

function parseDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,(.+)$/i);
  if (!match) throw new Error("Unsupported image data URL.");
  const mediaType = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
  return { mediaType, base64: match[2] };
}

function normalizeResult(value) {
  const searchQuery = stringOrEmpty(value?.searchQuery);
  const candidates = Array.isArray(value?.candidates)
    ? value.candidates.slice(0, 5).map(candidate => ({
        title: stringOrEmpty(candidate.title),
        url: stringOrEmpty(candidate.url),
        source: stringOrEmpty(candidate.source),
        confidence: numberBetween(candidate.confidence, 0, 1),
        reason: stringOrEmpty(candidate.reason),
        searchQuery: stringOrEmpty(candidate.searchQuery),
      })).filter(candidate => candidate.url || candidate.title || candidate.source || candidate.searchQuery)
    : [];
  if (candidates.length === 0 && searchQuery) {
    candidates.push({
      title: "Search for this source",
      url: "",
      source: "",
      confidence: numberBetween(value?.confidence, 0, 1),
      reason: "No exact URL was verified, but this search query is based on the visible screenshot details.",
      searchQuery,
    });
  }

  const link = sanitizeURL(stringOrEmpty(value?.link));
  const promoted = link || candidates.find(candidate => candidate.url && (candidate.confidence ?? 0) >= 0.88)?.url || "";

  return {
    category: stringOrEmpty(value?.category) || "other",
    title: stringOrEmpty(value?.title) || "Saved screenshot",
    notes: stringOrEmpty(value?.notes),
    link: promoted,
    confidence: numberBetween(value?.confidence, 0, 1),
    searchQuery,
    candidates,
  };
}

async function enrichWithSearch(result) {
  if (!process.env.BRAVE_SEARCH_API_KEY || !result.searchQuery) {
    return result;
  }

  try {
    const results = await braveSearch(result.searchQuery);
    if (results.length === 0) return result;

    const existing = new Set(result.candidates.map(candidate => candidate.url).filter(Boolean));
    const searchCandidates = results
      .filter(candidate => !existing.has(candidate.url))
      .slice(0, 5)
      .map(candidate => ({
        ...candidate,
        confidence: candidate.confidence,
        reason: `Search result for "${result.searchQuery}"`,
        searchQuery: result.searchQuery,
      }));

    const candidates = [...searchCandidates, ...result.candidates].slice(0, 5);
    const top = candidates.find(candidate => candidate.url && (candidate.confidence ?? 0) >= 0.82);

    return {
      ...result,
      link: result.link || top?.url || "",
      candidates,
    };
  } catch (error) {
    console.error("Search enrichment failed", error);
    return result;
  }
}

async function braveSearch(query) {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", "5");
  url.searchParams.set("country", "us");
  url.searchParams.set("search_lang", "en");
  url.searchParams.set("safesearch", "moderate");
  url.searchParams.set("spellcheck", "1");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY,
    },
  });
  if (!response.ok) {
    throw new Error(`Brave Search error ${response.status}: ${await response.text()}`);
  }

  const body = await response.json();
  const webResults = Array.isArray(body?.web?.results) ? body.web.results : [];
  return webResults
    .map((result, index) => ({
      title: stringOrEmpty(result.title),
      url: sanitizeURL(stringOrEmpty(result.url)),
      source: stringOrEmpty(result.profile?.name) || hostname(stringOrEmpty(result.url)),
      confidence: Math.max(0.55, 0.92 - index * 0.08),
      reason: stringOrEmpty(result.description),
    }))
    .filter(result => result.url);
}

function hostname(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function sanitizeURL(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function stringOrEmpty(value) {
  return typeof value === "string" ? value.trim() : "";
}

function numberBetween(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(max, Math.max(min, number));
}
