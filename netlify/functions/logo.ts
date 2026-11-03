import type { Config } from '@netlify/functions';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { settings } from '../../db/schema.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { ...corsHeaders, 'Cache-Control': 'no-store' } });

const LOGO_KEY = 'site_logo';

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (req.method === 'GET') {
      const [row] = await db.select().from(settings).where(eq(settings.key, LOGO_KEY));
      return json({ logoUrl: row?.value || 'logo.png' });
    }

    if (req.method === 'POST') {
      let body: any = {};
      try {
        body = await req.json();
      } catch {}
      const { logoUrl } = body;
      if (!logoUrl || typeof logoUrl !== 'string') {
        return json({ error: 'logoUrl is required' }, 400);
      }
      await db
        .insert(settings)
        .values({ key: LOGO_KEY, value: logoUrl })
        .onConflictDoUpdate({ target: settings.key, set: { value: logoUrl } });
      return json({ logoUrl });
    }

    return json({ error: 'Method not allowed' }, 405);
  } catch (error) {
    console.error('logo function error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
};

export const config: Config = {
  path: '/api/logo',
};
