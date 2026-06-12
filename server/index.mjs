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

    const { imageDataUrl, sourceURL, note, categories, mode } = req.body ?? {};
    const fastMode = mode === "fast";
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
    const categoryGuidance = [
      "Category rules:",
      "- style: clothing, outfits, shoes, bags, totes, purses, jewelry, accessories, fashion items, beauty/fashion styling.",
      "- product: physical products to buy that are not wearable/style items, not bags/totes/purses, not jewelry, not shoes, and not fashion accessories.",
      "- If an item is worn, carried as part of an outfit, or sold as a fashion accessory, choose style over product.",
      "- If the screenshot is an article/post about a product or fashion item, choose read when the primary thing saved is the article text/headline.",
    ].join("\n");

    const image = parseDataUrl(imageDataUrl);
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      max_tokens: fastMode ? 450 : 1200,
      system: [
        fastMode
          ? "You help a screenshot-saving app quickly title, categorize, and summarize screenshots."
          : "You help a screenshot-saving app identify the source or best search strategy for screenshots.",
        fastMode
          ? "Prioritize speed. Use obvious visual details, visible text, brand names, products, article headlines, places, and UI context."
          : "Analyze visual details, visible text, brand names, products, article headlines, prices, dates, social handles, domains, places, and UI context.",
        "You do not have live web browsing in this endpoint. Do not pretend you verified a URL online.",
        "If an exact source URL is supplied by the app, use it as the link.",
        fastMode
          ? "If no exact URL is supplied, leave link empty. Do not spend effort building source candidates."
          : "If no exact URL is supplied, create a searchQuery only when the screenshot appears to be a public/sourceable article, product, social post, listing, restaurant, event, place, recipe, video, book, or brand page.",
        fastMode
          ? "Do not search for private or unsourceable screenshots."
          : "If the screenshot is a text message, email, notes app, calendar, private chat, camera roll photo, personal document, receipt without a public item, random meme, or anything not meaningfully sourceable on the public web, set searchQuery to an empty string and candidates to an empty array.",
        "Never invent a definitive product/article URL from only a brand or domain. Domains alone are not enough.",
        fastMode
          ? "Return an empty candidates array unless a full exact URL is supplied or clearly visible."
          : "For candidates, include a url only when the exact full URL is supplied or clearly visible. Otherwise leave url empty but include title, source, reason, confidence, and searchQuery.",
        categoryGuidance,
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
                fastMode ? "Quickly categorize this screenshot." : "Find the source or likely matches for this screenshot.",
                sourceURL ? `Known source URL from iOS share sheet: ${sourceURL}` : "No source URL was supplied by iOS.",
                note ? `User note: ${note}` : "",
                "Return JSON with: category, title, notes, link, confidence, searchQuery, candidates.",
                fastMode
                  ? "Keep notes to one short sentence. Use an empty searchQuery and empty candidates unless the screenshot clearly shows an exact full URL."
                  : "candidates must be an array of up to 5 objects: title, url, source, confidence, reason, searchQuery.",
                fastMode
                  ? ""
                  : "For candidates without a verified URL, leave url empty and put the likely title/source/reason/searchQuery.",
                fastMode
                  ? ""
                  : "If there is no relevant public source link to find, return empty link, empty searchQuery, and empty candidates. Do not force a web search.",
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
    const normalized = normalizeResult(parsed, sourceURL);
    const searched = fastMode ? normalized : await enrichWithSearch(normalized, { anthropic, image, note });
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

function normalizeResult(value, sourceURL) {
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

  // The only link we treat as a confirmed exact source is one iOS handed us from
  // the share sheet. Anything the model reads off the image is a best guess until
  // it has been verified against the live page.
  const cleanSourceURL = sanitizeURL(stringOrEmpty(sourceURL));
  const aiLink = sanitizeURL(stringOrEmpty(value?.link));
  const visibleCandidateURL = candidates.find(candidate => candidate.url && (candidate.confidence ?? 0) >= 0.88)?.url || "";
  const link = cleanSourceURL || aiLink || visibleCandidateURL;
  const linkConfirmed = Boolean(cleanSourceURL) && link === cleanSourceURL;

  return {
    category: stringOrEmpty(value?.category) || "other",
    title: stringOrEmpty(value?.title) || "Saved screenshot",
    notes: stringOrEmpty(value?.notes),
    link,
    linkConfirmed,
    confidence: numberBetween(value?.confidence, 0, 1),
    searchQuery,
    candidates,
  };
}

async function enrichWithSearch(result, { anthropic, image, note } = {}) {
  if (!process.env.BRAVE_SEARCH_API_KEY || !result.searchQuery) {
    return result;
  }

  try {
    const results = await braveSearch(result.searchQuery);
    if (results.length === 0) return result;

    const existing = new Set(result.candidates.map(candidate => candidate.url).filter(Boolean));
    const searchResults = results.filter(candidate => !existing.has(candidate.url)).slice(0, 5);
    if (searchResults.length === 0) return result;

    // Pull live page details for the strongest results so the verifier compares
    // against the real page, not just a search snippet (and dead links surface).
    const summaries = await Promise.all(
      searchResults.map((candidate, index) =>
        index < 3 ? fetchPageSummary(candidate.url) : Promise.resolve(null),
      ),
    );

    const verification = await verifyCandidates({
      anthropic,
      image,
      query: result.searchQuery,
      context: { title: result.title, notes: result.notes, note },
      candidates: searchResults.map((candidate, index) => ({
        title: summaries[index]?.title || candidate.title,
        url: candidate.url,
        source: candidate.source,
        snippet: summaries[index]?.description || candidate.description,
        reachable: index < 3 ? Boolean(summaries[index]) : undefined,
      })),
    });

    const searchCandidates = searchResults.map((candidate, index) => {
      const verdict = verification.scores[index] ?? {};
      return {
        title: summaries[index]?.title || candidate.title,
        url: candidate.url,
        source: candidate.source,
        confidence: numberBetween(verdict.score, 0, 1),
        reason: stringOrEmpty(verdict.reason) || `Search result for "${result.searchQuery}"`,
        searchQuery: result.searchQuery,
      };
    });

    // Strongest verified match first.
    searchCandidates.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
    const candidates = [...searchCandidates, ...result.candidates].slice(0, 5);

    // Only auto-fill the link with a guess the verifier is reasonably sure about.
    const best = searchCandidates.find(candidate => candidate.url && (candidate.confidence ?? 0) >= 0.5);
    const link = result.link || best?.url || "";
    const linkConfirmed = Boolean(link) && link === result.link ? result.linkConfirmed : false;

    return {
      ...result,
      link,
      linkConfirmed,
      candidates,
    };
  } catch (error) {
    console.error("Search enrichment failed", error);
    return result;
  }
}

async function verifyCandidates({ anthropic, image, query, context, candidates }) {
  const fallback = { scores: candidates.map(() => ({ score: 0, reason: "" })) };
  if (!anthropic || !image || candidates.length === 0) return fallback;

  const candidateLines = candidates
    .map((candidate, index) =>
      [
        `Candidate ${index}:`,
        `  title: ${candidate.title || "(none)"}`,
        `  url: ${candidate.url}`,
        `  site: ${candidate.source || hostname(candidate.url)}`,
        candidate.snippet ? `  page text: ${candidate.snippet}` : "",
        candidate.reachable === false ? "  note: page could not be loaded (may be dead or blocked)" : "",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");

  try {
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      max_tokens: 600,
      system: [
        "You verify whether candidate web pages are the ACTUAL source of a screenshot.",
        "Be strict and skeptical. A page matches only if it is about the specific item, article, post, product, place, recipe, or video shown in the screenshot.",
        "A brand homepage, a category or listing page, a search-results page, a different product, or an article that merely mentions the topic is NOT a match.",
        "If a candidate's page could not be loaded, it cannot be a confident match.",
        "Score each candidate from 0 to 1 for how likely it is the exact source. Reserve scores above 0.7 for clear, specific matches and use low scores when unsure.",
        'Return only JSON shaped like {"scores":[{"index":number,"score":number,"reason":string}]} with one entry per candidate.',
      ].join("\n"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                `Screenshot details: title="${context?.title || ""}", notes="${context?.notes || ""}"${context?.note ? `, user note="${context.note}"` : ""}.`,
                `Search query used to find these candidates: "${query}".`,
                "Candidates to score:",
                candidateLines,
                "Compare each candidate against what is actually visible in the screenshot and score every candidate by index.",
              ].join("\n"),
            },
            {
              type: "image",
              source: { type: "base64", media_type: image.mediaType, data: image.base64 },
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find(block => block.type === "text");
    if (!textBlock) return fallback;
    const parsed = parseJSON(textBlock.text);
    const entries = Array.isArray(parsed?.scores) ? parsed.scores : [];
    const scores = candidates.map((_, index) => {
      const entry = entries.find(score => Number(score?.index) === index);
      return {
        score: numberBetween(entry?.score, 0, 1),
        reason: stringOrEmpty(entry?.reason),
      };
    });
    return { scores };
  } catch (error) {
    console.error("Candidate verification failed", error);
    return fallback;
  }
}

async function fetchPageSummary(url) {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ShelfLifeBot/1.0; +https://github.com/screenshot-shelf)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !contentType.includes("html")) return null;
    const html = (await response.text()).slice(0, 200_000);
    const title = stripTags(extractTag(html, /<title[^>]*>([\s\S]*?)<\/title>/i) || extractMeta(html, "og:title"));
    const description = stripTags(extractMeta(html, "description") || extractMeta(html, "og:description"));
    if (!title && !description) return null;
    return {
      title: title.slice(0, 200),
      description: description.slice(0, 500),
    };
  } catch {
    return null;
  }
}

function extractTag(html, regex) {
  const match = html.match(regex);
  return match ? match[1] : "";
}

function extractMeta(html, key) {
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${key}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }
  return "";
}

function stripTags(value) {
  return decodeEntities(stringOrEmpty(value).replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
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
    .map(result => ({
      title: stringOrEmpty(result.title),
      url: sanitizeURL(stringOrEmpty(result.url)),
      source: stringOrEmpty(result.profile?.name) || hostname(stringOrEmpty(result.url)),
      description: stringOrEmpty(result.description),
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
