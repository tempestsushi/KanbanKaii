# KanbanKaii

KanbanKaii is a private, AI-assisted ticket management dashboard. It turns
actionable Slack messages into structured Kanban tickets, while ignoring casual
conversation and non-actionable questions.

The project combines a React dashboard, FastAPI API, Supabase authentication
and database, Redis/ARQ background jobs, and a local Ollama model.

## Features

- Private Supabase-authenticated workspaces
- Email/password authentication and protected application pages
- Pending, In Progress, and Completed Kanban columns
- Persistent ticket creation, editing, deletion, and drag-and-drop status changes
- Per-user analytics, profile data, settings, and notifications
- Slack OAuth connection and disconnection
- Verified Slack event webhooks
- Asynchronous AI processing through Redis and ARQ
- Local `llama3.2:3b` inference through Ollama
- Multi-task extraction from a single Slack message
- Per-user Redis AI rate limiting
- Supabase Realtime ticket updates

## Architecture

```text
Slack ──webhook──> FastAPI ──event ID──> Redis/ARQ worker
                       │                       │
                       │                       └──> Ollama triage
                       │                                │
                       └────────────────────────────────┴──> Supabase tickets
                                                                    │
Vercel React frontend <── Supabase Auth + Realtime ──────────────────┘
          │
          └── authenticated ticket requests ──> FastAPI
```

Slack sends messages directly to the backend; Slack messages do not pass
through the React frontend. FastAPI acknowledges valid events quickly and ARQ
processes them in the background so slow local-model inference does not cause
Slack webhook timeouts.

## Technology

### Frontend

- React 18 and TypeScript
- Vite
- Tailwind CSS and Shadcn-style UI components
- dnd-kit
- Supabase JavaScript client
- Recharts

### Backend

- Python 3.11+
- FastAPI and Pydantic v2
- Supabase Python client
- Redis and ARQ
- Ollama with `llama3.2:3b`

## Project structure

```text
kanbanticket/
├── frontend/
│   ├── src/api/                 # Ticket, profile, and settings clients
│   ├── src/auth/                # Session provider and route guards
│   ├── src/components/          # Kanban and shared UI
│   ├── src/integrations/slack/  # Slack settings UI and API client
│   └── src/pages/               # Application pages
├── backend/
│   ├── app/auth/                # Supabase JWT verification
│   ├── app/database/            # Supabase and ticket repositories
│   ├── app/integrations/slack/  # Slack routes, processing, and services
│   ├── app/redis/               # Redis, ARQ pool, and rate limiter
│   ├── app/routes/              # General FastAPI routes
│   ├── app/services/            # Ollama triage and ticket factory
│   ├── app/workers/             # ARQ worker entry point
│   ├── supabase/migrations/     # Database schema and RLS migrations
│   └── tests/                   # Backend unit and route tests
├── scripts/                     # Local service launcher
└── COMMANDS.md                  # Development command reference
```

## Frontend routes

| Path | Access | Purpose |
| --- | --- | --- |
| `/` | Authenticated | Main Kanban dashboard |
| `/auth` | Public only | Account signup and login |
| `/analytics` | Authenticated | User-specific ticket metrics |
| `/profile` | Authenticated | Supabase account profile |
| `/settings` | Authenticated | User preferences and Slack integration |

Authenticated pages redirect signed-out visitors to `/auth`. The auth page
redirects signed-in users back to the application.

## Backend routes

Interactive OpenAPI documentation is available at `http://127.0.0.1:8000/docs`
while FastAPI is running.

### System

| Method | Route | Authentication | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | None | FastAPI health check |
| `GET` | `/health/redis` | None | Redis connectivity check |

### Tickets

All ticket routes require `Authorization: Bearer <supabase-jwt>`. The backend
derives the owner UUID from the verified JWT; clients cannot select another
ticket owner.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/tickets` | Create a manual ticket |
| `GET` | `/api/tickets` | List the authenticated user's tickets |
| `GET` | `/api/tickets?status=PENDING` | Filter tickets by status |
| `PATCH` | `/api/tickets/{ticket_id}/status` | Update status during drag-and-drop |
| `PATCH` | `/api/tickets/{ticket_id}` | Persist complete ticket edits |
| `DELETE` | `/api/tickets/{ticket_id}` | Delete an owned ticket |

Manual ticket payload:

```json
{
  "title": "Fix checkout validation",
  "description": "Correct the validation error shown at checkout.",
  "priority": "HIGH",
  "status": "PENDING",
  "assignee": "Aisha"
}
```

### AI triage adapter

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/webhook/triage` | Test normalized message triage and ticket creation |

