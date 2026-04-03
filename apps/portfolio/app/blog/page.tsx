import React from 'react'
import Link from 'next/link'
import { Clock } from 'lucide-react'
import { getPayloadClient } from '@/lib/payload'

interface Blog {
  id: string
  title: string
  category: string
  readTime: string
  excerpt: string
  publishedAt: string
  image?: {
    url: string
  } | string
}

const categoryKey = (value: string) =>
  value ? value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : ''

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    'bug-bounty': 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    'software-dev': 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    'science': 'text-violet-400 bg-violet-400/10 border-violet-400/20',
    'personal': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  }
  return colors[category] || 'text-gray-400 bg-gray-400/10 border-gray-400/20'
}

export default async function BlogPage() {
  const payload = await getPayloadClient()

  const now = new Date().toISOString()
  const blogsRes = await payload.find({
    collection: 'blog-posts',
    sort: '-publishedAt',
    where: {
      and: [
        {
          status: {
            equals: 'published',
          },
        },
        {
          publishedAt: {
            less_than_equal: now,
          },
        },
      ],
    },
  })

  const blogs = blogsRes.docs as unknown as Blog[]

  return (
    <div className="min-h-screen pt-32 pb-20 bg-gradient-to-b from-black via-gray-950 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-400 font-semibold mb-2">Writing</p>
          <h1 className="text-5xl font-bold text-white mb-4">Blog Posts</h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Sharing my thoughts on software engineering, cybersecurity, and the fascinating world of science.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {blogs.map((blog) => (
            <Link
              key={blog.id}
              href={`/blog/${blog.id}`}
              className="group rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/50 hover:shadow-2xl hover:shadow-cyan-500/20"
            >
              <div className="aspect-video overflow-hidden rounded-t-2xl bg-gray-900">
                {blog.image && typeof blog.image !== 'string' && (
                  <img
                    src={blog.image.url}
                    alt={blog.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                )}
              </div>
              <div className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${getCategoryColor(
                      categoryKey(blog.category)
                    )}`}
                  >
                    {blog.category?.toUpperCase()}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    {blog.readTime}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white transition-colors group-hover:text-cyan-400">
                    {blog.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm text-gray-400">{blog.excerpt}</p>
                </div>
                <time className="text-xs text-gray-500">
                  {blog.publishedAt
                    ? new Date(blog.publishedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : '—'}
                </time>
              </div>
            </Link>
          ))}
        </div>
        
        {blogs.length === 0 && (
          <div className="text-center py-20 bg-white/5 border border-white/10 rounded-2xl">
            <p className="text-gray-400">No blog posts yet. Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  )
}
