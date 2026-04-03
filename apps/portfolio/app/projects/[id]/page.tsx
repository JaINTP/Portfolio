import React from 'react'
import { notFound } from 'next/navigation'
import { Github, ExternalLink, ArrowLeft, Calendar, Tag } from 'lucide-react'
import Link from 'next/link'
import { getProject } from '@/lib/api'

export const dynamic = 'force-dynamic'

/* eslint-disable @next/next/no-img-element */

interface Project {
  id: string
  title: string
  category: string
  description: string
  tags?: string[]
  github?: string
  demo?: string
  image?: string
  date_label?: string
  created_at: string
}

type Props = {
  params: Promise<{
    id: string
  }>
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params
  
  let project: Project | null = null
  try {
    project = await getProject(id)
  } catch (error) {
    console.error('Error fetching project:', error)
    return notFound()
  }

  if (!project) {
    return notFound()
  }

  return (
    <div className="min-h-screen pt-32 pb-20 bg-gradient-to-b from-black via-gray-950 to-black">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link 
          href="/projects" 
          className="inline-flex items-center text-sm text-cyan-400 hover:text-cyan-300 transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Projects
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div className="space-y-8">
            <div>
              <span className="px-3 py-1 rounded-full border border-cyan-400/20 bg-cyan-400/10 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-4 inline-block">
                {project.category}
              </span>
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6 leading-tight">
                {project.title}
              </h1>
              
              <div className="flex flex-wrap gap-6 text-sm text-gray-400 mb-8">
                {project.date_label && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-500" />
                    {project.date_label}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-cyan-500" />
                  {project.tags?.join(', ')}
                </div>
              </div>
            </div>

            <div className="prose prose-invert max-w-none">
              <div className="text-gray-300 text-lg leading-relaxed whitespace-pre-wrap">
                {project.description}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-4">
              {project.github && (
                <a
                  href={project.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all font-semibold"
                >
                  <Github className="w-5 h-5" />
                  Source Code
                </a>
              )}
              {project.demo && (
                <a
                  href={project.demo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 text-black hover:bg-cyan-400 transition-all font-semibold"
                >
                  <ExternalLink className="w-5 h-5" />
                  Live Demo
                </a>
              )}
            </div>
          </div>

          <div className="sticky top-24">
            {project.image && (
              <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-cyan-500/10">
                <img 
                  src={project.image} 
                  alt={project.title}
                  className="w-full h-auto object-cover"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
