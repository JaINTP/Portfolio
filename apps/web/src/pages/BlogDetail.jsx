import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Calendar, Clock, Tag, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import { sanitizeHtml } from '../lib/sanitizeHtml';
import ResponsiveSection from '../components/layout/ResponsiveSection';
import hljs from 'highlight.js/lib/common';
import 'highlight.js/styles/github-dark.css';

const BlogDetail = () => {
  const { id } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadBlog = async () => {
      try {
        const data = await api.getBlog(id);
        if (!cancelled) {
          setBlog(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load blog post.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadBlog();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const getCategoryColor = (category) => {
    const colors = {
      'bug-bounty': 'text-amber-400 bg-amber-400/10 border-amber-400/20',
      'software-dev': 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
      science: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
      personal: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    };
    return colors[category] || 'text-gray-400 bg-gray-400/10 border-gray-400/20';
  };

  const categoryKey = useMemo(() => {
    if (!blog?.category) return '';
    return blog.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }, [blog]);

  const formattedDate = useMemo(() => {
    if (!blog?.published_at) return null;
    return new Date(blog.published_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, [blog]);

  const safeContent = useMemo(
    () => sanitizeHtml(blog?.content ?? ''),
    [blog?.content]
  );
  const contentRef = useRef(null);

  useEffect(() => {
    if (!contentRef.current) {
      return;
    }

    const codeBlocks = contentRef.current.querySelectorAll('pre code');
    codeBlocks.forEach((block) => {
      hljs.highlightElement(block);
    });
  }, [safeContent]);

  if (loading) {
    return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black pt-24 pb-16">
      <ResponsiveSection as="section" width="narrow" className="py-0">
        <div className="text-center">
          <p className="text-gray-400 text-lg">Loading post...</p>
        </div>
      </ResponsiveSection>
    </div>
  );
}

  if (error || !blog) {
    return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black pt-24 pb-16">
      <ResponsiveSection as="section" width="narrow" className="py-0">
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-cyan-400 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </Link>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center text-gray-300">
            <h1 className="text-3xl font-bold text-white mb-4">Post not found</h1>
            <p>{error || "We couldn't find the blog post you were looking for."}</p>
        </div>
      </ResponsiveSection>
    </div>
  );
}

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black pt-24 pb-16">
      <ResponsiveSection as="section" width="narrow" className="py-0">
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-cyan-400 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </Link>

        <article className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden">
          <div className="relative aspect-video">
            <img
              src={blog.image}
              alt={blog.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 flex flex-wrap items-center justify-between gap-4">
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(
                  categoryKey
                )}`}
              >
                {blog.category?.toUpperCase() ?? ''}
              </span>
              <div className="flex items-center gap-4 text-xs text-gray-300">
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {formattedDate ?? '—'}
                </span>
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {blog.read_time}
                </span>
              </div>
            </div>
          </div>

          <div className="p-8 sm:p-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              {blog.title}
            </h1>
            <p className="text-lg text-gray-300 mb-8">{blog.excerpt}</p>

            <div className="flex flex-wrap gap-3 mb-10">
              {blog.tags?.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-2 text-xs text-gray-300 bg-white/5 px-3 py-1 rounded-full"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>

            <div
              className="blog-content"
              ref={contentRef}
              dangerouslySetInnerHTML={{ __html: safeContent }}
            />
          </div>
        </article>
      </ResponsiveSection>
    </div>
  );
};

export default BlogDetail;
