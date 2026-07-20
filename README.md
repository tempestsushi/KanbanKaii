# KanbanKaii

KanbanKaii is an AI-driven ticket management dashboard that turns actionable
Slack messages into structured Kanban tickets. It combines a React dashboard,
FastAPI backend, Supabase Auth/Postgres, Redis background jobs, Slack OAuth, and
a pluggable AI provider layer for local or hosted model triage.

The goal is simple: keep work conversations inside Slack, but automatically
capture the real tasks into a board where they can be assigned, edited, moved,
and tracked.

## What it does

- Creates Kanban tickets from actionable Slack mentions.
- Ignores chatter, empty mentions, and non-task questions.
- Splits one message into multiple tickets when multiple tasks are present.
- Supports manual ticket creation, editing, deletion, search, filter, sort, and drag-and-drop status updates.
- Provides private `My Tasks` boards for each signed-in user.
- Supports organization workspaces with members, roles, project boards, and Slack channel-to-board mapping.
- Shows organization/project tickets based on the current user's role and board membership.
- Uses Supabase Realtime so new tickets can appear without refreshing the whole app.
- Uses Redis + ARQ workers so Slack webhooks respond quickly while AI processing happens in the background.
- Supports hosted Gemini models and local Ollama models through environment configuration.
- Includes PWA metadata so the app can be installed from mobile browsers.

## App flow

```text
Slack message
  ↓
FastAPI Slack webhook
  ↓
Signature check, duplicate check, empty-message filtering
  ↓
Redis / ARQ background job
  ↓
Slack user + channel + organization context resolution
  ↓
AI triage model
  ↓
Structured task JSON
  ↓
Ticket factory
  ↓
Supabase tickets table
  ↓
React Kanban board + Supabase Realtime updates
```

Slack does not send messages through the frontend. Slack talks directly to the
FastAPI backend. The frontend only reads the resulting tickets and lets users
manage them.

## Main features

### Personal board

Each authenticated user gets a private Kanban board with three columns:

- `Pending`
- `In Progress`
- `Completed`

Tickets can be created manually or generated from Slack. Users can update the
ticket details, delete tickets, and drag tickets between columns.

### Organization board

Organizations add a team layer on top of personal tasks.

- Managers can create organizations and project boards.
- Members can be invited through the app.
- Project boards can be linked to Slack channels.
- Organization tickets can show which project board they belong to.
- Members see the tickets for boards they are part of.
- Assigned users update their own task status from `My Tasks`; the organization view reflects that progress.

### Slack integration

Slack is connected with OAuth and verified webhooks.

The backend handles:

- OAuth connect/reconnect/disconnect
- Slack event signature verification
- bot-message and duplicate-event filtering
- public channel auto-join when scopes allow it
- private channel invite detection
- Slack display-name and channel-name resolution
- per-user AI rate limiting
- project-board routing through Slack channel IDs

### AI triage

The AI layer receives cleaned Slack text and returns strict structured task
data. The active model provider is selected from `backend/.env`.

Supported providers:

- `gemini`
- `ollama`

## Tech stack

Frontend:

- React
- TypeScript
- Vite
- Tailwind CSS
- Shadcn-style components
- dnd-kit
- Supabase JS client

Backend:

- Python 3.11+
- FastAPI
- Pydantic v2
- Supabase Python client
- Redis
- ARQ workers
- Slack OAuth + Events API

Infrastructure:

- Supabase Auth
- Supabase Postgres
- Supabase Realtime
- Redis for queues, rate limits, OAuth state, and short-lived invitations
- ngrok or Cloudflare Tunnel for local webhook testing
- Vercel-ready frontend

## Project structure

```text
kanbanticket/
├── frontend/                  # React app
│   ├── public/                # PWA assets, icons, manifest, service worker
│   └── src/
│       ├── api/               # API clients
│       ├── auth/              # Supabase auth context and guards
│       ├── components/        # UI components
│       ├── hooks/             # Page and feature hooks
│       ├── integrations/      # Slack frontend integration helpers
│       └── pages/             # Landing, auth, dashboard, org, settings pages
├── backend/                   # FastAPI app
│   ├── app/
│   │   ├── auth/              # Supabase JWT auth
│   │   ├── database/          # Supabase repositories
│   │   ├── integrations/      # Slack integration
│   │   ├── organizations/     # Organization APIs and repositories
│   │   ├── redis/             # Redis helpers
│   │   ├── routes/            # General API routes
│   │   ├── services/          # AI providers and ticket factory
│   │   └── workers/           # ARQ worker
│   ├── supabase/migrations/   # Database schema and RLS
│   └── tests/                 # Backend tests
├── scripts/                   # Local startup scripts
├── COMMANDS.md                # Copy-paste command reference
└── README.md
```

## Environment variables

Create these files locally. Do not commit real secrets.

### `frontend/.env`

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

### `backend/.env`

