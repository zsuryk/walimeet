// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { MAX_BODY_BYTES, readJsonBody } from '../lib/body';

const ENDPOINT = 'https://example.com/api/poll';

function stringRequest(
  body: string,
  contentLength?: string
): Request {
  const headers = contentLength === undefined
    ? undefined
    : { 'Content-Length': contentLength };
  return new Request(ENDPOINT, { method: 'POST', body, headers });
}

function chunkedRequest(chunks: number, chunkSize: number): Request {
  let pull = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      pull += 1;
      if (pull > chunks) {
        controller.close();
        return;
      }
      controller.enqueue(new Uint8Array(chunkSize));
    },
  });
  const init = {
    method: 'POST',
    body: stream,
    duplex: 'half',
  } as RequestInit;
  return new Request(ENDPOINT, init);
}

describe('readJsonBody', () => {
  it('rejects an oversized Content-Length without reading the body', async () => {
    const request = stringRequest(
      '{"name":"Team sync"}',
      String(MAX_BODY_BYTES + 1)
    );

    const result = await readJsonBody<{ name: string }>(request);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(413);
    }
    expect(request.body?.locked).toBe(false);
  });

  it('accepts a Content-Length exactly at the cap', async () => {
    const request = stringRequest('{"name":"ok"}', String(MAX_BODY_BYTES));

    const result = await readJsonBody<{ name: string }>(request);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ name: 'ok' });
    }
  });

  it('rejects a streamed body that exceeds the cap', async () => {
    const request = chunkedRequest(8, 4096);

    const result = await readJsonBody(request);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(413);
    }
    expect(request.body?.locked).toBe(true);
  });

  it('parses a valid small JSON body', async () => {
    const request = stringRequest('{"name":"Team sync","expiryDays":7}');

    const result = await readJsonBody<{ name: string; expiryDays: number }>(
      request
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ name: 'Team sync', expiryDays: 7 });
    }
  });

  it('rejects invalid JSON', async () => {
    const request = stringRequest('{"name": not json');

    const result = await readJsonBody(request);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
    }
  });

  it('rejects an empty body', async () => {
    const request = stringRequest('');

    const result = await readJsonBody(request);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
    }
  });

  it('rejects a request with no body at all', async () => {
    const request = new Request(ENDPOINT, { method: 'POST' });

    const result = await readJsonBody(request);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
    }
  });
});
