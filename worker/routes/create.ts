import { generatePollId } from '../lib/id';
import { savePoll } from '../lib/kv';
import type { CreatePollInput, Env, Poll } from '../lib/types';

export async function handleCreatePoll(
  request: Request,
  env: Env
): Promise<Response> {
  const input: CreatePollInput = await request.json();

  if (!input.name || !input.dates?.length || !input.timeRange) {
    return new Response('Invalid input', { status: 400 });
  }

  const now = Date.now();
  const poll: Poll = {
    id: generatePollId(),
    name: input.name,
    description: input.description || '',
    dates: input.dates,
    timeRange: input.timeRange,
    timezone: input.timezone || 'UTC',
    slotMinutes: 15,
    creatorName: input.creatorName || 'Anonymous',
    createdAt: now,
    expiresAt: now + input.expiryDays * 24 * 60 * 60 * 1000,
    responses: {},
  };

  await savePoll(env.WALIMEET_KV, poll);

  return new Response(JSON.stringify(poll), {
    headers: { 'Content-Type': 'application/json' },
  });
}
