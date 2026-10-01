# Walimeet

The easiest way to schedule group meetings. Free, no account required.

## Features

- Interactive availability grid — click/drag to mark times
- 15-minute time slots with timezone support
- Shareable poll links
- Auto-expiring polls (1–14 days)
- Mobile-friendly

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Cloudflare Workers
- **Storage**: Cloudflare KV

## Getting Started

```bash
npm install
cp .env.example .env  # update with your Worker URL
npm run dev
```

## Deploy

1. Create a KV namespace:
   ```bash
   npx wrangler kv namespace create WALIMEET_KV
   ```

2. Copy the example config and update with your KV ID:
   ```bash
   cp wrangler.toml.example wrangler.toml
   ```

3. Deploy the Worker:
   ```bash
   npx wrangler deploy
   ```

4. Create and deploy the frontend:
   ```bash
   npx wrangler pages project create walimeet --production-branch main
   echo "VITE_API_URL=https://YOUR-WORKER.workers.dev" > .env
   npm run build
   npx wrangler pages deploy dist
   ```

## Security

Built into the Worker API:

- **Rate limits** (per-IP, via Workers Rate Limiting bindings in `wrangler.toml`): 30/min
  global, 20/10s burst, 5/min for writes (`POST`/`PUT`). Exceeding a limit returns `429`
  with a `Retry-After` header.
- **16 KB request body cap** — oversized payloads are rejected before reading only when
  `Content-Length` exceeds the cap; bodies without a truthful `Content-Length` are read up
  to 16 KB, then rejected with `413`.
- **Strict field validation** — names, dates, times, timezone, and availability slot keys
  are checked on every write.
- **50-participant cap** per poll — a new participant beyond the cap gets `409`.
- **Poll-id format guard** — ids must match `[A-Za-z0-9_-]{10}`; anything else returns
  `404` without a KV read (protects the KV read quota).
- **Link capability** — polls have no auth: anyone with the link can respond, and
  responding with an existing name overwrites that name's previous response.
- **Observability** — `wrangler.toml` (from `wrangler.toml.example`) sets
  `[observability] enabled = true`.

**Monitoring:** per-IP limits bound request rate, not daily totals — the KV free tier
(1,000 writes/day, 100k reads/day) can still be exhausted by a determined multi-IP
attacker. Enable Turnstile in production and watch KV usage; optionally add a free WAF
custom rule challenging `POST`/`PUT` requests.

### Turnstile (bot protection)

Off by default. To enable:

1. Create a Turnstile widget in the Cloudflare dashboard (add your deployed hostname).
2. `wrangler secret put TURNSTILE_SECRET`
3. Set `VITE_TURNSTILE_SITE_KEY` in `.env` when building the frontend.

Optionally run `wrangler secret put TURNSTILE_ALLOWED_HOSTNAMES` with a comma-separated
list of hostnames; when set, siteverify results are only accepted if the token's hostname
is in that list.

Without `TURNSTILE_SECRET` the API skips verification; without `VITE_TURNSTILE_SITE_KEY`
the frontend renders no widget. Challenged routes are poll creation and responding only —
reads are never challenged.

### Recommended follow-ups (free plan, dashboard only)

- [ ] Add one WAF rate-limiting rule: IP, 10-second period, 10-second mitigation.
- [ ] Confirm DDoS protection is on (always-on by default).

## License

[MIT](LICENSE)
