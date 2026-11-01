import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Upload,
  ArrowRight,
  FileText,
  Video,
  Image as ImageIcon,
  Check,
  Package,
} from 'lucide-react';
import { FileAttachment, PostItem } from '../types/post';
import { createPost } from '../utils/postStorage';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: (post: PostItem) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  onPostCreated,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'News' | 'Update' | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState<FileAttachment | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Format size
    const sizeInMB = file.size / (1024 * 1024);
    const sizeFormatted =
      sizeInMB >= 1
        ? `${sizeInMB.toFixed(1)} MB`
        : `${(file.size / 1024).toFixed(0)} KB`;

    let fileType = 'file';
    if (file.type.startsWith('image/')) fileType = 'image';
    else if (file.type.startsWith('video/')) fileType = 'video';
    else if (file.name.endsWith('.apk')) fileType = 'apk';

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAttachment({
          name: file.name,
          type: fileType,
          dataUrl: reader.result,
          sizeFormatted,
        });
        setError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedCategory) {
      setError('Please select whether to post as News or Update.');
      return;
    }

    if (!title.trim()) {
      setError('Please enter a title.');
      return;
    }

    // User can provide photo/file OR description, or both
    if (!description.trim() && !attachment) {
      setError('Please provide either a description or attach a file/photo/video.');
      return;
    }

    setIsSubmitting(true);

    const newPost = await createPost({
      category: selectedCategory,
      title: title.trim(),
      description: description.trim() || undefined,
      attachment: attachment || undefined,
      authorName: 'ZeptaLabs Officials',
      authorAvatar: 'logo.png',
    });

    setIsSubmitting(false);
    onPostCreated(newPost);
    // Reset state & close
    setSelectedCategory(null);
    setTitle('');
    setDescription('');
    setAttachment(null);
    onClose();
  };

  const handleClose = () => {
    setSelectedCategory(null);
    setTitle('');
    setDescription('');
    setAttachment(null);
    setError('');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/60"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-lg bg-white border border-neutral-300 p-6 sm:p-8 z-10 shadow-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
            <div>
              <h2 className="text-lg font-bold text-black tracking-tight">
                Share An Update / News
              </h2>
              <p className="text-xs text-neutral-500 font-normal">
                Publish directly to ZeptaLabs News &amp; Updates
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-1 text-neutral-500 hover:text-black transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* STEP 1: SELECT CATEGORY */}
          {!selectedCategory ? (
            <div className="py-6 space-y-4">
              <p className="text-sm font-semibold text-neutral-800">
                What would you like to post?
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('News')}
                  className="p-5 border-2 border-neutral-200 hover:border-black bg-white hover:bg-neutral-50 text-left transition-all cursor-pointer group"
                >
                  <div className="font-bold text-base text-black mb-1 group-hover:underline">
                    News
                  </div>
                  <p className="text-xs text-neutral-500">
                    Post to the "Check Latest News" section for announcements.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCategory('Update')}
                  className="p-5 border-2 border-neutral-200 hover:border-black bg-white hover:bg-neutral-50 text-left transition-all cursor-pointer group"
                >
                  <div className="font-bold text-base text-black mb-1 group-hover:underline">
                    Update
                  </div>
                  <p className="text-xs text-neutral-500">
                    Post to the "Check Updates" section for new versions and patches.
                  </p>
                </button>
              </div>
            </div>
          ) : (
            /* STEP 2: CREATION FORM */
            <form onSubmit={handlePublish} className="mt-6 space-y-4">
              {/* Category selector badge */}
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <span className="text-xs text-neutral-500">
                  Posting to:{' '}
                  <span className="font-bold text-black uppercase">
                    {selectedCategory === 'News' ? 'Latest News' : 'Updates'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs text-neutral-500 hover:text-black underline"
                >
                  Change Category
                </button>
              </div>

              {error && (
                <div className="p-3 bg-neutral-100 border border-black text-xs text-black">
                  {error}
                </div>
              )}

              {/* Title Input */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Title <span className="text-black">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    selectedCategory === 'News'
                      ? 'Enter news headline'
                      : 'Enter update title or version'
                  }
                  className="w-full px-3 py-2 border border-neutral-300 bg-white text-black text-sm focus:outline-none focus:border-black font-medium"
                />
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Description{' '}
                  <span className="text-neutral-400 font-normal">
                    (optional if file/photo attached)
                  </span>
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter details, release notes, or summary..."
                  className="w-full px-3 py-2 border border-neutral-300 bg-white text-black text-sm focus:outline-none focus:border-black resize-none"
                />
              </div>

              {/* File Attachment */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Attachment{' '}
                  <span className="text-neutral-400 font-normal">
                    (Photo, Video, APK, or any file)
                  </span>
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />

                {!attachment ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-neutral-300 hover:border-black p-4 text-center cursor-pointer transition-colors bg-neutral-50 flex flex-col items-center justify-center gap-1.5"
                  >
                    <Upload className="w-5 h-5 text-neutral-600" />
                    <span className="text-xs font-semibold text-black">
                      Attach photo, video, APK, or document
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      Supports MP4, PNG, JPG, APK, ZIP, etc.
                    </span>
                  </button>
                ) : (
                  <div className="border border-neutral-300 p-3 bg-neutral-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {attachment.type === 'image' && (
                          <ImageIcon className="w-4 h-4 text-black shrink-0" />
                        )}
                        {attachment.type === 'video' && (
                          <Video className="w-4 h-4 text-black shrink-0" />
                        )}
                        {attachment.type === 'apk' && (
                          <Package className="w-4 h-4 text-black shrink-0" />
                        )}
                        {attachment.type === 'file' && (
                          <FileText className="w-4 h-4 text-black shrink-0" />
                        )}
                        <span className="text-xs font-medium text-black truncate max-w-[200px]">
                          {attachment.name}
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          ({attachment.sizeFormatted})
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setAttachment(null)}
                        className="text-xs text-neutral-500 hover:text-black underline shrink-0 ml-2"
                      >
                        Remove
                      </button>
                    </div>

                    {/* Preview for images */}
                    {attachment.type === 'image' && (
                      <div className="mt-2 max-h-48 overflow-hidden border border-neutral-200">
                        <img
                          src={attachment.dataUrl}
                          alt="Upload preview"
                          className="w-full h-auto object-cover max-h-48"
                        />
                      </div>
                    )}

                    {/* Preview for videos */}
                    {attachment.type === 'video' && (
                      <div className="mt-2 border border-neutral-200">
                        <video
                          src={attachment.dataUrl}
                          controls
                          className="w-full max-h-48"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-black text-white text-sm font-semibold py-2.5 hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Publish to {selectedCategory}</span>
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
