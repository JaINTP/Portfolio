import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Calendar, Tag, ArrowLeft, Github, ExternalLink } from 'lucide-react';
import { api } from '../lib/api';
import { sanitizeHtml } from '../lib/sanitizeHtml';
import ResponsiveSection from '../components/layout/ResponsiveSection';
import hljs from 'highlight.js/lib/common';
import 'highlight.js/styles/github-dark.css';

const ProjectDetail = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadProject = async () => {
      try {
        const data = await api.getProject(id);
        if (!cancelled) {
          setProject(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load project.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadProject();

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

  const sanitisedDescription = useMemo(
    () => sanitizeHtml(project?.description ?? ''),
    [project?.description],
  );

  const contentRef = useRef(null);

  const formattedDate = useMemo(() => {
    if (!project?.date_label) {
      return null;
    }
    try {
      return new Date(project.date_label).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return project.date_label;
    }
  }, [project?.date_label]);

  const openExternal = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    if (!contentRef.current) {
      return;
    }
    const codeBlocks = contentRef.current.querySelectorAll('pre code');
    codeBlocks.forEach((block) => {
      hljs.highlightElement(block);
    });
  }, [sanitisedDescription]);

  if (loading) {
    return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black pt-24 pb-16">
      <ResponsiveSection as="section" width="narrow" className="py-0">
        <div className="text-center">
          <p className="text-gray-400 text-lg">Loading project...</p>
        </div>
      </ResponsiveSection>
    </div>
  );
}

  if (error || !project) {
    return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black pt-24 pb-16">
      <ResponsiveSection as="section" width="narrow" className="py-0">
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-cyan-400 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center text-gray-300">
            <h1 className="text-3xl font-bold text-white mb-4">Project not found</h1>
            <p>{error || "We couldn't find the project you were looking for."}</p>
        </div>
      </ResponsiveSection>
    </div>
  );
}

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black pt-24 pb-16">
      <ResponsiveSection as="section" width="narrow" className="py-0">
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-cyan-400 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>

        <article className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden">
          <div className="relative aspect-video">
            {project.image && (
              <img
                src={project.image}
                alt={project.title}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 flex flex-wrap items-center justify-between gap-4">
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(
                  project.category?.toLowerCase(),
                )}`}
              >
                {project.category?.toUpperCase() ?? ''}
              </span>
              {formattedDate && (
                <span className="flex items-center gap-2 text-xs text-gray-300">
                  <Calendar className="w-4 h-4" />
                  {formattedDate}
                </span>
              )}
            </div>
          </div>

          <div className="p-8 sm:p-12 space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-4xl sm:text-5xl font-bold text-white">
                {project.title}
              </h1>
              <div className="flex flex-wrap gap-3">
                {project.github && (
                  <button
                    type="button"
                    onClick={() => openExternal(project.github)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-gray-200 transition-colors"
                  >
                    <Github className="w-4 h-4" />
                    Source
                  </button>
                )}
                {project.demo && (
                  <button
                    type="button"
                    onClick={() => openExternal(project.demo)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Live Demo
                  </button>
                )}
              </div>
            </div>

            {project.tags?.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-2 text-xs text-gray-300 bg-white/5 px-3 py-1 rounded-full"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div
              className="project-description prose prose-invert prose-lg max-w-none text-gray-200"
              ref={contentRef}
              dangerouslySetInnerHTML={{ __html: sanitisedDescription }}
            />
          </div>
        </article>
      </ResponsiveSection>
    </div>
  );
};

export default ProjectDetail;
