import { useEffect, useMemo, useState } from 'react';
import { Plus, Edit, Trash2, Save, X, FileText, Image as ImageIcon, Tag, BarChart3 } from 'lucide-react';
import { Article } from './NewsCard';

function slugify(value: string): string {
  const normalized = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return normalized || 'story';
}

interface AdminDashboardProps {
  articles: Article[];
  onAddArticle: (article: Omit<Article, 'id'>) => void;
  onUpdateArticle: (id: string, article: Omit<Article, 'id'>) => void;
  onDeleteArticle: (id: string) => void;
  apiBaseUrl: string;
}

interface ProviderUsageItem {
  provider: string;
  used: number;
  limit: number;
  remaining: number;
  capped: boolean;
}

function getSourceDomain(url?: string): string {
  if (!url) {
    return 'N/A';
  }

  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'N/A';
  }
}

function estimateReadMinutes(text: string): number {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

function articleAgeHours(publishedAt: string): number {
  const then = new Date(publishedAt).getTime();
  if (Number.isNaN(then)) {
    return 0;
  }

  const diffMs = Math.max(0, Date.now() - then);
  return Math.round(diffMs / (1000 * 60 * 60));
}

function formatDateTime(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function isSameLocalDay(isoValue: string, compareDate: Date): boolean {
  const parsed = new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed.toDateString() === compareDate.toDateString();
}

export function AdminDashboard({ articles, onAddArticle, onUpdateArticle, onDeleteArticle, apiBaseUrl }: AdminDashboardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedInsightId, setSelectedInsightId] = useState<string | null>(null);
  const [providerUsage, setProviderUsage] = useState<ProviderUsageItem[]>([]);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image: '',
    source: 'BuzzPatrika',
    author: 'BuzzPatrika Desk',
    organization: 'BuzzPatrika',
    tags: 'news, latest, update',
    location: 'India',
    sourceCredibilityScore: 0.72,
    category: 'NEWS',
  });

  const categories = ['TRENDING', 'CONTENT', 'STARTUP', 'BUSINESS', 'ENTERTAINMENT', 'EDTECH', 'SOCIAL MEDIA', 'SPORTS', 'TECH', 'NEWS', 'EVENTS', 'PODCAST', 'LIVE'];

  const averageCredibility = useMemo(() => {
    if (articles.length === 0) {
      return 0;
    }

    const total = articles.reduce((sum, article) => sum + Math.max(0, Math.min(1, article.sourceCredibilityScore)), 0);
    return Math.round((total / articles.length) * 100);
  }, [articles]);

  const usagePercent = useMemo(() => {
    if (providerUsage.length === 0) {
      return 0;
    }

    const totalUsed = providerUsage.reduce((sum, item) => sum + item.used, 0);
    const totalLimit = providerUsage.reduce((sum, item) => sum + item.limit, 0);
    if (totalLimit === 0) {
      return 0;
    }

    return Math.round((totalUsed / totalLimit) * 100);
  }, [providerUsage]);

  const usageProvidersLabel = useMemo(() => {
    if (providerUsage.length === 0) {
      return 'No provider data';
    }

    return providerUsage.map((item) => item.provider).join(' + ');
  }, [providerUsage]);

  useEffect(() => {
    let isMounted = true;

    const loadProviderUsage = async () => {
      try {
        setIsLoadingUsage(true);
        setUsageError(null);
        const response = await fetch(`${apiBaseUrl}/provider-usage`);

        if (!response.ok) {
          throw new Error(`Failed to load provider usage (${response.status})`);
        }

        const payload = await response.json() as { providers?: ProviderUsageItem[] };
        if (isMounted) {
          setProviderUsage(Array.isArray(payload.providers) ? payload.providers : []);
        }
      } catch (error) {
        if (isMounted) {
          setUsageError(error instanceof Error ? error.message : 'Failed to load provider usage');
          setProviderUsage([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingUsage(false);
        }
      }
    };

    loadProviderUsage();
    const intervalId = window.setInterval(loadProviderUsage, 60 * 1000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [apiBaseUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const now = new Date();
    const nowIso = now.toISOString();

    const articleData = {
      ...formData,
      slug: `${slugify(formData.title)}-${Date.now().toString().slice(-6)}`,
      date: formatDateTime(now),
      publishedAt: nowIso,
      updatedAt: nowIso,
      tags: formData.tags
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    };

    if (editingId) {
      onUpdateArticle(editingId, articleData);
    } else {
      onAddArticle(articleData);
    }

    setFormData({
      title: '',
      description: '',
      image: '',
      source: 'Buzzपत्रिका',
      author: 'BuzzPatrika Desk',
      organization: 'BuzzPatrika',
      tags: 'news, latest, update',
      location: 'India',
      sourceCredibilityScore: 0.72,
      category: 'NEWS',
    });
    setIsEditing(false);
    setEditingId(null);
  };

  const handleEdit = (article: Article) => {
    setFormData({
      title: article.title,
      description: article.description,
      image: article.image,
      source: article.source,
      author: article.author,
      organization: article.organization,
      tags: article.tags.join(', '),
      location: article.location || 'India',
      sourceCredibilityScore: article.sourceCredibilityScore,
      category: article.category,
    });
    setEditingId(article.id);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData({
      title: '',
      description: '',
      image: '',
      source: 'Buzzपत्रिका',
      author: 'BuzzPatrika Desk',
      organization: 'BuzzPatrika',
      tags: 'news, latest, update',
      location: 'India',
      sourceCredibilityScore: 0.72,
      category: 'NEWS',
    });
    setIsEditing(false);
    setEditingId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1 h-12 bg-gradient-to-b from-orange-500 to-red-600 rounded-full" />
            <div>
              <h1 className="text-4xl font-black text-gray-900">Content Manager</h1>
              <p className="text-gray-500 font-medium">Create and manage your news articles</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-xl text-white shadow-lg">
              <p className="text-blue-100 text-sm font-medium mb-1">Total Articles</p>
              <p className="text-3xl font-bold">{articles.length}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-5 rounded-xl text-white shadow-lg">
              <p className="text-green-100 text-sm font-medium mb-1">Published Today</p>
              <p className="text-3xl font-bold">{articles.filter((article) => isSameLocalDay(article.publishedAt, new Date())).length}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-5 rounded-xl text-white shadow-lg">
              <p className="text-purple-100 text-sm font-medium mb-1">Categories</p>
              <p className="text-3xl font-bold">{new Set(articles.map(a => a.category)).size}</p>
            </div>
            <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 p-5 rounded-xl text-white shadow-lg">
              <p className="text-cyan-100 text-sm font-medium mb-1">Avg Credibility</p>
              <p className="text-3xl font-bold">{averageCredibility}%</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-5 rounded-xl text-white shadow-lg">
              <p className="text-amber-100 text-sm font-medium mb-1">Daily API Usage</p>
              <p className="text-3xl font-bold">{usagePercent}%</p>
              <p className="text-[11px] text-amber-100 mt-1">{isLoadingUsage ? 'Refreshing…' : usageProvidersLabel}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-slate-700" />
              <h2 className="text-lg font-bold text-slate-900">Daily API Limit Dashboard</h2>
            </div>
            <span className="text-xs text-slate-500">Auto refresh: 60s</span>
          </div>

          {usageError ? (
            <p className="text-sm text-red-600">{usageError}</p>
          ) : providerUsage.length === 0 ? (
            <p className="text-sm text-slate-500">No provider usage data yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {providerUsage.map((item) => {
                const percent = item.limit > 0 ? Math.min(100, Math.round((item.used / item.limit) * 100)) : 0;
                return (
                  <div key={item.provider} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-slate-800">{item.provider}</p>
                      <p className={`text-xs font-semibold ${item.capped ? 'text-red-600' : 'text-emerald-600'}`}>
                        {item.used}/{item.limit}
                      </p>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden mb-2">
                      <div
                        className={`h-full ${item.capped ? 'bg-red-500' : 'bg-emerald-500'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500">Remaining today: {item.remaining}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add/Edit Form */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {editingId ? 'Edit Article' : 'Create New Article'}
                  </h2>
                  <p className="text-white/90 text-sm">Fill in the details below</p>
                </div>
              </div>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white text-orange-600 rounded-xl hover:bg-gray-100 transition-colors font-semibold shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                  New Article
                </button>
              ) : (
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-colors font-semibold"
                >
                  <X className="w-5 h-5" />
                  Cancel
                </button>
              )}
            </div>
          </div>

          {isEditing && (
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <FileText className="w-4 h-4" />
                  Article Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 transition-colors"
                  placeholder="Enter a compelling headline"
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <FileText className="w-4 h-4" />
                  Article Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 transition-colors min-h-32 resize-none"
                  placeholder="Write a detailed description of the article"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <Tag className="w-4 h-4" />
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 transition-colors"
                    required
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <FileText className="w-4 h-4" />
                    Source
                  </label>
                  <input
                    type="text"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 transition-colors"
                    placeholder="Buzzपत्रिका"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <FileText className="w-4 h-4" />
                    Author
                  </label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 transition-colors"
                    placeholder="BuzzPatrika Desk"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <FileText className="w-4 h-4" />
                    Organization
                  </label>
                  <input
                    type="text"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 transition-colors"
                    placeholder="BuzzPatrika"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <Tag className="w-4 h-4" />
                    Tags / Keywords
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 transition-colors"
                    placeholder="politics, finance, tech"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <FileText className="w-4 h-4" />
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 transition-colors"
                    placeholder="India"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <FileText className="w-4 h-4" />
                  Source Credibility Score (0 to 1)
                </label>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={formData.sourceCredibilityScore}
                  onChange={(e) => setFormData({ ...formData, sourceCredibilityScore: Number(e.target.value) })}
                  className="w-full sm:w-56 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <ImageIcon className="w-4 h-4" />
                  Image URL *
                </label>
                <input
                  type="url"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 transition-colors"
                  placeholder="https://example.com/image.jpg"
                  required
                />
                {formData.image && (
                  <div className="mt-3 rounded-xl overflow-hidden border-2 border-gray-200">
                    <img src={formData.image} alt="Preview" className="w-full h-48 object-cover" />
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all font-semibold shadow-lg text-lg"
              >
                <Save className="w-5 h-5" />
                {editingId ? 'Update Article' : 'Publish Article'}
              </button>
            </form>
          )}
      </div>

        {/* Articles List */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6">
            <h2 className="text-2xl font-bold text-white">Published Articles ({articles.length})</h2>
            <p className="text-gray-300 text-sm mt-1">Manage all your published content</p>
          </div>

          <div className="divide-y divide-gray-100">
            {articles.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">No articles published yet</p>
                <p className="text-gray-400 text-sm mt-1">Create your first article above to get started</p>
              </div>
            ) : (
              articles.map((article) => (
                <div key={article.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full sm:w-40 h-40 object-cover rounded-xl"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <span className="inline-block px-3 py-1 bg-gradient-to-r from-orange-100 to-red-100 text-red-700 rounded-full text-xs font-semibold mb-2">
                            {article.category}
                          </span>
                          <h3 className="font-bold text-lg text-gray-900 mb-1">{article.title}</h3>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">{article.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="font-medium">{article.source}</span>
                            <span>•</span>
                            <span>{article.date}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex sm:flex-col gap-2">
                      <button
                        onClick={() => setSelectedInsightId((prev) => (prev === article.id ? null : article.id))}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 text-white rounded-xl hover:bg-slate-800 transition-colors font-medium shadow-md"
                      >
                        <BarChart3 className="w-4 h-4" />
                        <span>Insights</span>
                      </button>
                      <button
                        onClick={() => handleEdit(article)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium shadow-md"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this article?')) {
                            onDeleteArticle(article.id);
                          }
                        }}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium shadow-md"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>

                  {selectedInsightId === article.id ? (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <h4 className="text-sm font-bold text-slate-800 mb-3">Article Insights</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="rounded-lg bg-white p-3 border border-slate-100">
                          <p className="text-xs text-slate-500">Credibility</p>
                          <p className="text-lg font-bold text-slate-900">{Math.round(Math.max(0, Math.min(1, article.sourceCredibilityScore)) * 100)}%</p>
                        </div>
                        <div className="rounded-lg bg-white p-3 border border-slate-100">
                          <p className="text-xs text-slate-500">Age</p>
                          <p className="text-lg font-bold text-slate-900">{articleAgeHours(article.publishedAt)}h</p>
                        </div>
                        <div className="rounded-lg bg-white p-3 border border-slate-100">
                          <p className="text-xs text-slate-500">Read Time</p>
                          <p className="text-lg font-bold text-slate-900">{estimateReadMinutes(article.description)} min</p>
                        </div>
                        <div className="rounded-lg bg-white p-3 border border-slate-100">
                          <p className="text-xs text-slate-500">Tags</p>
                          <p className="text-lg font-bold text-slate-900">{article.tags.length}</p>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600">
                        <div className="rounded-lg bg-white p-3 border border-slate-100">
                          <p className="font-semibold text-slate-700 mb-1">Source Domain</p>
                          <p>{getSourceDomain(article.sourceUrl)}</p>
                        </div>
                        <div className="rounded-lg bg-white p-3 border border-slate-100">
                          <p className="font-semibold text-slate-700 mb-1">Updated</p>
                          <p>{new Date(article.updatedAt).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
