import type { Poll } from './types';

export async function getPoll(kv: KVNamespace, id: string): Promise<Poll | null> {
  const data = await kv.get(`poll:${id}`, 'json');
  return data as Poll | null;
}

export async function savePoll(kv: KVNamespace, poll: Poll): Promise<void> {
  const ttl = Math.ceil((poll.expiresAt - Date.now()) / 1000);
  const data = JSON.stringify(poll);
  if (new TextEncoder().encode(data).length > 131072) {
    throw new Error('poll exceeds size limit');
  }
  await kv.put(`poll:${poll.id}`, data, {
    expirationTtl: Math.max(ttl, 60),
  });
}
