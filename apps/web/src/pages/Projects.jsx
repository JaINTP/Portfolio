import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Github, ExternalLink, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { sanitizeHtml } from '../lib/sanitizeHtml';
import ResponsiveSection from '../components/layout/ResponsiveSection';
import { useBreakpoint } from '../hooks/use-breakpoint';

const Projects = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [projects, setProjects] = useState([]);
  const [sortOrder, setSortOrder] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const categoryTrackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadProjects = async () => {
      try {
        const data = await api.listProjects();
        if (!cancelled) {
          setProjects(data ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load projects.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  const categoryKey = (value) =>
    value ? value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';

  const sortOptions = [
    { value: 'desc', label: 'Newest first' },
    { value: 'asc', label: 'Oldest first' },
  ];

  const categories = useMemo(() => {
    const unique = new Map();
    projects.forEach((project) => {
      const key = categoryKey(project.category);
      if (key) {
        unique.set(key, project.category);
      }
    });

    const colorMap = {
      'bug-bounty': 'amber',
      'software-dev': 'cyan',
      science: 'violet',
      personal: 'emerald',
    };

    return [
      { id: 'all', label: 'All Projects', color: 'cyan' },
      ...Array.from(unique.entries()).map(([id, label]) => ({
        id,
        label,
        color: colorMap[id] ?? 'cyan',
      })),
    ];
  }, [projects]);

  const sortedProjects = useMemo(() => {
    const copy = [...projects];
    const isAscending = sortOrder === 'asc';
    const resolveTimestamp = (entry) => {
      const source = entry?.created_at ?? entry?.updated_at;
      if (!source) return 0;
      const value = new Date(source).getTime();
      return Number.isNaN(value) ? 0 : value;
    };
    return copy.sort((a, b) => {
      const aTime = resolveTimestamp(a);
      const bTime = resolveTimestamp(b);
      return isAscending ? aTime - bTime : bTime - aTime;
    });
  }, [projects, sortOrder]);

  const sanitisedProjects = useMemo(
    () =>
      sortedProjects.map((project) => ({
        ...project,
        description_safe: sanitizeHtml(project?.description ?? ''),
      })),
    [sortedProjects]
  );

  const filteredProjects = useMemo(() => {
    if (selectedCategory === 'all') {
      return sanitisedProjects;
    }
    return sanitisedProjects.filter((project) => categoryKey(project.category) === selectedCategory);
  }, [selectedCategory, sanitisedProjects]);

  const getCategoryColor = (category) => {
    const colors = {
      'bug-bounty': 'text-amber-400 bg-amber-400/10 border-amber-400/20',
      'software-dev': 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
      'science': 'text-violet-400 bg-violet-400/10 border-violet-400/20',
    };
    return colors[category] || 'text-gray-400 bg-gray-400/10 border-gray-400/20';
  };

  const getButtonColor = (categoryId) =>
    categories.find((c) => c.id === categoryId)?.color ?? 'cyan';

  const openExternal = useCallback((event, url) => {
    event.preventDefault();
    event.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const updateCategoryScroll = useCallback(() => {
    const node = categoryTrackRef.current;
    if (!node) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = node;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateCategoryScroll();
  }, [categories, updateCategoryScroll]);

  useEffect(() => {
    const node = categoryTrackRef.current;
    if (!node) {
      return;
    }
    updateCategoryScroll();
    const handleScroll = () => updateCategoryScroll();
    node.addEventListener('scroll', handleScroll, { passive: true });
    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(updateCategoryScroll)
        : null;
    if (resizeObserver) {
      resizeObserver.observe(node);
    }
    return () => {
      node.removeEventListener('scroll', handleScroll);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [updateCategoryScroll]);

  const scrollCategories = (direction) => {
    const node = categoryTrackRef.current;
    if (!node) return;
    node.scrollBy({
      left: direction * 240,
      behavior: 'smooth',
    });
  };

  const { isMobile } = useBreakpoint();

  const renderCategoryButton = (category, options = {}) => {
    const color = getButtonColor(category.id);
    const isActive = selectedCategory === category.id;
    const baseClasses =
      'px-5 py-2 rounded-full font-medium whitespace-nowrap border transition-all duration-300';
    return (
      <button
        type="button"
        key={category.id}
        onClick={() => setSelectedCategory(category.id)}
        className={`${baseClasses} ${options.extraClasses ?? ''} ${isActive
            ? 'text-black shadow-lg'
            : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
          }`}
        style={
          isActive
            ? {
              backgroundColor:
                color === 'amber'
                  ? '#f59e0b'
                  : color === 'cyan'
                    ? '#06b6d4'
                    : color === 'emerald'
                      ? '#10b981'
                      : '#8b5cf6',
            }
            : {}
        }
      >
        {category.label}
      </button>
    );
  };

  const mobileCategories = categories;
  const desktopCategories = categories.filter((category) => category.id !== 'all');

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black pt-24 pb-16">
      {isMobile && (
        <ResponsiveSection as="div" className="md:hidden">
          <div className="sticky top-[4.5rem] z-40 -mx-4 rounded-2xl border border-white/10 bg-black/80 px-4 py-4 backdrop-blur-xl shadow-2xl shadow-black/40">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
                Categories
              </span>
              <span className="text-xs text-gray-400">{filteredProjects.length} items</span>
            </div>
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
              {mobileCategories.map((category) =>
                renderCategoryButton(category, { extraClasses: 'snap-center text-sm' }),
              )}
            </div>
            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
                Sort by date
              </div>
              <select
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                className="w-full rounded-full border border-white/10 bg-black/60 px-4 py-2 text-sm text-gray-200 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </ResponsiveSection>
      )}

      <ResponsiveSection as="section" className="py-0">
        {/* Header */}
        <div className="mb-12">
          <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Work</p>
          <h1 className="text-4xl font-bold text-white sm:text-5xl">Projects</h1>
          <p className="mt-4 max-w-3xl text-lg text-gray-400">
            A collection of my work spanning security research, software development, and scientific computing.
          </p>
        </div>

        {/* Filter Section (desktop and tablets) */}
        <div className="mb-12 hidden md:block">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 text-2xl font-semibold text-white">
              <Filter className="h-6 w-6 text-cyan-400" />
              Filter by Category
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
                Sort by date
              </span>
              <select
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                className="rounded-full border border-white/10 bg-black/60 px-4 py-2 text-sm text-gray-200 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`rounded-full px-6 py-3 text-sm font-semibold transition-all duration-300 ${selectedCategory === 'all'
                    ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/50'
                    : 'border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
              >
                All Projects
              </button>
            </div>
            <div className="relative flex-1">
              {canScrollLeft && (
                <button
                  type="button"
                  onClick={() => scrollCategories(-1)}
                  className="absolute left-0 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/60 text-gray-200 transition-colors hover:text-white"
                  aria-label="Scroll categories left"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <div className="overflow-hidden md:mx-10">
                <div
                  ref={categoryTrackRef}
                  className="flex gap-3 overflow-x-auto pb-2"
                  style={{ scrollbarWidth: 'none' }}
                >
                  {desktopCategories.map((category) =>
                    renderCategoryButton(category, { extraClasses: 'text-sm' }),
                  )}
                </div>
              </div>
              {canScrollRight && (
                <button
                  type="button"
                  onClick={() => scrollCategories(1)}
                  className="absolute right-0 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/60 text-gray-200 transition-colors hover:text-white"
                  aria-label="Scroll categories right"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">Loading projects...</p>
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-16">
            <p className="text-red-400 text-lg">{error}</p>
          </div>
        )}

        {/* Projects Grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {!loading && !error && filteredProjects.map((project, index) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="group bg-white/5 backdrop-blur-sm rounded-xl overflow-hidden border border-white/10 hover:border-cyan-400/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              style={{
                animation: 'fadeInUp 0.6s ease-out',
                animationDelay: `${index * 100}ms`,
                animationFillMode: 'backwards',
              }}
            >
              <div className="aspect-video overflow-hidden relative">
                {project.image && (
                  <img
                    src={project.image}
                    alt={project.title}
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(
                      categoryKey(project.category)
                    )}`}
                  >
                    {project.category?.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">{project.date_label ?? '—'}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors">
                  {project.title}
                </h3>
                <div
                  className="text-sm text-gray-300 leading-relaxed mb-4 line-clamp-3 space-y-2 [&>*]:text-inherit [&>*]:m-0 [&>*:not(:last-child)]:mb-2"
                  dangerouslySetInnerHTML={{ __html: project.description_safe }}
                />
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.tags?.map((tag) => (
                    <span key={tag} className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex gap-3 pt-4 border-t border-white/10">
                  {project.github && (
                    <button
                      type="button"
                      onClick={(event) => openExternal(event, project.github)}
                      className="flex items-center gap-2 text-sm text-gray-400 hover:text-cyan-400 transition-colors"
                    >
                      <Github className="w-4 h-4" />
                      Code
                    </button>
                  )}
                  {project.demo && (
                    <button
                      type="button"
                      onClick={(event) => openExternal(event, project.demo)}
                      className="flex items-center gap-2 text-sm text-gray-400 hover:text-cyan-400 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Demo
                    </button>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {!loading && !error && filteredProjects.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">No projects found in this category.</p>
          </div>
        )}
      </ResponsiveSection>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Projects;
