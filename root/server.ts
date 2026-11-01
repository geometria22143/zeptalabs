import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = path.join(__dirname, 'posts.json');
const USERS_FILE = path.join(__dirname, 'users.json');

// Irreversible cryptographic SHA-256 hashes of authorized admin keys
const ADMIN_HASHES = [
  '5175bf3cc64f2faa88ab54c08694aa81c0dfdb8fb441271ee970d26f98fd779c',
  '1931a8de33c52fd980828a9bb3a9683491f9c041d7f912b33c1cebbce7b98383',
  'dd9c50fe578af7964d8c930663a56bbf4dc34c0193e09d4a5e74ac1644e4540e',
];

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
}
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, '[]', 'utf-8');
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(__dirname));

// Admin Verification Endpoint
app.post('/api/auth/verify-admin', (req: Request, res: Response) => {
  const { key } = req.body;
  if (!key || typeof key !== 'string') {
    res.json({ isAdmin: false });
    return;
  }
  const trimmed = key.trim();
  const normalized = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  const rawWithoutHash = trimmed.replace(/^#+/, '');
  const h1 = crypto.createHash('sha256').update(trimmed).digest('hex');
  const h2 = crypto.createHash('sha256').update(normalized).digest('hex');
  const h3 = crypto.createHash('sha256').update(rawWithoutHash).digest('hex');
  const isAdmin = ADMIN_HASHES.some((h) => h === h1 || h === h2 || h === h3);
  res.json({ isAdmin });
});

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

function readPosts(): PostItem[] {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writePosts(posts: PostItem[]): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write posts:', err);
  }
}

interface ServerUserItem {
  name: string;
  accountKey: string;
  email?: string;
  avatarUrl?: string;
  createdAt: string;
  notificationsEnabled?: boolean;
}

function readUsers(): ServerUserItem[] {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeUsers(users: ServerUserItem[]): void {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write users:', err);
  }
}

// User Persistence Endpoints
app.get('/api/users', (_req: Request, res: Response) => {
  res.json(readUsers());
});

app.post('/api/users', (req: Request, res: Response) => {
  const { name, accountKey, email, avatarUrl, notificationsEnabled } = req.body;
  if (!accountKey || typeof accountKey !== 'string') {
    res.status(400).json({ error: 'accountKey required' });
    return;
  }
  const users = readUsers();
  const safeKey = accountKey.trim().toLowerCase();
  const filtered = users.filter((u) => (u.accountKey || '').trim().toLowerCase() !== safeKey);
  const updatedUser: ServerUserItem = {
    name: name || 'ZeptaLabs Member',
    accountKey: accountKey.trim(),
    email: email || '',
    avatarUrl: avatarUrl || 'logo.png',
    createdAt: new Date().toISOString(),
    notificationsEnabled: notificationsEnabled !== false,
  };
  filtered.push(updatedUser);
  writeUsers(filtered);
  res.json(updatedUser);
});

