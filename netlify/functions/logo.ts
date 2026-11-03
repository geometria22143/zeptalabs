import type { Handler, HandlerEvent } from '@netlify/functions';
import { db } from '../lib/db';

const DEFAULT_LOGO = 'logo.png';

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

  try {
    // GET /api/logo
    if (event.httpMethod === 'GET') {
      const rows = await db().sql`SELECT value FROM site_settings WHERE key = 'logo'`;
      const logoUrl = rows.length > 0 ? (rows[0] as any).value : DEFAULT_LOGO;
      return { statusCode: 200, headers, body: JSON.stringify({ logoUrl }) };
    }

    // POST /api/logo
    if (event.httpMethod === 'POST') {
      const { logoUrl } = JSON.parse(event.body || '{}');

      if (!logoUrl || typeof logoUrl !== 'string') {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'logoUrl is required' }) };
      }

      await db().sql`
        INSERT INTO site_settings (key, value, updated_at)
        VALUES ('logo', ${logoUrl}, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `;

      return { statusCode: 200, headers, body: JSON.stringify({ logoUrl }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (error) {
    console.error('Logo function error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
