import React from 'react';
import { motion } from 'motion/react';
import { Clock } from 'lucide-react';
import { PostItem } from '../types/post';
import { PostCard } from './PostCard';
import { UserProfile } from '../types/auth';

interface UpdatesSectionProps {
  posts: PostItem[];
  onPostUpdated: () => void;
  currentUser?: UserProfile | null;
}

export const UpdatesSection: React.FC<UpdatesSectionProps> = ({
  posts,
  onPostUpdated,
  currentUser,
}) => {
  const updatePosts = posts.filter((p) => p.category === 'Update');

  return (
    <section id="updates" className="w-full pt-4 pb-10 scroll-mt-20">
      <div className="pb-3 border-b border-neutral-200 mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
          Check Updates
        </h2>
        {updatePosts.length > 0 && (
          <span className="text-xs font-semibold px-2 py-0.5 bg-neutral-100 text-neutral-700">
            {updatePosts.length} {updatePosts.length === 1 ? 'Post' : 'Posts'}
          </span>
        )}
      </div>

      {updatePosts.length === 0 ? (
        /* Empty state: Ghost-colored clock and 'No updates yet' */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3 }}
          whileHover={{ y: -2 }}
          className="border border-neutral-200 bg-white p-10 sm:p-14 text-center flex flex-col items-center justify-center transition-colors hover:border-neutral-400"
        >
          <div className="mb-3 p-3 rounded-full bg-neutral-50 border border-neutral-100">
            <Clock className="w-8 h-8 text-neutral-300 stroke-[1.5]" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-1">
            No updates yet
          </h3>
          <p className="text-sm text-neutral-500 max-w-sm">
            New updates will be posted here soon.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {updatePosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onPostUpdated={onPostUpdated}
              currentUser={currentUser}
            />
          ))}
        </div>
      )}
    </section>
  );
};
