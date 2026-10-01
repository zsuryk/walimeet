// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { savePoll } from '../lib/kv';
import { handleGetPoll } from '../routes/poll';
import { handleRespond } from '../routes/respond';
import type { Env, Poll } from '../lib/types';

const SIZE_CAP = 131072;

function makePoll(overrides: Partial<Poll> = {}): Poll {
  return {
    id: 'pollid_123',
    name: 'Test poll',
    description: 'A poll',
    dates: ['2026-01-05', '2026-01-06'],
    timeRange: { start: '09:00', end: '11:00' },
    timezone: 'UTC',
    slotMinutes: 15,
    creatorName: 'Ada',
    createdAt: Date.now(),
    expiresAt: Date.now() + 60 * 60 * 1000,
    responses: {},
    ...overrides,
  };
}

function byteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

function stubKv(): {
  kv: KVNamespace;
  get: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
} {
  const get = vi.fn(async () => null);
  const put = vi.fn(async () => undefined);
  const kv = { get, put } as unknown as KVNamespace;
  return { kv, get, put };
}

function respondRequest(name: string, key: string): Request {
  return new Request('https://example.com/api/poll/pollid_123/respond', {
    method: 'PUT',
    body: JSON.stringify({ name, availabilities: { [key]: true } }),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('savePoll size guard', () => {
  it('rejects a poll under the char cap but over the byte cap', async () => {
    const { kv, put } = stubKv();
    const poll = makePoll({ description: '日'.repeat(100_000) });
    const json = JSON.stringify(poll);

    expect(json.length).toBeLessThanOrEqual(SIZE_CAP);
    expect(new TextEncoder().encode(json).length).toBeGreaterThan(SIZE_CAP);

    await expect(savePoll(kv, poll)).rejects.toThrow(
      'poll exceeds size limit'
    );
    expect(put).not.toHaveBeenCalled();
  });

  it('saves a normal poll within the byte cap', async () => {
    const { kv, put } = stubKv();
    const poll = makePoll();

    expect(byteLength(poll)).toBeLessThanOrEqual(SIZE_CAP);
    await savePoll(kv, poll);

    expect(put).toHaveBeenCalledTimes(1);
    expect(put.mock.calls[0][0]).toBe(`poll:${poll.id}`);
  });
});

describe('handleRespond size cap', () => {
  it('answers 409 without writing when the respond pushes the poll over the cap', async () => {
    const shell = makePoll({
      responses: {
        seed: { name: '', availabilities: {}, submittedAt: 0 },
      },
    });
    const nameLength = SIZE_CAP - 40 - byteLength(shell);
    expect(nameLength).toBeGreaterThan(0);

    const poll = makePoll({
      responses: {
        seed: {
          name: 'x'.repeat(nameLength),
          availabilities: {},
          submittedAt: 0,
        },
      },
    });
    expect(byteLength(poll)).toBeLessThanOrEqual(SIZE_CAP);
    expect(byteLength(poll)).toBeGreaterThan(SIZE_CAP - 200);

    const simulated: Poll = {
      ...poll,
      responses: {
        ...poll.responses,
        newcomer: {
          name: 'Newcomer',
          availabilities: { '2026-01-05-09:00': true },
          submittedAt: Date.now(),
        },
      },
    };
    expect(byteLength(simulated)).toBeGreaterThan(SIZE_CAP);

    const { kv, get, put } = stubKv();
    get.mockImplementation(async () => poll);
    const env = { WALIMEET_KV: kv } as unknown as Env;

    const response = await handleRespond(
      respondRequest('Newcomer', '2026-01-05-09:00'),
      env,
      poll.id
    );

    expect(response.status).toBe(409);
    expect(await response.text()).toBe('Poll has reached its maximum size');
    expect(get).toHaveBeenCalledTimes(1);
    expect(put).not.toHaveBeenCalled();
  });
});

describe('handleGetPoll id validation', () => {
  it('answers 404 without touching KV for invalid poll ids', async () => {
    const { kv, get } = stubKv();
    const env = { WALIMEET_KV: kv } as unknown as Env;

    for (const id of ['short', 'abcdefghijkl', 'abc/def']) {
      const response = await handleGetPoll(
        new Request(`https://example.com/api/poll/${id}`),
        env,
        id
      );
      expect(response.status).toBe(404);
      expect(await response.text()).toBe('Poll not found');
    }

    expect(get).not.toHaveBeenCalled();
  });

  it('reads the stored poll for a well-formed id', async () => {
    const poll = makePoll();
    const { kv, get } = stubKv();
    get.mockImplementation(async () => poll);
    const env = { WALIMEET_KV: kv } as unknown as Env;

    const response = await handleGetPoll(
      new Request(`https://example.com/api/poll/${poll.id}`),
      env,
      poll.id
    );

    expect(response.status).toBe(200);
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith(`poll:${poll.id}`, 'json');
    expect((await response.json()) as Poll).toEqual(poll);
  });
});
