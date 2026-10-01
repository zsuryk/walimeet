import { checkRateLimits } from './lib/ratelimit';
import { verifyTurnstile } from './lib/turnstile';
import { handleCreatePoll } from './routes/create';
import { handleGetPoll } from './routes/poll';
import { handleRespond } from './routes/respond';
import type { Env } from './lib/types';

const headers: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Turnstile-Response',
  'Access-Control-Max-Age': '86400',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
};

function withHeaders(response: Response): Response {
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      const limited = await checkRateLimits(request, env, request.method);
      if (limited) {
        return withHeaders(limited);
      }

      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers });
      }

      const blocked = await verifyTurnstile(request, env);
      if (blocked) {
        return withHeaders(blocked);
      }

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

      const result = withHeaders(response);
      if (request.method === 'GET' && result.status === 200) {
        result.headers.set('Cache-Control', 'public, max-age=30');
      }
      return result;
    } catch (error) {
      console.error(
        JSON.stringify({
          msg: 'worker_error',
          path: path.replace(/\/api\/poll\/[^/]+/, '/api/poll/:id'),
          error: String(error),
        })
      );
      return new Response('Internal error', {
        status: 500,
        headers,
      });
    }
  },
};
