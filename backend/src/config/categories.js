export const CATEGORY_CONFIG = [
  {
    slug: "trending",
    displayName: "Trending",
    newsQuery: "trending india media startups technology",
    marketSymbols: ["NIFTY", "SENSEX"]
  },
  {
    slug: "business",
    displayName: "Business",
    newsQuery: "business india markets economy companies",
    marketSymbols: ["NIFTY", "BANKNIFTY", "HDFCBANK.BSE"]
  },
  {
    slug: "tech",
    displayName: "Tech",
    newsQuery: "technology AI startups product launches india",
    marketSymbols: ["TCS.BSE", "INFY.BSE", "WIPRO.BSE"]
  },
  {
    slug: "startup",
    displayName: "Startup",
    newsQuery: "startup funding venture capital india",
    marketSymbols: ["NIFTY"]
  },
  {
    slug: "entertainment",
    displayName: "Entertainment",
    newsQuery: "entertainment OTT cinema media india",
    marketSymbols: ["NIFTY"]
  },
  {
    slug: "social-media",
    displayName: "Social Media",
    newsQuery: "social media creator economy platform policy india",
    marketSymbols: ["NIFTY"]
  },
  {
    slug: "sports",
    displayName: "Sports",
    newsQuery: "sports cricket football leagues india",
    marketSymbols: ["NIFTY"]
  },
  {
    slug: "news",
    displayName: "News",
    newsQuery: "india breaking news policy updates",
    marketSymbols: ["NIFTY", "SENSEX"]
  }
];

export function getCategoryBySlug(slug) {
  return CATEGORY_CONFIG.find((category) => category.slug === slug) || null;
}
