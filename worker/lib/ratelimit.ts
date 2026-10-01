import type { Env, RateLimit } from './types';

async function consume(
  binding: RateLimit,
  key: string,
  period: number,
  limiter: string
): Promise<Response | null> {
  let result: { success: boolean };
  try {
    result = await binding.limit({ key });
  } catch (error) {
    console.error(JSON.stringify({ msg: 'ratelimit_binding_error', limiter, error: String(error) }));
    return null;
  }
  if (result.success) {
    return null;
  }
  return new Response('Too many requests', {
    status: 429,
    headers: { 'Retry-After': String(period) },
  });
}

export async function checkRateLimits(
  request: Request,
  env: Env,
  method: string
): Promise<Response | null> {
  const key = request.headers.get('cf-connecting-ip') || 'unknown';

  let response = await consume(env.RATE_LIMIT_ALL, key, 60, 'RATE_LIMIT_ALL');
  if (response) {
    return response;
  }

  response = await consume(env.RATE_LIMIT_BURST, key, 10, 'RATE_LIMIT_BURST');
  if (response) {
    return response;
  }

  if (method === 'POST' || method === 'PUT') {
    response = await consume(env.RATE_LIMIT_WRITE, key, 60, 'RATE_LIMIT_WRITE');
    if (response) {
      return response;
    }
  }

  return null;
}
