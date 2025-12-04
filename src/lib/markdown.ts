import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeStringify from 'rehype-stringify'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import remarkGfm from 'remark-gfm'
import rehypePrettyCode from 'rehype-pretty-code'

const articlesDirectory = path.join(process.cwd(), 'articles')

export interface Article {
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

export function getAllArticles(): Omit<Article, 'content'>[] {
  if (!fs.existsSync(articlesDirectory)) {
    return []
  }
  
  const fileNames = fs.readdirSync(articlesDirectory)
  const allArticles = fileNames
    .filter(name => name.endsWith('.md'))
    .map((name) => {
      const slug = name.replace(/\.md$/, '')
      const fullPath = path.join(articlesDirectory, name)
      const fileContents = fs.readFileSync(fullPath, 'utf8')
      const { data } = matter(fileContents)

      return {
        slug,
        title: data.title,
        author: data.author,
        date: data.date,
        description: data.description,
        tags: data.tags,
        category: data.category,
        image: data.image || undefined,
      }
    })

  return allArticles.sort((a, b) => (a.date < b.date ? 1 : -1))
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  try {
    const fullPath = path.join(articlesDirectory, `${slug}.md`)
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data, content } = matter(fileContents)

    const processedContent = await unified()
      .use(remarkParse)
      .use(remarkMath)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeKatex)
      .use(rehypePrettyCode, {
        theme: 'github-dark-dimmed',
        keepBackground: true,
      })
      .use(rehypeStringify)
      .process(content)

    return {
      slug,
      title: data.title,
      author: data.author,
      date: data.date,
      description: data.description,
      tags: data.tags,
      category: data.category,
      image: data.image || undefined,
      content: processedContent.toString(),
    }
  } catch (error) {
    console.error(`Error loading article ${slug}:`, error)
    return null
  }
}
