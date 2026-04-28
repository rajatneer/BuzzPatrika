import crypto from "node:crypto";
import { env } from "../config/env.js";

const NEWSAPI_CATEGORY_BY_SLUG = {
  business: "business",
  entertainment: "entertainment",
  sports: "sports",
  tech: "technology",
  trending: "general",
  startup: "general",
  "social-media": "general",
  news: "general"
};

const GNEWS_TOPIC_BY_SLUG = {
  business: "business",
  entertainment: "entertainment",
  sports: "sports",
  tech: "technology",
  news: "nation"
};

const COUNTRY_LABEL_BY_CODE = {
  in: "India",
  us: "United States",
  gb: "United Kingdom",
  au: "Australia",
  ca: "Canada",
  ae: "United Arab Emirates",
  sg: "Singapore"
};

const GOOGLE_RSS_LOCALE_BY_COUNTRY = {
  in: { hl: "en-IN", gl: "IN", ceid: "IN:en" },
  us: { hl: "en-US", gl: "US", ceid: "US:en" },
  gb: { hl: "en-GB", gl: "GB", ceid: "GB:en" },
  au: { hl: "en-AU", gl: "AU", ceid: "AU:en" },
  ca: { hl: "en-CA", gl: "CA", ceid: "CA:en" },
  ae: { hl: "en", gl: "AE", ceid: "AE:en" },
  sg: { hl: "en-SG", gl: "SG", ceid: "SG:en" }
};

const PROVIDER_CACHE_TTL_MS = env.providerCacheTtlHours * 60 * 60 * 1000;
const GNEWS_MIN_REQUEST_INTERVAL_MS = 1200;
const providerCache = new Map();
const providerDailyBudgetState = new Map();
let lastGNewsRequestAtMs = 0;

function getCurrentDayKey() {
  return new Date().toISOString().slice(0, 10);
}

function canConsumeProviderRequest(providerName, dailyLimit) {
  const dayKey = getCurrentDayKey();
  const state = providerDailyBudgetState.get(providerName);

  if (!state || state.dayKey !== dayKey) {
    providerDailyBudgetState.set(providerName, {
      dayKey,
      count: 0
    });
  }

  const activeState = providerDailyBudgetState.get(providerName);
  if (activeState.count >= dailyLimit) {
    return false;
  }

  activeState.count += 1;
  providerDailyBudgetState.set(providerName, activeState);
  return true;
}

function markProviderBudgetExhausted(providerName, dailyLimit) {
  providerDailyBudgetState.set(providerName, {
    dayKey: getCurrentDayKey(),
    count: dailyLimit
  });
}

function getProviderUsageRecord(providerName, dailyLimit) {
  const dayKey = getCurrentDayKey();
  const state = providerDailyBudgetState.get(providerName);

  if (!state || state.dayKey !== dayKey) {
    return { dayKey, count: 0, limit: dailyLimit };
  }

  return { dayKey: state.dayKey, count: state.count, limit: dailyLimit };
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#160;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractXmlTagValue(block, tagName) {
  const regex = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = String(block || "").match(regex);
  if (!match) {
    return "";
  }

  return stripHtml(decodeHtmlEntities(match[1]));
}

function toGoogleRssLocale(countryCode) {
  return GOOGLE_RSS_LOCALE_BY_COUNTRY[countryCode] || {
    hl: "en",
    gl: String(countryCode || "in").toUpperCase(),
    ceid: `${String(countryCode || "in").toUpperCase()}:en`
  };
}

function getCachedProviderItems(cacheKey) {
  const cached = providerCache.get(cacheKey);
  if (!cached) {
    return null;
  }

  if (Date.now() > cached.expiresAt) {
    providerCache.delete(cacheKey);
    return null;
  }

  return cached.items;
}

