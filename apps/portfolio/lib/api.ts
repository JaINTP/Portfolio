const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.jaintp.com'

async function request(path: string, { method = 'GET', body, headers = {} }: any = {}) {
  const config: any = {
    method,
    headers: {
      Accept: 'application/json',
      ...headers,
    },
    credentials: 'include', // Required for session cookies
    cache: 'no-store',
  }

  if (body !== undefined) {
    if (body instanceof FormData) {
      config.body = body
    } else {
      config.headers['Content-Type'] = 'application/json'
      config.body = JSON.stringify(body)
    }
  }

  // Use relative path for client-side calls to use Next.js proxy/rewrites
  const baseUrl = typeof window === 'undefined' ? `${API_URL}/api` : '/api'
  const response = await fetch(`${baseUrl}${path}`, config)

  if (response.status === 204) return null

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await response.json() : null

  if (!response.ok) {
    const error = new Error(payload?.detail || 'Request failed')
    // @ts-ignore
    error.status = response.status
    throw error
  }

  return payload
}

export const api = {
  // Auth
  login: (credentials: any) => request('/auth/login', { method: 'POST', body: credentials }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  session: () => request('/auth/session'),

  // Blogs
  getBlogPosts: () => request('/blogs'),
  getBlogPost: (id: string) => request(`/blogs/${id}`),
  createBlog: (data: any) => request('/blogs', { method: 'POST', body: data }),
  updateBlog: (id: string, data: any) => request(`/blogs/${id}`, { method: 'PUT', body: data }),
  deleteBlog: (id: string) => request(`/blogs/${id}`, { method: 'DELETE' }),

  // Projects
  getProjects: () => request('/projects'),
  getProject: (id: string) => request(`/projects/${id}`),
  createProject: (data: any) => request('/projects', { method: 'POST', body: data }),
  updateProject: (id: string, data: any) => request(`/projects/${id}`, { method: 'PUT', body: data }),
  deleteProject: (id: string) => request(`/projects/${id}`, { method: 'DELETE' }),

  // About
  getAboutProfile: () => request('/about'),
  createAbout: (data: any) => request('/about', { method: 'POST', body: data }),
  updateAbout: (id: string, data: any) => request(`/about/${id}`, { method: 'PUT', body: data }),

  // Uploads
  uploadProjectImage: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return request('/uploads/projects/cover-image', { method: 'POST', body: formData })
  },
  uploadBlogImage: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return request('/uploads/blogs/cover-image', { method: 'POST', body: formData })
  },
  uploadAboutImage: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return request('/uploads/about/image', { method: 'POST', body: formData })
  },
  uploadProfileImage: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return request('/uploads/profile-image', { method: 'POST', body: formData })
  },
}

// Backward compatibility for existing page components
export async function getProjects() { return api.getProjects() }
export async function getProject(id: string) { return api.getProject(id) }
export async function getAboutProfile() { return api.getAboutProfile() }
export async function getBlogPosts() { return api.getBlogPosts() }
export async function getBlogPost(id: string) { return api.getBlogPost(id) }
