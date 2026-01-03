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
        // Optimization: Don't hit API if we know we're not logged in
        if (!document.cookie.includes('auth_state=true')) {
            setUser(null);
            return;
        }

        try {
            const session = await api.session();
            if (session.authenticated) {
                setUser({
                    id: session.user_id,
                    name: session.username,
                    isAdmin: session.is_admin,
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

    const handleCommentAdded = (newComment, parentId = null) => {
        if (parentId) {
            // Add reply to parent's replies array
            setComments((prev) => addReplyToComments(prev, parentId, newComment));
        } else {
            // Add top-level comment
            setComments((prev) => [newComment, ...prev]);
        }
    };

    const addReplyToComments = (comments, parentId, newReply) => {
        return comments.map((comment) => {
            if (comment.id === parentId) {
                return {
                    ...comment,
                    replies: [...(comment.replies || []), newReply],
                };
            }
            if (comment.replies && comment.replies.length > 0) {
                return {
                    ...comment,
                    replies: addReplyToComments(comment.replies, parentId, newReply),
                };
            }
            return comment;
        });
    };

    const handleCommentDeleted = (commentId) => {
        setComments((prev) => removeCommentFromTree(prev, commentId));
    };

    const removeCommentFromTree = (comments, commentId) => {
        return comments
            .filter((comment) => comment.id !== commentId)
            .map((comment) => ({
                ...comment,
                replies: comment.replies ? removeCommentFromTree(comment.replies, commentId) : [],
            }));
    };

    // Count total comments including replies
    const countComments = (comments) => {
        return comments.reduce((count, comment) => {
            return count + 1 + (comment.replies ? countComments(comment.replies) : 0);
        }, 0);
    };

    return (
        <div className="mt-16 pt-12 border-t border-white/10">
            <div className="flex items-center gap-3 mb-8">
                <MessageSquare className="w-6 h-6 text-cyan-400" />
                <h2 className="text-2xl font-bold text-white">
                    Comments ({countComments(comments)})
                </h2>
            </div>

            <CommentForm blogId={blogId} onCommentAdded={handleCommentAdded} user={user} />

            <div className="space-y-6 mt-10">
                {loading ? (
                    <p className="text-gray-400">Loading comments...</p>
                ) : comments.length > 0 ? (
                    comments.map((comment) => (
                        <CommentItem 
                            key={comment.id} 
                            comment={comment} 
                            user={user}
                            blogId={blogId}
                            onCommentAdded={handleCommentAdded}
                            onCommentDeleted={handleCommentDeleted}
                        />
                    ))
                ) : (
                    <p className="text-gray-500 italic">No comments yet. Be the first to share your thoughts!</p>
                )}
            </div>
        </div>
    );
};

export default CommentSection;
