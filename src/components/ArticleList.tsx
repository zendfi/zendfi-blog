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

export default function ArticleList({ articles, search = '', selectedTag = '', selectedCategory = '' }: ArticleListProps) {
  // Filter articles by search, tag, and category
  const filtered = articles.filter((article: Article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(search.toLowerCase()) ||
      article.description.toLowerCase().includes(search.toLowerCase()) ||
      (article.tags && article.tags.some((tag: string) => tag.toLowerCase().includes(search.toLowerCase())))
    const matchesTag = selectedTag ? article.tags && article.tags.includes(selectedTag) : true
    const matchesCategory = selectedCategory ? article.category === selectedCategory : true
    return matchesSearch && matchesTag && matchesCategory
  })

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