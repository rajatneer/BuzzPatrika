import { NewsCard, Article } from './NewsCard';
import { TrendingUp, Flame } from 'lucide-react';

interface NewsFeedProps {
  articles: Article[];
  isLoading: boolean;
  error: string | null;
  activeCategoryLabel: string;
  searchQuery: string;
  onRetry: () => void;
}

export function NewsFeed({
  articles,
  isLoading,
  error,
  activeCategoryLabel,
  searchQuery,
  onRetry,
}: NewsFeedProps) {
  const featuredArticle = articles[0];
  const regularArticles = articles.slice(1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold">
            Category: {activeCategoryLabel}
          </span>
          {searchQuery ? (
            <span className="px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 text-sm font-semibold">
              Search: {searchQuery}
            </span>
          ) : null}
        </div>

        {isLoading ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Flame className="w-10 h-10 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Loading Stories</h3>
            <p className="text-gray-500">Fetching latest generated updates from the pipeline.</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Flame className="w-10 h-10 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Could Not Load Latest Stories</h3>
            <p className="text-gray-500 mb-5">{error}</p>
            <button
              onClick={onRetry}
              className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
        {articles.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Flame className="w-10 h-10 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Articles Yet</h3>
            <p className="text-gray-500">Run the pipeline or adjust category/search filters to see stories.</p>
          </div>
        ) : (
          <>
            {/* Featured Article */}
            {featuredArticle && (
              <div className="mb-12">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1 h-8 bg-gradient-to-b from-orange-500 to-red-600 rounded-full" />
                  <h2 className="text-3xl font-black text-gray-900">
                    Breaking News
                  </h2>
                </div>
                <NewsCard article={featuredArticle} featured={true} />
              </div>
            )}

            {/* Latest News Section */}
            {regularArticles.length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full" />
                  <h2 className="text-3xl font-black text-gray-900">
                    Latest Updates
                  </h2>
                  <TrendingUp className="w-6 h-6 text-blue-600 ml-auto" />
                </div>

                <div className="space-y-6">
                  {regularArticles.map((article) => (
                    <NewsCard key={article.id} article={article} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
          </>
        )}
      </div>
    </div>
  );
}
