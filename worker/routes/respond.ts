import { readJsonBody } from '../lib/body';
import { getPoll, savePoll } from '../lib/kv';
import {
  MAX_PARTICIPANTS,
  validatePollId,
  validateRespondInput,
} from '../lib/validate';
import type { Env, ParticipantResponse } from '../lib/types';

export async function handleRespond(
  request: Request,
  env: Env,
  pollId: string
): Promise<Response> {
  if (!validatePollId(pollId)) {
    return new Response('Poll not found', { status: 404 });
  }

  const parsed = await readJsonBody<unknown>(request);
  if (!parsed.ok) {
    return parsed.response;
  }

  const poll = await getPoll(env.WALIMEET_KV, pollId);

  if (!poll) {
    return new Response('Poll not found', { status: 404 });
  }

  if (Date.now() > poll.expiresAt) {
    return new Response('Poll expired', { status: 410 });
  }

  const validated = validateRespondInput(poll, parsed.value);
  if (!validated.ok) {
    return new Response(validated.message, { status: 400 });
  }

  const { name, availabilities } = validated.value;
  const responseKey = name.toLowerCase();

  if (
    !Object.prototype.hasOwnProperty.call(poll.responses, responseKey) &&
    Object.keys(poll.responses).length >= MAX_PARTICIPANTS
  ) {
    return new Response('Poll is full (maximum 50 participants)', {
      status: 409,
    });
  }

  const response: ParticipantResponse = {
    name,
    availabilities,
    submittedAt: Date.now(),
  };

  poll.responses[responseKey] = response;

  if (new TextEncoder().encode(JSON.stringify(poll)).length > 131072) {
    return new Response('Poll has reached its maximum size', { status: 409 });
  }

  await savePoll(env.WALIMEET_KV, poll);

  return new Response(JSON.stringify(poll), {
    headers: { 'Content-Type': 'application/json' },
  });
}
