import Anthropic from "@anthropic-ai/sdk";
import type { Category } from "./types";
import { getCategories } from "./categories";

const KEY_STORAGE = "screenshot-shelf:anthropic-key";

export function getApiKey(): string {
  return localStorage.getItem(KEY_STORAGE) ?? "";
}

export function setApiKey(key: string) {
  const trimmed = key.trim();
  if (trimmed) localStorage.setItem(KEY_STORAGE, trimmed);
  else localStorage.removeItem(KEY_STORAGE);
}

export interface AIResult {
  category: Category;
  title: string;
  notes: string;
  link: string;
}

function buildSchema(categoryValues: string[]) {
  return {
  type: "object",
  properties: {
    category: { type: "string", enum: categoryValues },
    title: { type: "string" },
    notes: { type: "string" },
    link: { type: "string" },
  },
  required: ["category", "title", "notes", "link"],
  additionalProperties: false,
  } as const;
}

function buildSystemPrompt() {
  const categories = getCategories();
  const custom = categories.filter(c => c.custom);
  const customLines = custom
    .map(c => `- ${c.value}: ${c.label}${c.context ? ` — ${c.context}` : ""}`)
    .join("\n");

  return `You analyze screenshots that users take when they want to remember something. Look at the image and figure out what it is.

Categories:
- place: restaurants, cafes, bars, hotels, travel destinations, locations, maps
- watch: TV shows, movies, video clips, trailers, streaming content, YouTube videos
- read: ANY article, news story, op-ed, blog post, newsletter, book, Substack, Medium post, social media thread, screenshot of text from a website. If the screenshot shows mainly text, headlines, paragraphs, a byline, or looks like it came from a newspaper/magazine/news website, it is a "read".
- style: clothing, outfits, shoes, accessories, fashion items
- product: physical products to buy that are not clothing (electronics, home goods, beauty, kitchen, furniture)
- recipe: recipes, food photos, cooking ideas, ingredient lists
- idea: inspiration, abstract ideas, concepts, quotes, design references, creative prompts
- other: anything that genuinely fits nowhere else
${customLines ? `\nUser custom categories:\n${customLines}` : ""}

Decision priority: use a user custom category when the screenshot strongly matches its name/context. Otherwise, a screenshot of an article ABOUT a place/show/product is still "read" — categorize by the screenshot's primary purpose (a news headline about a restaurant is "read", not "place"). Only use "other" as a last resort.

Extract:
- category: best match
- title: a short, specific title that helps the user remember (max ~50 chars). For places use the venue name. For shows use show + season. For products use brand + item. For articles use the headline if visible, or a short summary. Don't include category prefixes like "Article:" or "Movie:".
- notes: 1-2 sentence description of what this is. For articles, mention the publication if visible.
- link: any URL visible in the screenshot, or empty string if none

Be specific. Read text in the image. Pull out names, places, headlines, publications.`;
}

export async function categorizeScreenshot(dataUrl: string): Promise<AIResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Add your Anthropic API key in Profile first.");
  }

  const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!match) throw new Error("Could not read the image data.");
  const mediaType = match[1] as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  const base64 = match[2];

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const categoryValues = getCategories().map(c => c.value);

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 1024,
      system: buildSystemPrompt(),
      output_config: {
        format: { type: "json_schema", schema: buildSchema(categoryValues) },
      },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: "Categorize this screenshot." },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    if (!textBlock) throw new Error("AI returned an unexpected response. Try again.");
    return JSON.parse(textBlock.text) as AIResult;
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new Error("Invalid API key. Check your key in Profile.");
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new Error("Too many requests. Wait a moment and try again.");
    }
    if (err instanceof Anthropic.APIError) {
      throw new Error(`AI error: ${err.message}`);
    }
    throw err;
  }
}
