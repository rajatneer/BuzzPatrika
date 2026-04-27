import { useState } from 'react';
import { Plus, Edit, Trash2, Save, X, FileText, Image as ImageIcon, Tag } from 'lucide-react';
import { Article } from './NewsCard';

interface AdminDashboardProps {
  articles: Article[];
  onAddArticle: (article: Omit<Article, 'id'>) => void;
  onUpdateArticle: (id: string, article: Omit<Article, 'id'>) => void;
  onDeleteArticle: (id: string) => void;
}

export function AdminDashboard({ articles, onAddArticle, onUpdateArticle, onDeleteArticle }: AdminDashboardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image: '',
    source: 'BuzzPatrika',
    category: 'NEWS',
  });

  const categories = ['TRENDING', 'CONTENT', 'STARTUP', 'BUSINESS', 'ENTERTAINMENT', 'EDTECH', 'SOCIAL MEDIA', 'SPORTS', 'TECH', 'NEWS', 'EVENTS', 'PODCAST', 'LIVE'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const articleData = {
      ...formData,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-xl text-white shadow-lg">
              <p className="text-blue-100 text-sm font-medium mb-1">Total Articles</p>
              <p className="text-3xl font-bold">{articles.length}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-5 rounded-xl text-white shadow-lg">
              <p className="text-green-100 text-sm font-medium mb-1">Published Today</p>
              <p className="text-3xl font-bold">{articles.filter(a => a.date === new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })).length}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-5 rounded-xl text-white shadow-lg">
              <p className="text-purple-100 text-sm font-medium mb-1">Categories</p>
              <p className="text-3xl font-bold">{new Set(articles.map(a => a.category)).size}</p>
            </div>
          </div>
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
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
