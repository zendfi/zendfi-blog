import { getAllArticles } from '@/lib/markdown'
import ArticleList from '../components/ArticleList'
import FilterModalManager from '../components/FilterModalManager'
import { Article } from '../components/ArticleList'
import Link from 'next/link'

export default async function Home() {
  const articles: Article[] = getAllArticles()
  return (
    <FilterModalManager>
      <div className="py-12 sm:py-20">
        <div className="max-w-[70rem] mx-auto px-6">
          <section className="rounded-lg p-8 sm:p-12 mb-8 mt-40" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0.4))' }}>
            <div className="max-w-3xl">
              <h1 className="text-5xl sm:text-6xl font-extrabold mb-4 leading-tight" style={{ color: 'var(--foreground)' }}>Zendfi</h1>
              <p className="text-lg sm:text-xl mb-6 text-gray-500">Advancing blockchain interoperability, cross-chain security, and provably secure protocols through rigorous cryptographic research and formal verification.</p>
              <div className="flex items-center gap-3">
                <Link href="#articles" className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium shadow transition" style={{ background: 'var(--accent)', color: 'white' }}>Read articles</Link>
                <Link href="/article/the-cross-chain-trust-problem" className="text-sm text-gray-500 hover:text-gray-900">Latest: Cross-chain trust problem →</Link>
              </div>
            </div>
          </section>
        </div>
      </div>
      <ArticleList articles={articles} search="" selectedTag="" selectedCategory="" />
    </FilterModalManager>
  )
}

