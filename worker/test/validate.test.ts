// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  MAX_PARTICIPANTS,
  getAllowedSlotKeys,
  validateCreateInput,
  validatePollId,
  validateRespondInput,
} from '../lib/validate';
import { handleRespond } from '../routes/respond';
import type { Env, ParticipantResponse, Poll } from '../lib/types';

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

function makeResponses(count: number): Record<string, ParticipantResponse> {
  const responses: Record<string, ParticipantResponse> = {};
  for (let i = 0; i < count; i++) {
    responses[`user${i}`] = {
      name: `User${i}`,
      availabilities: {},
      submittedAt: Date.now(),
    };
  }
  return responses;
}

function envFor(poll: Poll): { env: Env; puts: string[] } {
  const store = new Map<string, string>();
  store.set(`poll:${poll.id}`, JSON.stringify(poll));
  const puts: string[] = [];
  const kv = {
    async get(key: string): Promise<unknown> {
      const value = store.get(key);
      return value === undefined ? null : JSON.parse(value);
    },
    async put(key: string, value: string): Promise<void> {
      puts.push(key);
      store.set(key, value);
    },
  };
  const env = { WALIMEET_KV: kv } as unknown as Env;
  return { env, puts };
}

function respondRequest(name: string, key: string): Request {
  return new Request('https://example.com/api/poll/pollid_123/respond', {
    method: 'PUT',
    body: JSON.stringify({ name, availabilities: { [key]: true } }),
    headers: { 'Content-Type': 'application/json' },
  });
}

const VALID_CREATE = {
  name: 'Team sync',
  description: 'Weekly sync',
  dates: ['2026-01-05'],
  timeRange: { start: '09:00', end: '10:00' },
  timezone: 'Europe/Berlin',
  creatorName: 'Ada',
  expiryDays: 7,
};

describe('validatePollId', () => {
  it('accepts a nanoid(10) id', () => {
    expect(validatePollId('Abcdefgh_-')).toBe(true);
    expect(validatePollId('0000000000')).toBe(true);
  });

  it('rejects ids that are not exactly ten url-safe chars', () => {
    expect(validatePollId('')).toBe(false);
    expect(validatePollId('short')).toBe(false);
    expect(validatePollId('abcdefghijk')).toBe(false);
    expect(validatePollId('abcdefghi!')).toBe(false);
    expect(validatePollId('abc defghi')).toBe(false);
    expect(validatePollId('abcdefghi/')).toBe(false);
  });
});

