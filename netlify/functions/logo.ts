import type { Handler, HandlerEvent } from '@netlify/functions';

let storedLogo = 'logo.png';

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

      storedLogo = logoUrl;
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ logoUrl: storedLogo }),
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