function setCachedProviderItems(cacheKey, items) {
  providerCache.set(cacheKey, {
    items,
    expiresAt: Date.now() + PROVIDER_CACHE_TTL_MS
  });
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForGNewsThrottle() {
  const now = Date.now();
  const waitMs = Math.max(0, (lastGNewsRequestAtMs + GNEWS_MIN_REQUEST_INTERVAL_MS) - now);

  if (waitMs > 0) {
    await delay(waitMs);
  }

  lastGNewsRequestAtMs = Date.now();
}

function sanitizeCountryCode(countryCode) {
  const code = String(countryCode || "").toLowerCase();
  return /^[a-z]{2}$/.test(code) ? code : env.defaultCountryCode;
}

function buildCountryAwareQuery(category, countryCode) {
  const baseQuery = category.newsQuery.replace(/\bindia\b/gi, "").replace(/\s+/g, " ").trim();
  const countryLabel = COUNTRY_LABEL_BY_CODE[countryCode] || countryCode.toUpperCase();
  const categoryHint = category.displayName.toLowerCase();

  if (countryCode === "in") {
    return category.newsQuery;
  }

  return `${categoryHint} ${baseQuery} ${countryLabel}`.replace(/\s+/g, " ").trim();
}

function filterToFreshItems(items) {
  const cutoff = Date.now() - (env.storiesMaxAgeDays * 24 * 60 * 60 * 1000);

  return items.filter((item) => {
    const parsedMs = new Date(item.publishedAt || "").getTime();
    return Number.isFinite(parsedMs) && parsedMs >= cutoff;
  });
}

async function fetchNewsApiItems(category, limit, countryCode) {
  if (!env.newsApiKey) {
    return [];
  }

  const normalizedCountryCode = sanitizeCountryCode(countryCode);
  const cacheKey = `newsapi:${normalizedCountryCode}:${category.slug}:${limit}`;
  const cachedItems = getCachedProviderItems(cacheKey);
  if (cachedItems) {
    return cachedItems;
  }

  if (!canConsumeProviderRequest("newsapi", env.newsApiDailyRequestLimit)) {
    console.warn(`News provider skipped for ${category.slug}: daily request limit (${env.newsApiDailyRequestLimit}) reached`);
    return [];
  }

  const apiCategory = NEWSAPI_CATEGORY_BY_SLUG[category.slug] || "general";
  const query = buildCountryAwareQuery(category, normalizedCountryCode);

  const params = new URLSearchParams({
    country: normalizedCountryCode,
    category: apiCategory,
    q: query,
    pageSize: String(limit)
  });

  const response = await fetch(`https://newsapi.org/v2/top-headlines?${params.toString()}`, {
    headers: {
      "X-Api-Key": env.newsApiKey
    }
  });

  if (!response.ok) {
    if (response.status === 429) {
      markProviderBudgetExhausted("newsapi", env.newsApiDailyRequestLimit);
    }
    throw new Error(`NewsAPI request failed with ${response.status}`);
  }

  const payload = await response.json();
  const articles = Array.isArray(payload.articles) ? payload.articles : [];

  const mapped = articles.map((article) => {
    const sourceUrl = article.url || "";
    const digest = crypto.createHash("sha1").update(`newsapi:${sourceUrl}`).digest("hex");

    return {
      externalId: digest,
      provider: "newsapi",
      countryCode: normalizedCountryCode,
      categorySlug: category.slug,
      title: article.title || "Untitled story",
      summary: article.description || article.content || "",
      sourceUrl,
      publishedAt: article.publishedAt || new Date().toISOString(),
      marketSignal: null,
      relevanceScore: 0.8,
      rawPayload: JSON.stringify(article),
      ingestionStatus: "ingested"
    };
  });

  const freshItems = filterToFreshItems(mapped);

  if (freshItems.length > 0) {
    setCachedProviderItems(cacheKey, freshItems);
  }

  return freshItems;
}

async function fetchGNewsItems(category, limit, countryCode) {
  if (!env.gNewsApiKey) {
    return [];
  }

  const normalizedCountryCode = sanitizeCountryCode(countryCode);
  const cacheKey = `gnews:${normalizedCountryCode}:${category.slug}:${limit}`;
  const cachedItems = getCachedProviderItems(cacheKey);
  if (cachedItems) {
    return cachedItems;
  }

  if (!canConsumeProviderRequest("gnews", env.gNewsDailyRequestLimit)) {
    console.warn(`GNews provider skipped for ${category.slug}: daily request limit (${env.gNewsDailyRequestLimit}) reached`);
    return [];
  }

  const params = new URLSearchParams({
    country: normalizedCountryCode,
    lang: "en",
    max: String(limit),
    token: env.gNewsApiKey
  });

  const topic = GNEWS_TOPIC_BY_SLUG[category.slug];
  if (topic) {
    params.set("topic", topic);
  }

  const query = buildCountryAwareQuery(category, normalizedCountryCode);
  if (query) {
    params.set("q", query);
  }

  let payload = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await waitForGNewsThrottle();
    const response = await fetch(`https://gnews.io/api/v4/top-headlines?${params.toString()}`);

    if (response.ok) {
      payload = await response.json();
      break;
    }

    let responseText = "";
    try {
      responseText = await response.text();
    } catch {
      responseText = "";
    }

    const normalizedErrorText = responseText.toLowerCase();
    const exhaustedDailyBudget = (
      normalizedErrorText.includes("requests per day")
      || normalizedErrorText.includes("daily")
      || normalizedErrorText.includes("request limit")
      || normalizedErrorText.includes("quota")
    );

    if (response.status === 429 && attempt === 0 && !exhaustedDailyBudget) {
      // GNews can temporarily throttle bursts. Retry once after interval pacing.
      continue;
    }

    if (response.status === 429 && exhaustedDailyBudget) {
      markProviderBudgetExhausted("gnews", env.gNewsDailyRequestLimit);
    }

    throw new Error(`GNews request failed with ${response.status}`);
  }

  if (!payload) {
    return [];
  }

  const articles = Array.isArray(payload.articles) ? payload.articles : [];

  const mapped = articles.map((article) => {
    const sourceUrl = article.url || "";
    const digest = crypto.createHash("sha1").update(`gnews:${sourceUrl}`).digest("hex");

    return {
      externalId: digest,
      provider: "gnews",
      countryCode: normalizedCountryCode,
      categorySlug: category.slug,
      title: article.title || "Untitled story",
      summary: article.description || article.content || "",
      sourceUrl,
      publishedAt: article.publishedAt || new Date().toISOString(),
      marketSignal: null,
      relevanceScore: 0.79,
      rawPayload: JSON.stringify(article),
      ingestionStatus: "ingested"
    };
  });

  const freshItems = filterToFreshItems(mapped);

  if (freshItems.length > 0) {
    setCachedProviderItems(cacheKey, freshItems);
  }

  return freshItems;
}