describe('validateCreateInput', () => {
  it('accepts a valid create payload', () => {
    const result = validateCreateInput(VALID_CREATE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        name: 'Team sync',
        description: 'Weekly sync',
        dates: ['2026-01-05'],
        timeRange: { start: '09:00', end: '10:00' },
        timezone: 'Europe/Berlin',
        creatorName: 'Ada',
        expiryDays: 7,
      });
    }
  });

  it('trims input and applies defaults', () => {
    const result = validateCreateInput({
      ...VALID_CREATE,
      name: '  Padded  ',
      timezone: '',
      creatorName: '   ',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('Padded');
      expect(result.value.timezone).toBe('UTC');
      expect(result.value.creatorName).toBe('Anonymous');
    }
  });

  it('rejects non-object input', () => {
    expect(validateCreateInput(null).ok).toBe(false);
    expect(validateCreateInput('x').ok).toBe(false);
    expect(validateCreateInput([]).ok).toBe(false);
  });

  it('rejects a missing or non-string name', () => {
    expect(validateCreateInput({ ...VALID_CREATE, name: undefined }).ok).toBe(
      false
    );
    expect(validateCreateInput({ ...VALID_CREATE, name: 42 }).ok).toBe(false);
    expect(validateCreateInput({ ...VALID_CREATE, name: '   ' }).ok).toBe(
      false
    );
  });

  it('rejects an oversized name and accepts the boundary', () => {
    const tooLong = validateCreateInput({
      ...VALID_CREATE,
      name: 'a'.repeat(121),
    });
    expect(tooLong.ok).toBe(false);
    if (!tooLong.ok) {
      expect(tooLong.message).toBe('name must be at most 120 characters');
    }
    expect(validateCreateInput({ ...VALID_CREATE, name: 'a'.repeat(120) }).ok).toBe(
      true
    );
  });

  it('rejects an oversized description', () => {
    const result = validateCreateInput({
      ...VALID_CREATE,
      description: 'a'.repeat(1001),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe(
        'description must be at most 1000 characters'
      );
    }
    expect(
      validateCreateInput({ ...VALID_CREATE, description: 'a'.repeat(1000) }).ok
    ).toBe(true);
  });

  it('rejects an oversized creatorName', () => {
    const result = validateCreateInput({
      ...VALID_CREATE,
      creatorName: 'a'.repeat(121),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe('creatorName must be at most 120 characters');
    }
  });

  it('rejects a non-string description or creatorName', () => {
    expect(
      validateCreateInput({ ...VALID_CREATE, description: 7 }).ok
    ).toBe(false);
    expect(
      validateCreateInput({ ...VALID_CREATE, creatorName: {} }).ok
    ).toBe(false);
  });

  it('rejects an invalid timezone', () => {
    const result = validateCreateInput({
      ...VALID_CREATE,
      timezone: 'Not/AZone',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe('Invalid timezone');
    }
  });

  it('rejects an oversized timezone', () => {
    const result = validateCreateInput({
      ...VALID_CREATE,
      timezone: 'a'.repeat(65),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe('timezone must be at most 64 characters');
    }
  });

  it('rejects dates that are not an array or are empty', () => {
    expect(validateCreateInput({ ...VALID_CREATE, dates: '2026-01-05' }).ok).toBe(
      false
    );
    expect(validateCreateInput({ ...VALID_CREATE, dates: [] }).ok).toBe(false);
  });

  it('rejects more than 31 dates', () => {
    const dates = Array.from(
      { length: 32 },
      (_, i) => `2026-01-${String((i % 31) + 1).padStart(2, '0')}`
    );
    const result = validateCreateInput({ ...VALID_CREATE, dates });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe('dates must have at most 31 entries');
    }
    expect(
      validateCreateInput({ ...VALID_CREATE, dates: dates.slice(0, 31) }).ok
    ).toBe(true);
  });

  it('rejects malformed dates', () => {
    for (const date of ['2026-1-5', '05-01-2026', 'not-a-date', '']) {
      const result = validateCreateInput({ ...VALID_CREATE, dates: [date] });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toBe('Invalid date format');
      }
    }
  });

  it('rejects impossible calendar dates', () => {
    for (const dates of [
      ['2026-02-31'],
      ['2026-13-45'],
      ['2026-04-31'],
    ]) {
      const result = validateCreateInput({ ...VALID_CREATE, dates });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toBe('Invalid date format');
      }
    }
    expect(
      validateCreateInput({ ...VALID_CREATE, dates: ['2026-02-28'] }).ok
    ).toBe(true);
  });

  it('rejects duplicate dates', () => {
    const result = validateCreateInput({
      ...VALID_CREATE,
      dates: ['2026-01-01', '2026-01-01'],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe('dates must be unique');
    }
    expect(
      validateCreateInput({
        ...VALID_CREATE,
        dates: ['2026-01-01', '2026-01-02'],
      }).ok
    ).toBe(true);
  });

  it('rejects __proto__ as the name regardless of case or padding', () => {
    for (const name of ['__proto__', '__PROTO__', ' __proto__ ']) {
      const result = validateCreateInput({ ...VALID_CREATE, name });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toBe('Invalid name');
      }
    }
  });

  it('rejects __proto__ as the creatorName regardless of case or padding', () => {
    for (const creatorName of ['__proto__', '__Proto__', ' __proto__ ']) {
      const result = validateCreateInput({ ...VALID_CREATE, creatorName });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toBe('Invalid name');
      }
    }
  });

  it('rejects a missing or non-object timeRange', () => {
    expect(
      validateCreateInput({ ...VALID_CREATE, timeRange: undefined }).ok
    ).toBe(false);
    expect(validateCreateInput({ ...VALID_CREATE, timeRange: '09:00' }).ok).toBe(
      false
    );
  });

  it('rejects malformed times', () => {
    for (const [start, end] of [
      ['9:00', '10:00'],
      ['09:0', '10:00'],
      ['25:00', '26:00'],
      ['09:00', '10:60'],
    ]) {
      const result = validateCreateInput({
        ...VALID_CREATE,
        timeRange: { start, end },
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toBe('Invalid time format');
      }
    }
  });

  it('rejects an end time that is not after the start time', () => {
    for (const [start, end] of [
      ['10:00', '10:00'],
      ['11:00', '09:00'],
    ]) {
      const result = validateCreateInput({
        ...VALID_CREATE,
        timeRange: { start, end },
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toBe('End time must be after start time');
      }
    }
  });

  it('accepts the widest possible single-day range', () => {
    const result = validateCreateInput({
      ...VALID_CREATE,
      timeRange: { start: '00:00', end: '23:59' },
    });
    expect(result.ok).toBe(true);
  });

  it('rejects expiryDays outside 1 to 14', () => {
    for (const expiryDays of [0, -1, 15, 100, 2.5, Number.NaN, '7']) {
      const result = validateCreateInput({ ...VALID_CREATE, expiryDays });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toBe(
          'expiryDays must be an integer between 1 and 14'
        );
      }
    }
  });

  it('accepts expiryDays boundaries', () => {
    expect(
      validateCreateInput({ ...VALID_CREATE, expiryDays: 1 }).ok
    ).toBe(true);
    expect(
      validateCreateInput({ ...VALID_CREATE, expiryDays: 14 }).ok
    ).toBe(true);
  });
});

describe('getAllowedSlotKeys', () => {
  it('generates every slot key for the poll range', () => {
    const keys = getAllowedSlotKeys(makePoll());
    expect(keys.size).toBe(16);
    expect(keys.has('2026-01-05-09:00')).toBe(true);
    expect(keys.has('2026-01-05-10:45')).toBe(true);
    expect(keys.has('2026-01-06-10:45')).toBe(true);
    expect(keys.has('2026-01-05-11:00')).toBe(false);
    expect(keys.has('2026-01-05-08:45')).toBe(false);
  });
});

