# Security hardening: abuse prevention for walimeet API

Status: implemented

## Problem

The Worker API (`POST /api/poll`, `GET /api/poll/:id`, `PUT /api/poll/:id/respond`) has no
abuse controls. Threats, in priority order:

1. **Bot spam** — automated poll creation/responding.
2. **DDoS / hammering** — unlimited request rate per IP.
3. **Large payload / KV quota ruin** — `request.json()` is unbounded; field lengths are
   unvalidated; `respond` appends to `poll.responses` with no cap and rewrites the whole
   poll to KV each time. KV free tier: 1,000 writes/day, 100,000 reads/day, 25 MB max value.
4. **KV read burn via enumeration** — `GET /api/poll/<anything>` costs a KV read for any
   string; arbitrary paths drain the 100k reads/day quota.
5. **Misc** — no security headers, generic CORS, frontend has no 429/403/409 handling.

DDoS at the network/HTTP layer is already covered by Cloudflare's free always-on DDoS
protection; nothing to code for that (see `05` for the recommended free WAF rate-limit rule).

## Design decisions

### D1 — Rate limiting (must-have): Workers Rate Limiting bindings

Free plan, zero added latency, no KV quota cost. `wrangler.toml` (stable GA syntax,
Wrangler >= 4.36):

```toml
[[ratelimits]]
name = "RATE_LIMIT_ALL"
namespace_id = "1001"
[ratelimits.simple]
limit = 30
period = 60

[[ratelimits]]
name = "RATE_LIMIT_BURST"
namespace_id = "1002"
[ratelimits.simple]
limit = 20
period = 10

[[ratelimits]]
name = "RATE_LIMIT_WRITE"
namespace_id = "1003"
[ratelimits.simple]
limit = 5
period = 60
```

- Key: `request.headers.get('cf-connecting-ip') || 'unknown'` (missing/empty IP shares
  one bucket).
- Order in `fetch`: `RATE_LIMIT_ALL` -> `RATE_LIMIT_BURST` -> (`RATE_LIMIT_WRITE` only
  for POST/PUT) -> OPTIONS preflight answer -> Turnstile -> routing. OPTIONS is rate
  limited too (it previously answered 204 before any limiter — an unbounded
  Worker-quota DoS hole found in review).
- Failure -> `429` with `Retry-After` = period seconds.
- A throwing binding fails OPEN per stage with a structured `ratelimit_binding_error`
  log (availability over strictness; edge WAF/DDoS cover the catastrophic case).
- Counters are per-PoP and permissive; limits bound RATE, not daily totals — see the
  README monitoring note for the residual KV quota risk (60/min/IP allowed ~86k
  reads/day vs the 100k free quota; 10/min/IP allowed 14.4k writes/day vs 1k — hence
  30 and 5).

### D2 — Turnstile, feature-flagged (bot layer)

- Server: `verifyTurnstile(request, env): Promise<Response | null>` in
  `worker/lib/turnstile.ts`. Returns `null` when OK / feature off, else a `403` response.
- Reads token from header **`x-turnstile-response`** (so it can run before body parsing).
- Enforced ONLY when `env.TURNSTILE_SECRET` is set (wrangler secret, never in config) AND
  the request is a write route (`POST /api/poll`, `PUT .../respond`). GETs never challenged.
- Verify via `POST https://challenges.cloudflare.com/turnstile/v0/siteverify`
  (form-encoded `secret`, `response`, plus `remoteip` when `cf-connecting-ip` is
  present), ~3s timeout, failure -> 403.
- Optional hostname allowlist: when the `TURNSTILE_ALLOWED_HOSTNAMES` secret is set
  (comma-separated), `data.hostname` from siteverify must be a member or the token is
  rejected — blocks tokens farmed on other origins embedding the public sitekey.
- Client: `VITE_TURNSTILE_SITE_KEY`; when unset, frontend renders no widget and sends no
  header (default dev behavior unchanged). Vanilla script loader, `render: 'explicit'`,
  no new npm deps.
- Contract: token in `x-turnstile-response`; CORS must allow that header.

### D3 — Large payload / KV protection

- `MAX_BODY_BYTES = 16384` (16 KB). Reject `Content-Length > MAX` with `413` **before**
  reading. For missing/lying Content-Length, read via `request.body.getReader()` with a
  hard byte cap -> `413`. Never `await request.text()` on an unbounded body.
- Field limits (create): `name` 1–120 chars, `description` <= 1000, `creatorName` <= 120,
  `timezone` <= 64 and valid `Intl` time zone, `dates` 1–31 entries each
  `/^\d{4}-\d{2}-\d{2}$/`, `timeRange.start/end` `/^([01]\d|2[0-3]):[0-5]\d$/` with
  end > start and <= 96 slots/day (15-min slots), `expiryDays` existing 1–14 rule.
