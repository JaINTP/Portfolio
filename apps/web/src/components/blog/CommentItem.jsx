import React from 'react';
import { formatDistanceToNow } from 'date-fns';

const CommentItem = ({ comment }) => {
    const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true });

    return (
        <div className="bg-white/5 border border-white/5 rounded-2xl p-6 group hover:border-white/10 transition-colors">
            <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                    {comment.user_avatar ? (
                        <img
                            src={comment.user_avatar}
                            alt={comment.user_name}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-center justify-center text-cyan-400 font-bold">
                            {comment.user_name.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4 mb-2">
                        <h4 className="text-white font-semibold truncate">
                            {comment.user_name}
                        </h4>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                            {timeAgo}
                        </span>
                    </div>
                    <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {comment.content}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CommentItem;
