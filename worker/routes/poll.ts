import { getPoll } from '../lib/kv';
import { validatePollId } from '../lib/validate';
import type { Env } from '../lib/types';

export async function handleGetPoll(
  _request: Request,
  env: Env,
  pollId: string
): Promise<Response> {
  if (!validatePollId(pollId)) {
    return new Response('Poll not found', { status: 404 });
  }

  const poll = await getPoll(env.WALIMEET_KV, pollId);

  if (!poll) {
    return new Response('Poll not found', { status: 404 });
  }

  if (Date.now() > poll.expiresAt) {
    return new Response('Poll expired', { status: 410 });
  }

  return new Response(JSON.stringify(poll), {
    headers: { 'Content-Type': 'application/json' },
  });
}