```env
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

REDIS_URL=redis://localhost:6379/0

AI_MODEL_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-3.1-flash-lite

OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b

SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_SIGNING_SECRET=your_slack_signing_secret
SLACK_REDIRECT_URI=https://your-public-backend-url/api/integrations/slack/callback
SLACK_FRONTEND_RETURN_URL=http://localhost:5173/settings
INTEGRATION_ENCRYPTION_KEY=your_fernet_key

SLACK_AI_RATE_LIMIT_REQUESTS=10
SLACK_AI_RATE_LIMIT_WINDOW_SECONDS=60
```

Use `AI_MODEL_PROVIDER=gemini` for hosted Gemini. Use
`AI_MODEL_PROVIDER=ollama` when running a local Ollama model.

## Running locally

### 1. Clone and install frontend dependencies

```powershell
git clone <your-repo-url>
cd kanbanticket
cd frontend
npm install
```

Start the frontend:

```powershell
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

### 2. Install backend dependencies

Open another terminal:

```powershell
cd D:\kanbanticket\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Start FastAPI:

```powershell
.\venv\Scripts\uvicorn.exe app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend docs:

```text
http://127.0.0.1:8000/docs
```

### 3. Start Redis

Redis is required for Slack queueing, OAuth state, invitations, and rate
limiting.

If using Docker:

```powershell
docker run --name kanbankaii-redis -p 6379:6379 -d redis:7-alpine redis-server --appendonly yes
```

If the container already exists:

```powershell
docker start kanbankaii-redis
```

Check Redis:

```powershell
docker exec kanbankaii-redis redis-cli ping
```

Expected response:

```text
PONG
```

### 4. Start the ARQ worker

Open another terminal:

```powershell
cd D:\kanbanticket\backend
.\venv\Scripts\Activate.ps1
arq app.workers.slack_worker.WorkerSettings
```

The worker processes queued Slack events and calls the AI provider.

### 5. Choose an AI provider

For Gemini, set this in `backend/.env`:

```env
AI_MODEL_PROVIDER=gemini
GEMINI_API_KEY=your_key
GEMINI_MODEL=gemini-3.1-flash-lite
```

For Ollama:

```powershell
ollama pull llama3.2:3b
ollama serve
```

Then set:

```env
AI_MODEL_PROVIDER=ollama
OLLAMA_MODEL=llama3.2:3b
```

### 6. Expose the backend for Slack

Slack needs a public HTTPS URL for OAuth and Event Subscriptions.

Using ngrok:

```powershell
cd C:\ngrok
.\ngrok.exe http 8000
```

Set these Slack URLs using your ngrok domain:

```text
OAuth callback:
https://your-ngrok-domain.ngrok-free.dev/api/integrations/slack/callback

Event Subscriptions:
https://your-ngrok-domain.ngrok-free.dev/api/webhooks/slack/events
```

Also update `SLACK_REDIRECT_URI` in `backend/.env` to match the OAuth callback
exactly.

### 7. Optional one-command local launcher

After dependencies, Redis container, and environment variables are ready:

```powershell
cd D:\kanbanticket
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-server.ps1 -UseNgrok
```

To skip Ollama when using Gemini:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-server.ps1 -UseNgrok -SkipOllama
```

More copy-paste commands are in `COMMANDS.md`.

## Supabase setup

1. Create a Supabase project.
2. Add the frontend Supabase URL and publishable key to `frontend/.env`.
3. Add the backend Supabase URL and service-role key to `backend/.env`.
4. Run the SQL files from `backend/supabase/migrations/` in Supabase SQL Editor.
5. Enable Supabase Realtime for the tickets table if required by the migration notes.
6. Configure Auth redirect URLs for your local and deployed frontend URLs.

## Slack setup

In your Slack app configuration:

1. Add the OAuth callback URL.
2. Add the Event Subscriptions request URL.
3. Add the required bot scopes.
4. Install the app to your workspace.
5. Connect Slack from KanbanKaii Settings or Organization settings.
6. Invite the app to private channels manually when needed.

Public channels can be auto-joined if the app has the correct scope. Private
channels must be invited from Slack.

## Useful checks

Frontend:

```powershell
cd frontend
npm run typecheck
npm run lint
npm run build
```

Backend:

```powershell
cd backend
.\venv\Scripts\python.exe -m unittest discover -s tests -v
```

Health endpoints:

```text
http://127.0.0.1:8000/health
http://127.0.0.1:8000/health/redis
```

## Deployment notes

The current learning deployment model is:

- Vercel hosts the React frontend.
- Supabase hosts Auth, Postgres, RLS, and Realtime.
- FastAPI, Redis, and the ARQ worker can run locally during development.
- ngrok or another tunnel exposes the local backend to Slack.
- Hosted Gemini can replace local Ollama when you do not want to run a model on your machine.

For production, the backend, Redis, and worker should run on an always-on server
instead of a personal machine.

## Security notes

- Never commit `.env` files.
- Keep Supabase service-role keys backend-only.
- Frontend API calls use Supabase JWTs.
- Slack webhook signatures are verified.
- Slack tokens are encrypted before storage.
- OAuth state and organization invitations are temporary Redis records.
- AI calls are rate-limited per connected Slack user.
