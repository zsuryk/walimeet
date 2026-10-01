# 03 — Turnstile (feature-flagged) + frontend error handling

Status: resolved
Blocked by: —

Owner files: `worker/lib/turnstile.ts` (new), `src/lib/turnstile.ts` (new), `src/lib/api.ts`, `src/pages/Create.tsx`, `src/components/SubmitModal.tsx`, plus any `src/**` files that consume `ApiError.kind`
Do NOT touch: `worker/index.ts`, `worker/lib/types.ts`, `worker/routes/*`, `wrangler.toml`

## Goal

Implement spec **D2** (server + client Turnstile) and **D6** (frontend error handling).

## Server task

New `worker/lib/turnstile.ts`:

```ts
export async function verifyTurnstile(request: Request, env: Env): Promise<Response | null>
```

- If `!env.TURNSTILE_SECRET` -> `null` (feature off).
- If not a write route (`POST /api/poll` or `PUT /api/poll/*/respond`) -> `null`.
- Read token from `x-turnstile-response`. Missing/empty -> `403 Verification required`.
- `fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST',
  body: new URLSearchParams({ secret, response: token }) })` with `AbortSignal.timeout(3000)`.
- Any thrown error, non-2xx, or `json.success !== true` -> `403 Verification failed`.
- OK -> `null`.
- Never log the secret or the token. `env.TURNSTILE_SECRET` is declared in
  `worker/lib/types.ts` by ticket 01 — do not edit that file; if the property is missing
  at integration time, integration fixes it (note it in your report).

## Frontend tasks

1. `VITE_TURNSTILE_SITE_KEY` read via `import.meta.env.VITE_TURNSTILE_SITE_KEY`.
2. New `src/lib/turnstile.ts` — vanilla loader (no npm deps):
   - `loadTurnstile(): Promise<void>` injecting
     `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit` once.
   - `renderTurnstile(el: HTMLElement, onToken: (token: string | null) => void): () => void`
     using `window.turnstile.render(el, { sitekey, action, theme: 'auto', callback, 'expired-callback' })`
     returning a cleanup fn. No-op returning noop when site key unset.
   - `resetTurnstile()` helper or expose `reset()` from render — used after a 403.
   - Type the `window.turnstile` global locally (`declare global`) — no `@types` package.
3. `src/lib/api.ts`:
   - Attach header `X-Turnstile-Response: <token>` on `createPoll` and `respondToPoll`
     when a token is supplied (thread an optional `turnstileToken?: string` parameter or
     an options object — keep call sites compiling).
   - `ApiError.kind` union gains `'rate-limited' | 'forbidden' | 'conflict'`; map
     429 -> rate-limited, 403 -> forbidden, 409 -> conflict, 413 -> bad-request
     (message: 'Request too large').
4. UI wiring:
   - `Create.tsx`: when site key set, render the widget (compact, in the form near submit),
     hold its token, send with `createPoll`; on `403` reset widget + show
     'Verification failed — please try again'. On `429` show
     'Too many requests — please wait a moment and try again.'
   - `SubmitModal.tsx`: same for respond (`403`/`429` handling; `409` shows the server's
     poll-full message).
   - Widget must not block submission when site key is unset (default path unchanged).
5. Update every `switch`/comparison over `ApiError.kind` in `src/**` for the new union
   members (TypeScript will flag them; no silent fallthroughs — map to a sensible message).

## Constraints

- No new npm dependencies. No changes to worker routes or `worker/index.ts`.
- Existing React tests must keep passing: `npm run test`.

## Verify

- `npm run lint`, `npm run test`, `npm run build`.
