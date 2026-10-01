import type { CreatePollInput, Poll, RespondInput } from './types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export type ApiErrorKind =
  | 'not-found'
  | 'expired'
  | 'bad-request'
  | 'rate-limited'
  | 'forbidden'
  | 'conflict'
  | 'network'
  | 'server';

export class ApiError extends Error {
  status: number | null;
  kind: ApiErrorKind;

  constructor(message: string, status: number | null, kind: ApiErrorKind) {
    super(message);
    this.status = status;
    this.kind = kind;
  }
}

function toApiError(status: number | null): ApiError {
  if (status === null)
    return new ApiError('Network error — check your connection', null, 'network');
  if (status === 403)
    return new ApiError('Verification failed — please try again', 403, 'forbidden');
  if (status === 404) return new ApiError('Poll not found', 404, 'not-found');
  if (status === 410) return new ApiError('Poll expired', 410, 'expired');
  if (status === 413)
    return new ApiError('Request too large', 413, 'bad-request');
  if (status === 429)
    return new ApiError(
      'Too many requests — please wait a moment and try again',
      429,
      'rate-limited'
    );
  if (status === 400) return new ApiError('Invalid input', 400, 'bad-request');
  if (status === 409) return new ApiError('Conflict', 409, 'conflict');
  return new ApiError('Server error', status, 'server');
}

async function toApiErrorFromResponse(res: Response): Promise<ApiError> {
  if (res.status === 409) {
    try {
      const detail = (await res.text()).trim();
      if (detail) return new ApiError(detail, 409, 'conflict');
    } catch {
      return toApiError(res.status);
    }
  }
  return toApiError(res.status);
}

function jsonHeaders(turnstileToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (turnstileToken) headers['X-Turnstile-Response'] = turnstileToken;
  return headers;
}

export async function createPoll(
  input: CreatePollInput,
  turnstileToken?: string
): Promise<Poll> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/poll`, {
      method: 'POST',
      headers: jsonHeaders(turnstileToken),
      body: JSON.stringify(input),
    });
  } catch {
    throw new ApiError('Network error — check your connection', null, 'network');
  }
  if (!res.ok) throw await toApiErrorFromResponse(res);
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
  input: RespondInput,
  turnstileToken?: string
): Promise<Poll> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/poll/${pollId}/respond`, {
      method: 'PUT',
      headers: jsonHeaders(turnstileToken),
      body: JSON.stringify(input),
    });
  } catch {
    throw new ApiError('Network error — check your connection', null, 'network');
  }
  if (!res.ok) throw await toApiErrorFromResponse(res);
  return res.json();
}
