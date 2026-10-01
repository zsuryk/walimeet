# 04 — Worker typecheck + unit tests for security modules

Status: resolved
Blocked by: 01, 02, 03

Owner files: `tsconfig.json`, new `tsconfig.worker.json`, `package.json` (scripts/devDeps only), `worker/test/*`, `vite.config.ts` (only if vitest config must change)
Do NOT touch: `worker/index.ts`, `worker/lib/**` implementations (except trivial type fixes), `worker/routes/**`, `src/**` (except if `vite.config.ts` needs it)

## Goal

Implement spec **D7**: make `npm run build` typecheck the worker, and add unit tests for
the security modules from tickets 01–03.

## Typecheck

1. Binding types: run `npx wrangler types` (downloads wrangler if needed). It generates
   `worker-configuration.d.ts` with `Env`, `KVNamespace`, and the `RateLimit` binding types
   derived from `wrangler.toml`.
   - If wrangler is unavailable/offline: add devDependency `@cloudflare/workers-types`
     and ensure the structural `RateLimit` interface from ticket 01 remains; document the
     fallback in your report.
   - Add generated file to `.gitignore` only if it churns; prefer committing it so builds
     are reproducible (choose one, state which).
2. New `tsconfig.worker.json`, modeled on `tsconfig.app.json` shape:
   - `include`: `["worker/**/*", "worker-configuration.d.ts"]` (adjust to actual output path).
   - `compilerOptions`: same strictness conventions as app config (`noUnusedLocals`,
     `noUnusedParameters`, `verbatimModuleSyntax`, `moduleResolution: "bundler"`,
     `noEmit: true`, `target: es2023`, `lib: ["ES2023"]`, `types` as needed — do NOT
     include `vite/client` or `node` unless required).
   - Wire it into `tsconfig.json` references so `tsc -b` covers it.
3. `npm run build` must typecheck the worker (and still build the frontend).
4. If `worker/` has pre-existing type errors unrelated to this work, fix them minimally
   (report them) — the build must go green.

## Tests

Add `worker/test/*.test.ts` with `// @vitest-environment node` header (vitest include
globs already cover `worker/`). Cover at minimum:

- `validate.test.ts`: valid create/respond inputs accepted; each rule rejected
  (oversized name, bad dates, bad times, >31 dates, bad timezone, expiryDays bounds,
  non-boolean availability values, non-slot availability keys, >50-participant cap logic
  if exported, invalid poll ids valid/invalid).
- `body.test.ts`: `Content-Length` over cap -> 413 without reading; chunked stream over
  cap -> 413; valid small JSON parses; invalid JSON -> 400; empty body -> 400.
  Build `Request` objects with `new Request('https://x/', { method: 'POST', body, ... })`.
- `ratelimit.test.ts`: mock `Env` with stub `limit()` returning success/failure; assert
  null vs 429 + `Retry-After`; OPTIONS skipped; missing IP uses `'unknown'` key.
- `turnstile.test.ts`: secret unset -> null on every route; secret set + missing token ->
  403; `fetch` stubbed (`vi.stubGlobal('fetch', ...)`) success -> null, `success:false` ->
  403; GET route -> null.
- If `src/test/setup.ts` interferes with node-environment tests, scope setupFiles in
  `vite.config.ts` to `src/test/**` only — change config minimally.

Do not test `worker/index.ts` end-to-end (would need miniflare/wrangler; out of scope).

## Verify

- `npm run build` (typecheck + frontend build) passes.
- `npm run test` passes (new + existing React tests).
- `npm run lint` passes.
