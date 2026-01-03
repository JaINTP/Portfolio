import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Button } from '../ui/button';
import { Github, Twitter } from 'lucide-react';

// Custom Google icon (lucide doesn't have one)
const GoogleIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

const CommentForm = ({ blogId, onCommentAdded, user }) => {
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [enabledProviders, setEnabledProviders] = useState([]);

    useEffect(() => {
        const fetchProviders = async () => {
            try {
                const providers = await api.listSsoProviders();
                setEnabledProviders(providers);
            } catch (err) {
                console.error('Failed to fetch providers:', err);
            }
        };
        fetchProviders();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) return;

        setSubmitting(true);
        setError(null);
        try {
            const newComment = await api.postComment(blogId, { content: content.trim() });
            onCommentAdded(newComment);
            setContent('');
        } catch (err) {
            setError(err.message || 'Failed to post comment');
        } finally {
            setSubmitting(false);
        }
    };

    // If user is not logged in, show login buttons
    if (!user) {
        if (enabledProviders.length === 0) return null;

        const providerButtons = [
            { id: 'github', name: 'GitHub', icon: Github, className: "bg-[#24292F] hover:bg-[#24292F]/90" },
            { id: 'google', name: 'Google', icon: GoogleIcon, className: "bg-white hover:bg-gray-100 text-gray-700" },
            { id: 'twitter', name: 'Twitter', icon: Twitter, className: "bg-[#1DA1F2] hover:bg-[#1DA1F2]/90" },
        ];

        return (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                <p className="text-gray-300 mb-6">Sign in to join the conversation</p>
                <div className="flex flex-wrap justify-center gap-4">
                    {providerButtons.filter(p => enabledProviders.includes(p.id)).map(p => (
                        <Button
                            key={p.id}
                            variant="outline"
                            className={`flex items-center gap-2 text-white border-none ${p.className}`}
                            onClick={() => api.ssoLogin(p.id)}
                        >
                            <p.icon className="w-4 h-4" />
                            {p.name}
                        </Button>
                    ))}
                </div>
            </div>
        );
    }

    // User is logged in - show comment form
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-sm font-bold">
                    {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-gray-300 text-sm font-medium">Posting as {user.name}</span>
            </div>
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write a comment..."
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all min-h-[120px]"
                required
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex justify-end">
                <Button
                    type="submit"
                    disabled={submitting || !content.trim()}
                    className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold px-6"
                >
                    {submitting ? 'Posting...' : 'Post Comment'}
                </Button>
            </div>
        </form>
    );
};

export default CommentForm;
