import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Github, ExternalLink, Clock } from 'lucide-react';
import ResponsiveSection from '../components/layout/ResponsiveSection';
import { useBreakpoint } from '../hooks/use-breakpoint';
import { api } from '../lib/api';

const Home = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [projects, setProjects] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsVisible(true);
    let cancelled = false;

    const loadData = async () => {
      try {
        const [projectsResp, blogsResp] = await Promise.all([
          api.listProjects(),
          api.listBlogs(),
        ]);
        if (!cancelled) {
          setProjects(projectsResp ?? []);
          setBlogs(blogsResp ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load featured content.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const categoryKey = (value) =>
    value ? value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';

  const getCategoryColor = (category) => {
    const colors = {
      'bug-bounty': 'text-amber-400 bg-amber-400/10 border-amber-400/20',
      'software-dev': 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
      'science': 'text-violet-400 bg-violet-400/10 border-violet-400/20',
      'personal': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    };
    return colors[category] || 'text-gray-400 bg-gray-400/10 border-gray-400/20';
  };

  const stripHtml = (value) =>
    typeof value === 'string' ? value.replace(/<[^>]+>/g, '') : '';

  const featuredProjects = useMemo(() => projects.slice(0, 3), [projects]);
  const latestBlogs = useMemo(() => blogs.slice(0, 3), [blogs]);
  const { isMobile } = useBreakpoint();

  const openExternal = useCallback((event, url) => {
    event.preventDefault();
    event.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black">
      {/* Hero Section */}
      <ResponsiveSection
        as="section"
        className="relative flex min-h-[80vh] items-center justify-center overflow-hidden"
        containerClassName="py-24 sm:py-32"
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a1a_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_110%)]" />

        <div
          className={`relative transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
        >
          <div className="mx-auto max-w-4xl space-y-6 text-left md:text-center">
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
                to="/projects"
                className="inline-flex w-full items-center justify-center rounded-xl bg-cyan-500 px-8 py-4 text-base font-semibold text-black transition-all duration-300 hover:scale-105 hover:bg-cyan-400 hover:shadow-lg hover:shadow-cyan-500/40 sm:w-auto"
              >
                View Projects
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link
                to="/about"
                className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-white transition-all duration-300 hover:bg-white/10 sm:w-auto"
              >
                About Me
              </Link>
            </div>
          </div>
        </div>
      </ResponsiveSection>

      {/* Featured Projects */}
      <ResponsiveSection as="section" className="py-24">
        <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Highlights</p>
            <h2 className="text-4xl font-bold text-white">Featured Projects</h2>
          </div>
          <Link
            to="/projects"
            className="inline-flex items-center justify-center rounded-full border border-white/10 px-5 py-2 text-sm font-semibold text-cyan-400 transition-colors hover:border-cyan-400/50 hover:text-cyan-300"
          >
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>

        {error && !loading && (
          <div className="mb-8 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div
          className={
            isMobile
              ? '-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-6'
              : 'grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3'
          }
        >
          {featuredProjects.map((project, index) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className={`group rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/50 hover:shadow-2xl hover:shadow-cyan-500/20 ${isMobile ? 'min-w-[85%] snap-center' : ''
                }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="aspect-video overflow-hidden rounded-t-2xl">
                {project.image && (
                  <img
                    src={project.image}
                    alt={project.title}
                    crossOrigin="anonymous"
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
                    {stripHtml(project.description)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {project.tags?.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-full bg-white/5 px-2 py-1 text-xs text-gray-400">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex gap-6 pt-2 text-sm text-gray-400">
                  {project.github && (
                    <button
                      type="button"
                      onClick={(event) => openExternal(event, project.github)}
                      className="inline-flex items-center gap-1 transition-colors hover:text-cyan-400"
                    >
                      <Github className="h-4 w-4" />
                      Code
                    </button>
                  )}
                  {project.demo && (
                    <button
                      type="button"
                      onClick={(event) => openExternal(event, project.demo)}
                      className="inline-flex items-center gap-1 transition-colors hover:text-cyan-400"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Demo
                    </button>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </ResponsiveSection>

      {/* Latest Blog Posts */}
      <ResponsiveSection as="section" className="bg-white/5 py-24">
        <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Writing</p>
            <h2 className="text-4xl font-bold text-white">Latest Blogs</h2>
          </div>
          <Link
            to="/blog"
            className="inline-flex items-center justify-center rounded-full border border-white/10 px-5 py-2 text-sm font-semibold text-cyan-400 transition-colors hover:border-cyan-400/50 hover:text-cyan-300"
          >
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>

        <div
          className={
            isMobile
              ? '-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-6'
              : 'grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3'
          }
        >
          {latestBlogs.map((blog, index) => (
            <Link
              key={blog.id}
              to={`/blog/${blog.id}`}
              className={`group rounded-2xl border border-white/10 bg-black/60 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/50 hover:shadow-2xl hover:shadow-cyan-500/20 ${isMobile ? 'min-w-[85%] snap-center' : ''
                }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="aspect-video overflow-hidden rounded-t-2xl">
                {blog.image && (
                  <img
                    src={blog.image}
                    alt={blog.title}
                    crossOrigin="anonymous"
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
                    {blog.read_time}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white transition-colors group-hover:text-cyan-400">
                    {blog.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm text-gray-400">{blog.excerpt}</p>
                </div>
                <time className="text-xs text-gray-500">
                  {blog.published_at
                    ? new Date(blog.published_at).toLocaleDateString('en-US', {
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
      </ResponsiveSection>
    </div>
  );
};

export default Home;
