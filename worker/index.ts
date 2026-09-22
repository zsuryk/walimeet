import { handleCreatePoll } from './routes/create';
import { handleGetPoll } from './routes/poll';
import { handleRespond } from './routes/respond';
import type { Env } from './lib/types';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    try {
      let response: Response;

      if (request.method === 'POST' && path === '/api/poll') {
        response = await handleCreatePoll(request, env);
      } else if (request.method === 'GET' && path.startsWith('/api/poll/')) {
        const pollId = path.split('/api/poll/')[1];
        response = await handleGetPoll(request, env, pollId);
      } else if (request.method === 'PUT' && path.startsWith('/api/poll/') && path.endsWith('/respond')) {
        const pollId = path.split('/api/poll/')[1].split('/')[0];
        response = await handleRespond(request, env, pollId);
      } else {
        response = new Response('Not found', { status: 404 });
      }

      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal error', {
        status: 500,
        headers,
      });
    }
  },
};
