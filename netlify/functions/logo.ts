import type { Handler, HandlerEvent } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

// Netlify Blobs storage helpers
async function readLogo(): Promise<string> {
  try {
    const store = getStore('zeptalabs-data');
    const data = await store.get('logo', { type: 'text' });
    console.log('📖 Read logo from blob storage:', data || 'logo.png (default)');
    return (data as string) || 'logo.png';
  } catch (error) {
    console.error('❌ Error reading logo from blob storage:', error);
    return 'logo.png';
  }
}

async function writeLogo(logoUrl: string): Promise<void> {
  try {
    const store = getStore('zeptalabs-data');
    await store.set('logo', logoUrl);
    console.log('💾 Wrote logo to blob storage:', logoUrl);
  } catch (error) {
    console.error('❌ Error writing logo to blob storage:', error);
    throw new Error('Failed to save logo to storage');
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

  try {
    // GET /api/logo
    if (event.httpMethod === 'GET') {
      const storedLogo = await readLogo();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ logoUrl: storedLogo }),
      };
    }

    // POST /api/logo
    if (event.httpMethod === 'POST') {
      const { logoUrl } = JSON.parse(event.body || '{}');
      
      if (!logoUrl) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'logoUrl is required' }),
        };
      }

      await writeLogo(logoUrl);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ logoUrl }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
