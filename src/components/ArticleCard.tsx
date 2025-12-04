"use client";
import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from '@/components/ThemeContext'

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
  tags?: string[]  // Make optional
  category?: string  // Make optional
  image?: string
}

interface ArticleCardProps {
  article: Article
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const { theme } = useTheme();
  
  return (
    <article className={`pb-6 sm:pb-8 ${
      theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
    }`}>
      <div className={`flex flex-col ${article.image ? 'md:flex-row md:gap-6' : ''}`}>
        {/* Content - Left Side */}
        <div className={`flex-1 ${article.image ? 'md:order-1' : ''}`}>
          <div className={`flex items-center text-sm sm:text-base mb-2 ${
            theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
          }`}>
            <p>{article.author}</p> <span className='text-xs p-2'>●</span>
            <time>{formatDate(article.date)}</time>
            {article.category && (
              <span className={`ml-4 px-2 py-0.5 rounded text-xs sm:text-sm ${
                theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
              }`}>{article.category}</span>
            )}
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 leading-tight">
            <Link 
              href={`/article/${article.slug}`}
              className={`transition-colors ${
                theme === 'dark' ? 'hover:text-gray-300' : 'hover:text-gray-600'
              }`}
            >
              {article.title}
            </Link>
          </h2>
          
          <p className={`text-base sm:text-lg mb-4 leading-relaxed ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          }`}>
            {article.description}
          </p>
          
          {article.tags && article.tags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {article.tags.map(tag => (
                <span key={tag} className={`px-2 py-0.5 rounded text-xs sm:text-sm ${
                  theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'
                }`}>{tag}</span>
              ))}
            </div>
          )}
          
          <Link 
            href={`/article/${article.slug}`}
            className={`inline-flex items-center text-sm sm:text-base transition-colors group text-[var(--accent)]`}
          >
            READ MORE 
            <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>

        {/* Image - Right Side */}
        {article.image && (
          <div className="mt-4 md:mt-0 md:order-2 md:w-64 lg:w-80 flex-shrink-0">
            <Link href={`/article/${article.slug}`}>
              <Image 
                src={article.image} 
                alt={article.title} 
                width={320} 
                height={200} 
                className="w-full h-40 md:h-full object-cover rounded-lg hover:opacity-90 transition-opacity" 
                unoptimized
              />
            </Link>
          </div>
        )}
      </div>
    </article>
  )
}
