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

3. Deploy:
   ```bash
   npx wrangler deploy
   ```

## License

[MIT](LICENSE)