async function fetchAlphaVantageSignal(category, countryCode) {
  const normalizedCountryCode = sanitizeCountryCode(countryCode);
  if (normalizedCountryCode !== "in") {
    return [];
  }

  if (!env.alphaVantageApiKey) {
    return [];
  }

  const cacheKey = `alphavantage:${normalizedCountryCode}`;
  const cachedItems = getCachedProviderItems(cacheKey);
  if (cachedItems) {
    return cachedItems.map((item) => ({
      ...item,
      categorySlug: category.slug
    }));
  }

  if (!canConsumeProviderRequest("alphavantage", env.alphaVantageDailyRequestLimit)) {
    console.warn(`Market provider skipped for ${category.slug}: daily request limit (${env.alphaVantageDailyRequestLimit}) reached`);
    return [];
  }

  const url = `https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${env.alphaVantageApiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 429) {
      markProviderBudgetExhausted("alphavantage", env.alphaVantageDailyRequestLimit);
    }
    throw new Error(`Alpha Vantage request failed with ${response.status}`);
  }

  const payload = await response.json();
  const providerInfoText = String(payload.Note || payload.Information || "").toLowerCase();
  if (providerInfoText.includes("rate limit") || providerInfoText.includes("requests per day")) {
    markProviderBudgetExhausted("alphavantage", env.alphaVantageDailyRequestLimit);
  }

  const gainers = Array.isArray(payload.top_gainers) ? payload.top_gainers.slice(0, 3) : [];

  const mapped = gainers.map((item, index) => {
    const ticker = item.ticker || `TICKER-${index}`;
    const externalId = crypto.createHash("sha1").update(`alphavantage:${ticker}:${new Date().toISOString().slice(0, 10)}`).digest("hex");

    return {
      externalId,
      provider: "alphavantage",
      countryCode: normalizedCountryCode,
      categorySlug: category.slug,
      title: `${ticker} leads market momentum` ,
      summary: `${ticker} moved ${item.change_percentage || "N/A"} with volume ${item.volume || "N/A"}.`,
      sourceUrl: "https://www.alphavantage.co/",
      publishedAt: new Date().toISOString(),
      marketSignal: JSON.stringify(item),
      relevanceScore: 0.7,
      rawPayload: JSON.stringify(item),
      ingestionStatus: "ingested"
    };
  });

  const freshItems = filterToFreshItems(mapped);

  if (freshItems.length > 0) {
    setCachedProviderItems(cacheKey, freshItems);
  }

  return freshItems;
}

async function fetchGoogleNewsRssItems(category, limit, countryCode) {
  const normalizedCountryCode = sanitizeCountryCode(countryCode);
  const cacheKey = `google-rss:${normalizedCountryCode}:${category.slug}:${limit}`;
  const cachedItems = getCachedProviderItems(cacheKey);
  if (cachedItems) {
    return cachedItems;
  }

  const locale = toGoogleRssLocale(normalizedCountryCode);
  const query = buildCountryAwareQuery(category, normalizedCountryCode);
  const params = new URLSearchParams({
    q: query,
    hl: locale.hl,
    gl: locale.gl,
    ceid: locale.ceid
  });

  const response = await fetch(`https://news.google.com/rss/search?${params.toString()}`, {
    headers: {
      "User-Agent": "Mediababa/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Google RSS request failed with ${response.status}`);
  }

  const xml = await response.text();
  const itemBlocks = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];
  const mapped = itemBlocks.slice(0, limit).map((itemBlock, index) => {
    const title = extractXmlTagValue(itemBlock, "title") || `${category.displayName} live update ${index + 1}`;
    const sourceUrl = extractXmlTagValue(itemBlock, "link") || "https://news.google.com/";
    const publishedAt = new Date(extractXmlTagValue(itemBlock, "pubDate") || new Date().toISOString()).toISOString();
    const description = extractXmlTagValue(itemBlock, "description");
    const sourceName = extractXmlTagValue(itemBlock, "source") || "Google News RSS";
    const externalId = crypto
      .createHash("sha1")
      .update(`google-rss:${sourceUrl}:${publishedAt}:${title}`)
      .digest("hex");

    return {
      externalId,
      provider: "google-news-rss",
      countryCode: normalizedCountryCode,
      categorySlug: category.slug,
      title,
      summary: description || title,
      sourceUrl,
      publishedAt,
      marketSignal: null,
      relevanceScore: 0.76,
      rawPayload: JSON.stringify({
        source: { name: sourceName },
        description,
        title,
        publishedAt,
        link: sourceUrl
      }),
      ingestionStatus: "ingested"
    };
  });

  if (mapped.length > 0) {
    setCachedProviderItems(cacheKey, mapped);
  }

  return mapped;
}

