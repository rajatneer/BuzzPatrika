import { useCallback, useEffect, useMemo, useState } from 'react';
import { Header, NewsCategory, NewsCountry } from './components/Header';
import { NewsFeed } from './components/NewsFeed';
import { AdminDashboard } from './components/AdminDashboard';
import { LoginModal } from './components/LoginModal';
import { Article, ReadActionType } from './components/NewsCard';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (
  typeof window !== 'undefined'
    && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    && window.location.port === '5500'
    ? 'http://localhost:4000/api'
    : '/api'
);
const SITE_URL = (
  import.meta.env.VITE_SITE_URL
  ?? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5500')
).replace(/\/+$/, '');
const AUTO_REFRESH_INTERVAL_MS = 30 * 60 * 1000;
const READ_ACTION_STATS_STORAGE_KEY = 'buzzpatrika-read-action-stats-v1';

interface ReadActionCounts {
  readMore: number;
  readFullStory: number;
  lastClickedAt: string | null;
}

type ReadActionStatsMap = Record<string, ReadActionCounts>;

function mergeReadActionStats(previous: ReadActionStatsMap, incoming: ReadActionStatsMap): ReadActionStatsMap {
  const next: ReadActionStatsMap = { ...previous };

  Object.entries(incoming).forEach(([articleId, incomingStats]) => {
    const current = next[articleId] ?? {
      readMore: 0,
      readFullStory: 0,
      lastClickedAt: null,
    };

    const lastClickedAt = [current.lastClickedAt, incomingStats.lastClickedAt]
      .filter((value): value is string => typeof value === 'string')
      .sort()
      .at(-1) ?? null;

    next[articleId] = {
      readMore: Math.max(current.readMore, incomingStats.readMore),
      readFullStory: Math.max(current.readFullStory, incomingStats.readFullStory),
      lastClickedAt,
    };
  });

  return next;
}

function normalizeReadActionStats(input: unknown): ReadActionStatsMap {
  if (!input || typeof input !== 'object') {
    return {};
  }

  const parsed = input as Record<string, Partial<ReadActionCounts>>;
  const normalized: ReadActionStatsMap = {};

  Object.entries(parsed).forEach(([articleId, value]) => {
    if (!value || typeof value !== 'object') {
      return;
    }

    normalized[articleId] = {
      readMore: Math.max(0, Number(value.readMore) || 0),
      readFullStory: Math.max(0, Number(value.readFullStory) || 0),
      lastClickedAt: typeof value.lastClickedAt === 'string' ? value.lastClickedAt : null,
    };
  });

  return normalized;
}

function loadReadActionStats(): ReadActionStatsMap {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(READ_ACTION_STATS_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    return normalizeReadActionStats(JSON.parse(raw));
  } catch {
    return {};
  }
}

function slugify(value: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return normalized || 'story';
}

function upsertMetaTag(attr: 'name' | 'property', key: string, content: string): void {
  let tag = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;

  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }

  tag.setAttribute('content', content);
}

function upsertLinkTag(rel: string, href: string): void {
  let tag = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;

  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    document.head.appendChild(tag);
  }

  tag.setAttribute('href', href);
}

function upsertJsonLd(id: string, payload: unknown): void {
  let tag = document.getElementById(id) as HTMLScriptElement | null;

  if (!tag) {
    tag = document.createElement('script');
    tag.id = id;
    tag.type = 'application/ld+json';
    document.head.appendChild(tag);
  }

  tag.textContent = JSON.stringify(payload);
}

const CATEGORY_IMAGES: Record<string, string> = {
  trending: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop',
  business: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop',
  tech: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop',
  startup: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&auto=format&fit=crop',
  entertainment: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop',
  'social-media': 'https://images.unsplash.com/photo-1611262588024-d12430b98920?w=800&auto=format&fit=crop',
  sports: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop',
  news: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&auto=format&fit=crop',
};

const COUNTRY_OPTIONS: NewsCountry[] = [
  { code: 'in', label: 'India' },
  { code: 'us', label: 'United States' },
  { code: 'gb', label: 'United Kingdom' },
  { code: 'au', label: 'Australia' },
  { code: 'ca', label: 'Canada' },
  { code: 'ae', label: 'UAE' },
  { code: 'sg', label: 'Singapore' },
];

