import type { Handler } from '@netlify/functions';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler: Handler = async () => {
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      status: 'OK',
      message: '✅ Netlify Functions are working!',
      timestamp: new Date().toISOString(),
      environment: 'Netlify Serverless',
    }),
  };
};
