import { PostItem, CommentItem } from '../types/post';

const POSTS_KEY = 'zeptalabs_posts';
const USER_SESSION_ID_KEY = 'zeptalabs_session_client_id';
const LOGO_KEY = 'zeptalabs_site_logo';
// Posts that were created while the server was unreachable and still need uploading
const PENDING_POSTS_KEY = 'zeptalabs_pending_posts';

function getPendingPosts(): PostItem[] {
  try {
    const raw = localStorage.getItem(PENDING_POSTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePendingPosts(posts: PostItem[]): void {
  try {
    if (posts.length === 0) localStorage.removeItem(PENDING_POSTS_KEY);
    else localStorage.setItem(PENDING_POSTS_KEY, JSON.stringify(posts));
  } catch {}
}

export function getClientSessionId(): string {
  let id = localStorage.getItem(USER_SESSION_ID_KEY);
  if (!id) {
    id = 'user_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem(USER_SESSION_ID_KEY, id);
  }
  return id;
}

export function getLocalCachedPosts(): PostItem[] {
  try {
    const raw = localStorage.getItem(POSTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalCachedPosts(posts: PostItem[]): void {
  try {
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
  } catch (quotaError) {
    console.warn('LocalStorage quota limit reached in saveLocalCachedPosts, saving lightweight representation:', quotaError);
    try {
      // Strip heavy dataUrl if storage full
      const lightweight = posts.map((p) => ({
        ...p,
        attachment: p.attachment
          ? {
              ...p.attachment,
              dataUrl: p.attachment.dataUrl.length > 50000 ? '' : p.attachment.dataUrl,
            }
          : undefined,
      }));
      localStorage.setItem(POSTS_KEY, JSON.stringify(lightweight));
    } catch {}
  }
}

// Logo Management
export async function fetchSiteLogo(): Promise<string> {
  try {
    const res = await fetch('/api/logo');
    if (res.ok) {
      const data = await res.json();
      if (data?.logoUrl) {
        localStorage.setItem(LOGO_KEY, data.logoUrl);
        return data.logoUrl;
      }
    }
  } catch (err) {
    console.warn('Could not fetch logo from server, checking local cache:', err);
  }
  return localStorage.getItem(LOGO_KEY) || 'logo.png';
}

export async function updateSiteLogo(newLogoUrl: string): Promise<string> {
  localStorage.setItem(LOGO_KEY, newLogoUrl);
  try {
    const res = await fetch('/api/logo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logoUrl: newLogoUrl }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.logoUrl;
    }
  } catch (err) {
    console.warn('Could not save logo to server:', err);
  }
  return newLogoUrl;
}

// Fetch all posts from the server (shared across all viewers in real-time)
export async function fetchAllPosts(): Promise<PostItem[]> {
  try {
    // Upload only posts that previously failed to reach the server. Never re-upload
    // the general cache, otherwise posts deleted by the admin would reappear.
    const pending = getPendingPosts();
    if (pending.length > 0) {
      try {
        const syncRes = await fetch('/api/posts/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ posts: pending }),
        });
        if (syncRes.ok) savePendingPosts([]);
      } catch {}
    }

    const res = await fetch('/api/posts', { cache: 'no-store' });
    if (res.ok) {
      const serverPosts: PostItem[] = await res.json();
      saveLocalCachedPosts(serverPosts);
      return serverPosts;
    }
  } catch (err) {
    console.warn('Could not fetch from server API, using local cache:', err);
  }
  return getLocalCachedPosts();
}

// Create a new post on the server
export async function createPost(
  newPost: Omit<PostItem, 'id' | 'createdAt' | 'likes' | 'likedBy' | 'shares' | 'comments'>
): Promise<PostItem> {
  try {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPost),
    });

    if (res.ok) {
      const created: PostItem = await res.json();
      const current = getLocalCachedPosts();
      const updated = [created, ...current.filter((p) => p.id !== created.id)];
      saveLocalCachedPosts(updated);
      return created;
    }
  } catch (err) {
    console.error('Server post creation failed, saving locally:', err);
  }

  // Fallback local creation
  const created: PostItem = {
    ...newPost,
    id: 'post_' + Date.now().toString(),
    createdAt:
      new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) +
      ' ' +
      new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    likes: 0,
    likedBy: [],
    shares: 0,
    comments: [],
  };

  const current = getLocalCachedPosts();
  current.unshift(created);
  saveLocalCachedPosts(current);
  savePendingPosts([created, ...getPendingPosts()]);
  return created;
}

// Delete post
export async function deletePost(postId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/posts/${postId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      const updated = getLocalCachedPosts().filter((p) => p.id !== postId);
      saveLocalCachedPosts(updated);
      return true;
    }
  } catch (err) {
    console.warn('Delete post failed on server:', err);
  }
  savePendingPosts(getPendingPosts().filter((p) => p.id !== postId));
  const updated = getLocalCachedPosts().filter((p) => p.id !== postId);
  saveLocalCachedPosts(updated);
  return true;
}

