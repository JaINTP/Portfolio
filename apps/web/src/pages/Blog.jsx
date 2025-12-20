import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Calendar, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import ResponsiveSection from '../components/layout/ResponsiveSection';
import { useBreakpoint } from '../hooks/use-breakpoint';
import { resolveMediaUrl } from '../lib/utils';

const Blog = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [blogs, setBlogs] = useState([]);
  const [sortOrder, setSortOrder] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const categoryTrackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadBlogs = async () => {
      try {
        const data = await api.listBlogs();
        if (!cancelled) {
          setBlogs(data ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load blog posts.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadBlogs();

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
    blogs.forEach((blog) => {
      const key = categoryKey(blog.category);
      if (key) {
        unique.set(key, blog.category);
      }
    });

    return [
      { id: 'all', label: 'All Posts' },
      ...Array.from(unique.entries()).map(([id, label]) => ({
        id,
        label,
      })),
    ];
  }, [blogs]);

  const sortedBlogs = useMemo(() => {
    const copy = [...blogs];
    const isAscending = sortOrder === 'asc';
    const resolveTimestamp = (entry) => {
      const source = entry?.published_at ?? entry?.created_at;
      if (!source) return 0;
      const value = new Date(source).getTime();
      return Number.isNaN(value) ? 0 : value;
    };
    return copy.sort((a, b) => {
      const aTime = resolveTimestamp(a);
      const bTime = resolveTimestamp(b);
      return isAscending ? aTime - bTime : bTime - aTime;
    });
  }, [blogs, sortOrder]);

  const filteredBlogs = useMemo(() => {
    if (selectedCategory === 'all') {
      return sortedBlogs;
    }
    return sortedBlogs.filter((blog) => categoryKey(blog.category) === selectedCategory);
  }, [selectedCategory, sortedBlogs]);

  const getCategoryColor = (category) => {
    const colors = {
      'bug-bounty': 'text-amber-400 bg-amber-400/10 border-amber-400/20',
      'software-dev': 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
      'science': 'text-violet-400 bg-violet-400/10 border-violet-400/20',
      'personal': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    };
    return colors[category] || 'text-gray-400 bg-gray-400/10 border-gray-400/20';
  };

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
    if (!node) return;
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

  const colorMap = {
    'bug-bounty': 'amber',
    'software-dev': 'cyan',
    science: 'violet',
    personal: 'emerald',
  };

  const getButtonColor = (categoryId) => colorMap[categoryId] ?? 'cyan';

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
                Topics
              </span>
              <span className="text-xs text-gray-400">{filteredBlogs.length} posts</span>
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
          <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Writing</p>
          <h1 className="text-4xl font-bold text-white sm:text-5xl">Blog</h1>
          <p className="mt-4 max-w-3xl text-lg text-gray-400">
            Thoughts on security, software development, science, and life with my coding companion.
          </p>
        </div>

        {/* Filter Section */}
        <div className="mb-12 hidden md:block">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`rounded-full px-6 py-3 text-sm font-semibold transition-all duration-300 ${selectedCategory === 'all'
                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/50'
                  : 'border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
              >
                All Posts
              </button>
            </div>
            <div className="relative flex-1 min-w-[280px]">
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
            <div className="flex min-w-[220px] flex-col gap-2">
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
        </div>

        {loading && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">Loading blog posts...</p>
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-16">
            <p className="text-red-400 text-lg">{error}</p>
          </div>
        )}

        {/* Blog Grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {!loading &&
            !error &&
            filteredBlogs.map((blog, index) => {
              const normalizedCategory = categoryKey(blog.category);
              return (
                <Link
                  key={blog.id}
                  to={`/blog/${blog.id}`}
                  className="group bg-white/5 backdrop-blur-sm rounded-xl overflow-hidden border border-white/10 hover:border-cyan-400/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                  style={{
                    animation: 'fadeInUp 0.6s ease-out',
                    animationDelay: `${index * 100}ms`,
                    animationFillMode: 'backwards',
                  }}
                >
                  <div className="aspect-video overflow-hidden relative">
                    {blog.image && (
                      <img
                        src={resolveMediaUrl(blog.image)}
                        alt={blog.title}
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(
                          normalizedCategory
                        )}`}
                      >
                        {blog.category?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors line-clamp-2">
                      {blog.title}
                    </h3>
                    <p className="text-gray-400 text-sm mb-4 line-clamp-3">{blog.excerpt}</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {blog.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="flex items-center gap-1 text-xs text-gray-500 bg-white/5 px-2 py-1 rounded"
                        >
                          <Tag className="w-3 h-3" />
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {blog.published_at
                          ? new Date(blog.published_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                          : '—'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {blog.read_time}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
        </div>

        {!loading && !error && filteredBlogs.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">No blog posts found in this category.</p>
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

export default Blog;
