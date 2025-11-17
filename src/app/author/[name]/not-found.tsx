// src/app/author/[name]/not-found.tsx
import Link from 'next/link'

export default function AuthorNotFound() {
  return (
    <div className="py-12 max-w-[70rem] mx-auto px-6 text-center">
      {/* Simple animated graphic */}
      <div className="mb-8 flex justify-center">
        <svg 
          className="w-48 h-48 sm:w-64 sm:h-64" 
          viewBox="0 0 200 200" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background circle */}
          <circle 
            cx="100" 
            cy="100" 
            r="80" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            className="animate-pulse text-gray-300 dark:text-gray-600"
          />
          
          {/* Person icon */}
          <circle 
            cx="100" 
            cy="70" 
            r="20" 
            className="animate-bounce fill-gray-600 dark:fill-gray-400"
          />
          <path 
            d="M 60 140 Q 100 100 140 140" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="8" 
            strokeLinecap="round"
            className="animate-pulse text-gray-600 dark:text-gray-400"
          />
          
          {/* Simple floating dots */}
          <circle 
            cx="30" 
            cy="50" 
            r="3" 
            className="animate-ping fill-gray-500 dark:fill-gray-500"
          />
          <circle 
            cx="170" 
            cy="50" 
            r="3" 
            className="animate-ping fill-gray-500 dark:fill-gray-500"
            style={{ animationDelay: '0.3s' }}
          />
          <circle 
            cx="30" 
            cy="150" 
            r="3" 
            className="animate-ping fill-gray-500 dark:fill-gray-500"
            style={{ animationDelay: '0.6s' }}
          />
          <circle 
            cx="170" 
            cy="150" 
            r="3" 
            className="animate-ping fill-gray-500 dark:fill-gray-500"
            style={{ animationDelay: '0.9s' }}
          />
        </svg>
      </div>
      
      <h1 className="text-4xl font-bold mb-4">Author Not Found</h1>
      <p className="text-lg mb-8 text-gray-600 dark:text-gray-400">
        The author you&apos;re looking for doesn&apos;t exist or has no published articles.
      </p>
      <Link 
        href="/"
        className="inline-flex items-center transition-colors group text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
      >
        <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span>
        Back to articles
      </Link>
    </div>
  )
}
