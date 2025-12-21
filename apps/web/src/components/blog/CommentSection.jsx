import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import CommentForm from './CommentForm';
import CommentItem from './CommentItem';
import { MessageSquare } from 'lucide-react';

const CommentSection = ({ blogId }) => {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    const fetchComments = async () => {
        try {
            const data = await api.listComments(blogId);
            setComments(data);
        } catch (error) {
            console.error('Failed to fetch comments:', error);
        } finally {
            setLoading(false);
        }
    };

    const checkSession = async () => {
        try {
            const session = await api.session();
            if (session.authenticated) {
                setUser({
                    name: session.username,
                    isAdmin: session.is_admin,
                    // For SSO users, we might need a different session check or combine them
                });
            }
        } catch (error) {
            // Not logged in or session expired
        }
    };

    useEffect(() => {
        fetchComments();
        checkSession();
    }, [blogId]);

    const handleCommentInfo = (newComment) => {
        setComments((prev) => [newComment, ...prev]);
    };

    return (
        <div className="mt-16 pt-12 border-t border-white/10">
            <div className="flex items-center gap-3 mb-8">
                <MessageSquare className="w-6 h-6 text-cyan-400" />
                <h2 className="text-2xl font-bold text-white">
                    Comments ({comments.length})
                </h2>
            </div>

            <CommentForm blogId={blogId} onCommentAdded={handleCommentInfo} user={user} />

            <div className="space-y-6 mt-10">
                {loading ? (
                    <p className="text-gray-400">Loading comments...</p>
                ) : comments.length > 0 ? (
                    comments.map((comment) => (
                        <CommentItem key={comment.id} comment={comment} />
                    ))
                ) : (
                    <p className="text-gray-500 italic">No comments yet. Be the first to share your thoughts!</p>
                )}
            </div>
        </div>
    );
};

export default CommentSection;
