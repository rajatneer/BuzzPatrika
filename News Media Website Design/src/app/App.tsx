import { useEffect, useMemo, useState } from 'react';
import { Header, NewsCategory } from './components/Header';
import { NewsFeed } from './components/NewsFeed';
import { AdminDashboard } from './components/AdminDashboard';
import { LoginModal } from './components/LoginModal';
import { Article } from './components/NewsCard';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

const FALLBACK_ARTICLES: Article[] = [
  {
    id: '1',
    title: 'Times Now Navbharat Digital Launches High-Tech Election Coverage with Real-Time Data Analysis',
    description: 'As the 2026 Vidhan Sabha General Assembly Elections approach, the political temperature in the state has reached a fever pitch, and Times Now Navbharat has upgraded its digital platform to provide comprehensive coverage.',
    image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop',
    source: 'Buzzपत्रिका',
    date: 'April 22, 2026',
    category: 'TECH',
  },
  {
    id: '2',
    title: 'Tech Giants Announce Major AI Collaboration for 2026',
    description: 'Leading technology companies have come together to form an unprecedented alliance focused on advancing artificial intelligence research while ensuring ethical development and deployment of AI systems.',
    image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop',
    source: 'Buzzपत्रिका',
    date: 'April 23, 2026',
    category: 'TECH',
  },
  {
    id: '3',
    title: 'Global Climate Summit Reaches Historic Agreement',
    description: 'World leaders have reached a landmark agreement on climate action, committing to ambitious carbon reduction targets and substantial investments in renewable energy infrastructure across all participating nations.',
    image: 'https://images.unsplash.com/photo-1473186578172-c141e6798cf4?w=800&auto=format&fit=crop',
    source: 'Buzzपत्रिका',
    date: 'April 23, 2026',
    category: 'NEWS',
  },
];

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

interface BackendCategory {
  slug: string;
  display_name: string;
}

interface BackendStory {
  id: number;
  category: string;
  headline: string;
  summary: string;
  sourceUrl?: string | null;
  provider?: string | null;
  publishedAt?: string | null;
  sourcePublishedAt?: string | null;
}

function formatStoryDate(value?: string | null): string {
  if (!value) {
    return new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return parsedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
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

function mapStoryToArticle(story: BackendStory): Article {
  const image = CATEGORY_IMAGES[story.category] ?? CATEGORY_IMAGES.news;

  return {
    id: String(story.id),
    title: story.headline,
    description: story.summary,
    image,
    source: toProviderLabel(story.provider),
    date: formatStoryDate(story.publishedAt ?? story.sourcePublishedAt),
    category: toArticleCategory(story.category),
    sourceUrl: story.sourceUrl ?? undefined,
  };
}

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAdminView, setIsAdminView] = useState(false);
  const [articles, setArticles] = useState<Article[]>(FALLBACK_ARTICLES);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingStories, setIsLoadingStories] = useState(false);
  const [storiesError, setStoriesError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [isRefreshingStories, setIsRefreshingStories] = useState(false);

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
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setStoriesError(error instanceof Error ? error.message : 'Unknown error while loading stories.');
        setArticles((previous) => (previous.length > 0 ? previous : FALLBACK_ARTICLES));
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
  }, [refreshTick, searchQuery, selectedCategory]);

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
    const newArticle: Article = {
      ...article,
      id: Date.now().toString(),
    };
    setArticles((previous) => [newArticle, ...previous]);
  };

  const handleUpdateArticle = (id: string, updatedArticle: Omit<Article, 'id'>) => {
    setArticles((previous) => previous.map((article) =>
      article.id === id ? { ...updatedArticle, id } : article
    ));
  };

  const handleDeleteArticle = (id: string) => {
    setArticles((previous) => previous.filter((article) => article.id !== id));
  };

  const handleRefreshStories = () => {
    setIsRefreshingStories(true);
    setRefreshTick((value) => value + 1);
  };

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
        activeCategory={selectedCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCategorySelect={setSelectedCategory}
        onRefreshStories={handleRefreshStories}
        isRefreshingStories={isRefreshingStories}
      />

      {isAdminView ? (
        <AdminDashboard
          articles={articles}
          onAddArticle={handleAddArticle}
          onUpdateArticle={handleUpdateArticle}
          onDeleteArticle={handleDeleteArticle}
        />
      ) : (
        <NewsFeed
          articles={articles}
          isLoading={isLoadingStories}
          error={storiesError}
          activeCategoryLabel={activeCategoryLabel}
          searchQuery={searchQuery}
          onRetry={handleRefreshStories}
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