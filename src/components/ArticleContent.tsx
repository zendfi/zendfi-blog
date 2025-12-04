"use client";
import Link from 'next/link'
import { useTheme } from '@/components/ThemeContext'
import MarkdownContent from '@/components/MarkdownContent'

// Define formatDate directly in this component
function formatDate(dateString: string): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
  return new Date(dateString).toLocaleDateString('en-US', options)
}

interface Article {
  slug: string
  title: string
  author: string
  date: string
  description: string
  tags?: string[]
  category?: string
  image?: string
  content: string
}

interface ArticleContentProps {
  article: Article
  slug: string
}

export default function ArticleContent({ article, slug }: ArticleContentProps) {
  const { theme } = useTheme();

  return (
    <article className="py-6 sm:py-12 w-full max-w-[70rem] mx-auto overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": article.title,
            "description": article.description,
            // Author removed from structured data per site preference
            "publisher": {
              "@type": "Organization",
              "name": "Zendfi",
              "logo": {
                "@type": "ImageObject",
                "url": "https://blog.zendfi.tech/icon.jpg"
              }
            },
            "datePublished": article.date,
            "dateModified": article.date,
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": `https://blog.zendfi.tech/article/${slug}`
            },
            "image": "https://blog.zendfi.tech/icon.jpg"
          })
        }}
      />
      <div className="mb-8">
        <div className={`flex items-center text-sm mb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
          }`}>
            <p>{article.author}</p> <span className='text-xs p-2'>●</span>
          <time>{formatDate(article.date)}</time>
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">{article.title}</h1>
        <p className={`text-base sm:text-lg md:text-xl mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
          }`}>{article.description}</p>

        {/* Author name and avatar removed from article header */}
      </div>

      <MarkdownContent
        content={article.content}
        className={`prose prose-sm sm:prose-base md:prose-lg max-w-none overflow-x-auto ${theme === 'dark' ? 'prose-invert' : 'prose-gray'
          }`}
      />

      <div className={`mt-12 pt-8 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
        }`}>
        <Link
          href="/"
          className={`inline-flex items-center transition-colors group ${theme === 'dark' ? 'text-[var(--accent)] hover:text-white' : 'text-accent hover:text-accent'
            }`}

        >
          <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span>
          Back to articles
        </Link>
      </div>
    </article>
  )
} 