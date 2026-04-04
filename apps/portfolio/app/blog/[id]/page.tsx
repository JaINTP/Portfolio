import React from 'react'
import { notFound } from 'next/navigation'
import { Clock, Calendar, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { getBlogPost } from '@/lib/api'
import Comments from '@/components/blog/Comments'

export const dynamic = 'force-dynamic'

/* eslint-disable @next/next/no-img-element */

interface Blog {
  id: string
  title: string
  category: string
  read_time?: string
  excerpt: string
  created_at: string
  content: string // HTML or Markdown string from Python API
  image?: string
}

type Props = {
  params: Promise<{
    id: string
  }>
}

export default async function BlogDetailPage({ params }: Props) {
  const { id } = await params
  
  let blog: Blog | null = null
  try {
    blog = await getBlogPost(id)
  } catch (error) {
    console.error('Error fetching blog post:', error)
    return notFound()
  }

  if (!blog) {
    return notFound()
  }

  return (
    <article className="min-h-screen pt-32 pb-20 bg-gradient-to-b from-black via-gray-950 to-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link 
          href="/blog" 
          className="inline-flex items-center text-sm text-cyan-400 hover:text-cyan-300 transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Blog
        </Link>

        <header className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <span className="px-3 py-1 rounded-full border border-cyan-400/20 bg-cyan-400/10 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
              {blog.category}
            </span>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(blog.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {blog.read_time || '5 min'}
              </span>
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            {blog.title}
          </h1>
          <p className="text-xl text-gray-400 leading-relaxed italic border-l-4 border-cyan-500 pl-6 py-2">
            {blog.excerpt}
          </p>
        </header>

        {blog.image && (
          <div className="mb-12 rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-cyan-500/10">
            <img 
              src={blog.image} 
              alt={blog.title}
              className="w-full h-auto object-cover max-h-[500px]"
            />
          </div>
        )}

        <div 
          className="prose prose-invert max-w-none text-gray-300 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: blog.content }}
        />

        <Comments />
      </div>
    </article>
  )
}
