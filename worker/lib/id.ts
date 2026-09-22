import { nanoid } from 'nanoid';

export function generatePollId(): string {
  return nanoid(10);
}
