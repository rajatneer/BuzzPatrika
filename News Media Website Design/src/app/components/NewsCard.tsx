import { Clock, ArrowRight, TrendingUp } from 'lucide-react';

export interface Article {
  id: string;
  title: string;
  description: string;
  image: string;
  source: string;
  date: string;
  category: string;
  sourceUrl?: string;
}

interface NewsCardProps {
  article: Article;
  featured?: boolean;
}

export function NewsCard({ article, featured = false }: NewsCardProps) {
  const readAction = article.sourceUrl ? (
    <a
      href={article.sourceUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 text-white font-medium group-hover:gap-3 transition-all"
    >
      Read Full Story
      <ArrowRight className="w-4 h-4" />
    </a>
  ) : (
    <button className="inline-flex items-center gap-2 text-white font-medium group-hover:gap-3 transition-all">
      Read Full Story
      <ArrowRight className="w-4 h-4" />
    </button>
  );

  const readMoreAction = article.sourceUrl ? (
    <a
      href={article.sourceUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-sm text-red-600 font-semibold group-hover:gap-2.5 transition-all"
    >
      Read More
      <ArrowRight className="w-4 h-4" />
    </a>
  ) : (
    <button className="inline-flex items-center gap-1.5 text-sm text-red-600 font-semibold group-hover:gap-2.5 transition-all">
      Read More
      <ArrowRight className="w-4 h-4" />
    </button>
  );

  if (featured) {
    return (
      <article className="group bg-white rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
        <div className="relative h-96 overflow-hidden">
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="absolute top-4 left-4">
            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-full text-xs font-semibold shadow-lg">
              <TrendingUp className="w-3 h-3" />
              Featured
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-center gap-2 text-white/90 text-xs mb-3">
              <span className="px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full font-medium">
                {article.category}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {article.date}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 line-clamp-2">
              {article.title}
            </h2>
            <p className="text-white/90 text-sm line-clamp-2 mb-4">
              {article.description}
            </p>
            {readAction}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300">
      <div className="flex flex-col sm:flex-row h-full">
        {/* Image */}
        <div className="sm:w-72 h-56 sm:h-auto flex-shrink-0 overflow-hidden">
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>

        {/* Content */}
        <div className="flex-1 p-5 sm:p-6 flex flex-col">
          <div className="flex items-center gap-2 text-xs mb-3">
            <span className="px-2.5 py-1 bg-gradient-to-r from-orange-100 to-red-100 text-red-700 rounded-full font-semibold">
              {article.category}
            </span>
            <span className="flex items-center gap-1 text-gray-500">
              <Clock className="w-3 h-3" />
              {article.date}
            </span>
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-red-600 transition-colors">
            {article.title}
          </h3>

          <p className="text-gray-600 text-sm line-clamp-3 mb-4 flex-1">
            {article.description}
          </p>

          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500 font-medium">{article.source}</span>
            {readMoreAction}
          </div>
        </div>
      </div>
    </article>
  );
}
