import { getPoll, savePoll } from '../lib/kv';
import type { Env, ParticipantResponse, RespondInput } from '../lib/types';

export async function handleRespond(
  request: Request,
  env: Env,
  pollId: string
): Promise<Response> {
  const input: RespondInput = await request.json();

  if (!input.name || !input.availabilities) {
    return new Response('Invalid input', { status: 400 });
  }

  const poll = await getPoll(env.WALIMEET_KV, pollId);

  if (!poll) {
    return new Response('Poll not found', { status: 404 });
  }

  if (Date.now() > poll.expiresAt) {
    return new Response('Poll expired', { status: 410 });
  }

  const responseKey = input.name.toLowerCase().trim();
  const response: ParticipantResponse = {
    name: input.name.trim(),
    availabilities: input.availabilities,
    submittedAt: Date.now(),
  };

  poll.responses[responseKey] = response;
  await savePoll(env.WALIMEET_KV, poll);

  return new Response(JSON.stringify(poll), {
    headers: { 'Content-Type': 'application/json' },
  });
}
