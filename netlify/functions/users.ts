import type { Config } from '@netlify/functions';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { ...corsHeaders, 'Cache-Control': 'no-store' } });

type UserRow = typeof users.$inferSelect;

const toClient = (u: UserRow) => ({
  name: u.name,
  accountKey: u.displayKey,
  email: u.email,
  avatarUrl: u.avatarUrl,
  createdAt: u.createdAt.toISOString(),
  notificationsEnabled: u.notificationsEnabled !== 0,
});

// Normalise keys so "#abc", "abc" and "ABC" all resolve to the same account
const normalizeKey = (key: string) => key.trim().toLowerCase().replace(/^#+/, '');

const readBody = async (req: Request) => {
  try {
    return await req.json();
  } catch {
    return {};
  }
};

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const path = new URL(req.url).pathname.replace(/^\/api\/users/, '').replace(/\/$/, '');

  try {
    if (req.method === 'GET' && path === '') {
      const rows = await db.select().from(users);
      return json(rows.map(toClient));
    }

    if (req.method === 'POST' && path === '') {
      const { name, accountKey, email, avatarUrl, notificationsEnabled } = await readBody(req);
      if (!accountKey || typeof accountKey !== 'string') {
        return json({ error: 'accountKey is required' }, 400);
      }

      const values = {
        accountKey: normalizeKey(accountKey),
        displayKey: accountKey.trim(),
        name: name || 'ZeptaLabs Member',
        email: email || '',
        avatarUrl: avatarUrl || 'logo.png',
        notificationsEnabled: notificationsEnabled === false ? 0 : 1,
      };

      const [saved] = await db
        .insert(users)
        .values(values)
        .onConflictDoUpdate({
          target: users.accountKey,
          set: {
            displayKey: values.displayKey,
            name: values.name,
            email: values.email,
            avatarUrl: values.avatarUrl,
            notificationsEnabled: values.notificationsEnabled,
          },
        })
        .returning();
      return json(toClient(saved));
    }

    if (req.method === 'POST' && path === '/find') {
      const { key } = await readBody(req);
      if (!key || typeof key !== 'string') {
        return json({ error: 'key is required' }, 400);
      }
      const [found] = await db.select().from(users).where(eq(users.accountKey, normalizeKey(key)));
      return json({ found: !!found, user: found ? toClient(found) : null });
    }

    return json({ error: 'Not found' }, 404);
  } catch (error) {
    console.error('users function error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
};

export const config: Config = {
  path: ['/api/users', '/api/users/*'],
};
