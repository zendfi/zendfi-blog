"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Header from "./Header";
import Footer from "./Footer";
import ArticleList, { Article } from "./ArticleList";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "./ThemeContext";


const categories = [
  "All Categories",
  "Research",
  "Dev Knowledge",
  "FAQ",
];

export default function SearchModalProvider({
  children,
  articles,
}: {
  children: React.ReactNode;
  articles?: Article[];
}) {
  const [isModalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");

  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  const isHome = pathname === "/";

  // Filter articles based on search query, tags, and categories
  const filteredArticles = useMemo(() => {
    if (!articles) {
      return [];
    }

    const lowerSearch = search.toLowerCase();
    return articles.filter((article) => {
      // Search filter
      const matchesSearch =
        !search.trim() ||
        article.title.toLowerCase().includes(lowerSearch) ||
        article.description?.toLowerCase().includes(lowerSearch) ||
        article.tags?.some((tag) => tag.toLowerCase().includes(lowerSearch)) ||
        article.category?.toLowerCase().includes(lowerSearch);


      // Category filter
      const matchesCategory =
        selectedCategory === "" ||
        selectedCategory === "All Categories" ||
        article.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [articles, search, selectedCategory]);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isModalOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isModalOpen]);

  // Close modal on outside click
  useEffect(() => {
    function handleClickOutside(evt: MouseEvent) {
      if (
        modalRef.current &&
        !modalRef.current.contains(evt.target as Node)
      ) {
        setModalOpen(false);
      }
    }

    if (isModalOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [isModalOpen]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && filteredArticles.length > 0) {
      // Navigate to first result on Enter
      router.push(`/article/${filteredArticles[0].slug}`);
      setModalOpen(false);
      setSearch("");
    } else if (e.key === "Escape") {
      setModalOpen(false);
      setSearch("");
    }
  };

  const handleArticleClick = (slug: string) => {
    setModalOpen(false);
    setSearch("");
    router.push(`/article/${slug}`);
  };

  return (
    <>
      <Header onOpenFilterModal={() => setModalOpen(true)} />

      {isModalOpen && (
        <div className={`fixed inset-0 z-50 flex justify-center items-start pt-4 sm:pt-12 px-4 backdrop-blur-xl ${
          theme === 'dark' ? 'bg-black/60' : 'bg-white/80'
        }`}>
          {/* Modal Container */}
          <div
            ref={modalRef}
            className={`relative rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in flex flex-col max-h-[85vh] ${
              theme === 'dark' 
                ? 'bg-black border border-zinc-800' 
                : 'bg-white border border-gray-200'
            }`}
          >
            {/* Close Button */}
            <button
              onClick={() => {
                setModalOpen(false);
                setSearch("");
              }}
              className={`absolute top-4 right-4 z-10 text-3xl transition-colors ${
                theme === 'dark' 
                  ? 'text-gray-400 hover:text-white' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              &times;
            </button>

            {/* Search Field */}
            <div className={`flex items-center px-4 pt-4 pb-3 border-b ${
              theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'
            }`}>
              <svg
                className={`w-5 h-5 mr-3 flex-shrink-0 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z"
                />
              </svg>

              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search articles..."
                className={`flex-1 bg-transparent text-base outline-none ${
                  theme === 'dark' 
                    ? 'text-white placeholder-gray-500' 
                    : 'text-gray-900 placeholder-gray-400'
                }`}
              />
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {search.trim() ? (
                filteredArticles.length > 0 ? (
                  <div className="space-y-3">
                    {filteredArticles.map((article: Article) => (
                      <button
                        key={article.slug}
                        onClick={() => handleArticleClick(article.slug)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors group ${
                          theme === 'dark'
                            ? 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <h3 className={`font-semibold text-base mb-1 transition-colors ${
                          theme === 'dark'
                            ? 'text-white group-hover:text-gray-200'
                            : 'text-gray-900 group-hover:text-gray-700'
                        }`}>
                          {article.title}
                        </h3>
                        {article.description && (
                          <p className={`text-sm line-clamp-2 ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {article.description}
                          </p>
                        )}
                        <div className={`flex items-center gap-3 mt-2 text-xs ${
                          theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                        }`}>
                          <span>{article.author}</span>
                          {article.category && (
                            <>
                              <span>•</span>
                              <span>{article.category}</span>
                            </>
                          )}
                          {article.tags && article.tags.length > 0 && (
                            <>
                              <span>•</span>
                              <span>{article.tags.join(", ")}</span>
                            </>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className={`text-center py-8 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    <p className="text-base">No articles found</p>
                    <p className="text-sm mt-1">Try a different search term</p>
                  </div>
                )
              ) : (
                <div className={`text-center py-8 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  <p className="text-base">Start typing to search articles</p>
                  {articles && articles.length > 0 && (
                    <p className="text-sm mt-1">
                      {articles.length} article{articles.length !== 1 ? "s" : ""} available
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Layout */}
      <main className="flex-1 w-full max-w-[70rem] mx-auto px-4 sm:px-6">
        {/* Landing Section */}
        {isHome && (
          <section className="py-6 sm:py-12">
            <div className="max-w-3xl">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 text-foreground">
                The ZendFi Journal
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-gray-500 leading-relaxed">
                Check out the latest updates and research from Team ZendFi! 
              </p>
            </div>
          </section>
        )}

        {/* Filters Section */}
        {isHome && articles && (
          <section className="py-4 sm:py-6">
            {/* Category Filters */}
            <div className={`mb-4 border-b ${
              theme === 'dark' ? 'border-gray-600' : 'border-gray-200'
            }`}>
              <div className="flex gap-2 overflow-x-auto pb-2 pr-4 sm:pr-0 sm:flex-wrap sm:overflow-x-visible sm:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-lg text-md uppercase font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                      selectedCategory === category
                        ? "text-[var(--accent)]"
                        : theme === 'dark' 
                          ? "text-gray-300" 
                          : "text-slate-900"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Content */}
        {isHome && articles ? (
          <ArticleList
            articles={articles}
            search={search}
            selectedCategory={selectedCategory}
          />
        ) : (
          children
        )}
      </main>

      <Footer />
    </>
  );
}
