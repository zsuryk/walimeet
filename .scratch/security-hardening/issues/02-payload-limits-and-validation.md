# 02 — Bounded body reads, strict validation, KV abuse caps

Status: resolved
Blocked by: —

Owner files: `worker/lib/body.ts` (new), `worker/lib/validate.ts` (new), `worker/lib/kv.ts`, `worker/routes/create.ts`, `worker/routes/respond.ts`, `worker/routes/poll.ts`
Do NOT touch: `worker/index.ts`, `worker/lib/types.ts`, `wrangler.toml`, `src/*`

## Goal

Implement spec **D3** and **D4**.

## Tasks

1. New `worker/lib/body.ts`:
   ```ts
   export const MAX_BODY_BYTES = 16384;
   export async function readJsonBody<T>(request: Request): Promise<
     { ok: true; value: T } | { ok: false; response: Response }
   >
   ```
   - If `Content-Length` header present and `> MAX_BODY_BYTES` -> `{ok:false}` with
     `413 Payload too large` (no body read).
   - Otherwise read `request.body.getReader()` accumulating chunks; total `> MAX` ->
     cancel reader, `413`. Handle `request.body === null` -> `400 Invalid JSON body`.
   - `TextDecoder` decode + `JSON.parse` in try/catch -> `400 Invalid JSON body`.
   - Never call `request.text()` / `request.json()` directly in routes.
2. New `worker/lib/validate.ts` (pure functions, no I/O — must be unit-testable):
   - `validatePollId(id: string): boolean` — `/^[A-Za-z0-9_-]{10}$/` (D4).
   - `validateCreateInput(input: unknown): { ok: true; value: NormalizedCreate } | { ok: false; message: string }`
     implementing every field rule in spec D3 (trim, length caps, regexes, dates 1–31,
     timezone validity via `new Intl.DateTimeFormat('en', { timeZone })` in try/catch,
     end > start, <= 96 slots/day from 15-min slots, expiryDays 1–14).
   - `validateRespondInput(poll: Poll, input: unknown): { ok: true; value: NormalizedRespond } | { ok: false; message: string }`
     — name 1–120; `availabilities` plain object (not array/null); values strictly
     `typeof === 'boolean'`; every key must be a member of `getAllowedSlotKeys(poll)`
     (generate `poll.dates x slots(poll.timeRange, 15min)` as a `Set`, <= 2976 keys);
     object key count <= size of that set.
   - Export helper `getAllowedSlotKeys(poll: Poll): Set<string>` with key format
     `` `${date}-${HH:mm}` `` (matches frontend `TimeGrid` `getSlotKey`).
3. `worker/routes/poll.ts`: validate id first -> invalid id returns `404 Poll not found`
   WITHOUT touching KV. (Frontend-visible behavior for bad ids changes from whatever it
   was to 404 — correct.)
4. `worker/routes/create.ts`: use `readJsonBody` + `validateCreateInput`; keep response
   shapes identical (`400` + message text on failure).
5. `worker/routes/respond.ts`: use `readJsonBody` + `validateRespondInput(poll, input)`;
   after `getPoll` and expiry checks, enforce participant cap: if
   `!(name.toLowerCase() in poll.responses) && Object.keys(poll.responses).length >= 50`
   -> `409 Poll is full (maximum 50 participants)`.
6. `worker/lib/kv.ts` `savePoll`: `JSON.stringify` once; if `> 131072` chars, throw
   `new Error('poll exceeds size limit')` (falls through to generic 500).

## Constraints

- No new dependencies.
- Keep `worker/lib/types.ts` untouched; add local types in `validate.ts` if needed.
- Routes must not catch/log beyond what they already do.

## Verify

- `npm run lint`.
- Manual reasoning check: smallest legit payload still accepted; a 1 MB body, a
  1000-key availabilities object, a 51st participant, and a 12-char poll id all rejected.
