"use client";
import { useEffect, useRef } from 'react' // Added for Mermaid
import Link from 'next/link'
import Image from 'next/image'
import mermaid from 'mermaid' // Added for Mermaid
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

type ArticleSummary = Omit<Article, 'content'>

interface ArticleContentProps {
  article: Article
  relatedArticles?: ArticleSummary[] // NEW: Added this prop for the CTA
}

export default function ArticleContent({ article, relatedArticles = [] }: ArticleContentProps) {
  const { theme } = useTheme();
  const articleRef = useRef<HTMLElement | null>(null)

  // Initialize Mermaid for your flowcharts
  useEffect(() => {
    const container = articleRef.current
    if (!container) {
      return
    }

    mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'dark' ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: 'Inter, sans-serif'
    })

    const selectors = [
      'figure[data-rehype-pretty-code-figure] pre code[data-language="mermaid"]',
      'pre code.language-mermaid',
      'code.language-mermaid'
    ]

    const codeBlocks = Array.from(container.querySelectorAll(selectors.join(',')))
    for (const codeBlock of codeBlocks) {
      const raw = codeBlock.textContent
      if (!raw) {
        continue
      }

      const replacement = document.createElement('div')
      replacement.className = 'mermaid'
      replacement.textContent = raw

      const parent =
        codeBlock.closest('figure[data-rehype-pretty-code-figure]') ??
        codeBlock.closest('pre') ??
        codeBlock

      parent.replaceWith(replacement)
    }

    const runMermaid = async () => {
      try {
        await mermaid.run({ querySelector: '.mermaid' })
      } catch {
        // Suppress Mermaid parse errors to avoid crashing the UI.
      }
    }

    void runMermaid()
  }, [article.content, theme])

  return (
    <article ref={articleRef} className="py-6 sm:py-12 w-full max-w-[70rem] mx-auto mt-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
          })
        }}
      />
      
      <div className="mb-8">
        <div className={`flex items-center text-sm mb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
            <p>{article.author}</p> <span className='text-xs p-2'>●</span>
          <time>{formatDate(article.date)}</time>
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">{article.title}</h1>
        <p className={`text-base sm:text-lg md:text-xl mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>{article.description}</p>
      </div>
      {article.image && (
        <div className="mb-8 -mx-4 sm:mx-0">
          <Image
            src={article.image}
            alt={article.title}
            width={1200}
            height={630}
            className="w-full h-auto rounded-none sm:rounded-lg object-cover"
            priority
            unoptimized
          />
        </div>
      )}

      {/* Markdown Content (Mermaid will hook in here) */}
      <MarkdownContent
        content={article.content}
        className={`prose prose-sm sm:prose-base md:prose-lg max-w-none overflow-x-auto ${theme === 'dark' ? 'prose-invert' : 'prose-gray'}`}
      />

      {/* Back to Articles Link */}
      <div className={`mt-12 pt-8 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
        <Link
          href="/"
          className={`inline-flex items-center transition-colors group ${theme === 'dark' ? 'text-[var(--accent)] hover:text-white' : 'text-accent hover:text-accent'}`}
        >
          <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span>
          Back to articles
        </Link>
      </div>

      {/* NEW: Read This Next CTA */}
      {relatedArticles.length > 0 && (
        <div className="mt-20 pt-16 sm:mt-24 border-t border-gray-200 dark:border-gray-800">
          <h2 className={`text-2xl font-bold text-center mb-10 ${theme === 'dark' ? 'text-white' : 'text-[#0B1E36]'}`}>
            Check these out next
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {relatedArticles.map((related) => (
              <Link 
                href={`/article/${related.slug}`} 
                key={related.slug} 
                className="group flex flex-col"
              >
                {/* Image Container with 16:9 Aspect Ratio */}
                <div className={`relative w-full aspect-[16/9] rounded-xl overflow-hidden mb-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  {related.image ? (
                    <Image 
                      src={related.image} 
                      alt={related.title} 
                      fill 
                      className="object-cover transition-transform duration-500 group-hover:scale-105" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}
                </div>
                
                {/* Text Content */}
                <h3 className={`text-[1.35rem] leading-snug font-bold mb-3 transition-colors ${theme === 'dark' ? 'text-white group-hover:text-gray-300' : 'text-[#0B1E36] group-hover:text-gray-600'}`}>
                  {related.title}
                </h3>
                <p className={`text-[15px] leading-relaxed line-clamp-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {related.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}