This normalized route is primarily a development/testing adapter. The Slack
integration uses the verified and queued webhook flow below.

```json
{
  "text": "Please fix the checkout error before tomorrow.",
  "user_name": "Aisha",
  "owner_id": "00000000-0000-0000-0000-000000000000",
  "source": "SLACK"
}
```

It returns `201 Created` when a ticket is created and `200 OK` when the message
is ignored.

### Slack integration

| Method | Route | Authentication | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/integrations/slack/connect` | Supabase JWT | Begin Slack OAuth |
| `GET` | `/api/integrations/slack/callback` | OAuth state | Complete Slack OAuth |
| `GET` | `/api/integrations/slack/status` | Supabase JWT | Validate connection status |
| `DELETE` | `/api/integrations/slack` | Supabase JWT | Revoke and remove connection |
| `POST` | `/api/webhooks/slack/events` | Slack signature | Receive Slack events |

The event receiver verifies Slack's signature over the raw body, ignores bot,
empty, duplicate, and unrelated messages, resolves mentioned connected users,
persists one delivery record, and queues only the event ID in Redis.

## Slack ticket flow

1. A user connects Slack from Settings.
2. The backend stores the encrypted Slack installation for that Supabase owner.
3. Slack sends a message event to `/api/webhooks/slack/events`.
4. FastAPI verifies the signature and checks for a connected-user mention.
5. Redis applies the per-user AI rate limit.
6. The event is persisted and its ID is queued in ARQ.
7. The worker loads the event and sends up to 50 words to Ollama.
8. Ollama returns strict structured task data, with at most five tasks.
9. The ticket factory creates private Supabase tickets for the mentioned owner.
10. Supabase Realtime sends inserted tickets to the owner's open dashboard.

## Environment configuration

Copy the example files rather than committing real `.env` files.

### Frontend: `frontend/.env`

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

The publishable key is intended for browser use. Never put a Supabase service
role key or another backend secret in a `VITE_` variable.

### Backend: `backend/.env`

```env
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-key
REDIS_URL=redis://localhost:6379/0

SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_SIGNING_SECRET=
SLACK_REDIRECT_URI=https://your-public-api/api/integrations/slack/callback
SLACK_FRONTEND_RETURN_URL=http://localhost:5173/settings
INTEGRATION_ENCRYPTION_KEY=

SLACK_AI_RATE_LIMIT_REQUESTS=10
SLACK_AI_RATE_LIMIT_WINDOW_SECONDS=60
```

The service-role key, Slack secrets, and encryption key must remain on the
backend machine.

## Local setup

### 1. Install frontend dependencies

```powershell
cd frontend
npm install
npm run dev
```

### 2. Install backend dependencies

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 3. Prepare local services

Install Ollama and download the model:

```powershell
ollama pull llama3.2:3b
```

Create/start the Redis container described in `COMMANDS.md`, then use the
combined launcher from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-server.ps1 -UseNgrok
```

The launcher checks Redis and Ollama and opens FastAPI, ARQ, and ngrok service
terminals. The PC must remain awake and online while the public application is
using this local backend.

## Tests and checks

```powershell
cd backend
.\venv\Scripts\python.exe -m unittest discover -s tests -v
```

```powershell
cd frontend
npm run typecheck
npm run lint
npm run build
```

## Deployment model

The current learning deployment uses:

- Vercel for the static React frontend
- Supabase for Auth, PostgreSQL, RLS, and Realtime
- ngrok for the public FastAPI hostname
- The local Windows machine for FastAPI, Redis, ARQ, and Ollama

Set `VITE_API_BASE_URL` on Vercel to the ngrok hostname, add the Vercel origin
to `FRONTEND_ORIGINS`, and configure Slack OAuth/events with the ngrok routes.
The frontend remains available when the PC is off, but backend ticket APIs and
Slack AI processing do not.

## Security notes

- Never commit `.env` files or Supabase service-role credentials.
- Ticket operations always scope records to the authenticated owner.
- Supabase RLS protects browser-side data access.
- Slack webhook signatures are verified before payload processing.
- OAuth state is stored one time in Redis with a ten-minute TTL.
- Slack access tokens are encrypted before database storage.
- AI requests are rate-limited per connected user.
