export const MAX_BODY_BYTES = 16384;

export async function readJsonBody<T>(request: Request): Promise<
  { ok: true; value: T } | { ok: false; response: Response }
> {
  const contentLength = request.headers.get('Content-Length');
  if (contentLength !== null && Number(contentLength) > MAX_BODY_BYTES) {
    return {
      ok: false,
      response: new Response('Payload too large', { status: 413 }),
    };
  }

  const body = request.body;
  if (!body) {
    return {
      ok: false,
      response: new Response('Invalid JSON body', { status: 400 }),
    };
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const result = await reader.read();
    if (result.done) break;
    total += result.value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return {
        ok: false,
        response: new Response('Payload too large', { status: 413 }),
      };
    }
    chunks.push(result.value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const value = JSON.parse(new TextDecoder().decode(bytes)) as T;
    return { ok: true, value };
  } catch {
    return {
      ok: false,
      response: new Response('Invalid JSON body', { status: 400 }),
    };
  }
}
