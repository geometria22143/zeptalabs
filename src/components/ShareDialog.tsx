import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Copy,
  Check,
  Share2,
  ExternalLink,
} from 'lucide-react';
import { PostItem } from '../types/post';
import { incrementPostShare } from '../utils/postStorage';

interface ShareDialogProps {
  isOpen: boolean;
  post: PostItem;
  onClose: () => void;
  onPostUpdated: () => void;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  isOpen,
  post,
  onClose,
  onPostUpdated,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Proper Link Generation for the post
  const shareUrl = `${window.location.origin}/?post=${post.id}#${post.id}`;
  const shareText = `ZeptaLabs ${post.category}: ${post.title}`;

  const trackShare = async () => {
    await incrementPostShare(post.id);
    onPostUpdated();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      await trackShare();
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.description || shareText,
          url: shareUrl,
        });
        await trackShare();
        onClose();
      } catch {
        // User dismissed
      }
    }
  };

  const sharePlatforms = [
    {
      name: 'WhatsApp',
      getUrl: () =>
        `https://api.whatsapp.com/send?text=${encodeURIComponent(
          `${shareText}\n${shareUrl}`
        )}`,
    },
    {
      name: 'X (Twitter)',
      getUrl: () =>
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(
          shareText
        )}&url=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: 'Telegram',
      getUrl: () =>
        `https://t.me/share/url?url=${encodeURIComponent(
          shareUrl
        )}&text=${encodeURIComponent(shareText)}`,
    },
    {
      name: 'Facebook',
      getUrl: () =>
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          shareUrl
        )}`,
    },
    {
      name: 'LinkedIn',
      getUrl: () =>
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
          shareUrl
        )}`,
    },
    {
      name: 'Reddit',
      getUrl: () =>
        `https://reddit.com/submit?url=${encodeURIComponent(
          shareUrl
        )}&title=${encodeURIComponent(post.title)}`,
    },
    {
      name: 'Email',
      getUrl: () =>
        `mailto:?subject=${encodeURIComponent(
          `ZeptaLabs: ${post.title}`
        )}&body=${encodeURIComponent(
          `${post.title}\n\n${post.description || ''}\n\nRead more at: ${shareUrl}`
        )}`,
    },
  ];

  const handleOpenPlatform = async (url: string) => {
    await trackShare();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md bg-white border border-neutral-300 p-6 sm:p-7 z-10 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
            <div>
              <h3 className="text-base font-bold text-black tracking-tight">
                Share Post
              </h3>
              <p className="text-xs text-neutral-500">
                Share this {post.category.toLowerCase()} across platforms
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-neutral-500 hover:text-black transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Post Title Preview */}
          <div className="my-4 p-3 bg-neutral-50 border border-neutral-200">
            <span className="text-[10px] uppercase font-mono font-bold text-neutral-500">
              {post.category}
            </span>
            <p className="text-sm font-bold text-black line-clamp-2 mt-0.5">
              {post.title}
            </p>
          </div>

          {/* Native Share button for mobile/supported browsers */}
          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
            <div className="mb-4">
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full py-2.5 px-4 bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Share via Device Apps</span>
              </button>
            </div>
          )}

          {/* Platforms Grid */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2">
              Select Platform
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {sharePlatforms.map((platform) => (
                <button
                  key={platform.name}
                  type="button"
                  onClick={() => handleOpenPlatform(platform.getUrl())}
                  className="px-3 py-2 text-xs font-medium border border-neutral-200 hover:border-black bg-white hover:bg-neutral-50 text-neutral-900 transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <span className="truncate">{platform.name}</span>
                  <ExternalLink className="w-3 h-3 text-neutral-400 group-hover:text-black shrink-0 ml-1" />
                </button>
              ))}
            </div>
          </div>

          {/* Generated Shareable Link Section */}
          <div className="pt-3 border-t border-neutral-200">
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Generated Post Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-300 text-xs text-neutral-800 font-mono focus:outline-none select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-3.5 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  copied
                    ? 'bg-black text-white'
                    : 'bg-black text-white hover:bg-neutral-800'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
