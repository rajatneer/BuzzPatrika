import { env } from "../config/env.js";

function slugify(value) {
  const normalized = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized || "story";
}

function parseRawPayload(rawPayload) {
  if (!rawPayload || typeof rawPayload !== "string") {
    return {};
  }

  try {
    const parsed = JSON.parse(rawPayload);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function trimWords(value, maxWords) {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return words.join(" ");
  }
  return words.slice(0, maxWords).join(" ");
}

function tryParseJson(content) {
  if (!content) {
    return null;
  }
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function buildStoryFromAi(sourceItem, aiResult, { autoPublish }) {
  const now = new Date().toISOString();
  const payload = parseRawPayload(sourceItem.rawPayload);
  const providerLabel = String(sourceItem.provider || "news");
  const headline = trimWords(aiResult.headline || sourceItem.title || "Untitled story", 12);
  const summary = trimWords(aiResult.summary || sourceItem.summary || headline, 35);
  const storyBody = trimWords(aiResult.storyBody || summary, 120);
  const tags = Array.isArray(aiResult.tags) ? aiResult.tags.slice(0, 8).map((tag) => String(tag).toLowerCase()) : [];
  const slugBase = slugify(headline).slice(0, 80);
  const slugSuffix = slugify(sourceItem.externalId || String(sourceItem.id || "story")).slice(0, 10);

  return {
    sourceItemId: sourceItem.id,
    categorySlug: sourceItem.categorySlug,
    slug: `${slugBase}-${slugSuffix}`,
    headline,
    summary,
    storyBody,
    authorName: payload?.author || `${providerLabel} desk`,
    organizationName: payload?.source?.name || providerLabel,
    location: payload?.location || (sourceItem.countryCode || "in").toUpperCase(),
    sourceCredibilityScore: Number.isFinite(Number(sourceItem.relevanceScore))
      ? Math.max(0, Math.min(1, Number(sourceItem.relevanceScore)))
      : 0.7,
    featuredMediaUrl: payload?.urlToImage || payload?.image || null,
    tagsJson: JSON.stringify(tags.length > 0 ? tags : [sourceItem.categorySlug, providerLabel]),
    confidenceScore: Number.isFinite(Number(aiResult.confidenceScore))
      ? Math.max(0, Math.min(1, Number(aiResult.confidenceScore)))
      : 0.75,
    generationModel: env.aiModel,
    generationStatus: "generated",
    editorialStatus: autoPublish ? "published" : "review_required",
    publishedAt: sourceItem.publishedAt || now,
    updatedAt: now
  };
}

export async function generateStoryWithAI(sourceItem, { autoPublish }) {
  if (!env.openAiApiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), env.aiRequestTimeoutMs);

  try {
    const promptPayload = {
      title: String(sourceItem.title || ""),
      summary: String(sourceItem.summary || ""),
      category: String(sourceItem.categorySlug || ""),
      country: String(sourceItem.countryCode || "in"),
      provider: String(sourceItem.provider || "news"),
      publishedAt: String(sourceItem.publishedAt || "")
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.openAiApiKey}`
      },
      body: JSON.stringify({
        model: env.aiModel,
        temperature: 0.2,
        max_tokens: env.aiMaxOutputTokens,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You are a concise news editor. Use only provided facts. Return JSON: headline, summary, storyBody, tags, confidenceScore."
          },
          {
            role: "user",
            content: `Rewrite this into short publish-ready story for India audience. Limits: headline<=12 words, summary<=35 words, storyBody<=120 words.\nInput:${JSON.stringify(promptPayload)}`
          }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed with ${response.status}`);
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    const aiResult = tryParseJson(content);
    if (!aiResult || typeof aiResult !== "object") {
      throw new Error("OpenAI response was not valid JSON");
    }

    return buildStoryFromAi(sourceItem, aiResult, { autoPublish });
  } finally {
    clearTimeout(timeoutId);
  }
}

