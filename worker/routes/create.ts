import { generatePollId } from '../lib/id';
import { savePoll } from '../lib/kv';
import type { CreatePollInput, Env, Poll } from '../lib/types';

export async function handleCreatePoll(
  request: Request,
  env: Env
): Promise<Response> {
  let input: CreatePollInput;
  try {
    input = (await request.json()) as CreatePollInput;
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const name = (input.name ?? '').trim();
  if (!name || !input.dates?.length || !input.timeRange) {
    return new Response('Invalid input', { status: 400 });
  }

  const { start, end } = input.timeRange;
  if (!start || !end || end <= start) {
    return new Response('End time must be after start time', { status: 400 });
  }

  if (
    !Number.isInteger(input.expiryDays) ||
    input.expiryDays < 1 ||
    input.expiryDays > 14
  ) {
    return new Response('expiryDays must be an integer between 1 and 14', {
      status: 400,
    });
  }

  const now = Date.now();
  const poll: Poll = {
    id: generatePollId(),
    name,
    description: input.description || '',
    dates: input.dates,
    timeRange: input.timeRange,
    timezone: input.timezone || 'UTC',
    slotMinutes: 15,
    creatorName: input.creatorName?.trim() || 'Anonymous',
    createdAt: now,
    expiresAt: now + input.expiryDays * 24 * 60 * 60 * 1000,
    responses: {},
  };

  await savePoll(env.WALIMEET_KV, poll);

  return new Response(JSON.stringify(poll), {
    headers: { 'Content-Type': 'application/json' },
  });
}
