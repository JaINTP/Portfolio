import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Reply, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';

const CommentItem = ({ comment, user, blogId, onCommentAdded, onCommentDeleted, depth = 0 }) => {
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true });
    
    // Check if current user can delete this comment
    const canDelete = user && (user.id === comment.user_id || user.isAdmin);
    const canReply = user && depth < 3; // Limit nesting depth

    const handleReply = async (e) => {
        e.preventDefault();
        if (!replyContent.trim()) return;

        setSubmitting(true);
        try {
            const newComment = await api.postComment(blogId, { 
                content: replyContent,
                parent_id: comment.id 
            });
            onCommentAdded?.(newComment, comment.id);
            setReplyContent('');
            setShowReplyForm(false);
        } catch (error) {
            console.error('Failed to post reply:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this comment?')) return;

        setDeleting(true);
        try {
            await api.deleteComment(blogId, comment.id);
            onCommentDeleted?.(comment.id);
        } catch (error) {
            console.error('Failed to delete comment:', error);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className={`${depth > 0 ? 'ml-8 border-l-2 border-white/10 pl-6' : ''}`}>
            <div className={`bg-white/5 border border-white/5 rounded-2xl p-6 group hover:border-white/10 transition-colors ${comment.is_deleted ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                        {comment.user_avatar ? (
                            <img
                                src={comment.user_avatar}
                                alt={comment.user_name}
                                className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10"
                            />
                        ) : (
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${comment.is_deleted ? 'bg-gray-700/50 text-gray-500' : 'bg-gradient-to-br from-cyan-500/20 to-violet-500/20 text-cyan-400'}`}>
                                {comment.user_name.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-4 mb-2">
                            <h4 className={`font-semibold truncate ${comment.is_deleted ? 'text-gray-500 italic' : 'text-white'}`}>
                                {comment.user_name}
                            </h4>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                                {timeAgo}
                            </span>
                        </div>
                        <p className={`leading-relaxed whitespace-pre-wrap mb-3 ${comment.is_deleted ? 'text-gray-500 italic' : 'text-gray-300'}`}>
                            {comment.content}
                        </p>
                        
                        {/* Action buttons - hidden for deleted comments */}
                        {!comment.is_deleted && (
                            <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                {canReply && (
                                    <button
                                        onClick={() => setShowReplyForm(!showReplyForm)}
                                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-cyan-400 transition-colors"
                                    >
                                        <Reply className="w-3.5 h-3.5" />
                                        Reply
                                    </button>
                                )}
                                {canDelete && (
                                    <button
                                        onClick={handleDelete}
                                        disabled={deleting}
                                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        {deleting ? 'Deleting...' : 'Delete'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Reply form */}
                {showReplyForm && (
                    <form onSubmit={handleReply} className="mt-4 ml-14">
                        <textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Write a reply..."
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent resize-none text-sm"
                            rows={2}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <button
                                type="button"
                                onClick={() => setShowReplyForm(false)}
                                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || !replyContent.trim()}
                                className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-xs font-medium hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
                            >
                                {submitting ? 'Posting...' : 'Post Reply'}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Nested replies */}
            {comment.replies && comment.replies.length > 0 && (
                <div className="mt-4 space-y-4">
                    {comment.replies.map((reply) => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            user={user}
                            blogId={blogId}
                            onCommentAdded={onCommentAdded}
                            onCommentDeleted={onCommentDeleted}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default CommentItem;
