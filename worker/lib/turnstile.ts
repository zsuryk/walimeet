import type { Env } from './types';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

function isEnforcedRoute(request: Request): boolean {
  const { pathname } = new URL(request.url);
  if (request.method === 'POST') return pathname === '/api/poll';
  if (request.method === 'PUT') {
    return pathname.startsWith('/api/poll/') && pathname.endsWith('/respond');
  }
  return false;
}

function denied(message: string): Response {
  return new Response(message, { status: 403 });
}

export async function verifyTurnstile(
  request: Request,
  env: Env
): Promise<Response | null> {
  const secret = env.TURNSTILE_SECRET;
  if (!secret) return null;
  if (!isEnforcedRoute(request)) return null;

  const token = request.headers.get('x-turnstile-response');
  if (!token) return denied('Verification required');

  let success = false;
  try {
    const params = new URLSearchParams({ secret, response: token });
    const remoteip = request.headers.get('cf-connecting-ip');
    if (remoteip) {
      params.set('remoteip', remoteip);
    }
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      body: params,
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = (await res.json()) as { success?: unknown; hostname?: unknown };
      success = data.success === true;
      const allowedRaw = env.TURNSTILE_ALLOWED_HOSTNAMES;
      if (success && allowedRaw) {
        const allowed = new Set(
          allowedRaw
            .split(',')
            .map((host) => host.trim())
            .filter(Boolean)
        );
        if (allowed.size > 0) {
          const hostname = typeof data.hostname === 'string' ? data.hostname : '';
          if (!allowed.has(hostname)) {
            success = false;
          }
        }
      }
    }
  } catch {
    success = false;
  }
  return success ? null : denied('Verification failed');
}