export async function fetchSourceItemsForCategory(category, limit, countryCode) {
  const normalizedCountryCode = sanitizeCountryCode(countryCode);

  const [newsItems, gNewsItems, marketItems] = await Promise.all([
    fetchNewsApiItems(category, limit, normalizedCountryCode).catch((error) => {
      console.warn(`News provider failed for ${category.slug}: ${error.message}`);
      return [];
    }),
    fetchGNewsItems(category, limit, normalizedCountryCode).catch((error) => {
      console.warn(`GNews provider failed for ${category.slug}: ${error.message}`);
      return [];
    }),
    // Alpha Vantage market movers are broad signals and do not need to run per category.
    category.slug === "trending"
      ? fetchAlphaVantageSignal(category, normalizedCountryCode).catch((error) => {
          console.warn(`Market provider failed for ${category.slug}: ${error.message}`);
          return [];
        })
      : Promise.resolve([]),
  ]);

  const combined = [...newsItems, ...gNewsItems, ...marketItems];
  if (combined.length > 0) {
    return combined;
  }

  const rssItems = await fetchGoogleNewsRssItems(category, limit, normalizedCountryCode).catch((error) => {
    console.warn(`RSS provider failed for ${category.slug}: ${error.message}`);
    return [];
  });

  return rssItems;
}

export function getProviderUsageSnapshot() {
  const newsUsage = getProviderUsageRecord("newsapi", env.newsApiDailyRequestLimit);
  const gNewsUsage = getProviderUsageRecord("gnews", env.gNewsDailyRequestLimit);
  const alphaUsage = getProviderUsageRecord("alphavantage", env.alphaVantageDailyRequestLimit);

  return {
    dayKey: getCurrentDayKey(),
    providers: [
      {
        provider: "newsapi",
        used: newsUsage.count,
        limit: newsUsage.limit,
        remaining: Math.max(0, newsUsage.limit - newsUsage.count),
        capped: newsUsage.count >= newsUsage.limit
      },
      {
        provider: "gnews",
        used: gNewsUsage.count,
        limit: gNewsUsage.limit,
        remaining: Math.max(0, gNewsUsage.limit - gNewsUsage.count),
        capped: gNewsUsage.count >= gNewsUsage.limit
      },
      {
        provider: "alphavantage",
        used: alphaUsage.count,
        limit: alphaUsage.limit,
        remaining: Math.max(0, alphaUsage.limit - alphaUsage.count),
        capped: alphaUsage.count >= alphaUsage.limit
      }
    ],
    cacheTtlHours: env.providerCacheTtlHours
  };
}
