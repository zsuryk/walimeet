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

## License

[MIT](LICENSE)
