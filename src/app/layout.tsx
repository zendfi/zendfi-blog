import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import 'katex/dist/katex.min.css'
import { ThemeProvider } from '../components/ThemeContext'
import React from 'react'
import SearchModalProvider from '../components/SearchModalProvider'
import { getAllArticles } from '@/lib/markdown'
import Script from "next/script";

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Zendfi Blog',
    template: '%s | Zendfi'
  },
  description:
    'Zendfi Blog: Insights into crypto payments infrastructure built on Solana...',
  metadataBase: new URL('https://blog.zendfi.tech'),

  manifest: '/manifest.json',
  themeColor: '#000000',

  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' }
    ]
  },

  alternates: {
    canonical: 'https://blog.zendfi.tech'
  },

  openGraph: {
    title: 'Zendfi – Fast, Secure Crypto Payments on Solana',
    description:
      'Explore Zendfi’s payments infrastructure...',
    url: 'https://blog.zendfi.tech',
    siteName: 'Zendfi Blog',
    images: [{ url: '/icon.jpg', width: 1200, height: 630 }]
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Zendfi Blog | Crypto Payments Built for the Future',
    images: ['/icon.jpg']
  },

  verification: {
    google: 'BfQ7ZlFVrCtP2qgOlwdYk_H0coaj9qL9UkNSeytWPxc'
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const articles = getAllArticles();

  return (
    <html lang="en">
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <ThemeProvider>
          <SearchModalProvider articles={articles}>
            <main className="flex-1 max-w-[70rem] mx-auto px-6">
              {children}
            </main>
          </SearchModalProvider>
        </ThemeProvider>

        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ResearchOrganization",
              name: "Zendfi",
              url: "https://blog.zendfi.tech",
              logo: "https://blog.zendfi.tech/icon.jpg",
            })
          }}
        />
      </body>
    </html>
  );
}
