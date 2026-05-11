# Sentinel — AI Output Auditor

Monitor, score, and govern what your AI agents produce.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Next.js 15 App                    │
│  ┌────────────┐  ┌───────────────┐  ┌────────────┐ │
│  │  Dashboard │  │  API Routes   │  │  Auth (v5) │ │
│  │  /outputs  │  │  /api/ingest  │  │  NextAuth  │ │
│  │  /policies │  │  /api/outputs │  └────────────┘ │
│  │  /agents   │  │  /api/agents  │                 │
│  │  /reports  │  │  /api/workers │                 │
│  └────────────┘  └───────────────┘                 │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
┌───────▼──────┐              ┌───────▼──────┐
│  PostgreSQL  │              │    Redis     │
│  + pgvector  │              │  (Queue)     │
│  Drizzle ORM │              │  ioredis     │
└──────────────┘              └──────────────┘
                                      │
                              ┌───────▼──────┐
                              │   Anthropic  │
                              │  Claude API  │
                              │  (Evaluator) │
                              └──────────────┘
```

**Evaluation Pipeline:**
1. Agent POSTs output to `/api/ingest` with Bearer token
2. Output stored in PostgreSQL, pushed to Redis queue
3. Worker (`/api/workers/evaluate`) pulls from queue, runs 3 parallel Claude evaluations:
   - Hallucination scorer (40% weight)
   - Policy checker (40% weight)  
   - Quality rater (20% weight)
4. Composite score stored, alerts fired if score > 70

## Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Anthropic API key

### 1. Clone and install

```bash
git clone <repo>
cd sentinel
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
DATABASE_URL=postgresql://sentinel:sentinel_secret@localhost:5432/sentinel
REDIS_URL=redis://localhost:6379
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
ANTHROPIC_API_KEY=sk-ant-...
WORKER_SECRET=your-worker-secret
```

### 3. Start infrastructure

```bash
docker-compose up postgres redis -d
```

### 4. Run migrations

```bash
# Apply the initial migration directly
psql $DATABASE_URL -f drizzle/migrations/0000_initial.sql

# Or use drizzle-kit push (for development)
npm run db:push
```

### 5. Seed data

```bash
npm run seed
```

Output:
```
✓ Created org: Acme Corp
✓ Created user: admin@acme.com
✓ Created API key: sk_live_...
✓ Created 5 agents
✓ Created 3 policies
✓ Created 500 outputs with evaluations

Login email: admin@acme.com
API key:     sk_live_<your-key>
```

### 6. Run the app

```bash
npm run dev
```

Open http://localhost:3000, sign in with `admin@acme.com` (no password required in demo mode).

## Sending your first output

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Authorization: Bearer sk_live_<your-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "<agent-uuid-from-db>",
    "output_text": "Your AI agent output text here",
    "context": "Optional source context the agent had access to",
    "metadata": {"session_id": "abc123"}
  }'

# Response: {"event_id":"...","output_id":"...","status":"queued"}
```

Then trigger evaluation:

```bash
curl -X POST http://localhost:3000/api/workers/evaluate \
  -H "X-Worker-Secret: your-worker-secret"
```

## Generating API keys

```bash
# From the database, create a new API key:
# 1. Generate a key: openssl rand -hex 32 | sed 's/^/sk_live_/'
# 2. Hash it: echo -n "sk_live_..." | sha256sum
# 3. Insert into api_keys table with the hash

# Or use the seed script which prints the key for you
npm run seed
```

## Docker deployment

```bash
# Build and run everything
docker-compose up -d

# Run migrations
docker-compose exec app npx drizzle-kit migrate

# Seed data
docker-compose exec app npm run seed
```

## Worker setup (production)

The evaluation worker at `/api/workers/evaluate` should be called by a cron job. On Vercel, use Vercel Cron:

```json
// vercel.json
{
  "crons": [{
    "path": "/api/workers/evaluate",
    "schedule": "* * * * *"
  }]
}
```

Add `CRON_SECRET` to your env and verify it in the worker route.

## Pages

| Route | Description |
|-------|-------------|
| `/dashboard` | Real-time overview, heatmap, live feed |
| `/outputs` | Paginated output list with filters |
| `/outputs/[id]` | Full output detail, scores, audit trail |
| `/policies` | Policy management |
| `/agents` | Agent overview cards |
| `/agents/[id]` | Per-agent score history |
| `/reports` | Compliance report generator + PDF export |

## API Reference

### `POST /api/ingest`
Ingest an AI output for evaluation.

**Auth:** `Authorization: Bearer sk_live_...`

```json
{
  "agent_id": "uuid",
  "output_text": "string",
  "context": "string (optional)",
  "metadata": {} 
}
```

### `GET /api/outputs`
List outputs with pagination and filters.

**Query:** `page`, `limit`, `status` (PASS/WARN/FAIL), `agent_id`, `date_from`, `date_to`

### `GET /api/outputs/[id]`
Full output detail with scores, violations, and audit trail.

### `POST /api/outputs/[id]/review`
Submit a review action.

```json
{
  "action": "reviewed | escalated | training_set | dismissed",
  "notes": "string (optional)"
}
```

### `GET /api/agents`
List agents with 7-day stats and sparkline data.

### `GET/POST /api/policies`
List or create evaluation policies.

### `GET /api/reports/generate`
Generate a compliance report for a date range.

**Query:** `date_from`, `date_to` (ISO dates)

### `POST /api/workers/evaluate`
Process queued outputs (authenticated with `X-Worker-Secret` header).

## Tech Stack

- **Framework:** Next.js 15 App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui (dark-first)
- **Database:** PostgreSQL + Drizzle ORM (+ pgvector)
- **Queue/Cache:** Redis (ioredis)
- **AI Evaluation:** Anthropic Claude claude-sonnet-4-20250514
- **Auth:** NextAuth v5
- **Charts:** Recharts
- **PDF:** jsPDF + jspdf-autotable
- **Deployment:** Docker / Vercel
