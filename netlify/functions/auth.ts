import type { Handler, HandlerEvent } from '@netlify/functions';
import crypto from 'crypto';

const ADMIN_HASHES = [
  '5175bf3cc64f2faa88ab54c08694aa81c0dfdb8fb441271ee970d26f98fd779c',
  '1931a8de33c52fd980828a9bb3a9683491f9c041d7f912b33c1cebbce7b98383',
  'dd9c50fe578af7964d8c930663a56bbf4dc34c0193e09d4a5e74ac1644e4540e',
];

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { key } = JSON.parse(event.body || '{}');
    
    if (!key || typeof key !== 'string') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ isAdmin: false }),
      };
    }

    const trimmed = key.trim();
    const normalized = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    const rawWithoutHash = trimmed.replace(/^#+/, '');
    
    const h1 = crypto.createHash('sha256').update(trimmed).digest('hex');
    const h2 = crypto.createHash('sha256').update(normalized).digest('hex');
    const h3 = crypto.createHash('sha256').update(rawWithoutHash).digest('hex');
    
    const isAdmin = ADMIN_HASHES.some((h) => h === h1 || h === h2 || h === h3);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ isAdmin }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', isAdmin: false }),
    };
  }
};
