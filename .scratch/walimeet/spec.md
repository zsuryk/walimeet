# Walimeet — Implementation Plan

## Overview

**Walimeet** ("when will we meet") is a free, anonymous group scheduling tool. Users create time-based polls, share a link, and participants mark their availability. The grid overlays all responses to highlight the best meeting times.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Hosting** | Cloudflare Workers | Edge compute, generous free tier, built-in KV storage |
| **Frontend** | React + Vite | Fast dev, easy deploy to CF Pages |
| **Storage** | Cloudflare KV | Simple key-value, no external DB needed |
| **Styling** | Tailwind CSS | Rapid UI, mobile-first |
| **Language** | TypeScript (full stack) | Type safety across frontend and worker |

### Why Cloudflare over Vercel?
- Vercel's Hobby plan is **non-commercial only** — can't monetize later
- Cloudflare KV provides built-in persistent storage (Vercel has none)
- CF's 100K reads/day = ~3K polls/day — more than enough for MVP
- No cold start issues (edge execution)

---

## Data Model

### Poll (stored in KV)

```typescript
interface Poll {
  id: string;              // Short unique ID (e.g., "abc123")
  name: string;            // Poll title
  description?: string;    // Optional description
  dates: string[];         // Selected dates ["2026-09-22", "2026-09-23"]
  timeRange: {
    start: string;         // "09:00" (24h format)
    end: string;           // "17:00"
  };
  timezone: string;        // Creator's timezone, e.g., "Asia/Hong_Kong"
  slotMinutes: 15;         // Fixed 15-min granularity
  creatorName: string;     // Anonymous creator name
  createdAt: number;       // Unix timestamp
  expiresAt: number;       // Unix timestamp (max 14 days)
  responses: Record<string, ParticipantResponse>;
}

interface ParticipantResponse {
  name: string;
  availabilities: Record<string, boolean>; // "2026-09-22-09:00" -> true/false
  submittedAt: number;
}
```

### KV Key Structure
- `poll:{id}` — The poll object
- No other keys needed (anonymous mode)

---

## UI Pages

### 1. Landing Page (`/`)
- Hero section: "Walimeet — The easiest way to schedule group meetings"
- CTA button: "Create a Poll"
- Brief "How it works" (3 steps)
- Mobile-first, clean design

### 2. Create Poll (`/create`)
- **Step 1**: Select dates from calendar (multi-select)
- **Step 2**: Set time range (start/end hours), timezone (auto-detected)
- **Step 3**: Enter poll name, description, creator name
- **Step 4**: Set expiry (default 7 days, max 14)
- Submit → redirect to `/poll/{id}`

### 3. Poll Page (`/poll/:id`)
- **Top**: Poll name, description, time range, timezone
- **Grid**: Horizontal dates × vertical time slots (15-min)
  - Empty cells = available (click to mark unavailable)
  - Click toggles availability
  - Color-coded: green = available, gray = unavailable
- **Overlay**: When >1 participant, show count per cell
  - Best slots = darkest green (most people available)
  - Hover/tap shows participant names
- **Participant list**: Names on the side
- **Submit**: Enter name → submit availability
- **Share**: Copy link button
- **Timezone toggle**: View in your timezone or original

### 4. Not Found (`/404`)
- Simple "Poll not found or expired" page

---

## API Routes (Cloudflare Worker)

All routes are handled by a single Worker with path-based routing:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/poll/:id` | Fetch poll data |
| `POST` | `/api/poll` | Create new poll |
| `PUT` | `/api/poll/:id/respond` | Submit/update availability |
| `GET` | `/` | Serve frontend (static) |

### Worker Structure

```
src/
├── worker/
│   ├── index.ts          # Worker entry, router
│   ├── routes/
│   │   ├── poll.ts       # GET /api/poll/:id
│   │   ├── create.ts     # POST /api/poll
│   │   └── respond.ts    # PUT /api/poll/:id/respond
│   └── lib/
│       ├── kv.ts         # KV helpers
│       ├── id.ts         # Short ID generator
│       └── types.ts      # Shared types
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── Create.tsx
│   │   │   ├── Poll.tsx
│   │   │   └── NotFound.tsx
│   │   ├── components/
│   │   │   ├── Calendar.tsx
│   │   │   ├── TimeGrid.tsx
│   │   │   ├── ParticipantList.tsx
│   │   │   └── ShareButton.tsx
│   │   ├── lib/
│   │   │   ├── timezone.ts
│   │   │   └── api.ts
│   │   └── main.tsx
│   ├── index.html
│   └── vite.config.ts
└── wrangler.toml
```

---

## Key Implementation Details

### Timezone Handling
- Creator selects a timezone when creating poll
- All time slots stored as absolute UTC timestamps internally
- Frontend detects visitor's timezone and converts for display
- Toggle to switch between "My Time" and "Poll Time"

### Availability Grid Interaction
- Click a cell to toggle: available (green) / unavailable (gray/empty)
- Click-and-drag to toggle multiple cells
- On mobile: tap to toggle, scroll horizontally for dates
- Cells show participant count on hover (desktop) or tap (mobile)

### Poll Expiry
- When creating poll, creator selects expiry: 1–14 days
- `expiresAt` stored in poll data
- Worker checks expiry on read — returns 404 if expired
- Optional: scheduled CF Worker to clean up expired polls (not MVP)

### Shareable Link
- URL format: `walimeet.pages.dev/poll/{short-id}`
- Copy-to-clipboard button
- Optional: QR code generation (future)

---

## Implementation Phases

### Phase 1: Project Setup
- [ ] Initialize Vite + React + TypeScript
- [ ] Set up Tailwind CSS
- [ ] Configure Cloudflare Worker with wrangler
- [ ] Set up CF Pages for frontend deployment
- [ ] Create `wrangler.toml` with KV namespace binding

### Phase 2: Backend (API)
- [ ] Worker router setup
- [ ] `POST /api/poll` — Create poll (validate, generate ID, store in KV)
- [ ] `GET /api/poll/:id` — Fetch poll (check expiry)
- [ ] `PUT /api/poll/:id/respond` — Submit availability
- [ ] Short ID generation (nanoid or similar)

### Phase 3: Frontend — Create Flow
- [ ] Landing page with CTA
- [ ] Calendar component (multi-select dates)
- [ ] Time range picker + timezone selector
- [ ] Poll name/description form
- [ ] Expiry selector (1–14 days)
- [ ] Submit → redirect to poll page

### Phase 4: Frontend — Poll View
- [ ] Time grid component (dates × time slots)
- [ ] Click/drag to toggle availability
- [ ] Participant name input
- [ ] Submit availability
- [ ] Availability overlay (color intensity by count)
- [ ] Hover/tap to see participant names

### Phase 5: Polish & Deploy
- [ ] Mobile responsiveness
- [ ] Timezone toggle (my time vs poll time)
- [ ] Share button (copy link)
- [ ] Error handling (invalid link, expired poll)
- [ ] Deploy to Cloudflare Pages + Workers

---

## Future Features (Post-MVP)

- [ ] Account system (optional sign-up)
- [ ] Google Calendar / Outlook integration
- [ ] Email notifications
- [ ] Recurring meetings (pattern-based availability)
- [ ] Poll editing by creator
- [ ] QR code for sharing
- [ ] Dark mode

---

## Estimated Effort

| Phase | Hours |
|-------|-------|
| Phase 1: Setup | 1–2h |
| Phase 2: Backend | 3–4h |
| Phase 3: Create Flow | 3–4h |
| Phase 4: Poll View | 4–5h |
| Phase 5: Polish | 2–3h |
| **Total** | **~13–18h** |