// Toggle post like
export async function togglePostLike(
  postId: string
): Promise<{ likes: number; isLiked: boolean }> {
  const clientId = getClientSessionId();

  try {
    const res = await fetch(`/api/posts/${postId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
    });

    if (res.ok) {
      const result = await res.json();
      const cached = getLocalCachedPosts().map((p) => {
        if (p.id === postId) {
          const already = p.likedBy.includes(clientId);
          const newLikedBy = already
            ? p.likedBy.filter((c) => c !== clientId)
            : [...p.likedBy, clientId];
          return { ...p, likes: result.likes, likedBy: newLikedBy };
        }
        return p;
      });
      saveLocalCachedPosts(cached);
      return result;
    }
  } catch (err) {
    console.warn('Like request failed on server:', err);
  }

  // Local fallback
  const cached = getLocalCachedPosts();
  let fallbackResult = { likes: 0, isLiked: false };
  const updated = cached.map((p) => {
    if (p.id === postId) {
      const already = p.likedBy.includes(clientId);
      const newLikedBy = already
        ? p.likedBy.filter((c) => c !== clientId)
        : [...p.likedBy, clientId];
      fallbackResult = { likes: newLikedBy.length, isLiked: !already };
      return { ...p, likes: newLikedBy.length, likedBy: newLikedBy };
    }
    return p;
  });
  saveLocalCachedPosts(updated);
  return fallbackResult;
}

// Increment share
export async function incrementPostShare(postId: string): Promise<number> {
  try {
    const res = await fetch(`/api/posts/${postId}/share`, {
      method: 'POST',
    });
    if (res.ok) {
      const data = await res.json();
      const cached = getLocalCachedPosts().map((p) =>
        p.id === postId ? { ...p, shares: data.shares } : p
      );
      saveLocalCachedPosts(cached);
      return data.shares;
    }
  } catch (err) {
    console.warn('Share request failed on server:', err);
  }

  let shares = 0;
  const cached = getLocalCachedPosts().map((p) => {
    if (p.id === postId) {
      shares = (p.shares || 0) + 1;
      return { ...p, shares };
    }
    return p;
  });
  saveLocalCachedPosts(cached);
  return shares;
}

// Add comment
export async function addCommentToPost(
  postId: string,
  authorName: string,
  content: string,
  authorAvatar?: string
): Promise<CommentItem | null> {
  try {
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorName, content, authorAvatar }),
    });

    if (res.ok) {
      const createdComment: CommentItem = await res.json();
      const cached = getLocalCachedPosts().map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            comments: [...(p.comments || []), createdComment],
          };
        }
        return p;
      });
      saveLocalCachedPosts(cached);
      return createdComment;
    }
  } catch (err) {
    console.warn('Comment request failed on server:', err);
  }

  const comment: CommentItem = {
    id: 'comment_' + Date.now().toString(),
    authorName: authorName.trim() || 'Visitor',
    authorAvatar: authorAvatar || '',
    content: content.trim(),
    createdAt: 'Just now',
    likes: 0,
    likedBy: [],
  };

  const cached = getLocalCachedPosts().map((p) => {
    if (p.id === postId) {
      return {
        ...p,
        comments: [...(p.comments || []), comment],
      };
    }
    return p;
  });
  saveLocalCachedPosts(cached);
  return comment;
}

// Delete comment
export async function deleteComment(
  postId: string,
  commentId: string
): Promise<boolean> {
  try {
    const res = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      const cached = getLocalCachedPosts().map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            comments: (p.comments || []).filter((c) => c.id !== commentId),
          };
        }
        return p;
      });
      saveLocalCachedPosts(cached);
      return true;
    }
  } catch (err) {
    console.warn('Delete comment failed on server:', err);
  }
  return false;
}

// Toggle comment like
export async function toggleCommentLike(
  postId: string,
  commentId: string
): Promise<{ likes: number; isLiked: boolean }> {
  const clientId = getClientSessionId();

  try {
    const res = await fetch(`/api/posts/${postId}/comments/${commentId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
    });

    if (res.ok) {
      const result = await res.json();
      const cached = getLocalCachedPosts().map((p) => {
        if (p.id === postId) {
          const updatedComments = (p.comments || []).map((c) => {
            if (c.id === commentId) {
              const already = (c.likedBy || []).includes(clientId);
              const newLikedBy = already
                ? (c.likedBy || []).filter((id) => id !== clientId)
                : [...(c.likedBy || []), clientId];
              return { ...c, likes: result.likes, likedBy: newLikedBy };
            }
            return c;
          });
          return { ...p, comments: updatedComments };
        }
        return p;
      });
      saveLocalCachedPosts(cached);
      return result;
    }
  } catch (err) {
    console.warn('Comment like failed on server:', err);
  }

  let result = { likes: 0, isLiked: false };
  const cached = getLocalCachedPosts().map((p) => {
    if (p.id === postId) {
      const updatedComments = (p.comments || []).map((c) => {
        if (c.id === commentId) {
          const already = (c.likedBy || []).includes(clientId);
          const newLikedBy = already
            ? (c.likedBy || []).filter((id) => id !== clientId)
            : [...(c.likedBy || []), clientId];
          result = { likes: newLikedBy.length, isLiked: !already };
          return { ...c, likes: newLikedBy.length, likedBy: newLikedBy };
        }
        return c;
      });
      return { ...p, comments: updatedComments };
    }
    return p;
  });
  saveLocalCachedPosts(cached);
  return result;
}