interface BackendCategory {
  slug: string;
  display_name: string;
}

interface BackendStory {
  id: number;
  slug?: string | null;
  category: string;
  headline: string;
  summary: string;
  authorName?: string | null;
  organizationName?: string | null;
  updatedAt?: string | null;
  location?: string | null;
  sourceCredibilityScore?: number | null;
  featuredMediaUrl?: string | null;
  featured_media_url?: string | null;
  tags?: string[];
  countryCode?: string | null;
  sourceUrl?: string | null;
  provider?: string | null;
  publishedAt?: string | null;
  sourcePublishedAt?: string | null;
}

function formatStoryDate(value?: string | null): string {
  if (!value) {
    return new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  return parsedDate.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function toProviderLabel(provider?: string | null): string {
  if (!provider) {
    return 'Buzzपत्रिका';
  }

  return provider
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function toArticleCategory(categorySlug: string): string {
  return categorySlug.replace(/-/g, ' ').toUpperCase();
}

function getCountryLabel(countryCode?: string | null): string {
  if (!countryCode) {
    return 'India';
  }

  const normalized = countryCode.toLowerCase();
  const country = COUNTRY_OPTIONS.find((item) => item.code === normalized);
  return country?.label ?? normalized.toUpperCase();
}

function sanitizeSourceUrl(sourceUrl?: string | null, provider?: string | null): string | undefined {
  const rawUrl = String(sourceUrl || '').trim();
  if (!rawUrl) {
    return undefined;
  }

  // AlphaVantage entries are market snapshots and only expose a generic homepage link.
  if (String(provider || '').toLowerCase() === 'alphavantage') {
    return undefined;
  }

  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');

    if (hostname === 'alphavantage.co') {
      return undefined;
    }

    return rawUrl;
  } catch {
    return undefined;
  }
}

function mapStoryToArticle(story: BackendStory): Article {
  const sourceImage = story.featuredMediaUrl || story.featured_media_url;
  const isRepresentativeImage = !sourceImage;
  const image = sourceImage || CATEGORY_IMAGES[story.category] || CATEGORY_IMAGES.news;
  const providerLabel = toProviderLabel(story.provider);
  const publishedAt = story.publishedAt ?? story.sourcePublishedAt ?? new Date().toISOString();
  const updatedAt = story.updatedAt ?? publishedAt;
  const normalizedTags = Array.isArray(story.tags)
    ? story.tags.map((tag) => String(tag).toLowerCase()).filter(Boolean)
    : [];
  const tags = normalizedTags.length > 0
    ? normalizedTags
    : [story.category, story.provider ?? 'news', story.countryCode ?? 'in'].map((tag) => String(tag).toLowerCase());
  const sourceCredibilityScore = Number.isFinite(Number(story.sourceCredibilityScore))
    ? Math.max(0, Math.min(1, Number(story.sourceCredibilityScore)))
    : 0.65;
  const slug = story.slug && story.slug.trim().length > 0
    ? story.slug
    : `${slugify(story.headline)}-${story.id}`;

  return {
    id: String(story.id),
    slug,
    title: story.headline,
    description: story.summary,
    image,
    source: toProviderLabel(story.provider),
    author: story.authorName?.trim() || `${providerLabel} Desk`,
    organization: story.organizationName?.trim() || providerLabel,
    date: formatStoryDate(publishedAt),
    publishedAt,
    updatedAt,
    category: toArticleCategory(story.category),
    tags,
    location: story.location ?? getCountryLabel(story.countryCode),
    sourceCredibilityScore,
    sourceUrl: sanitizeSourceUrl(story.sourceUrl, story.provider),
    isRepresentativeImage,
  };
}

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAdminView, setIsAdminView] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('in');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingStories, setIsLoadingStories] = useState(false);
  const [storiesError, setStoriesError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [isRefreshingStories, setIsRefreshingStories] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date>(new Date());
  const [readActionStats, setReadActionStats] = useState<ReadActionStatsMap>(() => loadReadActionStats());

  const lastUpdatedLabel = useMemo(() => (
    lastUpdatedAt.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  ), [lastUpdatedAt]);

  const activeCategoryLabel = useMemo(() => {
    if (!selectedCategory) {
      return 'All';
    }

    const category = categories.find((item) => item.slug === selectedCategory);
    if (category) {
      return category.displayName;
    }

    return selectedCategory;
  }, [categories, selectedCategory]);

  const activeCountryLabel = useMemo(() => {
    const country = COUNTRY_OPTIONS.find((item) => item.code === selectedCountry);
    return country?.label ?? 'India';
  }, [selectedCountry]);

  useEffect(() => {
    const sectionLabel = selectedCategory ? `${activeCategoryLabel} news` : 'latest news';
    const title = `${activeCountryLabel} ${sectionLabel} | BuzzPatrika`;
    const description = `Read ${sectionLabel} from ${activeCountryLabel}. Browse verified stories with tags, authors, location data, and source credibility scores.`;
    const keywordPool = Array.from(new Set([
      'buzzpatrika',
      'news',
      activeCountryLabel.toLowerCase(),
      activeCategoryLabel.toLowerCase(),
      ...articles.flatMap((article) => article.tags).slice(0, 20),
    ])).join(', ');

    const query = new URLSearchParams({ country: selectedCountry });
    if (selectedCategory) {
      query.set('category', selectedCategory);
    }

    if (searchQuery.trim()) {
      query.set('q', searchQuery.trim());
    }

    const canonicalUrl = `${SITE_URL}/index.html?${query.toString()}`;

    document.title = title;
    upsertMetaTag('name', 'description', description);
    upsertMetaTag('name', 'keywords', keywordPool);
    upsertMetaTag('name', 'robots', 'index, follow, max-image-preview:large');
    upsertMetaTag('property', 'og:title', title);
    upsertMetaTag('property', 'og:description', description);
    upsertMetaTag('property', 'og:type', 'website');
    upsertMetaTag('property', 'og:url', canonicalUrl);
    upsertMetaTag('property', 'og:site_name', 'BuzzPatrika');
    upsertMetaTag('name', 'twitter:card', 'summary_large_image');
    upsertMetaTag('name', 'twitter:title', title);
    upsertMetaTag('name', 'twitter:description', description);
    upsertLinkTag('canonical', canonicalUrl);

    const itemListElement = articles.slice(0, 15).map((article, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'NewsArticle',
        headline: article.title,
        description: article.description,
        datePublished: article.publishedAt,
        dateModified: article.updatedAt,
        author: {
          '@type': 'Person',
          name: article.author,
        },
        publisher: {
          '@type': 'Organization',
          name: article.organization,
        },
        image: [article.image],
        keywords: article.tags.join(', '),
        articleSection: article.category,
        contentLocation: article.location
          ? {
            '@type': 'Place',
            name: article.location,
          }
          : undefined,
        url: `${SITE_URL}/index.html?slug=${encodeURIComponent(article.slug)}`,
      },
    }));

    upsertJsonLd('buzzpatrika-seo-jsonld', {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          name: 'BuzzPatrika',
          url: `${SITE_URL}/index.html`,
          inLanguage: 'en',
          potentialAction: {
            '@type': 'SearchAction',
            target: `${SITE_URL}/index.html?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        },
        {
          '@type': 'CollectionPage',
          name: title,
          description,
          url: canonicalUrl,
          inLanguage: 'en',
        },
        {
          '@type': 'ItemList',
          name: `${activeCountryLabel} news list`,
          numberOfItems: itemListElement.length,
          itemListElement,
        },
      ],
    });
  }, [activeCategoryLabel, activeCountryLabel, articles, searchQuery, selectedCategory, selectedCountry]);

  useEffect(() => {
    let isActive = true;

    const loadCategories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/categories`);
        if (!response.ok) {
          throw new Error(`Failed to load categories (${response.status})`);
        }

        const payload = await response.json() as { categories?: BackendCategory[] };
        const nextCategories = (payload.categories ?? []).map((category) => ({
          slug: category.slug,
          displayName: category.display_name,
        }));

        if (isActive) {
          setCategories(nextCategories);
        }
      } catch (_error) {
        if (isActive) {
          setCategories([
            { slug: 'trending', displayName: 'Trending' },
            { slug: 'business', displayName: 'Business' },
            { slug: 'tech', displayName: 'Tech' },
            { slug: 'news', displayName: 'News' },
          ]);
        }
      }
    };

    loadCategories();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    const timerId = window.setTimeout(async () => {
      try {
        setIsLoadingStories(true);
        setStoriesError(null);

        const params = new URLSearchParams({
          status: 'published',
          limit: '30',
          country: selectedCountry,
        });

        if (selectedCategory) {
          params.set('category', selectedCategory);
        }

        const q = searchQuery.trim();
        if (q) {
          params.set('q', q);
        }

        const response = await fetch(`${API_BASE_URL}/stories?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to load stories (${response.status})`);
        }

        const payload = await response.json() as { stories?: BackendStory[] };
        const nextArticles = (payload.stories ?? []).map(mapStoryToArticle);

        if (isActive) {
          setArticles(nextArticles);
          setLastUpdatedAt(new Date());
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setStoriesError(error instanceof Error ? error.message : 'Unknown error while loading stories.');
        setArticles((previous) => (previous.length > 0 ? previous : []));
      } finally {
        if (isActive) {
          setIsLoadingStories(false);
          setIsRefreshingStories(false);
        }
      }
    }, 250);

    return () => {
      isActive = false;
      controller.abort();
      window.clearTimeout(timerId);
    };
  }, [refreshTick, searchQuery, selectedCategory, selectedCountry]);

  const handleLogin = (username: string, password: string) => {
    void username;
    void password;
    setIsAdmin(true);
    setIsLoginModalOpen(false);
    setIsAdminView(true);
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setIsAdminView(false);
  };

  const handleAddArticle = (article: Omit<Article, 'id'>) => {
    const nowIso = new Date().toISOString();
    const newArticle: Article = {
      ...article,
      id: Date.now().toString(),
      slug: article.slug || `${slugify(article.title)}-${Date.now().toString().slice(-6)}`,
      publishedAt: article.publishedAt || nowIso,
      updatedAt: article.updatedAt || nowIso,
      tags: article.tags.length > 0 ? article.tags : ['news', 'latest'],
      sourceCredibilityScore: Math.max(0, Math.min(1, article.sourceCredibilityScore)),
    };
    setArticles((previous) => [newArticle, ...previous]);
  };

  const handleUpdateArticle = (id: string, updatedArticle: Omit<Article, 'id'>) => {
    const nowIso = new Date().toISOString();
    setArticles((previous) => previous.map((article) =>
      article.id === id
        ? {
          ...updatedArticle,
          id,
          updatedAt: nowIso,
          date: formatStoryDate(updatedArticle.publishedAt || nowIso),
          sourceCredibilityScore: Math.max(0, Math.min(1, updatedArticle.sourceCredibilityScore)),
        }
        : article
    ));
  };

  const handleDeleteArticle = (id: string) => {
    setArticles((previous) => previous.filter((article) => article.id !== id));
  };

  const handleRefreshStories = useCallback(() => {
    setIsRefreshingStories(true);

    const runRefresh = async () => {
      try {
        const payload: { country: string; category?: string } = { country: selectedCountry };
        if (selectedCategory) {
          payload.category = selectedCategory;
        }

        const response = await fetch(`${API_BASE_URL}/pipeline/run`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Failed to refresh stories (${response.status})`);
        }
      } catch (error) {
        setStoriesError(error instanceof Error ? error.message : 'Failed to refresh stories.');
      } finally {
        setRefreshTick((value) => value + 1);
      }
    };

    void runRefresh();
  }, [selectedCategory, selectedCountry]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setIsRefreshingStories(true);
      setRefreshTick((value) => value + 1);
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadReadStats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/analytics/read-stats`);
        if (!response.ok) {
          return;
        }

        const payload = await response.json() as { stats?: unknown };
        const stats = normalizeReadActionStats(payload.stats);

        if (isMounted) {
          setReadActionStats((previous) => mergeReadActionStats(previous, stats));
        }
      } catch {
        // Local Node API does not expose analytics endpoints yet; keep local fallback state.
      }
    };

    void loadReadStats();
    const intervalId = window.setInterval(loadReadStats, 60 * 1000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(READ_ACTION_STATS_STORAGE_KEY, JSON.stringify(readActionStats));
  }, [readActionStats]);

  const trackReadActionOnApi = useCallback(async (articleId: string, action: ReadActionType) => {
    const storyId = Number(articleId);
    if (!Number.isFinite(storyId) || storyId <= 0) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/analytics/read-click`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyId,
          action,
        }),
        keepalive: true,
      });

      if (!response.ok) {
        return;
      }

      const payload = await response.json() as { storyId?: number | string; stats?: unknown };
      const storyKey = payload.storyId !== undefined ? String(payload.storyId) : articleId;
      const normalized = normalizeReadActionStats({ [storyKey]: payload.stats });
      const nextStats = normalized[storyKey];

      if (!nextStats) {
        return;
      }

      setReadActionStats((previous) => ({
        ...previous,
        [storyKey]: nextStats,
      }));
    } catch {
      // Keep optimistic UI count when analytics endpoint is unavailable.
    }
  }, []);

  const handleReadActionClick = useCallback((articleId: string, action: ReadActionType) => {
    setReadActionStats((previous) => {
      const current = previous[articleId] ?? {
        readMore: 0,
        readFullStory: 0,
        lastClickedAt: null,
      };

      const next = {
        ...current,
        lastClickedAt: new Date().toISOString(),
      };

      if (action === 'read-more') {
        next.readMore += 1;
      } else {
        next.readFullStory += 1;
      }

      const updated = {
        ...previous,
        [articleId]: next,
      };

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(READ_ACTION_STATS_STORAGE_KEY, JSON.stringify(updated));
      }

      return updated;
    });

    void trackReadActionOnApi(articleId, action);
  }, [trackReadActionOnApi]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        isAdmin={isAdmin}
        onLoginClick={() => setIsLoginModalOpen(true)}
        onLogoutClick={handleLogout}
        onAdminDashboard={() => setIsAdminView(true)}
        onHomeClick={() => setIsAdminView(false)}
        isAdminView={isAdminView}
        categories={categories}
        countries={COUNTRY_OPTIONS}
        activeCategory={selectedCategory}
        activeCountry={selectedCountry}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCategorySelect={setSelectedCategory}
        onCountrySelect={setSelectedCountry}
        onRefreshStories={handleRefreshStories}
        isRefreshingStories={isRefreshingStories}
        lastUpdatedLabel={lastUpdatedLabel}
      />

      {isAdminView ? (
        <AdminDashboard
          articles={articles}
          onAddArticle={handleAddArticle}
          onUpdateArticle={handleUpdateArticle}
          onDeleteArticle={handleDeleteArticle}
          apiBaseUrl={API_BASE_URL}
          readActionStats={readActionStats}
        />
      ) : (
        <NewsFeed
          articles={articles}
          isLoading={isLoadingStories}
          error={storiesError}
          activeCategoryLabel={activeCategoryLabel}
          activeCountryLabel={activeCountryLabel}
          searchQuery={searchQuery}
          onRetry={handleRefreshStories}
          onReadActionClick={handleReadActionClick}
        />
      )}

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleLogin}
      />

      {/* Footer */}
      <footer className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="text-2xl font-black mb-3">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">Buzz</span>
                <span className="text-white">पत्रिका</span>
              </div>
              <p className="text-gray-400 text-sm">
                Your trusted source for breaking news and daily updates.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-3">Quick Links</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <p className="hover:text-white transition-colors cursor-pointer">About Us</p>
                <p className="hover:text-white transition-colors cursor-pointer">Contact</p>
                <p className="hover:text-white transition-colors cursor-pointer">Privacy Policy</p>
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-3">Categories</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <p className="hover:text-white transition-colors cursor-pointer">Technology</p>
                <p className="hover:text-white transition-colors cursor-pointer">Business</p>
                <p className="hover:text-white transition-colors cursor-pointer">Entertainment</p>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 text-center">
            <p className="text-gray-400 text-sm">
              © 2026 Buzzपत्रिका. All rights reserved. Made with passion for news.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}