import { Search, Menu, X, LogIn, LogOut, Newspaper, RefreshCw, Globe2 } from 'lucide-react';
import { useState } from 'react';

export interface NewsCategory {
  slug: string;
  displayName: string;
}

export interface NewsCountry {
  code: string;
  label: string;
}

interface HeaderProps {
  isAdmin: boolean;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onAdminDashboard: () => void;
  onHomeClick: () => void;
  isAdminView: boolean;
  categories: NewsCategory[];
  countries: NewsCountry[];
  activeCategory: string | null;
  activeCountry: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onCategorySelect: (slug: string | null) => void;
  onCountrySelect: (countryCode: string) => void;
  onRefreshStories: () => void;
  isRefreshingStories: boolean;
  lastUpdatedLabel: string;
}

export function Header({
  isAdmin,
  onLoginClick,
  onLogoutClick,
  onAdminDashboard,
  onHomeClick,
  isAdminView,
  categories,
  countries,
  activeCategory,
  activeCountry,
  searchQuery,
  onSearchChange,
  onCategorySelect,
  onCountrySelect,
  onRefreshStories,
  isRefreshingStories,
  lastUpdatedLabel,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const displayCategories = categories.length > 0
    ? categories
    : [
      { slug: 'trending', displayName: 'Trending' },
      { slug: 'business', displayName: 'Business' },
      { slug: 'tech', displayName: 'Tech' },
      { slug: 'news', displayName: 'News' },
    ];

  return (
    <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Header */}
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <button onClick={onHomeClick} className="flex items-center gap-3 group">
            <div className="bg-gradient-to-br from-orange-500 to-red-600 p-2 rounded-lg group-hover:scale-110 transition-transform">
              <Newspaper className="w-6 h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <div className="text-2xl font-black tracking-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">Buzz</span>
                <span className="text-white">पत्रिका</span>
              </div>
              <div className="text-xs text-gray-400 -mt-1">Your Daily News Hub</div>
            </div>
            <div className="sm:hidden text-xl font-black">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">Buzz</span>
              <span className="text-white">पत्रिका</span>
            </div>
          </button>

          {/* Actions */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="hidden md:flex items-center gap-2 bg-white/10 border border-white/10 rounded-lg px-3 py-2 min-w-72">
              <Search className="w-4 h-4 text-gray-300" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search stories..."
                className="bg-transparent w-full text-sm text-white placeholder:text-gray-300 focus:outline-none"
              />
            </div>

            <div className="hidden sm:flex items-center gap-2 bg-white/10 border border-white/10 rounded-lg px-3 py-2">
              <Globe2 className="w-4 h-4 text-gray-300" />
              <select
                value={activeCountry}
                onChange={(event) => onCountrySelect(event.target.value)}
                className="bg-transparent text-sm text-white focus:outline-none"
                title="Select country"
              >
                {countries.map((country) => (
                  <option key={country.code} value={country.code} className="bg-slate-900 text-white">
                    {country.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onRefreshStories}
              disabled={isRefreshingStories}
              className="p-2.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh stories"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshingStories ? 'animate-spin' : ''}`} />
            </button>

            <div className="hidden sm:block px-3 py-2 text-xs text-gray-100 bg-white/10 border border-white/10 rounded-lg whitespace-nowrap">
              Last updated at {lastUpdatedLabel}
            </div>

            {isAdmin ? (
              <>
                {!isAdminView && (
                  <button
                    onClick={onAdminDashboard}
                    className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all"
                  >
                    Dashboard
                  </button>
                )}
                <button
                  onClick={onLogoutClick}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <button
                onClick={onLoginClick}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg hover:from-orange-600 hover:to-red-700 transition-all shadow-lg"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Admin Login</span>
              </button>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Navigation - Desktop */}
        <nav className="hidden lg:flex items-center gap-1 pb-3 border-t border-white/10 pt-3">
          <button
            className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${activeCategory === null ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-gray-100'}`}
            onClick={() => onCategorySelect(null)}
          >
            All
          </button>
          {displayCategories.map((category) => (
            <button
              key={category.slug}
              className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${activeCategory === category.slug ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-gray-100'}`}
              onClick={() => onCategorySelect(category.slug)}
            >
              {category.displayName}
            </button>
          ))}
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/10 py-4">
            <div className="mb-3 flex items-center gap-2 bg-white/10 border border-white/10 rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-gray-300" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search stories..."
                className="bg-transparent w-full text-sm text-white placeholder:text-gray-300 focus:outline-none"
              />
            </div>

            <div className="mb-3 flex items-center gap-2 bg-white/10 border border-white/10 rounded-lg px-3 py-2">
              <Globe2 className="w-4 h-4 text-gray-300" />
              <select
                value={activeCountry}
                onChange={(event) => onCountrySelect(event.target.value)}
                className="bg-transparent w-full text-sm text-white focus:outline-none"
                title="Select country"
              >
                {countries.map((country) => (
                  <option key={country.code} value={country.code} className="bg-slate-900 text-white">
                    {country.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3 px-3 py-2 text-xs text-gray-100 bg-white/10 border border-white/10 rounded-lg">
              Last updated at {lastUpdatedLabel}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {isAdmin && !isAdminView && (
                <button
                  onClick={() => {
                    onAdminDashboard();
                    setMobileMenuOpen(false);
                  }}
                  className="col-span-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg text-left"
                >
                  Dashboard
                </button>
              )}

              <button
                className={`px-4 py-3 rounded-lg text-left transition-colors text-sm ${activeCategory === null ? 'bg-white/25 text-white' : 'bg-white/5 hover:bg-white/10'}`}
                onClick={() => {
                  onCategorySelect(null);
                  setMobileMenuOpen(false);
                }}
              >
                All
              </button>

              {displayCategories.map((category) => (
                <button
                  key={category.slug}
                  className={`px-4 py-3 rounded-lg text-left transition-colors text-sm ${activeCategory === category.slug ? 'bg-white/25 text-white' : 'bg-white/5 hover:bg-white/10'}`}
                  onClick={() => {
                    onCategorySelect(category.slug);
                    setMobileMenuOpen(false);
                  }}
                >
                  {category.displayName}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
