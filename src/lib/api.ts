import type { CreatePollInput, Poll, RespondInput } from './types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  status: number | null;
  kind: 'not-found' | 'expired' | 'bad-request' | 'network' | 'server';

  constructor(
    message: string,
    status: number | null,
    kind: 'not-found' | 'expired' | 'bad-request' | 'network' | 'server'
  ) {
    super(message);
    this.status = status;
    this.kind = kind;
  }
}

function toApiError(status: number | null): ApiError {
  if (status === null) return new ApiError('Network error — check your connection', null, 'network');
  if (status === 404) return new ApiError('Poll not found', status, 'not-found');
  if (status === 410) return new ApiError('Poll expired', status, 'expired');
  if (status === 400) return new ApiError('Invalid input', status, 'bad-request');
  if (status >= 500) return new ApiError('Server error', status, 'server');
  return new ApiError('Server error', status, 'server');
}

export async function createPoll(input: CreatePollInput): Promise<Poll> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/poll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    throw new ApiError('Network error — check your connection', null, 'network');
  }
  if (!res.ok) throw toApiError(res.status);
  return res.json();
}

export async function getPoll(id: string): Promise<Poll> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/poll/${id}`);
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      res = await fetch(`${API_BASE}/poll/${id}`);
    } catch {
      throw new ApiError('Network error — check your connection', null, 'network');
    }
  }
  if (!res.ok) throw toApiError(res.status);
  return res.json();
}

export async function respondToPoll(
  pollId: string,
  input: RespondInput
): Promise<Poll> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/poll/${pollId}/respond`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    throw new ApiError('Network error — check your connection', null, 'network');
  }
  if (!res.ok) throw toApiError(res.status);
  return res.json();
}
