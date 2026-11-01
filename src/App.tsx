import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { NewsSection } from './components/NewsSection';
import { UpdatesSection } from './components/UpdatesSection';
import { AboutSection } from './components/AboutSection';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { ShareModal } from './components/ShareModal';
import { UserProfile } from './types/auth';
import { PostItem } from './types/post';
import { getCurrentUser, setCurrentUser } from './utils/authStorage';
import { fetchAllPosts } from './utils/postStorage';
import {
  registerServiceWorker,
  triggerPushNotification,
  requestBrowserNotificationPermission,
} from './utils/pushNotification';

export default function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [authModalNotice, setAuthModalNotice] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [currentUser, setProfileState] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);

  const knownPostIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    // Register Service Worker for push notifications in Chrome / Google
    registerServiceWorker();

    // Restore persistent session
    const saved = getCurrentUser();
    if (saved) {
      setProfileState(saved);
      if (saved.notificationsEnabled !== false) {
        requestBrowserNotificationPermission().catch(() => {});
      }
    }

    // Initial fetch of posts
    fetchAllPosts().then((loaded) => {
      setPosts(loaded);
      knownPostIdsRef.current = new Set(loaded.map((p) => p.id));
      isInitialLoadRef.current = false;
    });

    // Real-Time Updates System: Live polling every 3.5 seconds
    const interval = setInterval(() => {
      fetchAllPosts().then((livePosts) => {
        // Detect if any new admin post was uploaded
        if (!isInitialLoadRef.current && livePosts.length > 0) {
          const newPosts = livePosts.filter((p) => !knownPostIdsRef.current.has(p.id));
          if (newPosts.length > 0) {
            for (const post of newPosts) {
              knownPostIdsRef.current.add(post.id);
              // Send Chrome/Google browser push notification
              triggerPushNotification({
                title: `ZeptaLabs ${post.category}: ${post.title}`,
                body:
                  post.description && post.description.trim()
                    ? post.description.slice(0, 120) + (post.description.length > 120 ? '...' : '')
                    : `New ${post.category.toLowerCase()} posted by ZeptaLabs Officials. Click to view.`,
                url: `/?post=${post.id}#${post.id}`,
                tag: `post_${post.id}`,
              });
            }
          }
        }

        setPosts((current) => {
          if (JSON.stringify(current) !== JSON.stringify(livePosts)) {
            return livePosts;
          }
          return current;
        });
      });
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  // Proper Link Deep-Linking: When URL contains ?post=... or #...
  useEffect(() => {
    if (posts.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const postParam = urlParams.get('post');
      const hash = window.location.hash.replace('#', '');
      const targetId = postParam || hash;

      if (targetId) {
        setTimeout(() => {
          const el =
            document.getElementById(targetId) ||
            document.getElementById(`post_${targetId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('target-post-highlight');
            setTimeout(() => el.classList.remove('target-post-highlight'), 3500);
          }
        }, 400);
      }
    }
  }, [posts]);

  const handleOpenAuth = (mode: 'login' | 'signup' = 'login', notice: string = '') => {
    setAuthModalMode(mode);
    setAuthModalNotice(notice);
    setIsAuthModalOpen(true);
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setProfileState(user);
    setCurrentUser(user);
    setIsAuthModalOpen(false);
  };

  const handleLogout = () => {
    setProfileState(null);
    setCurrentUser(null);
  };

  const handlePostCreated = (newPost: PostItem) => {
    knownPostIdsRef.current.add(newPost.id);
    setPosts((prev) => [newPost, ...prev.filter((p) => p.id !== newPost.id)]);
    const targetSection = newPost.category === 'News' ? 'news' : 'updates';
    const el = document.getElementById(targetSection);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePostUpdated = async () => {
    const updated = await fetchAllPosts();
    setPosts(updated);
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans antialiased selection:bg-neutral-200 selection:text-black flex flex-col">
      {/* Website Top Header & Navigation with Circular Logo Frame & Profile Dropdown */}
      <Navbar
        currentUser={currentUser}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
        onOpenShareModal={() => setIsShareModalOpen(true)}
      />

      {/* Website Main Page Content - Fully Responsive across Mobile, Tablet, Laptop, PC */}
      <main className="flex-1 w-full bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-12">
          {/* Section 1: Check Latest News */}
          <NewsSection
            posts={posts}
            onPostUpdated={handlePostUpdated}
            currentUser={currentUser}
          />

          {/* Section 2: Check Updates */}
          <UpdatesSection
            posts={posts}
            onPostUpdated={handlePostUpdated}
            currentUser={currentUser}
          />

          {/* Section 3: About ZeptaLabs */}
          <AboutSection />
        </div>
      </main>

      {/* Website Footer */}
      <Footer />

      {/* Real-time Signing Modal (Account Key Authentication / Unique Key Generation) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        initialMode={authModalMode}
        modalNotice={authModalNotice}
      />

      {/* Admin Share An Update/News Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onPostCreated={handlePostCreated}
      />
    </div>
  );
}
