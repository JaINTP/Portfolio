import React from 'react'
import Link from 'next/link'
import { Github, ExternalLink, ArrowRight } from 'lucide-react'
import { getPayloadClient } from '@/lib/payload'

interface Project {
  id: string
  title: string
  category: string
  description: any // Lexical JSON
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

export default async function ProjectsPage() {
  const payload = await getPayloadClient()

  const projectsRes = await payload.find({
    collection: 'projects',
    sort: '-createdAt',
  })

  const projects = projectsRes.docs as unknown as Project[]

  return (
    <div className="min-h-screen pt-32 pb-20 bg-gradient-to-b from-black via-gray-950 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-400 font-semibold mb-2">Portfolio</p>
          <h1 className="text-5xl font-bold text-white mb-4">Projects</h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            A selection of my professional work, open source contributions, and personal experiments in engineering and security.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group relative rounded-3xl border border-white/10 bg-white/5 overflow-hidden transition-all duration-500 hover:border-cyan-400/30 hover:bg-white/[0.07]"
            >
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="aspect-square md:aspect-auto overflow-hidden bg-gray-900">
                  {project.image && typeof project.image !== 'string' && (
                    <img
                      src={project.image.url}
                      alt={project.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  )}
                </div>
                <div className="p-8 flex flex-col justify-between">
                  <div className="space-y-4">
                    <span
                      className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${getCategoryColor(
                        categoryKey(project.category)
                      )}`}
                    >
                      {project.category?.toUpperCase()}
                    </span>
                    <h2 className="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                      {project.title}
                    </h2>
                    <div className="text-sm text-gray-400">
                      <p className="line-clamp-4">
                        {/* Safe access to description text */}
                        {(project.description as any)?.root?.children?.[0]?.children?.[0]?.text || ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {project.tags?.map((tag) => (
                        <span key={tag.id} className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-gray-400">
                          {tag.tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-6 pt-8">
                    {project.github && (
                      <a
                        href={project.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-cyan-400 transition-colors"
                      >
                        <Github className="w-5 h-5" />
                        Code
                      </a>
                    )}
                    {project.demo && (
                      <a
                        href={project.demo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-cyan-400 transition-colors"
                      >
                        <ExternalLink className="w-5 h-5" />
                        Demo
                      </a>
                    )}
                    <Link
                      href={`/projects/${project.id}`}
                      className="ml-auto inline-flex items-center justify-center h-10 w-10 rounded-full bg-cyan-500 text-black hover:bg-cyan-400 transition-colors"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {projects.length === 0 && (
          <div className="text-center py-20 bg-white/5 border border-white/10 rounded-2xl">
            <p className="text-gray-400">No projects yet. Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  )
}