describe('validateRespondInput', () => {
  const poll = makePoll();
  const slot = '2026-01-05-09:00';

  it('accepts a valid respond payload', () => {
    const result = validateRespondInput(poll, {
      name: 'Bob',
      availabilities: { [slot]: true, '2026-01-06-10:30': false },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('Bob');
      expect(result.value.availabilities).toEqual({
        [slot]: true,
        '2026-01-06-10:30': false,
      });
    }
  });

  it('rejects a missing, empty or oversized name', () => {
    expect(
      validateRespondInput(poll, { availabilities: { [slot]: true } }).ok
    ).toBe(false);
    expect(
      validateRespondInput(poll, { name: '   ', availabilities: { [slot]: true } })
        .ok
    ).toBe(false);
    const long = validateRespondInput(poll, {
      name: 'a'.repeat(121),
      availabilities: { [slot]: true },
    });
    expect(long.ok).toBe(false);
    if (!long.ok) {
      expect(long.message).toBe('name must be at most 120 characters');
    }
  });

  it('rejects __proto__ as the name regardless of case or padding', () => {
    for (const name of ['__proto__', '__PROTO__', ' __proto__ ']) {
      const result = validateRespondInput(poll, {
        name,
        availabilities: { [slot]: true },
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toBe('Invalid name');
      }
    }
  });

  it('rejects missing or non-object availabilities', () => {
    expect(validateRespondInput(poll, { name: 'Bob' }).ok).toBe(false);
    expect(
      validateRespondInput(poll, { name: 'Bob', availabilities: 'yes' }).ok
    ).toBe(false);
    expect(
      validateRespondInput(poll, { name: 'Bob', availabilities: [true] }).ok
    ).toBe(false);
  });

  it('rejects non-boolean availability values', () => {
    const result = validateRespondInput(poll, {
      name: 'Bob',
      availabilities: { [slot]: 'true' },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe('Invalid availabilities');
    }
  });

  it('rejects keys that are not slots of the poll', () => {
    for (const key of [
      '2026-01-05-08:45',
      '2026-01-07-09:00',
      '2026-01-05-09:00:00',
      'nonsense',
    ]) {
      const result = validateRespondInput(poll, {
        name: 'Bob',
        availabilities: { [key]: true },
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toBe('Invalid availability slot');
      }
    }
  });

  it('rejects more keys than the poll has slots', () => {
    const availabilities: Record<string, boolean> = {};
    for (let i = 0; i <= 16; i++) {
      availabilities[`${i}`] = true;
    }
    const result = validateRespondInput(poll, { name: 'Bob', availabilities });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe('Too many availability slots');
    }
  });
});

describe('participant cap', () => {
  it('exports a cap of 50 participants', () => {
    expect(MAX_PARTICIPANTS).toBe(50);
  });

  it('rejects a new participant once the poll is full', async () => {
    const poll = makePoll({ responses: makeResponses(MAX_PARTICIPANTS) });
    const { env, puts } = envFor(poll);

    const response = await handleRespond(
      respondRequest('Newcomer', '2026-01-05-09:00'),
      env,
      poll.id
    );

    expect(response.status).toBe(409);
    expect(puts).toHaveLength(0);
  });

  it('lets an existing participant update themselves at the cap', async () => {
    const poll = makePoll({ responses: makeResponses(MAX_PARTICIPANTS) });
    const { env, puts } = envFor(poll);

    const response = await handleRespond(
      respondRequest('User7', '2026-01-05-09:00'),
      env,
      poll.id
    );

    expect(response.status).toBe(200);
    expect(puts).toHaveLength(1);
    const saved = (await response.json()) as Poll;
    expect(Object.keys(saved.responses)).toHaveLength(MAX_PARTICIPANTS);
    expect(saved.responses.user7.availabilities['2026-01-05-09:00']).toBe(true);
  });

  it('accepts a new participant below the cap', async () => {
    const poll = makePoll({
      responses: makeResponses(MAX_PARTICIPANTS - 1),
    });
    const { env, puts } = envFor(poll);

    const response = await handleRespond(
      respondRequest('Newcomer', '2026-01-05-09:00'),
      env,
      poll.id
    );

    expect(response.status).toBe(200);
    expect(puts).toHaveLength(1);
    const saved = (await response.json()) as Poll;
    expect(Object.keys(saved.responses)).toHaveLength(MAX_PARTICIPANTS);
    expect(saved.responses.newcomer.name).toBe('Newcomer');
  });

  it('does not create a KV write for an unknown poll id', async () => {
    const poll = makePoll({ responses: makeResponses(1) });
    const { env, puts } = envFor(poll);

    const response = await handleRespond(
      respondRequest('Bob', '2026-01-05-09:00'),
      env,
      'bad!id'
    );

    expect(response.status).toBe(404);
    expect(puts).toHaveLength(0);
  });
});
