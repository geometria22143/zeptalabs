import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  MessageSquare,
  Share2,
  Download,
  Package,
  FileText,
  Send,
  User,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { PostItem } from '../types/post';
import {
  togglePostLike,
  addCommentToPost,
  toggleCommentLike,
  deleteComment,
  deletePost,
  getClientSessionId,
} from '../utils/postStorage';
import { ShareDialog } from './ShareDialog';

interface PostCardProps {
  post: PostItem;
  onPostUpdated: () => void;
  currentUser?: { name: string; avatarUrl?: string; isAdmin?: boolean } | null;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onPostUpdated,
  currentUser,
}) => {
  const [showComments, setShowComments] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [commenterName, setCommenterName] = useState(currentUser?.name || '');
  const [isLiking, setIsLiking] = useState(false);

  const clientId = getClientSessionId();
  const isPostLiked = (post.likedBy || []).includes(clientId);

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    await togglePostLike(post.id);
    setIsLiking(false);
    onPostUpdated();
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const author = currentUser?.name || commenterName.trim() || 'Visitor';
    const avatar = currentUser?.avatarUrl || '';

    await addCommentToPost(post.id, author, newCommentText, avatar);
    setNewCommentText('');
    onPostUpdated();
  };

  const handleCommentLike = async (commentId: string) => {
    await toggleCommentLike(post.id, commentId);
    onPostUpdated();
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteComment(post.id, commentId);
    onPostUpdated();
  };

  const handleDeletePost = async () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      await deletePost(post.id);
      onPostUpdated();
    }
  };

  return (
    <article
      id={post.id}
      className="scroll-mt-24 border border-neutral-200 bg-white p-5 sm:p-7 transition-all hover:border-neutral-400 shadow-xs"
    >
      {/* Post Header */}
      <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-neutral-300 overflow-hidden bg-white flex items-center justify-center shrink-0 p-1">
            <img
              src="logo.png"
              alt={post.authorName}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = 'logo.png';
              }}
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-black">
                {post.authorName}
              </span>
              <span className="inline-flex items-center gap-0.5 text-[10px] uppercase font-mono px-1.5 py-0.5 bg-black text-white">
                <ShieldCheck className="w-2.5 h-2.5" />
                <span>Official</span>
              </span>
            </div>
            <span className="text-xs text-neutral-400 font-mono">
              {post.createdAt}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-1 bg-neutral-100 border border-neutral-200 text-neutral-800 uppercase tracking-wider">
            {post.category}
          </span>

          {currentUser?.isAdmin && (
            <button
              type="button"
              onClick={handleDeletePost}
              className="p-1 text-neutral-400 hover:text-black transition-colors"
              title="Delete Post"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Post Title */}
      <h3 className="text-xl sm:text-2xl font-bold text-black mb-3 leading-snug">
        {post.title}
      </h3>

      {/* Post Description */}
      {post.description && (
        <div className="text-neutral-700 text-sm sm:text-base leading-relaxed mb-4 whitespace-pre-line font-normal">
          {post.description}
        </div>
      )}

      {/* Media / File Attachment */}
      {post.attachment && (
        <div className="mb-5 overflow-hidden border border-neutral-200 bg-neutral-50">
          {post.attachment.type === 'image' && (
            <img
              src={post.attachment.dataUrl}
              alt={post.attachment.name}
              className="w-full max-h-[480px] object-cover"
            />
          )}

          {post.attachment.type === 'video' && (
            <video
              src={post.attachment.dataUrl}
              controls
              className="w-full max-h-[480px] bg-black"
            />
          )}

          {(post.attachment.type === 'apk' || post.attachment.type === 'file') && (
            <div className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2.5 bg-neutral-200 text-black shrink-0">
                  {post.attachment.type === 'apk' ? (
                    <Package className="w-6 h-6" />
                  ) : (
                    <FileText className="w-6 h-6" />
                  )}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-black truncate">
                    {post.attachment.name}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {post.attachment.sizeFormatted} •{' '}
                    {post.attachment.type === 'apk'
                      ? 'Android APK Package'
                      : 'File Attachment'}
                  </p>
                </div>
              </div>

              <a
                href={post.attachment.dataUrl}
                download={post.attachment.name}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition-colors shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>
            </div>
          )}
        </div>
      )}

      {/* Action Bar: Proper Liking, Commenting, Sharing */}
      <div className="flex items-center justify-between pt-3 border-t border-neutral-200 text-xs text-neutral-600">
        <div className="flex items-center space-x-6">
          {/* Proper Like Button */}
          <motion.button
            type="button"
            onClick={handleLike}
            whileTap={{ scale: 0.85 }}
            className={`flex items-center gap-1.5 transition-colors cursor-pointer select-none py-1 px-1.5 rounded-none ${
              isPostLiked ? 'text-black font-bold' : 'hover:text-black'
            }`}
          >
            <Heart
              className={`w-4 h-4 transition-transform duration-150 ${
                isPostLiked
                  ? 'fill-black text-black scale-110'
                  : 'text-neutral-500 hover:text-black'
              }`}
            />
            <span>{post.likes || 0} Likes</span>
          </motion.button>

          {/* Proper Comment Button */}
          <button
            type="button"
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 hover:text-black transition-colors cursor-pointer py-1 px-1.5"
          >
            <MessageSquare className="w-4 h-4 text-neutral-500" />
            <span>{(post.comments || []).length} Comments</span>
          </button>
        </div>

        {/* Proper Share Button */}
        <div>
          <motion.button
            type="button"
            onClick={() => setShowShareDialog(true)}
            whileTap={{ scale: 0.9 }}
            className="flex items-center gap-1.5 hover:text-black transition-colors cursor-pointer py-1 px-1.5"
          >
            <Share2 className="w-4 h-4 text-neutral-500" />
            <span>{post.shares || 0} Shares</span>
          </motion.button>
        </div>
      </div>

      {/* PROPER COMMENTING SYSTEM */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-5 pt-4 border-t border-neutral-100 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-black">
                Discussion ({(post.comments || []).length})
              </h4>
            </div>

            {/* Comment Creation Form */}
            <form onSubmit={handleAddComment} className="space-y-2 bg-neutral-50 p-3 border border-neutral-200">
              {!currentUser && (
                <input
                  type="text"
                  value={commenterName}
                  onChange={(e) => setCommenterName(e.target.value)}
                  placeholder="Your Name (Optional)"
                  className="w-full px-3 py-1.5 bg-white border border-neutral-300 text-xs text-black focus:outline-none focus:border-black"
                />
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 px-3 py-2 bg-white border border-neutral-300 text-xs text-black focus:outline-none focus:border-black font-medium"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <span>Post</span>
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </form>

            {/* Comments List */}
            {(post.comments || []).length > 0 ? (
              <div className="space-y-2.5 pt-1">
                {post.comments.map((comment) => {
                  const isCommentLiked = (comment.likedBy || []).includes(clientId);
                  const isOfficialAuthor =
                    comment.authorName === 'ZeptaLabs Officials';

                  return (
                    <div
                      key={comment.id}
                      className="p-3 bg-white border border-neutral-200 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-neutral-500">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-black">
                            {comment.authorName}
                          </span>
                          {isOfficialAuthor && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] uppercase font-mono px-1 py-0.2 bg-black text-white">
                              Official
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-neutral-400">
                            {comment.createdAt}
                          </span>
                          {(currentUser?.isAdmin ||
                            currentUser?.name === comment.authorName) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-neutral-400 hover:text-black"
                              title="Delete comment"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-neutral-800 text-xs leading-normal font-normal">
                        {comment.content}
                      </p>

                      {/* Comment Liking System */}
                      <div className="pt-1 flex items-center justify-end">
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.8 }}
                          onClick={() => handleCommentLike(comment.id)}
                          className={`flex items-center gap-1 text-[11px] transition-colors cursor-pointer ${
                            isCommentLiked
                              ? 'text-black font-bold'
                              : 'text-neutral-500 hover:text-black'
                          }`}
                        >
                          <Heart
                            className={`w-3 h-3 ${
                              isCommentLiked
                                ? 'fill-black text-black'
                                : 'text-neutral-400'
                            }`}
                          />
                          <span>{comment.likes || 0} Likes</span>
                        </motion.button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-neutral-400 italic py-2 text-center">
                No comments yet. Join the conversation!
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* PROPER SHARE DIALOG */}
      <ShareDialog
        isOpen={showShareDialog}
        post={post}
        onClose={() => setShowShareDialog(false)}
        onPostUpdated={onPostUpdated}
      />
    </article>
  );
};
