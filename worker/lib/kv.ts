import type { Poll } from './types';

export async function getPoll(kv: KVNamespace, id: string): Promise<Poll | null> {
  const data = await kv.get(`poll:${id}`, 'json');
  return data as Poll | null;
}

export async function savePoll(kv: KVNamespace, poll: Poll): Promise<void> {
  const ttl = Math.ceil((poll.expiresAt - Date.now()) / 1000);
  await kv.put(`poll:${poll.id}`, JSON.stringify(poll), {
    expirationTtl: Math.max(ttl, 60),
  });
}
