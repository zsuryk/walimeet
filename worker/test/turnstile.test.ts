// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifyTurnstile } from '../lib/turnstile';
import type { Env } from '../lib/types';

const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

const TOKEN = 'tok_123';

function envWith(secret?: string, allowedHostnames?: string): Env {
  const env: Record<string, string> = {};
  if (secret !== undefined) {
    env.TURNSTILE_SECRET = secret;
  }
  if (allowedHostnames !== undefined) {
    env.TURNSTILE_ALLOWED_HOSTNAMES = allowedHostnames;
  }
  return env as unknown as Env;
}

function stubFetch(payload: unknown): ReturnType<typeof vi.fn> {
  const mock = vi.fn(async () => new Response(JSON.stringify(payload)));
  vi.stubGlobal('fetch', mock);
  return mock;
}

function request(
  method: string,
  path: string,
  token?: string,
  ip?: string
): Request {
  const headers: Record<string, string> = {};
  if (token !== undefined) {
    headers['x-turnstile-response'] = token;
  }
  if (ip !== undefined) {
    headers['cf-connecting-ip'] = ip;
  }
  return new Request(`https://example.com${path}`, { method, headers });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('verifyTurnstile', () => {
  it('skips every route when no secret is configured', async () => {
    const mock = stubFetch({ success: true });

    expect(
      await verifyTurnstile(request('POST', '/api/poll'), envWith())
    ).toBeNull();
    expect(
      await verifyTurnstile(
        request('PUT', '/api/poll/pollid_123/respond'),
        envWith()
      )
    ).toBeNull();
    expect(
      await verifyTurnstile(request('GET', '/api/poll/pollid_123'), envWith())
    ).toBeNull();
    expect(mock).not.toHaveBeenCalled();
  });

  it('skips GET routes even when a secret is configured', async () => {
    const mock = stubFetch({ success: true });

    const response = await verifyTurnstile(
      request('GET', '/api/poll/pollid_123'),
      envWith('secret')
    );

    expect(response).toBeNull();
    expect(mock).not.toHaveBeenCalled();
  });

  it('denies a write without a token', async () => {
    const mock = stubFetch({ success: true });

    const response = await verifyTurnstile(
      request('POST', '/api/poll'),
      envWith('secret')
    );

    expect(response?.status).toBe(403);
    expect(await response?.text()).toBe('Verification required');
    expect(mock).not.toHaveBeenCalled();
  });

  it('denies a respond without a token', async () => {
    stubFetch({ success: true });

    const response = await verifyTurnstile(
      request('PUT', '/api/poll/pollid_123/respond'),
      envWith('secret')
    );

    expect(response?.status).toBe(403);
  });

  it('accepts a verified token and posts it to siteverify', async () => {
    const mock = stubFetch({ success: true });

    const response = await verifyTurnstile(
      request('POST', '/api/poll', TOKEN),
      envWith('secret')
    );

    expect(response).toBeNull();
    expect(mock).toHaveBeenCalledTimes(1);
    const [url, init] = mock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe(SITEVERIFY_URL);
    expect(init.method).toBe('POST');
    const body = init.body as URLSearchParams;
    expect(body.get('secret')).toBe('secret');
    expect(body.get('response')).toBe(TOKEN);
  });

  it('accepts a verified token on the respond route', async () => {
    stubFetch({ success: true });

    const response = await verifyTurnstile(
      request('PUT', '/api/poll/pollid_123/respond', TOKEN),
      envWith('secret')
    );

    expect(response).toBeNull();
  });

  it('denies when siteverify reports failure', async () => {
    stubFetch({ success: false });

    const response = await verifyTurnstile(
      request('POST', '/api/poll', TOKEN),
      envWith('secret')
    );

    expect(response?.status).toBe(403);
    expect(await response?.text()).toBe('Verification failed');
  });

  it('denies when siteverify returns a non-ok status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 500 }))
    );

    const response = await verifyTurnstile(
      request('POST', '/api/poll', TOKEN),
      envWith('secret')
    );

    expect(response?.status).toBe(403);
  });

  it('denies when siteverify throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      })
    );

    const response = await verifyTurnstile(
      request('POST', '/api/poll', TOKEN),
      envWith('secret')
    );

    expect(response?.status).toBe(403);
  });

  it('denies a malformed siteverify payload', async () => {
    stubFetch({ unexpected: true });

    const response = await verifyTurnstile(
      request('POST', '/api/poll', TOKEN),
      envWith('secret')
    );

    expect(response?.status).toBe(403);
  });

  it('forwards the client IP as remoteip when the header is present', async () => {
    const mock = stubFetch({ success: true });

    const response = await verifyTurnstile(
      request('POST', '/api/poll', TOKEN, '1.2.3.4'),
      envWith('secret')
    );

    expect(response).toBeNull();
    const [url, init] = mock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe(SITEVERIFY_URL);
    const body = init.body as URLSearchParams;
    expect(body.get('remoteip')).toBe('1.2.3.4');
  });

  it('omits remoteip when the client IP header is absent', async () => {
    const mock = stubFetch({ success: true });

    const response = await verifyTurnstile(
      request('POST', '/api/poll', TOKEN),
      envWith('secret')
    );

    expect(response).toBeNull();
    const [, init] = mock.mock.calls[0] as unknown as [string, RequestInit];
    const body = init.body as URLSearchParams;
    expect(body.has('remoteip')).toBe(false);
  });

  it('accepts a verified token when the hostname is allowlisted', async () => {
    stubFetch({ success: true, hostname: 'example.com' });

    const response = await verifyTurnstile(
      request('POST', '/api/poll', TOKEN),
      envWith('secret', 'example.com, walimeet.pages.dev')
    );

    expect(response).toBeNull();
  });

  it('denies a verified token when the hostname is not allowlisted', async () => {
    stubFetch({ success: true, hostname: 'evil.com' });

    const response = await verifyTurnstile(
      request('POST', '/api/poll', TOKEN),
      envWith('secret', 'example.com, walimeet.pages.dev')
    );

    expect(response?.status).toBe(403);
    expect(await response?.text()).toBe('Verification failed');
  });

  it('skips the hostname check when no allowlist is configured', async () => {
    stubFetch({ success: true, hostname: 'evil.com' });

    const response = await verifyTurnstile(
      request('POST', '/api/poll', TOKEN),
      envWith('secret')
    );

    expect(response).toBeNull();
  });

  it('tolerates whitespace around allowlisted hostnames', async () => {
    stubFetch({ success: true, hostname: 'example.com' });

    const response = await verifyTurnstile(
      request('POST', '/api/poll', TOKEN),
      envWith('secret', ' example.com ')
    );

    expect(response).toBeNull();
  });
});
