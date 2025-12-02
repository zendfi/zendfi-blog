"use client";
import Image from 'next/image'
import { useTheme } from '@/components/ThemeContext'
import Link from 'next/link';
import { Linkedin } from 'lucide-react';

export default function Footer() {
  const { theme } = useTheme();

  return (
    <footer className={`w-full max-w-[70rem] mx-auto backdrop-blur-md py-4 sm:py-6 px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-2 mt-12`} style={{ background: 'var(--footer-bg)', borderTopColor: 'var(--border-color)' }}>
      {/* Logo */}
      <div className="flex items-center space-x-2 order-1 sm:order-none">
         <Link href="/" className="flex items-center">
              <Image
                src="/images/logo.png"
                alt="Zendfi Logo"
                width={100}
                height={28}
                className="h-5 sm:h-6 w-auto filter hue-rotate-[19deg] brightness-110"
                priority
              />
            </Link>
      </div>
      {/* Copyright */}
      <div className={`text-xs sm:text-sm text-center order-2 sm:order-none ${
        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
      }`}>
        © 2025 Zendfi. All Rights Reserved.
      </div>
      {/* Socials */}
      <div className="flex items-center space-x-2 order-3 sm:order-none">
        <a href="https://x.com/zendfi_" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
          <svg className={`w-4 h-4 sm:w-5 sm:h-5 transition ${
            theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
          }`} fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </a>
        {/* GitHub link removed to decouple from GitHub per site migration */}
        <a href="https://linkedin.com/company/zendfi/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
          <Linkedin className='h-5 w-5 text-gray-600 dark:text-gray-400'/>  </a>
      </div>
    </footer>
  );
} 