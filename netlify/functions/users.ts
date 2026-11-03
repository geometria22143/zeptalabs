import type { Handler, HandlerEvent } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

interface ServerUserItem {
  name: string;
  accountKey: string;
  email?: string;
  avatarUrl?: string;
  createdAt: string;
  notificationsEnabled?: boolean;
}

// Netlify Blobs storage helpers
async function readUsers(): Promise<ServerUserItem[]> {
  try {
    const store = getStore('zeptalabs-data');
    const data = await store.get('users', { type: 'json' });
    console.log('📖 Read from blob storage:', data ? (data as ServerUserItem[]).length : 0, 'users');
    return (data as ServerUserItem[]) || [];
  } catch (error) {
    console.error('❌ Error reading users from blob storage:', error);
    return [];
  }
}

async function writeUsers(users: ServerUserItem[]): Promise<void> {
  try {
    const store = getStore('zeptalabs-data');
    await store.set('users', JSON.stringify(users));
    console.log('💾 Wrote to blob storage:', users.length, 'users');
  } catch (error) {
    console.error('❌ Error writing users to blob storage:', error);
    throw new Error('Failed to save users to storage');
  }
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const path = event.path.replace('/.netlify/functions/users', '');

  try {
    // GET /api/users
    if (event.httpMethod === 'GET' && path === '') {
      const users = await readUsers();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(users),
      };
    }

    // POST /api/users
    if (event.httpMethod === 'POST' && path === '') {
      let users = await readUsers();
      const { name, accountKey, email, avatarUrl, notificationsEnabled } = JSON.parse(event.body || '{}');
      
      if (!accountKey || typeof accountKey !== 'string') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'accountKey is required' }),
        };
      }

      const safeKey = accountKey.trim().toLowerCase();
      users = users.filter((u) => (u.accountKey || '').trim().toLowerCase() !== safeKey);
      
      const updatedUser: ServerUserItem = {
        name: name || 'ZeptaLabs Member',
        accountKey: accountKey.trim(),
        email: email || '',
        avatarUrl: avatarUrl || 'logo.png',
        createdAt: new Date().toISOString(),
        notificationsEnabled: notificationsEnabled !== false,
      };
      
      users.push(updatedUser);
      await writeUsers(users);
      console.log('✅ User saved to blob storage:', updatedUser.accountKey);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(updatedUser),
      };
    }

    // POST /api/users/find
    if (event.httpMethod === 'POST' && path === '/find') {
      const users = await readUsers();
      const { key } = JSON.parse(event.body || '{}');
      
      if (!key || typeof key !== 'string') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'key is required' }),
        };
      }

      const trimmed = key.trim().toLowerCase();
      const normalized = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
      const rawWithoutHash = trimmed.replace(/^#+/, '');

      const found = users.find((u) => {
        const uKey = (u.accountKey || '').trim().toLowerCase();
        const uKeyWithoutHash = uKey.replace(/^#+/, '');
        return uKey === trimmed || uKey === normalized || uKeyWithoutHash === rawWithoutHash;
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ found: !!found, user: found || null }),
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
