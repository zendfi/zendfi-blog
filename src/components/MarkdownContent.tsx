"use client";
import Image from 'next/image';
import React, { useMemo } from 'react';
import parse, { HTMLReactParserOptions, Element } from 'html-react-parser';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export default function MarkdownContent({ content, className }: MarkdownContentProps) {
  const parsedContent = useMemo(() => {
    const options: HTMLReactParserOptions = {
      replace: (domNode) => {
        // Check if this is an Element node (not text, comment, etc.)
        if (domNode instanceof Element && domNode.name === 'img') {
          const { src, alt } = domNode.attribs;
          
          // Only optimize local images (starting with /)
          if (src && src.startsWith('/')) {
            return (
              <span className="block my-6">
                <Image
                  src={src}
                  alt={alt || ''}
                  width={1200}
                  height={630}
                  className="rounded-lg w-full h-auto"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70rem"
                  priority={false}
                  unoptimized // Required for static export
                />
              </span>
            );
          }
          
          // For external images, still wrap in span for consistent styling
          return (
            <span className="block my-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt || ''}
                className="rounded-lg w-full h-auto"
                loading="lazy"
              />
            </span>
          );
        }
      },
    };

    return parse(content, options);
  }, [content]);

  return (
    <div className={className}>
      {parsedContent}
    </div>
  );
}
