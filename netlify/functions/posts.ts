import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { db } from '../lib/db';

interface CommentItem {
  id: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  likes: number;
  likedBy: string[];
}

interface PostItem {
  id: string;
  category: 'News' | 'Update';
  title: string;
  description?: string;
  attachment?: {
    name: string;
    type: string;
    dataUrl: string;
    sizeFormatted: string;
  };
  authorName: string;
  authorAvatar: string;
  createdAt: string;
  likes: number;
  likedBy: string[];
  shares: number;
  comments: CommentItem[];
}

// Posts are persisted in Netlify Database so every visitor sees the same feed.
function sortTimestamp(post: PostItem): Date {
  const idMatch = /^post_(\d{13})$/.exec(post.id || '');
  if (idMatch) return new Date(Number(idMatch[1]));
  const parsed = new Date(post.createdAt);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

async function listPosts(): Promise<PostItem[]> {
  const rows = await db().sql`SELECT data FROM posts ORDER BY created_at DESC`;
  return rows.map((r: any) => r.data as PostItem);
}

async function insertPost(post: PostItem): Promise<void> {
  await db().sql`
    INSERT INTO posts (id, data, created_at)
    VALUES (${post.id}, ${JSON.stringify(post)}::jsonb, ${sortTimestamp(post).toISOString()})
    ON CONFLICT (id) DO NOTHING
  `;
}

// Read-modify-write a single post inside a row-locked transaction.
async function updatePost(
  postId: string,
  mutate: (post: PostItem) => PostItem
): Promise<PostItem | null> {
  const client = await db().pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query('SELECT data FROM posts WHERE id = $1 FOR UPDATE', [postId]);
    if (res.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    const updated = mutate(res.rows[0].data as PostItem);
    await client.query('UPDATE posts SET data = $2::jsonb WHERE id = $1', [
      postId,
      JSON.stringify(updated),
    ]);
    await client.query('COMMIT');
    return updated;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// CORS headers for all responses
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

function formatNow(): string {
  const now = new Date();
  return (
    now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' +
    now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  );
}

function json(statusCode: number, data: unknown) {
  return { statusCode, headers, body: JSON.stringify(data) };
}

function toggleId(list: string[] | undefined, clientId: string) {
  const current = list || [];
  const alreadyLiked = current.includes(clientId);
  const next = alreadyLiked ? current.filter((cid) => cid !== clientId) : [...current, clientId];
  return { next, isLiked: !alreadyLiked };
}

export const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Works for both /api/posts/* (rewrite) and /.netlify/functions/posts/*
  const path = event.path
    .replace(/^\/\.netlify\/functions\/posts/, '')
    .replace(/^\/api\/posts/, '')
    .replace(/\/+$/, '');

  try {
    // GET /api/posts - Fetch all posts
    if (event.httpMethod === 'GET' && path === '') {
      return json(200, await listPosts());
    }

    // POST /api/posts - Create new post
    if (event.httpMethod === 'POST' && path === '') {
      const body = JSON.parse(event.body || '{}');

      if (!body.title || !body.category) {
        return json(400, { error: 'Title and category are required' });
      }

      // Merge into an existing post if the id already exists
      if (body.id) {
        const merged = await updatePost(body.id, (existing) => {
          const mergedComments = [...(existing.comments || [])];
          for (const newComment of body.comments || []) {
            if (!mergedComments.some((c) => c.id === newComment.id)) {
              mergedComments.push(newComment);
            }
          }
          return {
            ...existing,
            ...body,
            comments: mergedComments,
            likes: Math.max(existing.likes || 0, body.likes || 0),
            shares: Math.max(existing.shares || 0, body.shares || 0),
          };
        });
        if (merged) return json(200, merged);
      }

      const newPost: PostItem = {
        id: body.id || 'post_' + Date.now().toString(),
        category: body.category,
        title: body.title,
        description: body.description || undefined,
        attachment: body.attachment || undefined,
        authorName: body.authorName || 'ZeptaLabs Officials',
        authorAvatar: body.authorAvatar || 'logo.png',
        createdAt: body.createdAt || formatNow(),
        likes: typeof body.likes === 'number' ? body.likes : 0,
        likedBy: Array.isArray(body.likedBy) ? body.likedBy : [],
        shares: typeof body.shares === 'number' ? body.shares : 0,
        comments: Array.isArray(body.comments) ? body.comments : [],
      };

      await insertPost(newPost);
      return json(201, newPost);
    }

    // POST /api/posts/sync - Upload posts that only exist in a browser cache
    if (event.httpMethod === 'POST' && path === '/sync') {
      const body = JSON.parse(event.body || '{}');
      const incomingPosts: PostItem[] = Array.isArray(body.posts) ? body.posts : [];
      const valid = incomingPosts.filter((p) => p && p.id && p.title && p.category);

      if (valid.length > 0) {
        const ids = valid.map((p) => p.id);
        // Never resurrect posts that were deleted on the server
        const deletedRows = await db().sql`SELECT id FROM deleted_posts WHERE id = ANY(${ids})`;
        const deleted = new Set(deletedRows.map((r: any) => r.id as string));
        for (const inc of valid) {
          if (!deleted.has(inc.id)) await insertPost(inc);
        }
      }

      return json(200, await listPosts());
    }

    // POST /api/posts/:id/like
    const likeMatch = path.match(/^\/([^/]+)\/like$/);
    if (event.httpMethod === 'POST' && likeMatch) {
      const postId = likeMatch[1];
      const { clientId } = JSON.parse(event.body || '{}');
      if (!clientId) return json(400, { error: 'clientId is required' });

      let result = { likes: 0, isLiked: false };
      await updatePost(postId, (p) => {
        const { next, isLiked } = toggleId(p.likedBy, clientId);
        result = { likes: next.length, isLiked };
        return { ...p, likes: next.length, likedBy: next };
      });
      return json(200, result);
    }

    // POST /api/posts/:id/share
    const shareMatch = path.match(/^\/([^/]+)\/share$/);
    if (event.httpMethod === 'POST' && shareMatch) {
      const updated = await updatePost(shareMatch[1], (p) => ({ ...p, shares: (p.shares || 0) + 1 }));
      return json(200, { shares: updated?.shares || 0 });
    }

    // POST /api/posts/:id/comments
    const commentMatch = path.match(/^\/([^/]+)\/comments$/);
    if (event.httpMethod === 'POST' && commentMatch) {
      const postId = commentMatch[1];
      const { authorName, content, authorAvatar } = JSON.parse(event.body || '{}');

      if (!content || !String(content).trim()) {
        return json(400, { error: 'Content is required' });
      }

      const createdComment: CommentItem = {
        id: 'comment_' + Date.now().toString(),
        authorName: (authorName && String(authorName).trim()) || 'Visitor',
        authorAvatar: authorAvatar || '',
        content: String(content).trim(),
        createdAt: 'Just now',
        likes: 0,
        likedBy: [],
      };

      const updated = await updatePost(postId, (p) => ({
        ...p,
        comments: [...(p.comments || []), createdComment],
      }));
      if (!updated) return json(404, { error: 'Post not found' });
      return json(201, createdComment);
    }

    // POST /api/posts/:postId/comments/:commentId/like
    const commentLikeMatch = path.match(/^\/([^/]+)\/comments\/([^/]+)\/like$/);
    if (event.httpMethod === 'POST' && commentLikeMatch) {
      const [, postId, commentId] = commentLikeMatch;
      const { clientId } = JSON.parse(event.body || '{}');
      if (!clientId) return json(400, { error: 'clientId is required' });

      let result = { likes: 0, isLiked: false };
      await updatePost(postId, (p) => ({
        ...p,
        comments: (p.comments || []).map((c) => {
          if (c.id !== commentId) return c;
          const { next, isLiked } = toggleId(c.likedBy, clientId);
          result = { likes: next.length, isLiked };
          return { ...c, likes: next.length, likedBy: next };
        }),
      }));
      return json(200, result);
    }

    // DELETE /api/posts/:id
    const deleteMatch = path.match(/^\/([^/]+)$/);
    if (event.httpMethod === 'DELETE' && deleteMatch) {
      const postId = deleteMatch[1];
      await db().sql`DELETE FROM posts WHERE id = ${postId}`;
      await db().sql`INSERT INTO deleted_posts (id) VALUES (${postId}) ON CONFLICT (id) DO NOTHING`;
      return json(200, { success: true });
    }

    // DELETE /api/posts/:postId/comments/:commentId
    const deleteCommentMatch = path.match(/^\/([^/]+)\/comments\/([^/]+)$/);
    if (event.httpMethod === 'DELETE' && deleteCommentMatch) {
      const [, postId, commentId] = deleteCommentMatch;
      await updatePost(postId, (p) => ({
        ...p,
        comments: (p.comments || []).filter((c) => c.id !== commentId),
      }));
      return json(200, { success: true });
    }

    return json(404, { error: 'Not found' });
  } catch (error) {
    console.error('Function error:', error);
    return json(500, { error: 'Internal server error' });
  }
};
