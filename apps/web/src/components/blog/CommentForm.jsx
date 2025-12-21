import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Button } from '../ui/button';
import { Github, Globe, Twitter, Facebook } from 'lucide-react';

const CommentForm = ({ blogId, onCommentAdded, user }) => {
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [enabledProviders, setEnabledProviders] = useState([]);

    useEffect(() => {
        const fetchProviders = async () => {
            try {
                const providers = await api.listSsoProviders();
                setEnabledProviders(providers || []);
            } catch (err) {
                console.error('Failed to fetch SSO providers:', err);
            }
        };

        if (!user) {
            fetchProviders();
        }
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) return;

        setSubmitting(true);
        setError(null);
        try {
            const newComment = await api.postComment(blogId, { content });
            onCommentAdded(newComment);
            setContent('');
        } catch (err) {
            setError(err.message || 'Failed to post comment. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!user) {
        if (enabledProviders.length === 0) return null;

        const providerButtons = [
            { id: 'github', name: 'GitHub', icon: Github, className: "bg-[#24292F] hover:bg-[#24292F]/90" },
            { id: 'google', name: 'Google', icon: Globe, className: "bg-[#4285F4] hover:bg-[#4285F4]/90" },
            { id: 'twitter', name: 'Twitter', icon: Twitter, className: "bg-[#1DA1F2] hover:bg-[#1DA1F2]/90" },
            { id: 'meta', name: 'Meta', icon: Facebook, className: "bg-[#1877F2] hover:bg-[#1877F2]/90" },
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
