import React from 'react'
import { getPayloadClient } from '@/lib/payload'
import RichText from '@/components/ui/RichText'
import { Mail, MapPin, Code2, Github, Linkedin, Twitter } from 'lucide-react'

export const dynamic = 'force-dynamic'

/* eslint-disable @next/next/no-img-element */

interface AboutProfile {
  name: string
  title: string
  bio: unknown
  email: string
  location: string
  skills?: { id: string; skill: string }[]
  profileImage?: { url: string } | string
  dog?: {
    name: string
    role: string
    bio: unknown
    image?: { url: string } | string
    skills?: { id: string; skill: string }[]
  }
}

export default async function AboutPage() {
  const payload = await getPayloadClient()
  
  let profile: AboutProfile | null = null
  try {
    const res = await payload.findGlobal({
      slug: 'about',
    })
    profile = res as unknown as AboutProfile
  } catch {
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
                  {profile.profileImage && typeof profile.profileImage !== 'string' && (
                    <img 
                      src={profile.profileImage.url} 
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
                  {profile.skills?.map((s) => (
                    <span key={s.id} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400">
                      {s.skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-8 space-y-4">
                <h3 className="text-lg font-bold text-white">Connect</h3>
                <div className="flex gap-4">
                   <Github className="w-6 h-6 text-gray-400 hover:text-cyan-400 cursor-pointer" />
                   <Linkedin className="w-6 h-6 text-gray-400 hover:text-cyan-400 cursor-pointer" />
                   <Twitter className="w-6 h-6 text-gray-400 hover:text-cyan-400 cursor-pointer" />
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
              <div className="text-gray-400 text-lg leading-relaxed">
                <RichText content={profile.bio} />
              </div>
            </section>

            {profile.dog && (
              <section className="p-8 rounded-3xl border border-white/10 bg-white/5 space-y-6">
                <div className="flex flex-col sm:flex-row gap-8 items-start">
                  {profile.dog.image && typeof profile.dog.image !== 'string' && (
                    <img 
                      src={profile.dog.image.url} 
                      alt={profile.dog.name}
                      className="w-32 h-32 rounded-2xl object-cover border border-white/10"
                    />
                  )}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-2xl font-bold text-white">{profile.dog.name}</h3>
                      <p className="text-cyan-400 text-sm">{profile.dog.role}</p>
                    </div>
                    <div className="text-gray-400 text-sm leading-relaxed italic">
                      <RichText content={profile.dog.bio} />
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
