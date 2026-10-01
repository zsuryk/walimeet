# 05 — Docs, env flags, user follow-up checklist

Status: resolved
Blocked by: 01, 02, 03 (content depends on what landed; run alongside 04)

Owner files: `README.md`, `.env.example`, `.gitignore` (if needed)
Do NOT touch: any code

## Tasks

1. `.env.example`: add
   ```
   VITE_TURNSTILE_SITE_KEY=
   ```
   with a comment that it stays empty to disable Turnstile.
2. README: short "Security" section covering:
   - Per-IP rate limits (60/min global, 20/10s burst, 10/min writes) via Workers Rate
     Limiting bindings; 429 responses.
   - 16 KB request body cap; strict field validation; 50-participant cap per poll;
     poll-id format check before KV reads.
   - Turnstile: enable with
     1. create a Turnstile widget in the Cloudflare dashboard (add the deployed hostname),
     2. `wrangler secret put TURNSTILE_SECRET`,
     3. set `VITE_TURNSTILE_SITE_KEY` at build time. Disabled when unset.
   - Recommended dashboard-only follow-ups (free plan): one WAF rate-limiting rule
     (IP, 10s period, 10s mitigation) and confirm DDoS protection is on (always-on by
     default).
3. Note in README that `wrangler.toml` enables `[observability]`.

Keep it concise — a checklist, not an essay.
