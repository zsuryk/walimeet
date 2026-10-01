import { readJsonBody } from '../lib/body';
import { generatePollId } from '../lib/id';
import { savePoll } from '../lib/kv';
import { validateCreateInput } from '../lib/validate';
import type { Env, Poll } from '../lib/types';

export async function handleCreatePoll(
  request: Request,
  env: Env
): Promise<Response> {
  const parsed = await readJsonBody<unknown>(request);
  if (!parsed.ok) {
    return parsed.response;
  }

  const validated = validateCreateInput(parsed.value);
  if (!validated.ok) {
    return new Response(validated.message, { status: 400 });
  }

  const input = validated.value;
  const now = Date.now();
  const poll: Poll = {
    id: generatePollId(),
    name: input.name,
    description: input.description,
    dates: input.dates,
    timeRange: input.timeRange,
    timezone: input.timezone,
    slotMinutes: 15,
    creatorName: input.creatorName,
    createdAt: now,
    expiresAt: now + input.expiryDays * 24 * 60 * 60 * 1000,
    responses: {},
  };

  await savePoll(env.WALIMEET_KV, poll);

  return new Response(JSON.stringify(poll), {
    headers: { 'Content-Type': 'application/json' },
  });
}
