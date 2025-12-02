"use client";

import React, { useState, useRef, useEffect } from "react";
import Header from "./Header";
import Footer from "./Footer";
import ArticleList, { Article } from "./ArticleList";
import { usePathname } from "next/navigation";

const tags = [
  "All Tags",
  "Blockchain",
  "AI",
  "Security",
  "Infrastructure",
  "Payments",
  "Solana",
  "MPC",
  "Crypto",
  "API",
  "DeFi",
];

const categories = [
  "All Categories",
  "Research",
  "Development",
  "Tutorial",
  "Blog",
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
  const [selectedTag, setSelectedTag] = useState("All Tags");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");

  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const pathname = usePathname();
  const isHome = pathname === "/";

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
    if (e.key === "Enter") {
      setModalOpen(false);
    }
  };

  return (
    <>
      <Header onOpenFilterModal={() => setModalOpen(true)} />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-start pt-4 sm:pt-12 px-4 bg-black/60 backdrop-blur-xl">
          {/* Modal Container */}
          <div
            ref={modalRef}
            className="relative bg-black border border-zinc-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in"
          >
            {/* Close Button */}
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-3xl text-gray-400 hover:text-white"
            >
              &times;
            </button>

            {/* Search Field */}
            <div className="flex items-center px-4 pt-4 pb-1">
              <svg
                className="w-5 h-5 text-gray-400 mr-3"
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
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search articles..."
                className="flex-1 bg-transparent text-white placeholder-gray-500 text-base outline-none"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-6 px-6 py-6">
              {/* Tag Filter */}
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="flex-1 bg-zinc-900 text-white px-3 py-2 rounded-lg text-sm shadow-sm outline-none focus:ring-2 focus:ring-zinc-700"
              >
                {tags.map((tag) => (
                  <option key={tag} value={tag} className="bg-black">
                    {tag}
                  </option>
                ))}
              </select>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="flex-1 bg-zinc-900 text-white px-3 py-2 rounded-lg text-sm shadow-sm outline-none focus:ring-2 focus:ring-zinc-700"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="bg-black">
                    {cat}
                  </option>
                ))}
              </select>
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
                Insights on secure, global crypto payments, Solana settlement,
                MPC cryptography, and developer-first payment rails.
              </p>
            </div>
          </section>
        )}

        {/* Content */}
        {isHome && articles ? (
          <ArticleList
            articles={articles}
            search={search}
            selectedTag={selectedTag}
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
