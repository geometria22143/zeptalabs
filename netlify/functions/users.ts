import type { Handler, HandlerEvent } from '@netlify/functions';

interface ServerUserItem {
  name: string;
  accountKey: string;
  email?: string;
  avatarUrl?: string;
  createdAt: string;
  notificationsEnabled?: boolean;
}

let users: ServerUserItem[] = [];

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
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(users),
      };
    }

    // POST /api/users
    if (event.httpMethod === 'POST' && path === '') {
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
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(updatedUser),
      };
    }

    // POST /api/users/find
    if (event.httpMethod === 'POST' && path === '/find') {
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
