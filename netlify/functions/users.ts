import type { Handler, HandlerEvent } from '@netlify/functions';
import { db } from '../lib/db';

interface ServerUserItem {
  name: string;
  accountKey: string;
  email?: string;
  avatarUrl?: string;
  createdAt: string;
  notificationsEnabled?: boolean;
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

// Account keys are stored lowercase without the leading '#', so '#abc' and 'ABC' match
function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/^#+/, '');
}

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const path = event.path
    .replace(/^\/\.netlify\/functions\/users/, '')
    .replace(/^\/api\/users/, '')
    .replace(/\/+$/, '');

  try {
    // GET /api/users
    if (event.httpMethod === 'GET' && path === '') {
      const rows = await db().sql`SELECT data FROM app_users ORDER BY updated_at DESC`;
      return { statusCode: 200, headers, body: JSON.stringify(rows.map((r: any) => r.data)) };
    }

    // POST /api/users
    if (event.httpMethod === 'POST' && path === '') {
      const { name, accountKey, email, avatarUrl, notificationsEnabled } = JSON.parse(event.body || '{}');

      if (!accountKey || typeof accountKey !== 'string' || !normalizeKey(accountKey)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'accountKey is required' }) };
      }

      const key = normalizeKey(accountKey);
      const existing = await db().sql`SELECT data FROM app_users WHERE account_key = ${key}`;
      const previous = existing.length > 0 ? ((existing[0] as any).data as ServerUserItem) : null;

      const updatedUser: ServerUserItem = {
        name: name || 'ZeptaLabs Member',
        accountKey: accountKey.trim(),
        email: email || '',
        avatarUrl: avatarUrl || 'logo.png',
        createdAt: previous?.createdAt || new Date().toISOString(),
        notificationsEnabled: notificationsEnabled !== false,
      };

      await db().sql`
        INSERT INTO app_users (account_key, data, updated_at)
        VALUES (${key}, ${JSON.stringify(updatedUser)}::jsonb, NOW())
        ON CONFLICT (account_key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `;

      return { statusCode: 200, headers, body: JSON.stringify(updatedUser) };
    }

    // POST /api/users/find
    if (event.httpMethod === 'POST' && path === '/find') {
      const { key } = JSON.parse(event.body || '{}');

      if (!key || typeof key !== 'string') {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'key is required' }) };
      }

      const rows = await db().sql`SELECT data FROM app_users WHERE account_key = ${normalizeKey(key)}`;
      const found = rows.length > 0 ? (rows[0] as any).data : null;

      return { statusCode: 200, headers, body: JSON.stringify({ found: !!found, user: found }) };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
  } catch (error) {
    console.error('Users function error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
