"use client";
import ArticleCard from './ArticleCard'

export interface Article {
  slug: string
  title: string
  author: string
  date: string
  description: string
  tags?: string[]
  category?: string
  image?: string
}

interface ArticleListProps {
  articles: Article[]
  search?: string
  selectedTag?: string
  selectedCategory?: string
}

export default function ArticleList({
  articles,
  search = '',
  selectedTag = '',
  selectedCategory = ''
}: ArticleListProps) {

  const filtered = articles.filter((a) => {
    const lowerSearch = search.toLowerCase()

    const matchesSearch =
      !search ||
      a.title.toLowerCase().includes(lowerSearch) ||
      a.description?.toLowerCase().includes(lowerSearch);

    const matchesTag =
      selectedTag === "" ||
      selectedTag === "All Tags" ||
      a.tags?.includes(selectedTag);

    const matchesCategory =
      selectedCategory === "" ||
      selectedCategory === "All Categories" ||
      a.category === selectedCategory;

    return matchesSearch && matchesTag && matchesCategory;
  });

  return (
    <div id="articles" className="py-6 sm:py-12 max-w-[70rem] mx-auto">
      <div className="space-y-10 sm:space-y-14">
        {filtered.map((article: Article) => (
          <ArticleCard
            key={article.slug}
            article={article}
          />
        ))}

        {filtered.length === 0 && (
          <div className="text-gray-400">No articles found.</div>
        )}
      </div>
    </div>
  )
}
