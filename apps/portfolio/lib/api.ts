const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.jaintp.com'

export async function fetchFromApi(endpoint: string) {
  // Ensure we use the /api prefix which is required by the Python backend
  const res = await fetch(`${API_URL}/api${endpoint}`, {
    next: { revalidate: 3600 }, // Cache for 1 hour
  })
  
  if (!res.ok) {
    throw new Error(`Failed to fetch from API: ${res.statusText}`)
  }
  
  return res.json()
}

export async function getProjects() {
  return fetchFromApi('/projects')
}

export async function getProject(id: string) {
  return fetchFromApi(`/projects/${id}`)
}

export async function getAboutProfile() {
  return fetchFromApi('/about')
}

export async function getBlogPosts() {
  return fetchFromApi('/blogs')
}

export async function getBlogPost(id: string) {
  return fetchFromApi(`/blogs/${id}`)
}
