'use client'

import React, { useEffect, useState } from 'react'
import { Save, Plus, Trash2, LogOut, RefreshCcw, LayoutDashboard, FileText, FolderGit2, User as UserIcon } from 'lucide-react'
import { api } from '@/lib/api'

export default function AdminPage() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('blogs')
  const [blogs, setBlogs] = useState([])
  const [projects, setProjects] = useState([])
  const [about, setAbout] = useState<any>(null)
  const [authForm, setAuthForm] = useState({ email: '', password: '' })

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkSession = async () => {
    try {
      const data = await api.session()
      setSession(data)
      if (data.authenticated && data.is_admin) {
        loadData()
      }
    } catch (err) {
      console.error('Session check failed', err)
    } finally {
      setLoading(false)
    }
  }

  const loadData = async () => {
    try {
      const [blogsData, projectsData, aboutData] = await Promise.all([
        api.getBlogPosts(),
        api.getProjects(),
        api.getAboutProfile()
      ])
      setBlogs(blogsData)
      setProjects(projectsData)
      setAbout(aboutData)
    } catch (err) {
      console.error('Data loading failed', err)
    }
  }

  useEffect(() => {
    checkSession()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await api.login(authForm)
      // Small delay to allow cookie processing
      await new Promise(r => setTimeout(r, 500))
      const sessionData = await api.session()
      setSession(sessionData)
      
      if (!sessionData.authenticated) {
        setError('Login successful, but session could not be established. Please check if cookies are enabled.')
      } else if (!sessionData.is_admin) {
        setError('You are logged in but do not have admin privileges.')
      } else {
        loadData()
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Invalid credentials or server error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = async () => {
    try {
      await api.logout()
      setSession({ authenticated: false })
    } catch (err) {
      console.error('Logout failed', err)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>
  }

  if (!session?.authenticated || !session?.is_admin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-8 bg-white/5 p-10 rounded-3xl border border-white/10">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white">Admin Login</h2>
            <p className="mt-2 text-gray-400 text-sm">Sign in to manage your portfolio</p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-3 px-4 rounded-xl text-center">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Email address</label>
                <input
                  type="email"
                  required
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  className="mt-1 block w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Password</label>
                <input
                  type="password"
                  required
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  className="mt-1 block w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-500 outline-none transition-all"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-cyan-500 text-black font-bold rounded-xl hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tighter">Dashboard<span className="text-cyan-500">.</span></h1>
            <p className="text-gray-500 text-sm font-medium">Welcome back, {session.username}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="space-y-2">
            <button
              onClick={() => setActiveTab('blogs')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'blogs' ? 'bg-cyan-500 text-black' : 'text-gray-400 hover:bg-white/5'}`}
            >
              <FileText className="w-5 h-5" />
              Blog Posts
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'projects' ? 'bg-cyan-500 text-black' : 'text-gray-400 hover:bg-white/5'}`}
            >
              <FolderGit2 className="w-5 h-5" />
              Projects
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'about' ? 'bg-cyan-500 text-black' : 'text-gray-400 hover:bg-white/5'}`}
            >
              <UserIcon className="w-5 h-5" />
              About Profile
            </button>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
              {activeTab === 'blogs' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold">Manage Blog Posts</h3>
                    <button className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black rounded-lg text-xs font-black uppercase tracking-widest hover:bg-cyan-400 transition-all">
                      <Plus className="w-4 h-4" />
                      New Post
                    </button>
                  </div>
                  <div className="space-y-4">
                    {blogs.map((blog: any) => (
                      <div key={blog.id} className="flex justify-between items-center p-4 bg-black/40 border border-white/5 rounded-2xl">
                        <div>
                          <h4 className="font-bold">{blog.title}</h4>
                          <p className="text-xs text-gray-500">{new Date(blog.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-2">
                          <button className="p-2 text-gray-400 hover:text-white transition-colors"><RefreshCcw className="w-4 h-4" /></button>
                          <button className="p-2 text-red-400 hover:text-red-300 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'projects' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold">Manage Projects</h3>
                    <button className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black rounded-lg text-xs font-black uppercase tracking-widest hover:bg-cyan-400 transition-all">
                      <Plus className="w-4 h-4" />
                      New Project
                    </button>
                  </div>
                  <div className="space-y-4">
                    {projects.map((project: any) => (
                      <div key={project.id} className="flex justify-between items-center p-4 bg-black/40 border border-white/5 rounded-2xl">
                        <div>
                          <h4 className="font-bold">{project.title}</h4>
                          <p className="text-xs text-gray-500">{project.category}</p>
                        </div>
                        <div className="flex gap-2">
                          <button className="p-2 text-gray-400 hover:text-white transition-colors"><RefreshCcw className="w-4 h-4" /></button>
                          <button className="p-2 text-red-400 hover:text-red-300 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'about' && about && (
                <div className="space-y-6 text-left">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold">About Profile</h3>
                    <button className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black rounded-lg text-xs font-black uppercase tracking-widest hover:bg-cyan-400 transition-all">
                      <Save className="w-4 h-4" />
                      Save Changes
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Name</label>
                      <input type="text" defaultValue={about.name} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Title</label>
                      <input type="text" defaultValue={about.title} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500" />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Bio</label>
                      <textarea defaultValue={about.bio} rows={5} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
