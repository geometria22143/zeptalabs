import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

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

// Use Netlify Blobs for persistent storage
let posts: PostItem[] = [];

// CORS headers for all responses
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const path = event.path.replace('/.netlify/functions/posts', '');

  try {
    // GET /api/posts - Fetch all posts
    if (event.httpMethod === 'GET' && path === '') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(posts),
      };
    }

    // POST /api/posts - Create new post
    if (event.httpMethod === 'POST' && path === '') {
      const body = JSON.parse(event.body || '{}');
      
      if (!body.title || !body.category) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Title and category are required' }),
        };
      }

      // Check if post already exists
      if (body.id) {
        const existingIndex = posts.findIndex((p) => p.id === body.id);
        if (existingIndex !== -1) {
          const existing = posts[existingIndex];
          const mergedComments = [...(existing.comments || [])];
          for (const newComment of body.comments || []) {
            if (!mergedComments.some((c) => c.id === newComment.id)) {
              mergedComments.push(newComment);
            }
          }
          posts[existingIndex] = {
            ...existing,
            ...body,
            comments: mergedComments,
            likes: Math.max(existing.likes || 0, body.likes || 0),
            shares: Math.max(existing.shares || 0, body.shares || 0),
          };
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(posts[existingIndex]),
          };
        }
      }

      const newPost: PostItem = {
        id: body.id || ('post_' + Date.now().toString()),
        category: body.category,
        title: body.title,
        description: body.description || undefined,
        attachment: body.attachment || undefined,
        authorName: body.authorName || 'ZeptaLabs Officials',
        authorAvatar: body.authorAvatar || 'logo.png',
        createdAt:
          body.createdAt ||
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
        likes: typeof body.likes === 'number' ? body.likes : 0,
        likedBy: Array.isArray(body.likedBy) ? body.likedBy : [],
        shares: typeof body.shares === 'number' ? body.shares : 0,
        comments: Array.isArray(body.comments) ? body.comments : [],
      };

      posts.unshift(newPost);
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(newPost),
      };
    }

    // POST /api/posts/sync - Batch sync
    if (event.httpMethod === 'POST' && path === '/sync') {
      const body = JSON.parse(event.body || '{}');
      const incomingPosts = body.posts || [];
      
      for (const inc of incomingPosts) {
        if (!inc || !inc.id || !inc.title) continue;
        const existingIndex = posts.findIndex((p) => p.id === inc.id);
        if (existingIndex === -1) {
          posts.push(inc);
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(posts),
      };
    }

    // POST /api/posts/:id/like
    const likeMatch = path.match(/^\/([^/]+)\/like$/);
    if (event.httpMethod === 'POST' && likeMatch) {
      const postId = likeMatch[1];
      const body = JSON.parse(event.body || '{}');
      const { clientId } = body;

      if (!clientId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'clientId is required' }),
        };
      }

      let result = { likes: 0, isLiked: false };
      posts = posts.map((p) => {
        if (p.id === postId) {
          const alreadyLiked = (p.likedBy || []).includes(clientId);
          const newLikedBy = alreadyLiked
            ? (p.likedBy || []).filter((cid) => cid !== clientId)
            : [...(p.likedBy || []), clientId];
          result = { likes: newLikedBy.length, isLiked: !alreadyLiked };
          return {
            ...p,
            likes: newLikedBy.length,
            likedBy: newLikedBy,
          };
        }
        return p;
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result),
      };
    }

    // POST /api/posts/:id/share
    const shareMatch = path.match(/^\/([^/]+)\/share$/);
    if (event.httpMethod === 'POST' && shareMatch) {
      const postId = shareMatch[1];
      let shares = 0;

      posts = posts.map((p) => {
        if (p.id === postId) {
          shares = (p.shares || 0) + 1;
          return { ...p, shares };
        }
        return p;
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ shares }),
      };
    }

    // POST /api/posts/:id/comments
    const commentMatch = path.match(/^\/([^/]+)\/comments$/);
    if (event.httpMethod === 'POST' && commentMatch) {
      const postId = commentMatch[1];
      const body = JSON.parse(event.body || '{}');
      const { authorName, content, authorAvatar } = body;

      if (!content || !content.trim()) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Content is required' }),
        };
      }

      let createdComment: CommentItem | null = null;

      posts = posts.map((p) => {
        if (p.id === postId) {
          createdComment = {
            id: 'comment_' + Date.now().toString(),
            authorName: (authorName && authorName.trim()) || 'Visitor',
            authorAvatar: authorAvatar || '',
            content: content.trim(),
            createdAt: 'Just now',
            likes: 0,
            likedBy: [],
          };
          return {
            ...p,
            comments: [...(p.comments || []), createdComment],
          };
        }
        return p;
      });

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(createdComment),
      };
    }

    // POST /api/posts/:postId/comments/:commentId/like
    const commentLikeMatch = path.match(/^\/([^/]+)\/comments\/([^/]+)\/like$/);
    if (event.httpMethod === 'POST' && commentLikeMatch) {
      const [, postId, commentId] = commentLikeMatch;
      const body = JSON.parse(event.body || '{}');
      const { clientId } = body;

      if (!clientId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'clientId is required' }),
        };
      }

      let result = { likes: 0, isLiked: false };

      posts = posts.map((p) => {
        if (p.id === postId) {
          const updatedComments = (p.comments || []).map((c) => {
            if (c.id === commentId) {
              const alreadyLiked = (c.likedBy || []).includes(clientId);
              const newLikedBy = alreadyLiked
                ? (c.likedBy || []).filter((cid) => cid !== clientId)
                : [...(c.likedBy || []), clientId];
              result = { likes: newLikedBy.length, isLiked: !alreadyLiked };
              return {
                ...c,
                likes: newLikedBy.length,
                likedBy: newLikedBy,
              };
            }
            return c;
          });
          return { ...p, comments: updatedComments };
        }
        return p;
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result),
      };
    }

    // DELETE /api/posts/:id
    const deleteMatch = path.match(/^\/([^/]+)$/);
    if (event.httpMethod === 'DELETE' && deleteMatch) {
      const postId = deleteMatch[1];
      posts = posts.filter((p) => p.id !== postId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true }),
      };
    }

    // DELETE /api/posts/:postId/comments/:commentId
    const deleteCommentMatch = path.match(/^\/([^/]+)\/comments\/([^/]+)$/);
    if (event.httpMethod === 'DELETE' && deleteCommentMatch) {
      const [, postId, commentId] = deleteCommentMatch;
      posts = posts.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            comments: (p.comments || []).filter((c) => c.id !== commentId),
          };
        }
        return p;
      });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true }),
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' }),
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
