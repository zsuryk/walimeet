import type { Poll } from './types';

export const MAX_PARTICIPANTS = 50;

const POLL_ID_PATTERN = /^[A-Za-z0-9_-]{10}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const SLOT_MINUTES = 15;
const MAX_DATES = 31;
const MAX_SLOTS_PER_DAY = 96;

export interface NormalizedCreate {
  name: string;
  description: string;
  dates: string[];
  timeRange: {
    start: string;
    end: string;
  };
  timezone: string;
  creatorName: string;
  expiryDays: number;
}

export interface NormalizedRespond {
  name: string;
  availabilities: Record<string, boolean>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function validatePollId(id: string): boolean {
  return POLL_ID_PATTERN.test(id);
}

export function validateCreateInput(
  input: unknown
): { ok: true; value: NormalizedCreate } | { ok: false; message: string } {
  if (!isPlainObject(input)) {
    return { ok: false, message: 'Invalid input' };
  }

  const rawName = input.name;
  if (typeof rawName !== 'string') {
    return { ok: false, message: 'Invalid input' };
  }
  const name = rawName.trim();
  if (!name) {
    return { ok: false, message: 'Invalid input' };
  }
  if (name.toLowerCase() === '__proto__') {
    return { ok: false, message: 'Invalid name' };
  }
  if (name.length > 120) {
    return { ok: false, message: 'name must be at most 120 characters' };
  }

  const rawDescription = input.description;
  if (
    rawDescription !== undefined &&
    rawDescription !== null &&
    typeof rawDescription !== 'string'
  ) {
    return { ok: false, message: 'Invalid input' };
  }
  const description = typeof rawDescription === 'string' ? rawDescription : '';
  if (description.length > 1000) {
    return {
      ok: false,
      message: 'description must be at most 1000 characters',
    };
  }

  const rawCreatorName = input.creatorName;
  if (
    rawCreatorName !== undefined &&
    rawCreatorName !== null &&
    typeof rawCreatorName !== 'string'
  ) {
    return { ok: false, message: 'Invalid input' };
  }
  let creatorName =
    typeof rawCreatorName === 'string' ? rawCreatorName.trim() : '';
  if (creatorName.toLowerCase() === '__proto__') {
    return { ok: false, message: 'Invalid name' };
  }
  if (creatorName.length > 120) {
    return { ok: false, message: 'creatorName must be at most 120 characters' };
  }
  if (!creatorName) {
    creatorName = 'Anonymous';
  }

  const rawTimezone = input.timezone;
  if (
    rawTimezone !== undefined &&
    rawTimezone !== null &&
    typeof rawTimezone !== 'string'
  ) {
    return { ok: false, message: 'Invalid input' };
  }
  let timezone = typeof rawTimezone === 'string' ? rawTimezone.trim() : '';
  if (timezone.length > 64) {
    return { ok: false, message: 'timezone must be at most 64 characters' };
  }
  if (!timezone) {
    timezone = 'UTC';
  } else if (!isValidTimezone(timezone)) {
    return { ok: false, message: 'Invalid timezone' };
  }

  const rawDates = input.dates;
  if (!Array.isArray(rawDates)) {
    return { ok: false, message: 'Invalid input' };
  }
  if (rawDates.length === 0) {
    return { ok: false, message: 'Invalid input' };
  }
  if (rawDates.length > MAX_DATES) {
    return {
      ok: false,
      message: `dates must have at most ${MAX_DATES} entries`,
    };
  }
  const dates: string[] = [];
  const seenDates = new Set<string>();
  for (const entry of rawDates) {
    if (typeof entry !== 'string' || !DATE_PATTERN.test(entry)) {
      return { ok: false, message: 'Invalid date format' };
    }
    const [year, month, day] = entry.split('-').map(Number);
    const roundTrip = new Date(Date.UTC(year, month - 1, day));
    if (
      roundTrip.getUTCFullYear() !== year ||
      roundTrip.getUTCMonth() !== month - 1 ||
      roundTrip.getUTCDate() !== day
    ) {
      return { ok: false, message: 'Invalid date format' };
    }
    if (seenDates.has(entry)) {
      return { ok: false, message: 'dates must be unique' };
    }
    seenDates.add(entry);
    dates.push(entry);
  }

  const rawTimeRange = input.timeRange;
  if (!isPlainObject(rawTimeRange)) {
    return { ok: false, message: 'Invalid input' };
  }
  const start = rawTimeRange.start;
  const end = rawTimeRange.end;
  if (typeof start !== 'string' || typeof end !== 'string' || !start || !end) {
    return {
      ok: false,
      message: 'End time must be after start time',
    };
  }
  if (!TIME_PATTERN.test(start) || !TIME_PATTERN.test(end)) {
    return { ok: false, message: 'Invalid time format' };
  }
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  if (endMinutes <= startMinutes) {
    return {
      ok: false,
      message: 'End time must be after start time',
    };
  }
  if (Math.ceil((endMinutes - startMinutes) / SLOT_MINUTES) > MAX_SLOTS_PER_DAY) {
    return { ok: false, message: `Maximum ${MAX_SLOTS_PER_DAY} slots per day` };
  }

  const expiryDays = input.expiryDays;
  if (
    typeof expiryDays !== 'number' ||
    !Number.isInteger(expiryDays) ||
    expiryDays < 1 ||
    expiryDays > 14
  ) {
    return {
      ok: false,
      message: 'expiryDays must be an integer between 1 and 14',
    };
  }

  return {
    ok: true,
    value: {
      name,
      description,
      dates,
      timeRange: { start, end },
      timezone,
      creatorName,
      expiryDays,
    },
  };
}

export function getAllowedSlotKeys(poll: Poll): Set<string> {
  const keys = new Set<string>();
  const startMinutes = toMinutes(poll.timeRange.start);
  const endMinutes = toMinutes(poll.timeRange.end);

  for (const date of poll.dates) {
    for (
      let minutes = startMinutes;
      minutes < endMinutes;
      minutes += poll.slotMinutes
    ) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      keys.add(
        `${date}-${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
      );
    }
  }

  return keys;
}

export function validateRespondInput(
  poll: Poll,
  input: unknown
): { ok: true; value: NormalizedRespond } | { ok: false; message: string } {
  if (!isPlainObject(input)) {
    return { ok: false, message: 'Invalid input' };
  }

  const rawName = input.name;
  if (typeof rawName !== 'string') {
    return { ok: false, message: 'Invalid input' };
  }
  const name = rawName.trim();
  if (!name) {
    return { ok: false, message: 'Invalid input' };
  }
  if (name.toLowerCase() === '__proto__') {
    return { ok: false, message: 'Invalid name' };
  }
  if (name.length > 120) {
    return { ok: false, message: 'name must be at most 120 characters' };
  }

  const rawAvailabilities = input.availabilities;
  if (!rawAvailabilities) {
    return { ok: false, message: 'Invalid input' };
  }
  if (
    typeof rawAvailabilities !== 'object' ||
    rawAvailabilities === null ||
    Array.isArray(rawAvailabilities)
  ) {
    return { ok: false, message: 'Invalid availabilities' };
  }

  const allowed = getAllowedSlotKeys(poll);
  const entries: [string, unknown][] = Object.entries(rawAvailabilities);
  if (entries.length > allowed.size) {
    return { ok: false, message: 'Too many availability slots' };
  }

  const availabilities: Record<string, boolean> = {};
  for (const [key, value] of entries) {
    if (typeof value !== 'boolean') {
      return { ok: false, message: 'Invalid availabilities' };
    }
    if (!allowed.has(key)) {
      return { ok: false, message: 'Invalid availability slot' };
    }
    availabilities[key] = value;
  }

  return { ok: true, value: { name, availabilities } };
}
