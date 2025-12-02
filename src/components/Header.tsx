"use client";
import { useEffect } from 'react'
import Link from 'next/link'
import { useTheme } from '@/components/ThemeContext'
import React from 'react'
import Image from 'next/image'
import { Sun } from 'lucide-react';

export default function Header({ onOpenFilterModal }: { onOpenFilterModal?: () => void }) {
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    // Apply theme to HTML element
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  return (
    <header className={`sticky top-0 z-50 backdrop-blur-md mb-8`} style={{ background: 'var(--header-bg)' }}>
      {/* <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between"> */}
      <div className="max-w-[70rem] mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between">
     
             <Link href="/" className="flex items-center">
              <Image
                src="/images/logo.png"
                alt="Zendfi Logo"
                width={120}
                height={32}
                className="h-8 w-auto filter hue-rotate-[19deg] brightness-110"
                priority
              />
            </Link>
     
        <div className="flex items-center space-x-2">
          <button
            aria-label="Toggle dark mode"
            onClick={toggleTheme}
            className={`p-2 rounded w-10 h-10 flex items-center justify-center transition-colors ${
              theme === 'dark' 
                ? 'text-gray-200 hover:text-white' 
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            {theme === 'dark' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
              </svg>
            ) : (
              <Sun className="w-5 h-5" />
            )}
          </button>
          {onOpenFilterModal && (
            <button
              aria-label="Open filter modal"
              onClick={onOpenFilterModal}
              className={`p-2 rounded w-10 h-10 flex items-center justify-center transition-colors ${
                theme === 'dark' 
                  ? 'text-gray-200 hover:text-white' 
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
              </svg>
            </button>
          )}
       
        </div>
      </div>
    </header>
  )
}