- Respond limits: `name` 1–120 and never `__proto__` (case-insensitive — assigning
  that key hits the inherited setter and silently drops the response);
  `availabilities` values strictly boolean; every key must be a real slot of that poll
  (`YYYY-MM-DD-HH:mm`, member of the poll's generated slot set) — bounded generation
  (<= 31 x 96 keys).
- Dates must be real calendar days (regex + `Date.UTC` round-trip, so `2026-02-31`
  and `2026-13-45` are rejected) and unique.
- Participant cap: `MAX_PARTICIPANTS = 50`. New participant when at cap -> `409`.
  (Existing name updating itself always allowed.)
- Defense in depth: size guards measure UTF-8 bytes (TextEncoder), not UTF-16 chars:
  `savePoll` throws above 128 KB; `respond` pre-checks the serialized poll and returns
  `409 Poll has reached its maximum size` instead of letting a poll wedge into
  permanent 500s (a review finding — throw only remains as the create-path backstop,
  unreachable over HTTP because the 16 KB body cap binds first).
- Unknown extra JSON fields: ignored (lenient).

### D4 — KV read burn / enumeration

- `validatePollId`: `/^[A-Za-z0-9_-]{10}$/` (nanoid(10) alphabet) checked BEFORE any KV
  `get`. Invalid -> `404 Not found`, no KV touch, same body as a real miss.

### D5 — Response hardening

- Every API response: `X-Content-Type-Options: nosniff`, `Cache-Control: no-store` —
  except successful `GET` responses, which get `Cache-Control: public, max-age=30` so
  browsers absorb repeat poll reads (KV: 100k reads/day free).
- Error logs redact capability ids: the logged path shape is `/api/poll/:id`.
- CORS: keep `Access-Control-Allow-Origin: *` (no cookies/credentials), methods
  `GET, POST, PUT, OPTIONS`, allow-headers `Content-Type, X-Turnstile-Response`,
  `Access-Control-Max-Age: 86400`; preflight -> 204.
- 500s stay generic (`Internal error`); log structured JSON via `console.error`.

### D6 — Frontend error handling

`ApiError.kind` gains the cases needed to surface: 429 -> "Too many requests, wait a
moment", 403 -> Turnstile failure (reset widget), 409 -> "poll is full", 413 -> request too
large. All switch sites updated (TS will enforce).

### D7 — Verification

- `tsconfig.worker.json` wired as a project reference so `npm run build` typechecks
  `worker/`; binding types via `npx wrangler types` (fallback: `@cloudflare/workers-types`
  + minimal `RateLimit` interface).
- Vitest unit tests (`// @vitest-environment node`) for validate, body cap, rate limiter,
  Turnstile skip/verify, poll-id guard.

## File ownership (parallel waves)

| Ticket | Owns |
|--------|------|
| 01 rate limit | `worker/index.ts`, `worker/lib/ratelimit.ts`, `worker/lib/types.ts`, `wrangler.toml` |
| 02 payload/validation | `worker/lib/body.ts`, `worker/lib/validate.ts`, `worker/lib/kv.ts`, `worker/routes/*` |
| 03 turnstile | `worker/lib/turnstile.ts`, `src/lib/turnstile.ts`, `src/lib/api.ts`, `src/pages/Create.tsx`, `src/components/SubmitModal.tsx`, any component consuming `ApiError.kind` |
| 04 typecheck+tests | `tsconfig*.json`, `worker/test/*`, `package.json` scripts |
| 05 docs/flags | `README.md`, `.env.example` |

`worker/lib/types.ts` (01) must declare `RATE_LIMIT_ALL | RATE_LIMIT_BURST |
RATE_LIMIT_WRITE: RateLimit` and `TURNSTILE_SECRET?: string` per this spec — 02/03 rely
on it without editing the file.

## Review round — accepted risks

Two parallel reviews (spec compliance + adversarial) closed with these deliberate
acceptances:

- **Anonymous link-capability model**: anyone holding a poll link can respond and
  overwrite a same-name response; a squatter can fill the 50 slots. Fixing this needs
  auth/edit-tokens (deferred — see `.scratch/creator-powers/`). Documented in README.
- **Turnstile default-off**: fail-open when `TURNSTILE_SECRET` is unset is the agreed
  feature-flag contract; enabling it is a deployment step (README).
- **Non-blocking submit (decision 1A)**: with the widget enabled, submit stays enabled
  before a token arrives; a missing token yields 403 + widget reset. Chosen for
  resilience against adblockers over futile-request avoidance.
- **Per-IP limits cannot cap global daily KV totals** across many IPs; the WAF rule +
  monitoring note + Turnstile are the layered answer. No KV-counter global budget was
  shipped: an increment-per-write counter would double write consumption against the
  1,000 writes/day quota it protects.

## Out of scope

- Dashboard actions for the user: Turnstile widget creation, `wrangler secret put
  TURNSTILE_SECRET`, the free WAF rate-limit rule (ticket 05 documents these).
- Migrating off KV, Durable Objects, paid plans.
