import React from 'react'
import Link from 'next/link'
import { ArrowRight, Github, ExternalLink, Clock } from 'lucide-react'
import { getPayloadClient } from '@/lib/payload'

export const dynamic = 'force-dynamic'

/* eslint-disable @next/next/no-img-element */

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

interface Project {
  id: string
  title: string
  category: string
  excerpt?: string
  tags?: { id: string; tag: string }[]
  github?: string
  demo?: string
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

export default async function Home() {
  const payload = await getPayloadClient()

  const now = new Date().toISOString()
  const projectsRes = await payload.find({
    collection: 'projects',
    limit: 3,
    sort: '-createdAt',
  })

  const blogsRes = await payload.find({
    collection: 'blog-posts',
    limit: 3,
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

  const featuredProjects = projectsRes.docs as unknown as Project[]
  const latestBlogs = blogsRes.docs as unknown as Blog[]

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black">
      {/* Hero Section */}
      <section className="relative flex min-h-[80vh] items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a1a_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_110%)]" />

        <div className="relative mx-auto max-w-4xl space-y-6 text-left md:text-center">
          <p className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-gray-300 backdrop-blur">
            Always shipping secure, resilient systems
          </p>
          <h1 className="text-4xl leading-tight text-white sm:text-5xl lg:text-7xl">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 bg-clip-text font-bold text-transparent">
              Software Developer
            </span>
            <br />
            <span className="font-semibold text-gray-100">Security Researcher</span>
            <br />
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text font-semibold text-transparent">
              Science Enthusiast
            </span>
          </h1>
          <p className="text-lg leading-relaxed text-gray-400 sm:text-xl">
            Building secure, scalable systems and hunting vulnerabilities in critical infrastructure.
            Exploring the frontiers of science and performing quality lab work.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-center">
            <Link
              href="/projects"
              className="inline-flex w-full items-center justify-center rounded-xl bg-cyan-500 px-8 py-4 text-base font-semibold text-black transition-all duration-300 hover:scale-105 hover:bg-cyan-400 hover:shadow-lg hover:shadow-cyan-500/40 sm:w-auto"
            >
              View Projects
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              href="/about"
              className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-white transition-all duration-300 hover:bg-white/10 sm:w-auto"
            >
              About Me
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Projects */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Highlights</p>
            <h2 className="text-4xl font-bold text-white">Featured Projects</h2>
          </div>
          <Link
            href="/projects"
            className="inline-flex items-center justify-center rounded-full border border-white/10 px-5 py-2 text-sm font-semibold text-cyan-400 transition-colors hover:border-cyan-400/50 hover:text-cyan-300"
          >
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {featuredProjects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/50 hover:shadow-2xl hover:shadow-cyan-500/20"
            >
              <div className="aspect-video overflow-hidden rounded-t-2xl bg-gray-900">
                {project.image && typeof project.image !== 'string' && (
                  <img
                    src={project.image.url}
                    alt={project.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                )}
              </div>
              <div className="space-y-4 p-6">
                <span
                  className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${getCategoryColor(
                    categoryKey(project.category)
                  )}`}
                >
                  {project.category?.toUpperCase()}
                </span>
                <div>
                  <h3 className="text-xl font-bold text-white transition-colors group-hover:text-cyan-400">
                    {project.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm text-gray-400">
                    {project.excerpt || ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {project.tags?.slice(0, 3).map((tag) => (
                    <span key={tag.id} className="rounded-full bg-white/5 px-2 py-1 text-xs text-gray-400">
                      {tag.tag}
                    </span>
                  ))}
                </div>
                <div className="flex gap-6 pt-2 text-sm text-gray-400">
                  {project.github && (
                    <span className="inline-flex items-center gap-1 transition-colors hover:text-cyan-400">
                      <Github className="h-4 w-4" />
                      Code
                    </span>
                  )}
                  {project.demo && (
                    <span className="inline-flex items-center gap-1 transition-colors hover:text-cyan-400">
                      <ExternalLink className="h-4 w-4" />
                      Demo
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Latest Blog Posts */}
      <section className="bg-white/5 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Writing</p>
              <h2 className="text-4xl font-bold text-white">Latest Blogs</h2>
            </div>
            <Link
              href="/blog"
              className="inline-flex items-center justify-center rounded-full border border-white/10 px-5 py-2 text-sm font-semibold text-cyan-400 transition-colors hover:border-cyan-400/50 hover:text-cyan-300"
            >
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {latestBlogs.map((blog) => (
              <Link
                key={blog.id}
                href={`/blog/${blog.id}`}
                className="group rounded-2xl border border-white/10 bg-black/60 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/50 hover:shadow-2xl hover:shadow-cyan-500/20"
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
                    <p className="mt-2 line-clamp-2 text-sm text-gray-400">{blog.excerpt}</p>
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
        </div>
      </section>
    </div>
  )
}
