import React from 'react'
import { getAboutProfile } from '@/lib/api'
import { Mail, MapPin, Code2, Github, Linkedin, Twitter } from 'lucide-react'

export const dynamic = 'force-dynamic'

/* eslint-disable @next/next/no-img-element */

interface AboutProfile {
  name: string
  title: string
  bio: string
  email: string
  location: string
  skills?: string[]
  profile_image?: string
  social?: {
    github?: string
    linkedin?: string
    twitter?: string
  }
  dog?: {
    name: string
    role: string
    bio: string
    image?: string
    skills?: string[]
  }
}

export default async function AboutPage() {
  let profile: AboutProfile | null = null
  try {
    profile = await getAboutProfile()
  } catch (error) {
    console.error('Error fetching about profile:', error)
    profile = null
  }

  if (!profile) {
    return (
      <div className="min-h-screen pt-32 pb-20 flex items-center justify-center">
        <p className="text-gray-400">Profile data coming soon.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-32 pb-20 bg-gradient-to-b from-black via-gray-950 to-black">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Sidebar / Profile Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-8">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
                <div className="relative bg-black border border-white/10 rounded-3xl overflow-hidden p-2">
                  {profile.profile_image && (
                    <img 
                      src={profile.profile_image} 
                      alt={profile.name}
                      className="w-full aspect-square object-cover rounded-2xl"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h1 className="text-3xl font-bold text-white">{profile.name}</h1>
                <p className="text-cyan-400 font-medium">{profile.title}</p>
                <div className="flex flex-col gap-3 pt-4">
                  <div className="flex items-center gap-3 text-gray-400">
                    <Mail className="w-5 h-5 text-cyan-400/50" />
                    <span className="text-sm">{profile.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-400">
                    <MapPin className="w-5 h-5 text-cyan-400/50" />
                    <span className="text-sm">{profile.location}</span>
                  </div>
                </div>
              </div>

              <div className="pt-8 space-y-4">
                <h3 className="text-lg font-bold text-white">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.skills?.map((skill, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-8 space-y-4">
                <h3 className="text-lg font-bold text-white">Connect</h3>
                <div className="flex gap-4">
                   {profile.social?.github && (
                     <a href={profile.social.github} target="_blank" rel="noopener noreferrer">
                       <Github className="w-6 h-6 text-gray-400 hover:text-cyan-400 cursor-pointer" />
                     </a>
                   )}
                   {profile.social?.linkedin && (
                     <a href={profile.social.linkedin} target="_blank" rel="noopener noreferrer">
                       <Linkedin className="w-6 h-6 text-gray-400 hover:text-cyan-400 cursor-pointer" />
                     </a>
                   )}
                   {profile.social?.twitter && (
                     <a href={profile.social.twitter} target="_blank" rel="noopener noreferrer">
                       <Twitter className="w-6 h-6 text-gray-400 hover:text-cyan-400 cursor-pointer" />
                     </a>
                   )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-16">
            <section className="space-y-6">
              <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <Code2 className="text-cyan-400" />
                About Me
              </h2>
              <div className="text-gray-400 text-lg leading-relaxed whitespace-pre-wrap">
                {profile.bio}
              </div>
            </section>

            {profile.dog && (
              <section className="p-8 rounded-3xl border border-white/10 bg-white/5 space-y-6">
                <div className="flex flex-col sm:flex-row gap-8 items-start">
                  {profile.dog.image && (
                    <img 
                      src={profile.dog.image} 
                      alt={profile.dog.name}
                      className="w-32 h-32 rounded-2xl object-cover border border-white/10"
                    />
                  )}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-2xl font-bold text-white">{profile.dog.name}</h3>
                      <p className="text-cyan-400 text-sm">{profile.dog.role}</p>
                    </div>
                    <div className="text-gray-400 text-sm leading-relaxed italic whitespace-pre-wrap">
                      {profile.dog.bio}
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
