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
  res.json({ ok: true });
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
      model: process.env.ANTHROPIC_MODEL ?? "claude-opus-4-7",
      max_tokens: 1200,
      system: [
        "You help a screenshot-saving app identify the source or best search strategy for screenshots.",
        "Analyze visual details, visible text, brand names, products, article headlines, prices, dates, social handles, domains, places, and UI context.",
        "You do not have live web browsing in this endpoint. Do not pretend you verified a URL online.",
        "If an exact source URL is supplied by the app, use it as the link.",
        "If no exact URL is supplied, create a highly specific searchQuery and candidates only when a full exact URL is visible in the screenshot.",
        "Never invent a definitive product/article URL from only a brand or domain. Domains alone are not enough.",
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
                "candidates must be an array of up to 5 objects: title, url, source, confidence, reason.",
                "For candidates without a verified URL, leave url empty and put the likely title/source/reason plus the searchQuery.",
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
    res.json(normalizeResult(parsed));
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
  const candidates = Array.isArray(value?.candidates)
    ? value.candidates.slice(0, 5).map(candidate => ({
        title: stringOrEmpty(candidate.title),
        url: stringOrEmpty(candidate.url),
        source: stringOrEmpty(candidate.source),
        confidence: numberBetween(candidate.confidence, 0, 1),
        reason: stringOrEmpty(candidate.reason),
      })).filter(candidate => candidate.url)
    : [];

  return {
    category: stringOrEmpty(value?.category) || "other",
    title: stringOrEmpty(value?.title) || "Saved screenshot",
    notes: stringOrEmpty(value?.notes),
    link: stringOrEmpty(value?.link),
    confidence: numberBetween(value?.confidence, 0, 1),
    searchQuery: stringOrEmpty(value?.searchQuery),
    candidates,
  };
}

function stringOrEmpty(value) {
  return typeof value === "string" ? value.trim() : "";
}

function numberBetween(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(max, Math.max(min, number));
}
