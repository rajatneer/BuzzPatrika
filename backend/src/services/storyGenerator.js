const COUNTRY_LABEL_BY_CODE = {
  in: "India",
  us: "United States",
  gb: "United Kingdom",
  au: "Australia",
  ca: "Canada",
  ae: "United Arab Emirates",
  sg: "Singapore"
};

const PROVIDER_CREDIBILITY = {
  newsapi: 0.78,
  gnews: 0.77,
  alphavantage: 0.84,
  "google-news-rss": 0.74
};

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

function toProviderLabel(provider) {
  if (!provider) {
    return "BuzzPatrika";
  }

  return String(provider)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
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

function getCountryLabel(countryCode) {
  const normalizedCountry = String(countryCode || "in").toLowerCase();
  return COUNTRY_LABEL_BY_CODE[normalizedCountry] || normalizedCountry.toUpperCase();
}

function toCredibilityScore(provider, relevanceScore) {
  const providerScore = PROVIDER_CREDIBILITY[provider];
  const fallback = Number.isFinite(Number(relevanceScore)) ? Number(relevanceScore) : 0.55;
  const score = Number.isFinite(providerScore) ? providerScore : fallback;
  return Math.max(0, Math.min(1, score));
}

function buildTags(sourceItem, payload) {
  const rawTitle = String(payload.title || sourceItem.title || "").toLowerCase();
  const titleTokens = rawTitle
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4)
    .slice(0, 4);

  return Array.from(new Set([
    sourceItem.categorySlug,
    sourceItem.provider,
    String(sourceItem.countryCode || "in").toLowerCase(),
    ...titleTokens
  ].filter(Boolean)));
}

export function generateStoryFromSource(sourceItem, { autoPublish }) {
  const now = new Date().toISOString();
  const categoryLabel = sourceItem.categorySlug.replace(/-/g, " ");
  const payload = parseRawPayload(sourceItem.rawPayload);
  const providerLabel = toProviderLabel(sourceItem.provider);
  const organizationName = payload?.source?.name || providerLabel || "BuzzPatrika";
  const authorName = payload?.author || `${providerLabel} Desk`;
  const countryLabel = getCountryLabel(sourceItem.countryCode);
  const location = payload?.location || countryLabel;

  const headline = sourceItem.title;
  const summary = sourceItem.summary || `Latest ${categoryLabel} update sourced from market/news feeds.`;
  const slugBase = slugify(headline).slice(0, 80);
  const slugSuffix = slugify(sourceItem.externalId || String(sourceItem.id || "story")).slice(0, 10);
  const slug = `${slugBase}-${slugSuffix}`;
  const featuredMediaUrl = payload?.urlToImage || payload?.image || null;
  const credibilityScore = toCredibilityScore(sourceItem.provider, sourceItem.relevanceScore);
  const tags = buildTags(sourceItem, payload);
  const publishedAt = autoPublish ? now : (sourceItem.publishedAt || now);

  const storyBody = [
    `This automated story was generated for the ${categoryLabel} desk based on the latest source feed item.`,
    `Source headline: ${sourceItem.title}`,
    `Key context: ${summary}`,
    sourceItem.marketSignal
      ? `Market signal snapshot: ${sourceItem.marketSignal}`
      : "No additional market-signal payload was attached to this source item.",
    "Editorial note: this is phase-1 auto-generated content. Add review workflows and model-based summarization before production publishing."
  ].join("\n\n");

  return {
    sourceItemId: sourceItem.id,
    categorySlug: sourceItem.categorySlug,
    slug,
    headline,
    summary,
    storyBody,
    authorName,
    organizationName,
    location,
    sourceCredibilityScore: credibilityScore,
    featuredMediaUrl,
    tagsJson: JSON.stringify(tags),
    confidenceScore: 0.72,
    generationModel: "rules-v1",
    generationStatus: "generated",
    editorialStatus: autoPublish ? "published" : "review_required",
    publishedAt,
    updatedAt: now
  };
}
