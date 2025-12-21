import React, { useEffect, useRef, useState } from 'react';
import { Save, Plus, Trash2, LogOut, RefreshCcw } from 'lucide-react';
import { api } from '../lib/api';
import { resolveMediaUrl } from '../lib/utils';

const emptyBlogForm = {
  title: '',
  excerpt: '',
  content: '',
  category: '',
  tags: '',
  published_at: '',
  read_time: '',
  image: '',
};

const emptyProjectForm = {
  title: '',
  description: '',
  category: '',
  tags: '',
  image: '',
  date_label: '',
  github: '',
  demo: '',
};

const emptyAboutForm = {
  name: '',
  title: '',
  bio: '',
  email: '',
  location: '',
  skills: '',
  profileImage: '',
  socialGithub: '',
  socialLinkedin: '',
  socialTwitter: '',
  socialHackerone: '',
  dogName: '',
  dogRole: '',
  dogBio: '',
  dogImage: '',
  dogSkills: '',
};

const toList = (value) =>
  value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

const Admin = () => {
  const [hasSession, setHasSession] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [blogs, setBlogs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [about, setAbout] = useState(null);
  const [aboutId, setAboutId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('blogs');

  const [blogForm, setBlogForm] = useState(emptyBlogForm);
  const [editingBlogId, setEditingBlogId] = useState(null);
  const [projectForm, setProjectForm] = useState(emptyProjectForm);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [aboutForm, setAboutForm] = useState(emptyAboutForm);
  const [profileImageUploading, setProfileImageUploading] = useState(false);
  const [dogImageUploading, setDogImageUploading] = useState(false);
  const [blogImageUploading, setBlogImageUploading] = useState(false);
  const [projectImageUploading, setProjectImageUploading] = useState(false);
  const profileImageInputRef = useRef(null);
  const dogImageInputRef = useRef(null);
  const blogImageInputRef = useRef(null);
  const projectImageInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const verifySession = async () => {
      try {
        const response = await api.session();
        if (!cancelled && response?.authenticated) {
          setHasSession(true);
        }
      } catch {
        if (!cancelled) {
          setHasSession(false);
        }
      }
    };

    verifySession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasSession) {
      return;
    }
    loadAllContent();
  }, [hasSession]);

  const setMessage = (message) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const resetSessionState = () => {
    setBlogs([]);
    setProjects([]);
    setAbout(null);
    setAboutId(null);
    setBlogForm(emptyBlogForm);
    setProjectForm(emptyProjectForm);
    setAboutForm(emptyAboutForm);
    setEditingBlogId(null);
    setEditingProjectId(null);
    setProfileImageUploading(false);
    setDogImageUploading(false);
    setBlogImageUploading(false);
    setProjectImageUploading(false);
  };

  const handleSessionExpired = () => {
    setHasSession(false);
    setError('Your session has expired. Please sign in again.');
    resetSessionState();
  };

  const handleRequestError = (err, fallbackMessage) => {
    if (err?.status === 401) {
      handleSessionExpired();
      return;
    }
    setError(err.message || fallbackMessage);
  };

  const loadAllContent = async () => {
    setLoading(true);
    setError(null);
    try {
      const [blogsResp, projectsResp] = await Promise.all([
        api.listBlogs(),
        api.listProjects(),
      ]);
      setBlogs(blogsResp ?? []);
      setProjects(projectsResp ?? []);

      try {
        const aboutResp = await api.getAbout();
        setAbout(aboutResp);
        setAboutId(aboutResp.id);
        setAboutForm({
          name: aboutResp.name ?? '',
          title: aboutResp.title ?? '',
          bio: aboutResp.bio ?? '',
          email: aboutResp.email ?? '',
          location: aboutResp.location ?? '',
          skills: (aboutResp.skills ?? []).join(', '),
          profileImage: aboutResp.profile_image ?? '',
          socialGithub: aboutResp.social?.github ?? '',
          socialLinkedin: aboutResp.social?.linkedin ?? '',
          socialTwitter: aboutResp.social?.twitter ?? '',
          socialHackerone: aboutResp.social?.hackerone ?? '',
          dogName: aboutResp.dog?.name ?? '',
          dogRole: aboutResp.dog?.role ?? '',
          dogBio: aboutResp.dog?.bio ?? '',
          dogImage: aboutResp.dog?.image ?? '',
          dogSkills: (aboutResp.dog?.skills ?? []).join(', '),
        });
      } catch {
        setAbout(null);
        setAboutId(null);
        setAboutForm(emptyAboutForm);
      }
    } catch (err) {
      setError(err.message || 'Failed to load content.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    try {
      const credentials = {
        email: loginForm.email.trim(),
        password: loginForm.password,
      };
      await api.login(credentials);
      setHasSession(true);
      setLoginForm({ email: '', password: '' });
      setMessage('Signed in successfully.');
      await loadAllContent();
    } catch (err) {
      if (err?.status === 401) {
        setHasSession(false);
      }
      setError(err.message || 'Login failed.');
    }
  };

  const handleLogout = async () => {
    if (!hasSession) {
      resetSessionState();
      return;
    }

    try {
      await api.logout();
    } catch (err) {
      // Keep the UI responsive even if logout fails; surface meaningful errors.
      setError(err.message || 'Failed to sign out cleanly.');
    } finally {
      setHasSession(false);
      resetSessionState();
    }
  };


  const handleProfileImageFileChange = async (event) => {
    if (!hasSession) {
      handleSessionExpired();
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;

    setProfileImageUploading(true);
    setError(null);

    try {
      const response = await api.uploadProfileImage(file);
      setAboutForm((prev) => ({
        ...prev,
        profileImage: response.url,
      }));
      setMessage('Profile image uploaded.');
    } catch (err) {
      handleRequestError(err, 'Failed to upload profile image.');
    } finally {
      setProfileImageUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleProfileImageUploadClick = () => {
    profileImageInputRef.current?.click();
  };

  const handleDogImageFileChange = async (event) => {
    if (!hasSession) {
      handleSessionExpired();
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;

    setDogImageUploading(true);
    setError(null);

    try {
      const response = await api.uploadAboutImage(file);
      setAboutForm((prev) => ({
        ...prev,
        dogImage: response.url,
      }));
      setMessage('Dog image uploaded.');
    } catch (err) {
      handleRequestError(err, 'Failed to upload dog image.');
    } finally {
      setDogImageUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleDogImageUploadClick = () => {
    dogImageInputRef.current?.click();
  };

  const handleBlogImageFileChange = async (event) => {
    if (!hasSession) {
      handleSessionExpired();
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;

    setBlogImageUploading(true);
    setError(null);

    try {
      const response = await api.uploadBlogImage(file);
      setBlogForm((prev) => ({
        ...prev,
        image: response.url,
      }));
      setMessage('Blog image uploaded.');
    } catch (err) {
      handleRequestError(err, 'Failed to upload blog image.');
    } finally {
      setBlogImageUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleBlogImageUploadClick = () => {
    blogImageInputRef.current?.click();
  };

  const handleProjectImageFileChange = async (event) => {
    if (!hasSession) {
      handleSessionExpired();
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;

    setProjectImageUploading(true);
    setError(null);

    try {
      const response = await api.uploadProjectImage(file);
      setProjectForm((prev) => ({
        ...prev,
        image: response.url,
      }));
      setMessage('Project image uploaded.');
    } catch (err) {
      handleRequestError(err, 'Failed to upload project image.');
    } finally {
      setProjectImageUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleProjectImageUploadClick = () => {
    projectImageInputRef.current?.click();
  };

  const handleBlogSubmit = async (event) => {
    event.preventDefault();
    if (!hasSession) {
      handleSessionExpired();
      return;
    }

    const payload = {
      title: blogForm.title.trim(),
      excerpt: blogForm.excerpt.trim(),
      content: blogForm.content,
      category: blogForm.category.trim(),
      tags: toList(blogForm.tags),
      published_at: blogForm.published_at,
      read_time: blogForm.read_time.trim(),
      image: blogForm.image.trim() || null,
    };

    try {
      if (editingBlogId) {
        await api.updateBlog(editingBlogId, payload);
        setMessage('Blog post updated.');
      } else {
        await api.createBlog(payload);
        setMessage('Blog post created.');
      }
      setBlogForm(emptyBlogForm);
      setEditingBlogId(null);
      await loadAllContent();
    } catch (err) {
      handleRequestError(err, 'Unable to save blog post.');
    }
  };

  const handleBlogEdit = (entry) => {
    setEditingBlogId(entry.id);
    setBlogForm({
      title: entry.title ?? '',
      excerpt: entry.excerpt ?? '',
      content: entry.content ?? '',
      category: entry.category ?? '',
      tags: (entry.tags ?? []).join(', '),
      published_at: entry.published_at ?? '',
      read_time: entry.read_time ?? '',
      image: entry.image ?? '',
    });
    setActiveTab('blogs');
  };

  const handleBlogDelete = async (id) => {
    if (!hasSession) {
      handleSessionExpired();
      return;
    }
    if (!window.confirm('Delete this blog post?')) return;
    try {
      await api.deleteBlog(id);
      setMessage('Blog post deleted.');
      await loadAllContent();
    } catch (err) {
      handleRequestError(err, 'Unable to delete blog post.');
    }
  };

  const handleProjectSubmit = async (event) => {
    event.preventDefault();
    if (!hasSession) {
      handleSessionExpired();
      return;
    }

    const payload = {
      title: projectForm.title.trim(),
      description: projectForm.description,
      category: projectForm.category.trim(),
      tags: toList(projectForm.tags),
      image: projectForm.image.trim() || null,
      date_label: projectForm.date_label.trim() || null,
      github: projectForm.github.trim() || null,
      demo: projectForm.demo.trim() || null,
    };

    try {
      if (editingProjectId) {
        await api.updateProject(editingProjectId, payload);
        setMessage('Project updated.');
      } else {
        await api.createProject(payload);
        setMessage('Project created.');
      }
      setProjectForm(emptyProjectForm);
      setEditingProjectId(null);
      await loadAllContent();
    } catch (err) {
      handleRequestError(err, 'Unable to save project.');
    }
  };

  const handleProjectEdit = (entry) => {
    setEditingProjectId(entry.id);
    setProjectForm({
      title: entry.title ?? '',
      description: entry.description ?? '',
      category: entry.category ?? '',
      tags: (entry.tags ?? []).join(', '),
      image: entry.image ?? '',
      date_label: entry.date_label ?? '',
      github: entry.github ?? '',
      demo: entry.demo ?? '',
    });
    setActiveTab('projects');
  };

  const handleProjectDelete = async (id) => {
    if (!hasSession) {
      handleSessionExpired();
      return;
    }
    if (!window.confirm('Delete this project?')) return;
    try {
      await api.deleteProject(id);
      setMessage('Project deleted.');
      await loadAllContent();
    } catch (err) {
      handleRequestError(err, 'Unable to delete project.');
    }
  };

  const handleAboutSubmit = async (event) => {
    event.preventDefault();
    if (!hasSession) {
      handleSessionExpired();
      return;
    }

    const payload = {
      name: aboutForm.name.trim(),
      title: aboutForm.title.trim(),
      bio: aboutForm.bio,
      email: aboutForm.email.trim(),
      location: aboutForm.location.trim(),
      skills: toList(aboutForm.skills),
      profile_image: aboutForm.profileImage.trim() || null,
      social: {
        github: aboutForm.socialGithub.trim() || null,
        linkedin: aboutForm.socialLinkedin.trim() || null,
        twitter: aboutForm.socialTwitter.trim() || null,
        hackerone: aboutForm.socialHackerone.trim() || null,
      },
      dog: aboutForm.dogName
        ? {
          name: aboutForm.dogName.trim(),
          role: aboutForm.dogRole.trim(),
          bio: aboutForm.dogBio,
          image: aboutForm.dogImage.trim() || null,
          skills: toList(aboutForm.dogSkills),
        }
        : null,
    };

    try {
      if (aboutId) {
        await api.updateAbout(aboutId, payload);
        setMessage('About profile updated.');
      } else {
        const created = await api.createAbout(payload);
        setAboutId(created.id);
        setMessage('About profile created.');
      }
      await loadAllContent();
    } catch (err) {
      handleRequestError(err, 'Unable to save about profile.');
    }
  };

  const tabButton = (id, label) => (
    <button
      key={id}
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === id
        ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/50'
        : 'text-gray-300 hover:text-white hover:bg-white/10'
        }`}
    >
      {label}
    </button>
  );

  const loggedOutView = (
    <div className="max-w-md mx-auto bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8">
      <h2 className="text-2xl font-bold text-white mb-6 text-center">Admin Sign In</h2>
      <form className="space-y-5" onSubmit={handleLoginSubmit}>
        <div>
          <label className="block text-sm text-gray-300 mb-2" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={loginForm.email}
            onChange={(event) =>
              setLoginForm((prev) => ({ ...prev, email: event.target.value }))
            }
            className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
            required
            autoComplete="email"
            inputMode="email"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={loginForm.password}
            onChange={(event) =>
              setLoginForm((prev) => ({ ...prev, password: event.target.value }))
            }
            className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
            required
            autoComplete="current-password"
          />
        </div>
        <button
          type="submit"
          className="w-full inline-flex justify-center items-center gap-2 px-4 py-2 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 transition-colors"
        >
          Sign In
        </button>
      </form>
      {error && (
        <p className="text-red-400 text-sm mt-4 text-center" role="alert">
          {error}
        </p>
      )}
    </div>
  );

  const loggedInView = (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">Content Management</h2>
          <p className="text-gray-400 text-sm">
            Manage site content. All changes take effect immediately.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadAllContent}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-200 rounded-lg transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      <div className="flex gap-3 mb-8">{['blogs', 'projects', 'about'].map((tab) => {
        const labelMap = { blogs: 'Blogs', projects: 'Projects', about: 'About' };
        return tabButton(tab, labelMap[tab]);
      })}</div>

      {statusMessage && (
        <div className="mb-6 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-emerald-200">
          {statusMessage}
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-red-200">
          {error}
        </div>
      )}

      {loading && (
        <div className="mb-6 text-gray-300">Loading content...</div>
      )}

      {!loading && activeTab === 'blogs' && (
        <div className="grid gap-8 md:grid-cols-[2fr,1fr]">
          <form
            onSubmit={handleBlogSubmit}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">
                {editingBlogId ? 'Edit Blog Post' : 'New Blog Post'}
              </h3>
              {editingBlogId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingBlogId(null);
                    setBlogForm(emptyBlogForm);
                  }}
                  className="text-sm text-cyan-300 hover:text-cyan-200"
                >
                  Cancel edit
                </button>
              )}
            </div>
            <input
              type="text"
              value={blogForm.title}
              onChange={(event) => setBlogForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Title"
              className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
              required
            />
            <input
              type="text"
              value={blogForm.excerpt}
              onChange={(event) =>
                setBlogForm((prev) => ({ ...prev, excerpt: event.target.value }))
              }
              placeholder="Excerpt"
              className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={blogForm.category}
                onChange={(event) =>
                  setBlogForm((prev) => ({ ...prev, category: event.target.value }))
                }
                placeholder="Category"
                className="px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                required
              />
              <input
                type="date"
                value={blogForm.published_at}
                onChange={(event) =>
                  setBlogForm((prev) => ({ ...prev, published_at: event.target.value }))
                }
                className="px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                required
              />
              <input
                type="text"
                value={blogForm.read_time}
                onChange={(event) =>
                  setBlogForm((prev) => ({ ...prev, read_time: event.target.value }))
                }
                placeholder="Read time (e.g. 5 min)"
                className="px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                required
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm text-gray-300">Hero image</label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={blogForm.image}
                  onChange={(event) =>
                    setBlogForm((prev) => ({ ...prev, image: event.target.value }))
                  }
                  placeholder="Hero image URL or path"
                  className="flex-1 min-w-[12rem] px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                />
                <input
                  ref={blogImageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handleBlogImageFileChange}
                />
                <button
                  type="button"
                  onClick={handleBlogImageUploadClick}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-gray-200 rounded-lg transition-colors"
                  disabled={blogImageUploading}
                >
                  Upload
                </button>
                {blogImageUploading && (
                  <span className="text-sm text-gray-400">Uploading…</span>
                )}
              </div>
            </div>
            {blogForm.image && (
              <div className="flex flex-wrap items-center gap-4 rounded-lg border border-white/10 bg-black/30 p-4">
                <img
                  src={resolveMediaUrl(blogForm.image)}
                  alt="Blog hero preview"
                  className="h-24 w-24 object-cover rounded-lg border border-white/10"
                />
                <div className="flex flex-col gap-2">
                  <code className="text-xs text-gray-400 bg-black/40 px-2 py-1 rounded">
                    {blogForm.image}
                  </code>
                  <button
                    type="button"
                    onClick={() => setBlogForm((prev) => ({ ...prev, image: '' }))}
                    className="self-start text-xs text-red-300 hover:text-red-200 transition-colors"
                  >
                    Remove image
                  </button>
                </div>
              </div>
            )}
            <textarea
              value={blogForm.content}
              onChange={(event) =>
                setBlogForm((prev) => ({ ...prev, content: event.target.value }))
              }
              placeholder="Content (HTML allowed)"
              rows={8}
              className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
              required
            />
            <input
              type="text"
              value={blogForm.tags}
              onChange={(event) =>
                setBlogForm((prev) => ({ ...prev, tags: event.target.value }))
              }
              placeholder="Tags (comma separated)"
              className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 transition-colors"
            >
              <Save className="w-4 h-4" />
              {editingBlogId ? 'Update Post' : 'Create Post'}
            </button>
          </form>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Existing Posts</h3>
              <span className="text-sm text-gray-400">{blogs.length} total</span>
            </div>
            <div className="space-y-3 max-h-[32rem] overflow-y-auto pr-1">
              {blogs.map((post) => (
                <div
                  key={post.id}
                  className="bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col gap-3"
                >
                  <div>
                    <p className="text-sm text-gray-500">
                      {post.category} •{' '}
                      {post.published_at
                        ? new Date(post.published_at).toLocaleDateString()
                        : 'Unscheduled'}
                    </p>
                    <h4 className="text-lg font-semibold text-white">{post.title}</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleBlogEdit(post)}
                      className="inline-flex items-center gap-2 px-3 py-1 text-sm rounded-lg bg-white/10 hover:bg-white/20 text-gray-200 transition-colors"
                    >
                      <Plus className="w-4 h-4 rotate-45" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleBlogDelete(post.id)}
                      className="inline-flex items-center gap-2 px-3 py-1 text-sm rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {blogs.length === 0 && (
                <p className="text-gray-400 text-sm">No blog posts yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && activeTab === 'projects' && (
        <div className="grid gap-8 md:grid-cols-[2fr,1fr]">
          <form
            onSubmit={handleProjectSubmit}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">
                {editingProjectId ? 'Edit Project' : 'New Project'}
              </h3>
              {editingProjectId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingProjectId(null);
                    setProjectForm(emptyProjectForm);
                  }}
                  className="text-sm text-cyan-300 hover:text-cyan-200"
                >
                  Cancel edit
                </button>
              )}
            </div>
            <input
              type="text"
              value={projectForm.title}
              onChange={(event) =>
                setProjectForm((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="Title"
              className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
              required
            />
            <textarea
              value={projectForm.description}
              onChange={(event) =>
                setProjectForm((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="Description (HTML allowed)"
              rows={6}
              className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={projectForm.category}
                onChange={(event) =>
                  setProjectForm((prev) => ({ ...prev, category: event.target.value }))
                }
                placeholder="Category"
                className="px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                required
              />
              <input
                type="text"
                value={projectForm.date_label}
                onChange={(event) =>
                  setProjectForm((prev) => ({ ...prev, date_label: event.target.value }))
                }
                placeholder="Date label (e.g. 2024-12)"
                className="px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
              />
              <input
                type="text"
                value={projectForm.tags}
                onChange={(event) =>
                  setProjectForm((prev) => ({ ...prev, tags: event.target.value }))
                }
                placeholder="Tags (comma separated)"
                className="px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm text-gray-300">Project image</label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={projectForm.image}
                  onChange={(event) =>
                    setProjectForm((prev) => ({ ...prev, image: event.target.value }))
                  }
                  placeholder="Image URL or path"
                  className="flex-1 min-w-[12rem] px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                />
                <input
                  ref={projectImageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handleProjectImageFileChange}
                />
                <button
                  type="button"
                  onClick={handleProjectImageUploadClick}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-gray-200 rounded-lg transition-colors"
                  disabled={projectImageUploading}
                >
                  Upload
                </button>
                {projectImageUploading && (
                  <span className="text-sm text-gray-400">Uploading…</span>
                )}
              </div>
            </div>
            {projectForm.image && (
              <div className="flex flex-wrap items-center gap-4 rounded-lg border border-white/10 bg-black/30 p-4">
                <img
                  src={resolveMediaUrl(projectForm.image)}
                  alt="Project preview"
                  className="h-24 w-24 object-cover rounded-lg border border-white/10"
                />
                <div className="flex flex-col gap-2">
                  <code className="text-xs text-gray-400 bg-black/40 px-2 py-1 rounded">
                    {projectForm.image}
                  </code>
                  <button
                    type="button"
                    onClick={() => setProjectForm((prev) => ({ ...prev, image: '' }))}
                    className="self-start text-xs text-red-300 hover:text-red-200 transition-colors"
                  >
                    Remove image
                  </button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="url"
                value={projectForm.github}
                onChange={(event) =>
                  setProjectForm((prev) => ({ ...prev, github: event.target.value }))
                }
                placeholder="GitHub URL"
                className="px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
              />
              <input
                type="url"
                value={projectForm.demo}
                onChange={(event) =>
                  setProjectForm((prev) => ({ ...prev, demo: event.target.value }))
                }
                placeholder="Demo URL"
                className="px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 transition-colors"
            >
              <Save className="w-4 h-4" />
              {editingProjectId ? 'Update Project' : 'Create Project'}
            </button>
          </form>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Existing Projects</h3>
              <span className="text-sm text-gray-400">{projects.length} total</span>
            </div>
            <div className="space-y-3 max-h-[32rem] overflow-y-auto pr-1">
              {projects.map((item) => (
                <div
                  key={item.id}
                  className="bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col gap-3"
                >
                  <div>
                    <p className="text-sm text-gray-500">{item.category}</p>
                    <h4 className="text-lg font-semibold text-white">{item.title}</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleProjectEdit(item)}
                      className="inline-flex items-center gap-2 px-3 py-1 text-sm rounded-lg bg-white/10 hover:bg-white/20 text-gray-200 transition-colors"
                    >
                      <Plus className="w-4 h-4 rotate-45" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleProjectDelete(item.id)}
                      className="inline-flex items-center gap-2 px-3 py-1 text-sm rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {projects.length === 0 && (
                <p className="text-gray-400 text-sm">No projects yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && activeTab === 'about' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">About Profile</h3>
            {about && (
              <span className="text-sm text-gray-400">
                Last updated:{' '}
                {about.updated_at
                  ? new Date(about.updated_at).toLocaleString()
                  : '—'}
              </span>
            )}
          </div>
          <form className="grid gap-6" onSubmit={handleAboutSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={aboutForm.name}
                onChange={(event) =>
                  setAboutForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Name"
                className="px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                required
              />
              <input
                type="text"
                value={aboutForm.title}
                onChange={(event) =>
                  setAboutForm((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="Headline"
                className="px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                required
              />
              <input
                type="email"
                value={aboutForm.email}
                onChange={(event) =>
                  setAboutForm((prev) => ({ ...prev, email: event.target.value }))
                }
                placeholder="Email"
                className="px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                required
              />
              <input
                type="text"
                value={aboutForm.location}
                onChange={(event) =>
                  setAboutForm((prev) => ({ ...prev, location: event.target.value }))
                }
                placeholder="Location"
                className="px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                required
              />
            </div>
            <textarea
              value={aboutForm.bio}
              onChange={(event) =>
                setAboutForm((prev) => ({ ...prev, bio: event.target.value }))
              }
              placeholder="Bio (HTML allowed)"
              rows={6}
              className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
              required
            />
            <input
              type="text"
              value={aboutForm.skills}
              onChange={(event) =>
                setAboutForm((prev) => ({ ...prev, skills: event.target.value }))
              }
              placeholder="Skills (comma separated)"
              className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
            />
            <input
              type="text"
              value={aboutForm.profileImage}
              onChange={(event) =>
                setAboutForm((prev) => ({ ...prev, profileImage: event.target.value }))
              }
              placeholder="Profile image URL or path (optional)"
              className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
            />
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={profileImageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleProfileImageFileChange}
              />
              <button
                type="button"
                onClick={handleProfileImageUploadClick}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-200 rounded-lg transition-colors"
                disabled={profileImageUploading}
              >
                Upload Profile Photo
              </button>
              {profileImageUploading && (
                <span className="text-sm text-gray-400">Uploading…</span>
              )}
            </div>
            {aboutForm.profileImage && (
              <div className="flex flex-wrap items-center gap-4">
                <img
                  src={resolveMediaUrl(aboutForm.profileImage)}
                  alt="Profile preview"
                  className="h-24 w-24 object-cover rounded-lg border border-white/10 shadow-lg shadow-cyan-500/10"
                />
                <div className="flex flex-col gap-2">
                  <code className="text-xs text-gray-400 bg-black/30 px-2 py-1 rounded">
                    {aboutForm.profileImage}
                  </code>
                  <button
                    type="button"
                    onClick={() =>
                      setAboutForm((prev) => ({ ...prev, profileImage: '' }))
                    }
                    className="self-start text-xs text-red-300 hover:text-red-200 transition-colors"
                  >
                    Remove image
                  </button>
                </div>
              </div>
            )}

            <div>
              <h4 className="text-lg font-semibold text-white mb-3">Social Links</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="url"
                  value={aboutForm.socialGithub}
                  onChange={(event) =>
                    setAboutForm((prev) => ({ ...prev, socialGithub: event.target.value }))
                  }
                  placeholder="GitHub URL"
                  className="px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                />
                <input
                  type="url"
                  value={aboutForm.socialLinkedin}
                  onChange={(event) =>
                    setAboutForm((prev) => ({ ...prev, socialLinkedin: event.target.value }))
                  }
                  placeholder="LinkedIn URL"
                  className="px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                />
                <input
                  type="url"
                  value={aboutForm.socialTwitter}
                  onChange={(event) =>
                    setAboutForm((prev) => ({ ...prev, socialTwitter: event.target.value }))
                  }
                  placeholder="Twitter URL"
                  className="px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                />
                <input
                  type="url"
                  value={aboutForm.socialHackerone}
                  onChange={(event) =>
                    setAboutForm((prev) => ({ ...prev, socialHackerone: event.target.value }))
                  }
                  placeholder="HackerOne URL"
                  className="px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white mb-3">Dog Profile (optional)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={aboutForm.dogName}
                  onChange={(event) =>
                    setAboutForm((prev) => ({ ...prev, dogName: event.target.value }))
                  }
                  placeholder="Name"
                  className="px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                />
                <input
                  type="text"
                  value={aboutForm.dogRole}
                  onChange={(event) =>
                    setAboutForm((prev) => ({ ...prev, dogRole: event.target.value }))
                  }
                  placeholder="Role"
                  className="px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                />
                <input
                  type="text"
                  value={aboutForm.dogImage}
                  onChange={(event) =>
                    setAboutForm((prev) => ({ ...prev, dogImage: event.target.value }))
                  }
                  placeholder="Image URL"
                  className="px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                />
                <input
                  type="text"
                  value={aboutForm.dogSkills}
                  onChange={(event) =>
                    setAboutForm((prev) => ({ ...prev, dogSkills: event.target.value }))
                  }
                  placeholder="Skills (comma separated)"
                  className="px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
              <textarea
                value={aboutForm.dogBio}
                onChange={(event) =>
                  setAboutForm((prev) => ({ ...prev, dogBio: event.target.value }))
                }
                placeholder="Bio (HTML allowed)"
                rows={4}
                className="mt-4 w-full px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
              />
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <input
                  ref={dogImageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handleDogImageFileChange}
                />
                <button
                  type="button"
                  onClick={handleDogImageUploadClick}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-200 rounded-lg transition-colors"
                  disabled={dogImageUploading}
                >
                  Upload Dog Photo
                </button>
                {dogImageUploading && (
                  <span className="text-sm text-gray-400">Uploading…</span>
                )}
              </div>
              {aboutForm.dogImage && (
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <img
                    src={resolveMediaUrl(aboutForm.dogImage)}
                    alt="Dog preview"
                    className="h-24 w-24 object-cover rounded-lg border border-white/10"
                  />
                  <div className="flex flex-col gap-2">
                    <code className="text-xs text-gray-400 bg-black/30 px-2 py-1 rounded">
                      {aboutForm.dogImage}
                    </code>
                    <button
                      type="button"
                      onClick={() =>
                        setAboutForm((prev) => ({ ...prev, dogImage: '' }))
                      }
                      className="self-start text-xs text-red-300 hover:text-red-200 transition-colors"
                    >
                      Remove dog image
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 transition-colors"
            >
              <Save className="w-4 h-4" />
              {aboutId ? 'Update Profile' : 'Create Profile'}
            </button>
          </form>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">Admin Dashboard</h1>
        {hasSession ? loggedInView : loggedOutView}
      </div>
    </div>
  );
};

export default Admin;
