import type { CreatePollInput, Poll, RespondInput } from './types';

const API_BASE = '/api';

export async function createPoll(input: CreatePollInput): Promise<Poll> {
  const res = await fetch(`${API_BASE}/poll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to create poll');
  return res.json();
}

export async function getPoll(id: string): Promise<Poll> {
  const res = await fetch(`${API_BASE}/poll/${id}`);
  if (!res.ok) throw new Error('Poll not found');
  return res.json();
}

export async function respondToPoll(
  pollId: string,
  input: RespondInput
): Promise<Poll> {
  const res = await fetch(`${API_BASE}/poll/${pollId}/respond`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to submit response');
  return res.json();
}
