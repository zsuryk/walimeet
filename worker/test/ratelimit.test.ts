// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkRateLimits } from '../lib/ratelimit';
import type { Env, RateLimit } from '../lib/types';

function stubBinding(succeed: boolean): { binding: RateLimit; keys: string[] } {
  const keys: string[] = [];
  const binding: RateLimit = {
    async limit({ key }) {
      keys.push(key);
      return { success: succeed };
    },
  };
  return { binding, keys };
}

function stubThrowingBinding(): { binding: RateLimit; keys: string[] } {
  const keys: string[] = [];
  const binding: RateLimit = {
    async limit({ key }) {
      keys.push(key);
      throw new Error('binding unavailable');
    },
  };
  return { binding, keys };
}

function stubEnvWith(
  all: RateLimit,
  burst: RateLimit,
  write: RateLimit
): Env {
  return {
    RATE_LIMIT_ALL: all,
    RATE_LIMIT_BURST: burst,
    RATE_LIMIT_WRITE: write,
  } as unknown as Env;
}

afterEach(() => {
  vi.restoreAllMocks();
});

function stubEnv(config: {
  all?: boolean;
  burst?: boolean;
  write?: boolean;
}): { env: Env; keys: Record<'all' | 'burst' | 'write', string[]> } {
  const all = stubBinding(config.all ?? true);
  const burst = stubBinding(config.burst ?? true);
  const write = stubBinding(config.write ?? true);
  const env = {
    RATE_LIMIT_ALL: all.binding,
    RATE_LIMIT_BURST: burst.binding,
    RATE_LIMIT_WRITE: write.binding,
  } as unknown as Env;
  return {
    env,
    keys: { all: all.keys, burst: burst.keys, write: write.keys },
  };
}

function request(method: string, ip?: string | null): Request {
  const headers: Record<string, string> = {};
  if (ip !== undefined && ip !== null) {
    headers['cf-connecting-ip'] = ip;
  }
  return new Request('https://example.com/api/poll', { method, headers });
}

describe('checkRateLimits', () => {
  it('returns null when every bucket allows the request', async () => {
    const { env, keys } = stubEnv({});

    const response = await checkRateLimits(request('POST', '1.2.3.4'), env, 'POST');

    expect(response).toBeNull();
    expect(keys.all).toEqual(['1.2.3.4']);
    expect(keys.burst).toEqual(['1.2.3.4']);
    expect(keys.write).toEqual(['1.2.3.4']);
  });

  it('answers 429 with Retry-After when the global bucket is exhausted', async () => {
    const { env, keys } = stubEnv({ all: false });

    const response = await checkRateLimits(request('POST', '1.2.3.4'), env, 'POST');

    expect(response).not.toBeNull();
    expect(response?.status).toBe(429);
    expect(response?.headers.get('Retry-After')).toBe('60');
    expect(await response?.text()).toBe('Too many requests');
    expect(keys.burst).toHaveLength(0);
    expect(keys.write).toHaveLength(0);
  });

  it('answers 429 with Retry-After when the burst bucket is exhausted', async () => {
    const { env, keys } = stubEnv({ burst: false });

    const response = await checkRateLimits(request('GET', '1.2.3.4'), env, 'GET');

    expect(response?.status).toBe(429);
    expect(response?.headers.get('Retry-After')).toBe('10');
    expect(keys.all).toEqual(['1.2.3.4']);
    expect(keys.write).toHaveLength(0);
  });

  it('answers 429 with Retry-After when the write bucket is exhausted', async () => {
    const { env } = stubEnv({ write: false });

    const response = await checkRateLimits(request('PUT', '1.2.3.4'), env, 'PUT');

    expect(response?.status).toBe(429);
    expect(response?.headers.get('Retry-After')).toBe('60');
  });

  it('skips the write bucket for reads', async () => {
    const { env, keys } = stubEnv({});

    const response = await checkRateLimits(request('GET', '1.2.3.4'), env, 'GET');

    expect(response).toBeNull();
    expect(keys.all).toHaveLength(1);
    expect(keys.burst).toHaveLength(1);
    expect(keys.write).toHaveLength(0);
  });

  it('consumes the all and burst buckets for preflight requests', async () => {
    const { env, keys } = stubEnv({ write: false });

    const response = await checkRateLimits(
      request('OPTIONS', '1.2.3.4'),
      env,
      'OPTIONS'
    );

    expect(response).toBeNull();
    expect(keys.all).toEqual(['1.2.3.4']);
    expect(keys.burst).toEqual(['1.2.3.4']);
    expect(keys.write).toHaveLength(0);
  });

  it('falls back to the unknown key when the IP header is missing', async () => {
    const { env, keys } = stubEnv({});

    const response = await checkRateLimits(request('POST'), env, 'POST');

    expect(response).toBeNull();
    expect(keys.all).toEqual(['unknown']);
    expect(keys.burst).toEqual(['unknown']);
    expect(keys.write).toEqual(['unknown']);
  });

  it('shares one bucket when the IP header is empty', async () => {
    const { env, keys } = stubEnv({});

    await checkRateLimits(request('POST', ''), env, 'POST');

    expect(keys.all).toEqual(['unknown']);
    expect(keys.burst).toEqual(['unknown']);
    expect(keys.write).toEqual(['unknown']);
  });

  it('isolates buckets per IP', async () => {
    const { env, keys } = stubEnv({});

    await checkRateLimits(request('POST', '1.1.1.1'), env, 'POST');
    await checkRateLimits(request('POST', '2.2.2.2'), env, 'POST');

    expect(keys.all).toEqual(['1.1.1.1', '2.2.2.2']);
    expect(keys.write).toEqual(['1.1.1.1', '2.2.2.2']);
  });

  it('fails open and logs when the ALL limiter throws', async () => {
    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const failing = stubThrowingBinding();
    const burst = stubBinding(true);
    const write = stubBinding(true);
    const env = stubEnvWith(failing.binding, burst.binding, write.binding);

    const response = await checkRateLimits(
      request('POST', '1.2.3.4'),
      env,
      'POST'
    );

    expect(response).toBeNull();
    expect(failing.keys).toEqual(['1.2.3.4']);
    expect(burst.keys).toEqual(['1.2.3.4']);
    expect(write.keys).toEqual(['1.2.3.4']);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const logged = String(errorSpy.mock.calls[0]?.[0]);
    expect(logged).toContain('"msg":"ratelimit_binding_error"');
    expect(logged).toContain('"limiter":"RATE_LIMIT_ALL"');
  });

  it('fails open and logs when a later-stage limiter throws', async () => {
    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const all = stubBinding(true);
    const burst = stubBinding(true);
    const failing = stubThrowingBinding();
    const env = stubEnvWith(all.binding, burst.binding, failing.binding);

    const response = await checkRateLimits(
      request('PUT', '1.2.3.4'),
      env,
      'PUT'
    );

    expect(response).toBeNull();
    expect(all.keys).toEqual(['1.2.3.4']);
    expect(burst.keys).toEqual(['1.2.3.4']);
    expect(failing.keys).toEqual(['1.2.3.4']);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const logged = String(errorSpy.mock.calls[0]?.[0]);
    expect(logged).toContain('"msg":"ratelimit_binding_error"');
    expect(logged).toContain('"limiter":"RATE_LIMIT_WRITE"');
  });
});
