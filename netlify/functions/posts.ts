import type { Config } from '@netlify/functions';
import { desc, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { posts, type CommentRecord } from '../../db/schema.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { ...corsHeaders, 'Cache-Control': 'no-store' },
  });

type PostRow = typeof posts.$inferSelect;

// Shape the DB row exactly as the frontend PostItem expects
const toClient = (row: PostRow) => ({
  id: row.id,
  category: row.category,
  title: row.title,
  description: row.description ?? undefined,
  attachment: row.attachment ?? undefined,
  authorName: row.authorName,
  authorAvatar: row.authorAvatar,
  createdAt: row.createdAt,
  likes: row.likes,
  likedBy: row.likedBy ?? [],
  shares: row.shares,
  comments: row.comments ?? [],
});

const displayDate = () => {
  const now = new Date();
  return (
    now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' +
    now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  );
};

const listPosts = async () => {
  const rows = await db.select().from(posts).orderBy(desc(posts.insertedAt));
  return rows.map(toClient);
};

const getPost = async (id: string) => {
  const [row] = await db.select().from(posts).where(eq(posts.id, id));
  return row;
};

const readBody = async (req: Request) => {
  try {
    return await req.json();
  } catch {
    return {};
  }
};

const buildNewRow = (body: any): typeof posts.$inferInsert => ({
  id: body.id || 'post_' + Date.now().toString() + Math.random().toString(36).slice(2, 6),
  category: body.category,
  title: body.title,
  description: body.description || null,
  attachment: body.attachment || null,
  authorName: body.authorName || 'ZeptaLabs Officials',
  authorAvatar: body.authorAvatar || 'logo.png',
  createdAt: body.createdAt || displayDate(),
  likes: typeof body.likes === 'number' ? body.likes : 0,
  likedBy: Array.isArray(body.likedBy) ? body.likedBy : [],
  shares: typeof body.shares === 'number' ? body.shares : 0,
  comments: Array.isArray(body.comments) ? body.comments : [],
});

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/posts/, '').replace(/\/$/, '');

  try {
    // GET /api/posts
    if (req.method === 'GET' && path === '') {
      return json(await listPosts());
    }

    // POST /api/posts - create (or merge if id already exists)
    if (req.method === 'POST' && path === '') {
      const body = await readBody(req);
      if (!body.title || !body.category) {
        return json({ error: 'Title and category are required' }, 400);
      }

      if (body.id) {
        const existing = await getPost(body.id);
        if (existing) {
          const mergedComments: CommentRecord[] = [...(existing.comments || [])];
          for (const c of body.comments || []) {
            if (!mergedComments.some((m) => m.id === c.id)) mergedComments.push(c);
          }
          const [updated] = await db
            .update(posts)
            .set({
              title: body.title,
              category: body.category,
              description: body.description ?? existing.description,
              attachment: body.attachment ?? existing.attachment,
              comments: mergedComments,
              likes: Math.max(existing.likes || 0, body.likes || 0),
              shares: Math.max(existing.shares || 0, body.shares || 0),
            })
            .where(eq(posts.id, body.id))
            .returning();
          return json(toClient(updated));
        }
      }

      const [created] = await db.insert(posts).values(buildNewRow(body)).returning();
      return json(toClient(created), 201);
    }

    // POST /api/posts/sync - push locally cached posts that the server doesn't have yet
    if (req.method === 'POST' && path === '/sync') {
      const body = await readBody(req);
      const incoming: any[] = Array.isArray(body.posts) ? body.posts : [];
      const valid = incoming.filter((p) => p && p.id && p.title && p.category);
      if (valid.length > 0) {
        await db.insert(posts).values(valid.map(buildNewRow)).onConflictDoNothing();
      }
      return json(await listPosts());
    }

    // POST /api/posts/:id/like
    const likeMatch = path.match(/^\/([^/]+)\/like$/);
    if (req.method === 'POST' && likeMatch) {
      const postId = decodeURIComponent(likeMatch[1]);
      const { clientId } = await readBody(req);
      if (!clientId) return json({ error: 'clientId is required' }, 400);

      const post = await getPost(postId);
      if (!post) return json({ error: 'Post not found' }, 404);

      const likedBy = post.likedBy || [];
      const alreadyLiked = likedBy.includes(clientId);
      const newLikedBy = alreadyLiked ? likedBy.filter((c) => c !== clientId) : [...likedBy, clientId];
      await db
        .update(posts)
        .set({ likedBy: newLikedBy, likes: newLikedBy.length })
        .where(eq(posts.id, postId));
      return json({ likes: newLikedBy.length, isLiked: !alreadyLiked });
    }

    // POST /api/posts/:id/share
    const shareMatch = path.match(/^\/([^/]+)\/share$/);
    if (req.method === 'POST' && shareMatch) {
      const postId = decodeURIComponent(shareMatch[1]);
      const post = await getPost(postId);
      if (!post) return json({ error: 'Post not found' }, 404);
      const shares = (post.shares || 0) + 1;
      await db.update(posts).set({ shares }).where(eq(posts.id, postId));
      return json({ shares });
    }

    // POST /api/posts/:id/comments
    const commentMatch = path.match(/^\/([^/]+)\/comments$/);
    if (req.method === 'POST' && commentMatch) {
      const postId = decodeURIComponent(commentMatch[1]);
      const { authorName, content, authorAvatar } = await readBody(req);
      if (!content || !String(content).trim()) {
        return json({ error: 'Content is required' }, 400);
      }

      const post = await getPost(postId);
      if (!post) return json({ error: 'Post not found' }, 404);

      const comment: CommentRecord = {
        id: 'comment_' + Date.now().toString() + Math.random().toString(36).slice(2, 6),
        authorName: (authorName && String(authorName).trim()) || 'Visitor',
        authorAvatar: authorAvatar || '',
        content: String(content).trim(),
        createdAt: 'Just now',
        likes: 0,
        likedBy: [],
      };
      await db
        .update(posts)
        .set({ comments: [...(post.comments || []), comment] })
        .where(eq(posts.id, postId));
      return json(comment, 201);
    }

    // POST /api/posts/:postId/comments/:commentId/like
    const commentLikeMatch = path.match(/^\/([^/]+)\/comments\/([^/]+)\/like$/);
    if (req.method === 'POST' && commentLikeMatch) {
      const postId = decodeURIComponent(commentLikeMatch[1]);
      const commentId = decodeURIComponent(commentLikeMatch[2]);
      const { clientId } = await readBody(req);
      if (!clientId) return json({ error: 'clientId is required' }, 400);

      const post = await getPost(postId);
      if (!post) return json({ error: 'Post not found' }, 404);

      let result = { likes: 0, isLiked: false };
      const updatedComments = (post.comments || []).map((c) => {
        if (c.id !== commentId) return c;
        const likedBy = c.likedBy || [];
        const already = likedBy.includes(clientId);
        const newLikedBy = already ? likedBy.filter((id) => id !== clientId) : [...likedBy, clientId];
        result = { likes: newLikedBy.length, isLiked: !already };
        return { ...c, likes: newLikedBy.length, likedBy: newLikedBy };
      });
      await db.update(posts).set({ comments: updatedComments }).where(eq(posts.id, postId));
      return json(result);
    }

    // DELETE /api/posts/:postId/comments/:commentId
    const deleteCommentMatch = path.match(/^\/([^/]+)\/comments\/([^/]+)$/);
    if (req.method === 'DELETE' && deleteCommentMatch) {
      const postId = decodeURIComponent(deleteCommentMatch[1]);
      const commentId = decodeURIComponent(deleteCommentMatch[2]);
      const post = await getPost(postId);
      if (post) {
        await db
          .update(posts)
          .set({ comments: (post.comments || []).filter((c) => c.id !== commentId) })
          .where(eq(posts.id, postId));
      }
      return json({ success: true });
    }

    // DELETE /api/posts/:id
    const deleteMatch = path.match(/^\/([^/]+)$/);
    if (req.method === 'DELETE' && deleteMatch) {
      await db.delete(posts).where(eq(posts.id, decodeURIComponent(deleteMatch[1])));
      return json({ success: true });
    }

    return json({ error: 'Not found' }, 404);
  } catch (error) {
    console.error('posts function error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
};

export const config: Config = {
  path: ['/api/posts', '/api/posts/*'],
};
