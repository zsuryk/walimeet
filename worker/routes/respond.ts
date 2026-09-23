import { getPoll, savePoll } from '../lib/kv';
import type { Env, ParticipantResponse, RespondInput } from '../lib/types';

export async function handleRespond(
  request: Request,
  env: Env,
  pollId: string
): Promise<Response> {
  let input: RespondInput;
  try {
    input = (await request.json()) as RespondInput;
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const name = (input.name ?? '').trim();
  if (!name || !input.availabilities) {
    return new Response('Invalid input', { status: 400 });
  }

  if (
    typeof input.availabilities !== 'object' ||
    input.availabilities === null ||
    Array.isArray(input.availabilities)
  ) {
    return new Response('Invalid availabilities', { status: 400 });
  }

  const poll = await getPoll(env.WALIMEET_KV, pollId);

  if (!poll) {
    return new Response('Poll not found', { status: 404 });
  }

  if (Date.now() > poll.expiresAt) {
    return new Response('Poll expired', { status: 410 });
  }

  const responseKey = name.toLowerCase();
  const response: ParticipantResponse = {
    name,
    availabilities: input.availabilities,
    submittedAt: Date.now(),
  };

  poll.responses[responseKey] = response;
  await savePoll(env.WALIMEET_KV, poll);

  return new Response(JSON.stringify(poll), {
    headers: { 'Content-Type': 'application/json' },
  });
}
