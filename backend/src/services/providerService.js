import crypto from "node:crypto";
import { env } from "../config/env.js";

async function fetchNewsApiItems(category, limit) {
  if (!env.newsApiKey) {
    return [];
  }

  const params = new URLSearchParams({
    q: category.newsQuery,
    language: "en",
    sortBy: "publishedAt",
    pageSize: String(limit)
  });

  const response = await fetch(`https://newsapi.org/v2/everything?${params.toString()}`, {
    headers: {
      "X-Api-Key": env.newsApiKey
    }
  });

  if (!response.ok) {
    throw new Error(`NewsAPI request failed with ${response.status}`);
  }

  const payload = await response.json();
  const articles = Array.isArray(payload.articles) ? payload.articles : [];

  return articles.map((article) => {
    const sourceUrl = article.url || "";
    const digest = crypto.createHash("sha1").update(`newsapi:${sourceUrl}`).digest("hex");

    return {
      externalId: digest,
      provider: "newsapi",
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
}

async function fetchAlphaVantageSignal(category) {
  if (!env.alphaVantageApiKey) {
    return [];
  }

  const url = `https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${env.alphaVantageApiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Alpha Vantage request failed with ${response.status}`);
  }

  const payload = await response.json();
  const gainers = Array.isArray(payload.top_gainers) ? payload.top_gainers.slice(0, 3) : [];

  return gainers.map((item, index) => {
    const ticker = item.ticker || `TICKER-${index}`;
    const externalId = crypto.createHash("sha1").update(`alphavantage:${ticker}:${new Date().toISOString().slice(0, 10)}`).digest("hex");

    return {
      externalId,
      provider: "alphavantage",
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
}

function generateMockItems(category, limit) {
  const now = new Date();
  const timeLabel = now.toISOString().slice(11, 16);
  const items = [];

  for (let index = 0; index < limit; index += 1) {
    const publishedAt = new Date(now.getTime() - index * 15 * 60 * 1000).toISOString();
    const externalId = crypto.createHash("sha1").update(`mock:${category.slug}:${index}`).digest("hex");

    items.push({
      externalId,
      provider: "mock",
      categorySlug: category.slug,
      title: `${category.displayName} live update ${index + 1} (${timeLabel})`,
      summary: `Automated seed item for ${category.displayName}. Replace with live provider keys to ingest real sources.`,
      sourceUrl: "https://example.com/mock-source",
      publishedAt,
      marketSignal: null,
      relevanceScore: 0.5,
      rawPayload: JSON.stringify({ mock: true, category: category.slug, index }),
      ingestionStatus: "ingested"
    });
  }

  return items;
}

export async function fetchSourceItemsForCategory(category, limit) {
  const [newsItems, marketItems] = await Promise.all([
    fetchNewsApiItems(category, limit).catch((error) => {
      console.warn(`News provider failed for ${category.slug}: ${error.message}`);
      return [];
    }),
    fetchAlphaVantageSignal(category).catch((error) => {
      console.warn(`Market provider failed for ${category.slug}: ${error.message}`);
      return [];
    })
  ]);

  const combined = [...newsItems, ...marketItems];
  if (combined.length > 0) {
    return combined;
  }

  // Once live provider keys are configured, avoid falling back to mock items.
  if (env.newsApiKey || env.alphaVantageApiKey) {
    return [];
  }

  return generateMockItems(category, limit);
}
