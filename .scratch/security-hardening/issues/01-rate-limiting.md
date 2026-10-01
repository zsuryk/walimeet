# 01 — Rate limiting middleware + response hardening

Status: resolved
Blocked by: —

Owner files: `worker/index.ts`, `worker/lib/ratelimit.ts`, `worker/lib/types.ts`, `wrangler.toml`
Do NOT touch: `worker/routes/*`, `worker/lib/kv.ts`, `worker/lib/turnstile.ts`, `src/*`

## Goal

Implement spec decisions **D1** and **D5** (and the `Env` declarations from D2).

## Tasks

1. `wrangler.toml`: add the three `[[ratelimits]]` blocks exactly as in spec D1, plus:
   ```toml
   [observability]
   enabled = true
   ```
2. `worker/lib/types.ts`: extend `Env` with
   `RATE_LIMIT_ALL: RateLimit; RATE_LIMIT_BURST: RateLimit; RATE_LIMIT_WRITE: RateLimit; TURNSTILE_SECRET?: string;`
   The `RateLimit` type comes from generated binding types (see ticket 04). If no
   generated type exists yet, declare a minimal structural interface in this file:
   ```ts
   interface RateLimit {
     limit(opts: { key: string }): Promise<{ success: boolean }>;
   }
   ```
   (ticket 04 replaces/keeps it consistent with `wrangler types` output).
3. New `worker/lib/ratelimit.ts`:
   ```ts
   export function checkRateLimits(request: Request, env: Env, method: string): Response | null
   ```
   - Skip entirely for `OPTIONS`.
   - Key: `request.headers.get('cf-connecting-ip') ?? 'unknown'`.
   - Apply ALL -> BURST -> (POST/PUT only) WRITE, in that order, returning early.
   - On `success === false`: `429` body `Too many requests`, header
     `Retry-After: <period>` (60 / 10 / 60 respectively).
4. `worker/index.ts` rewrite of the fetch pipeline:
   - Build CORS/security headers first; `OPTIONS` -> `204` with them.
   - `checkRateLimits(...)` -> return its response if non-null (attach headers).
   - `await verifyTurnstile(request, env)` -> return its response if non-null (attach headers).
     Import from `./lib/turnstile` — ticket 03 creates it with signature
     `verifyTurnstile(request: Request, env: Env): Promise<Response | null>`; if the file
     does not exist yet, create nothing — leave the import and note it for integration
     (do not implement turnstile yourself).
   - Then existing routing (unchanged logic).
   - Every response gets: CORS headers + `X-Content-Type-Options: nosniff` +
     `Cache-Control: no-store`.
   - CORS values per spec D5.
   - Keep the catch-all `try/catch` returning generic `Internal error`; make the error log
     structured JSON: `console.error(JSON.stringify({ msg: 'worker_error', path, error: String(error) }))`.
5. 429/404/400 responses must not leak internals (plain text or small JSON is fine —
   pick one style and be consistent with existing routes' plain-text style).

## Verify

- `npm run lint` passes.
- `npx tsc --noEmit -p tsconfig.worker.json` passes IF ticket 04 already landed; otherwise
  skip typecheck (integration will run it).
