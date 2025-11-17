import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import 'katex/dist/katex.min.css'
import { ThemeProvider } from '../components/ThemeContext'
import React from 'react'
import SearchModalProvider from '../components/SearchModalProvider'
import { getAllArticles } from '@/lib/markdown'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Zendfi Blog',
    template: '%s | Zendfi'
  },
  description: 'Zendfi Blog: Insights into crypto payments infrastructure built on Solana. Learn about fast, low-cost global transaction rails, developer-first API design, MPC security, and how Zendfi is reimagining cross-border crypto payments for enterprises.',
  keywords: [
    'crypto payments', 'Solana payments', 'global payments', 'cross border payments',
    'merchant API', 'MPC security', 'digital payments infrastructure',
    'crypto settlement', 'Zendfi', 'blockchain payments'
  ],
  authors: [{ name: 'Zendfi Team' }],
  creator: 'Zendfi',
  publisher: 'Zendfi',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://blog.zendfi.tech'),
  alternates: {
    canonical: 'https://blog.zendfi.tech',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://blog.zendfi.tech',
    title: 'Zendfi – Fast, Secure Crypto Payments on Solana',
    description: 'Explore Zendfi’s payments infrastructure: instant crypto settlement, low fees, MPC security, and tools for global builders and merchants.',
    siteName: 'Zendfi Blog',
    images: [
      {
        url: '/icon.jpg',
        width: 1200,
        height: 630,
        alt: 'Zendfi Logo',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zendfi Blog | Crypto Payments Built for the Future',
    description: 'Dive into Zendfi’s world: fast crypto payments, secure infrastructure, Solana-based settlement, and more.',
    images: ['/icon.jpg'],
    creator: '@_tnxl',
    site: '@_tnxl',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'BfQ7ZlFVrCtP2qgOlwdYk_H0coaj9qL9UkNSeytWPxc',
  }
}


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const articles = getAllArticles();
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/icon.jpg" type="image/jpg" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="google-site-verification" content="BfQ7ZlFVrCtP2qgOlwdYk_H0coaj9qL9UkNSeytWPxc" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ResearchOrganization",
              "name": "Zendfi",
              "url": "https://blog.zendfi.tech",
              "logo": "https://blog.zendfi.tech/icon.jpg",
              "description": 'Explore Zendfi’s payments infrastructure: instant crypto settlement, low fees, MPC security, and tools for global builders and merchants.',
              "sameAs": [
                "https://twitter.com/_tnxl"
              ],
              "knowsAbout": [
                "Blockchain Technology",
                "Cryptography",
                "Interoperability Protocols",
                "Decentralized Systems",
                "Web3"
              ]
            })
          }}
        />
      </head>
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <ThemeProvider>
          <SearchModalProvider articles={articles}>
            <main className="flex-1 max-w-[70rem] mx-auto px-6">
              {children}
            </main>
          </SearchModalProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