app.post('/api/users/find', (req: Request, res: Response) => {
  const { key } = req.body;
  if (!key || typeof key !== 'string') {
    res.status(400).json({ error: 'key required' });
    return;
  }
  const trimmed = key.trim().toLowerCase();
  const normalized = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  const rawWithoutHash = trimmed.replace(/^#+/, '');
  const users = readUsers();
  const found = users.find((u) => {
    const uKey = (u.accountKey || '').trim().toLowerCase();
    const uKeyWithoutHash = uKey.replace(/^#+/, '');
    return uKey === trimmed || uKey === normalized || uKeyWithoutHash === rawWithoutHash;
  });
  res.json({ found: !!found, user: found || null });
});

// API Endpoints
app.get('/api/posts', (_req: Request, res: Response) => {
  res.json(readPosts());
});

app.post('/api/posts', (req: Request, res: Response) => {
  const body = req.body;
  if (!body.title || !body.category) {
    res.status(400).json({ error: 'Title and category required' });
    return;
  }

  const posts = readPosts();
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
      writePosts(posts);
      res.status(200).json(posts[existingIndex]);
      return;
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
      new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
        ' ' +
        new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    likes: typeof body.likes === 'number' ? body.likes : 0,
    likedBy: Array.isArray(body.likedBy) ? body.likedBy : [],
    shares: typeof body.shares === 'number' ? body.shares : 0,
    comments: Array.isArray(body.comments) ? body.comments : [],
  };

  posts.unshift(newPost);
  writePosts(posts);
  res.status(201).json(newPost);
});

app.post('/api/posts/sync', (req: Request, res: Response) => {
  const { posts: incomingPosts } = req.body;
  if (!Array.isArray(incomingPosts)) {
    res.status(400).json({ error: 'posts array required' });
    return;
  }
  const currentPosts = readPosts();
  let changed = false;
  for (const inc of incomingPosts) {
    if (!inc || !inc.id || !inc.title) continue;
    const existingIndex = currentPosts.findIndex((p) => p.id === inc.id);
    if (existingIndex === -1) {
      currentPosts.push(inc);
      changed = true;
    }
  }
  if (changed) {
    writePosts(currentPosts);
  }
  res.json(currentPosts);
});

app.post('/api/posts/:id/like', (req: Request, res: Response) => {
  const { id } = req.params;
  const { clientId } = req.body;
  if (!clientId) {
    res.status(400).json({ error: 'clientId required' });
    return;
  }

  const posts = readPosts();
  let result = { likes: 0, isLiked: false };

  const updated = posts.map((p) => {
    if (p.id === id) {
      const already = (p.likedBy || []).includes(clientId);
      const newLikedBy = already ? p.likedBy.filter((c) => c !== clientId) : [...(p.likedBy || []), clientId];
      result = { likes: newLikedBy.length, isLiked: !already };
      return { ...p, likes: newLikedBy.length, likedBy: newLikedBy };
    }
    return p;
  });

  writePosts(updated);
  res.json(result);
});

app.post('/api/posts/:id/share', (req: Request, res: Response) => {
  const { id } = req.params;
  const posts = readPosts();
  let shares = 0;

  const updated = posts.map((p) => {
    if (p.id === id) {
      shares = (p.shares || 0) + 1;
      return { ...p, shares };
    }
    return p;
  });

  writePosts(updated);
  res.json({ shares });
});

app.post('/api/posts/:id/comments', (req: Request, res: Response) => {
  const { id } = req.params;
  const { authorName, content, authorAvatar } = req.body;

  if (!content || !content.trim()) {
    res.status(400).json({ error: 'Content required' });
    return;
  }

  const posts = readPosts();
  let createdComment: CommentItem | null = null;

  const updated = posts.map((p) => {
    if (p.id === id) {
      createdComment = {
        id: 'comment_' + Date.now().toString(),
        authorName: (authorName && authorName.trim()) || 'Visitor',
        authorAvatar: authorAvatar || '',
        content: content.trim(),
        createdAt: 'Just now',
        likes: 0,
        likedBy: [],
      };
      return { ...p, comments: [...(p.comments || []), createdComment] };
    }
    return p;
  });

  writePosts(updated);
  res.status(201).json(createdComment);
});

app.post('/api/posts/:id/comments/:commentId/like', (req: Request, res: Response) => {
  const { id, commentId } = req.params;
  const { clientId } = req.body;
  if (!clientId) {
    res.status(400).json({ error: 'clientId required' });
    return;
  }

  const posts = readPosts();
  let result = { likes: 0, isLiked: false };

  const updated = posts.map((p) => {
    if (p.id === id) {
      const updatedComments = (p.comments || []).map((c) => {
        if (c.id === commentId) {
          const already = (c.likedBy || []).includes(clientId);
          const newLikedBy = already ? c.likedBy.filter((x) => x !== clientId) : [...(c.likedBy || []), clientId];
          result = { likes: newLikedBy.length, isLiked: !already };
          return { ...c, likes: newLikedBy.length, likedBy: newLikedBy };
        }
        return c;
      });
      return { ...p, comments: updatedComments };
    }
    return p;
  });

  writePosts(updated);
  res.json(result);
});

app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ZeptaLabs Standalone Server running at http://0.0.0.0:${PORT}`);
});
