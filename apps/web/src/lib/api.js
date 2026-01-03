const isDevelopment = process.env.NODE_ENV !== 'production';
const configuredBaseUrl = (process.env.REACT_APP_API_BASE_URL || '').trim();

const fallbackDevelopmentBase = 'http://127.0.0.1:8000/api';

if (!configuredBaseUrl && !isDevelopment) {
  throw new Error(
    'REACT_APP_API_BASE_URL must be defined for production builds. Set it via .env.production or build-time environment.',
  );
}

const API_BASE_URL = !isDevelopment ? '/api' : (configuredBaseUrl || fallbackDevelopmentBase);
const API_BASE = API_BASE_URL.replace(/\/$/, '');

// For SSO flows, we MUST use the direct API domain to maintain cookie consistency.
// The browser must navigate directly to the API (not through the proxy) so the
// session cookie is set on the same domain that receives the OAuth callback.
const SSO_API_BASE = (process.env.REACT_APP_SSO_API_BASE_URL || '').trim() || API_BASE;

const validateApiBaseUrl = (value) => {
  if (value.startsWith('/')) {
    return;
  }
  try {
    // eslint-disable-next-line no-new
    new URL(value);
  } catch (error) {
    throw new Error(`Invalid API base URL: ${value}. Must be an absolute URL or start with "/".`);
  }
};

validateApiBaseUrl(API_BASE_URL);

const GLOBAL_DATA_KEY = '__PORTFOLIO_DATA__';
const scriptPromises = new Map();

const structuredCloneFallback = (value) => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

const getCspNonce = () =>
  typeof document !== 'undefined'
    ? document.querySelector('meta[name="csp-nonce"]')?.content
    : null;

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const config = {
    method,
    headers: {
      Accept: 'application/json',
      ...headers,
    },
    credentials: 'include',
    cache: 'no-store', // Prevent browser/CDN caching of API responses
  };

  const isFormData =
    typeof FormData !== 'undefined' && body instanceof FormData;

  if (body !== undefined) {
    if (isFormData) {
      config.body = body;
    } else {
      config.headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(body);
    }
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, config);
  } catch (error) {
    if (error && typeof error === 'object') {
      error.isNetworkError = true;
    }
    throw error;
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const message = payload?.detail ?? 'Request failed';
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

const loadScriptData = (scriptPath, cacheKey) => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Script fallback is unavailable in this environment.'));
  }

  const existing = window[GLOBAL_DATA_KEY]?.[cacheKey];
  if (existing !== undefined) {
    return Promise.resolve(structuredCloneFallback(existing));
  }

  if (scriptPromises.has(cacheKey)) {
    return scriptPromises.get(cacheKey);
  }

  const nonce = getCspNonce();
  const promise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    if (nonce) {
      script.setAttribute('nonce', nonce);
    }
    script.src = `${API_BASE}${scriptPath}`;
    script.onload = () => {
      script.remove();
      const data = window[GLOBAL_DATA_KEY]?.[cacheKey];
      if (data === undefined) {
        reject(new Error(`Script loaded but no data found for ${cacheKey}`));
        return;
      }
      resolve(structuredCloneFallback(data));
    };
    script.onerror = () => {
      script.remove();
      reject(new Error(`Failed to load data script for ${cacheKey}`));
    };
    document.head.appendChild(script);
  }).finally(() => {
    scriptPromises.delete(cacheKey);
  });

  scriptPromises.set(cacheKey, promise);
  return promise;
};

const shouldAttemptFallback = (error) =>
  error?.isNetworkError === true || error?.status === undefined || error?.status === 0;

const requestWithFallback = (jsonPath, scriptPath, cacheKey) =>
  request(jsonPath).catch((error) => {
    if (!shouldAttemptFallback(error)) {
      throw error;
    }
    return loadScriptData(scriptPath, cacheKey).catch((fallbackErr) => {
      // Preserve the original error to aid debugging if fallback fails.
      console.warn(`Fallback script load failed for ${cacheKey}:`, fallbackErr);
      throw error;
    });
  });

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  session: () => request('/auth/session'),
  listSsoProviders: () => request('/auth/sso/providers'),
  ssoLogin: (provider) => {
    // Use SSO_API_BASE (direct API domain) to ensure cookie domain consistency
    // Pass the current path so user returns to the same page after login
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `${SSO_API_BASE}/auth/sso/${provider}/login?return_to=${returnTo}`;
  },

  // Blogs
  listBlogs: () => requestWithFallback('/blogs', '/blogs/data.js', 'blogs'),
  getBlog: async (id) => {
    try {
      return await request(`/blogs/${id}`);
    } catch (error) {
      if (!shouldAttemptFallback(error)) {
        throw error;
      }
      const data = await loadScriptData('/blogs/data.js', 'blogs');
      const match = data.find((item) => item.id === id);
      if (match) {
        return match;
      }
      throw error;
    }
  },
  createBlog: (data) => request('/blogs', { method: 'POST', body: data }),
  updateBlog: (id, data) => request(`/blogs/${id}`, { method: 'PUT', body: data }),
  deleteBlog: (id) => request(`/blogs/${id}`, { method: 'DELETE' }),
  listComments: (blogId) => request(`/blogs/${blogId}/comments`),
  postComment: (blogId, data) => request(`/blogs/${blogId}/comments`, { method: 'POST', body: data }),
  deleteComment: (blogId, commentId) => request(`/blogs/${blogId}/comments/${commentId}`, { method: 'DELETE' }),

  // Admin
  listAllComments: (includeDeleted = false) => request(`/admin/comments?include_deleted=${includeDeleted}`),
  adminDeleteComment: (commentId) => request(`/admin/comments/${commentId}`, { method: 'DELETE' }),

  // Projects
  listProjects: () => requestWithFallback('/projects', '/projects/data.js', 'projects'),
  getProject: async (id) => {
    try {
      return await request(`/projects/${id}`);
    } catch (error) {
      if (!shouldAttemptFallback(error)) {
        throw error;
      }
      const data = await loadScriptData('/projects/data.js', 'projects');
      const match = data.find((item) => item.id === id);
      if (match) {
        return match;
      }
      throw error;
    }
  },
  createProject: (data) => request('/projects', { method: 'POST', body: data }),
  updateProject: (id, data) => request(`/projects/${id}`, { method: 'PUT', body: data }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),

  // About profile
  getAbout: () => request('/about'),
  createAbout: (data) => request('/about', { method: 'POST', body: data }),
  updateAbout: (id, data) => request(`/about/${id}`, { method: 'PUT', body: data }),
  deleteAbout: (id) => request(`/about/${id}`, { method: 'DELETE' }),

  // Uploads
  uploadProfileImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/uploads/profile-image', {
      method: 'POST',
      body: formData,
      headers: { Accept: '*/*' },
    });
  },
  uploadAboutImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/uploads/about/image', {
      method: 'POST',
      body: formData,
      headers: { Accept: '*/*' },
    });
  },
  uploadBlogImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/uploads/blogs/cover-image', {
      method: 'POST',
      body: formData,
      headers: { Accept: '*/*' },
    });
  },
  uploadProjectImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/uploads/projects/cover-image', {
      method: 'POST',
      body: formData,
      headers: { Accept: '*/*' },
    });
  },
};

export default api;
