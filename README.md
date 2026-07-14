# KanbanKaii

KanbanKaii is an AI-driven ticket management dashboard that turns real work
requests from Slack into structured Kanban tickets. It is built as a full-stack
learning project with a React/Vite frontend, FastAPI backend, Supabase Auth and
Postgres, Redis/ARQ background jobs, and pluggable AI model providers.

The core idea is simple: people keep talking where work already happens, and
KanbanKaii quietly separates actionable requests from chatter, questions, and
empty mentions.

## What the app does

- Converts actionable Slack mentions into clean Kanban tickets.
- Ignores casual conversation and non-task messages.
- Splits one Slack message into multiple tickets when it contains multiple tasks.
- Supports private personal task boards.
- Supports organization workspaces with roles, project boards, members, and Slack channel mappings.
- Shows tickets in `Pending`, `In Progress`, and `Completed` columns.
- Persists manual ticket creation, editing, deletion, and drag-and-drop status changes.
- Uses Supabase Realtime so tickets appear without full-page refreshes.
- Uses Redis/ARQ so Slack webhooks respond quickly while AI processing happens in the background.
- Supports local Ollama models and hosted Gemini models through a model provider abstraction.
- Includes PWA metadata so the deployed app can be added to a mobile home screen.

## Major functionality

### Personal Kanban board

Each signed-in user gets a private board for their own tasks. Tickets can be:

- created manually,
- created by Slack AI triage,
- edited,
- deleted,
- dragged between columns,
- filtered and sorted,
- searched,
- updated in realtime.

Personal tickets are owned by the authenticated Supabase user. The frontend
never chooses another user's owner ID.

### Organization workspace

KanbanKaii also supports a shared organization layer for team workflows.

Organizations include:

- manager/owner and member roles,
- member invitations,
- role changes,
- member removal,
- organization deletion,
- leaving an organization,
- project boards,
- board-specific members,
- board-specific Slack channel mappings.

The organization board is primarily a visibility layer. Members can see tickets
for boards they belong to, while status updates are still driven from the
assigned user's own task board.

### Project boards

Project boards let managers split organization work by project or Slack channel.

Example:

- `Frontend`
- `Backend`
- `Launch`
- `Leadership`

A Slack channel can be linked to a project board. When a manager or team lead
assigns work from a linked channel, the created organization ticket is attached
to that board.

Channel status badges show whether a Slack channel is:

- linked only,
- connected,
- missing an invite,
- or requiring Slack reconnect because scopes changed.

### Slack integration

Slack is connected through OAuth and verified webhooks.

Implemented Slack behavior:

- OAuth connection and reconnection.
- Organization workspace verification.
- Slack event signature verification.
- Duplicate webhook protection.
- Empty mention filtering.
- Bot-message filtering.
- Redis queueing before AI processing.
- Per-user AI rate limiting.
- Mention-to-user resolution.
- Display-name resolution.
- Slack channel name lookup.
- Slack channel metadata refresh.
- Public channel auto-join using `channels:join`.
- Private channel manual invite detection.
- Organization project-board routing through Slack channel IDs.

Public channels can be auto-joined by the bot after the correct Slack scope is
granted. Private channels still require one manual app invite from inside Slack,
because Slack does not allow apps to silently join private channels.

### AI triage

The backend sends normalized Slack text to the configured AI provider and
expects strict structured task data.

The triage layer can:

- decide whether a message is actionable,
- extract one or more tasks,
- generate ticket titles,
- clean descriptions,
- estimate priority,
- reject empty mentions,
- reject non-actionable questions,
- cap overly long Slack inputs before model processing.

The model provider is configurable from the backend environment.

Supported direction:

- `ollama` for local models such as `llama3.2:3b`
- `gemini` for hosted Gemini models

### Authentication and sessions

Supabase Auth powers:

- signup,
- login,
- password reset,
- protected application routes,
- authenticated API requests,
- user profile data,
- persistent user settings.

The frontend uses the Supabase publishable key. Backend-only secrets remain in
the backend `.env`.

### Settings, profile, analytics, and notifications

The app includes:

- profile page connected to Supabase user data,
- settings persistence,
- Slack connection card,
- organization settings,
- notification dropdown,
- mark-as-read notifications,
- analytics based on the authenticated user's ticket data.

### Progressive Web App support

KanbanKaii includes basic PWA support:

- web app manifest,
- mobile theme color,
- home-screen icons,
- service worker registration,
- offline fallback page.

This enables mobile browsers to offer `Install app` or `Add to Home Screen`
after deployment over HTTPS.

## Architecture

```text
Slack Events
   │
   ▼
FastAPI webhook endpoint
   │ verifies signature, filters obvious noise
   │
   ▼
Supabase webhook delivery row + Redis/ARQ job
   │
   ▼
ARQ worker
   │ resolves Slack users, channel, organization role, project board
   │
   ▼
AI provider
   │ returns structured task JSON
   │
   ▼
Ticket factory
   │
   ▼
Supabase tickets table
   │
   ▼
React frontend via authenticated API + Supabase Realtime
```

Slack messages do not pass through the React frontend. Slack talks directly to
FastAPI. FastAPI stores and queues events quickly so Slack does not time out
while local or hosted AI inference runs.

## Tech stack

### Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Shadcn-style UI components
- dnd-kit for drag and drop
- Supabase JavaScript client
- lucide-react icons imported individually
- PWA manifest and service worker

### Backend

- Python 3.11+
- FastAPI
- Pydantic v2
- Supabase Python client
- Redis
- ARQ workers
- Slack OAuth and event webhooks
- Pluggable AI provider layer
- Ollama and Gemini model support

### Infrastructure

- Supabase Auth
- Supabase Postgres
- Supabase Row Level Security
- Supabase Realtime
- Redis for queues, rate limiting, OAuth state, and transient invitations
- Vercel for frontend deployment
- ngrok or another tunnel for exposing the local backend during development

## Project structure

```text
kanbanticket/
├── frontend/
│   ├── public/                 # PWA manifest, service worker, icons, social image
│   ├── src/api/                # API clients for tickets, orgs, settings, profile
│   ├── src/auth/               # Supabase auth context and route guards
│   ├── src/components/         # Kanban, layout, organization, auth, settings UI
│   ├── src/hooks/              # Page controllers and feature-specific hooks
│   ├── src/integrations/slack/ # Slack frontend API and connection UI
│   └── src/pages/              # Landing, auth, dashboard, org, settings pages
├── backend/
│   ├── app/auth/               # Supabase JWT verification
│   ├── app/database/           # Supabase client and ticket repository
│   ├── app/integrations/slack/ # Slack routes, services, queueing, processing
│   ├── app/maintenance/        # Cleanup jobs
│   ├── app/organizations/      # Organization repository, routes, invite store
│   ├── app/prompts/            # AI prompt templates
│   ├── app/redis/              # Redis connection, ARQ pool, rate limiter
│   ├── app/routes/             # General API routes
│   ├── app/services/           # AI providers and ticket factory
│   ├── app/workers/            # ARQ worker entry point
│   ├── supabase/migrations/    # Database schema, functions, and RLS
│   └── tests/                  # Backend unit and route tests
├── scripts/                    # Local startup scripts
├── COMMANDS.md                 # Copy-paste development commands
└── README.md
```

## Frontend routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Landing page and product explanation |
| `/auth` | Public only | Signup and login |
| `/reset-password` | Public | Password reset flow |
| `/dashboard` | Authenticated | Personal Kanban board |
| `/organization-board` | Authenticated | Organization/project board visibility |
| `/organization` | Authenticated | Organization settings, members, boards, invites, Slack channels |
| `/analytics` | Authenticated | Ticket analytics |
| `/profile` | Authenticated | User profile |
| `/settings` | Authenticated | Preferences and personal Slack connection |
| `/join/:token` | Authenticated | Organization invite acceptance |

## Backend route groups

Interactive docs are available at:

```text
http://127.0.0.1:8000/docs
```

### System

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/health` | API health check |
| `GET` | `/health/redis` | Redis health check |

### Tickets

Ticket routes require:

```text
Authorization: Bearer <supabase-jwt>
```

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/tickets` | List personal tickets |
| `POST` | `/api/tickets` | Create a manual personal ticket |
| `PATCH` | `/api/tickets/{ticket_id}` | Update ticket details |
| `PATCH` | `/api/tickets/{ticket_id}/status` | Update ticket status |
| `DELETE` | `/api/tickets/{ticket_id}` | Delete ticket |

### Organization tickets

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/tickets/organizations/{organization_id}` | List visible organization tickets |
| `POST` | `/api/tickets/organizations/{organization_id}` | Create organization ticket |
| `PATCH` | `/api/tickets/organizations/{organization_id}/{ticket_id}` | Update organization ticket |
| `DELETE` | `/api/tickets/organizations/{organization_id}/{ticket_id}` | Delete organization ticket |

### Organizations

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/organizations` | List organizations for the current user |
| `POST` | `/api/organizations` | Create organization |
| `GET` | `/api/organizations/{organization_id}` | Get organization |
| `POST` | `/api/organizations/{organization_id}/leave` | Leave organization |
| `DELETE` | `/api/organizations/{organization_id}` | Delete organization |
| `GET` | `/api/organizations/{organization_id}/members` | List members |
| `PATCH` | `/api/organizations/{organization_id}/members/{user_id}/role` | Change member role |
| `DELETE` | `/api/organizations/{organization_id}/members/{user_id}` | Remove member |

### Organization boards

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/organizations/{organization_id}/boards` | List project boards |
| `POST` | `/api/organizations/{organization_id}/boards` | Create project board |
| `DELETE` | `/api/organizations/{organization_id}/boards/{board_id}` | Delete project board |
| `GET` | `/api/organizations/{organization_id}/boards/{board_id}/members` | List board members |
| `POST` | `/api/organizations/{organization_id}/boards/{board_id}/members` | Add board member |
| `PATCH` | `/api/organizations/{organization_id}/boards/{board_id}/members/{user_id}/role` | Change board role |
| `DELETE` | `/api/organizations/{organization_id}/boards/{board_id}/members/{user_id}` | Remove board member |
| `GET` | `/api/organizations/{organization_id}/boards/{board_id}/slack-channels` | List board Slack channels |
| `POST` | `/api/organizations/{organization_id}/boards/{board_id}/slack-channels` | Link Slack channel to board |
| `DELETE` | `/api/organizations/{organization_id}/boards/{board_id}/slack-channels/{team_id}/{channel_id}` | Unlink Slack channel |

### Invitations

Organization invitations are stored in Redis because they are temporary.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/organizations/invitations/pending` | List invitations for signed-in email |
| `POST` | `/api/organizations/invitations/{invite_id}/accept` | Accept in-app invitation |
| `POST` | `/api/organizations/invitations/{invite_id}/decline` | Decline in-app invitation |
| `POST` | `/api/organizations/{organization_id}/invites` | Create invitation |
| `GET` | `/api/organizations/{organization_id}/invites` | List organization invitations |
| `DELETE` | `/api/organizations/{organization_id}/invites/{invite_id}` | Revoke invitation |

### Slack

| Method | Route | Authentication | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/integrations/slack/connect` | Supabase JWT | Start Slack OAuth |
| `GET` | `/api/integrations/slack/callback` | OAuth state | Complete Slack OAuth |
| `GET` | `/api/integrations/slack/status` | Supabase JWT | Personal Slack connection status |
| `DELETE` | `/api/integrations/slack` | Supabase JWT | Disconnect personal Slack |
| `GET` | `/api/integrations/slack/organizations/{organization_id}/status` | Supabase JWT | Organization Slack status |
| `POST` | `/api/integrations/slack/organizations/{organization_id}/channels/refresh` | Supabase JWT | Refresh mapped Slack channel metadata and auto-join public channels |
| `POST` | `/api/webhooks/slack/events` | Slack signature | Receive Slack events |

### AI triage test route

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/webhook/triage` | Test normalized triage without a real Slack event |

Example:

```json
{
  "text": "Please fix the checkout error before tomorrow.",
  "user_name": "Aisha",
  "owner_id": "00000000-0000-0000-0000-000000000000",
  "source": "SLACK"
}
```

## Slack ticket flow

1. A user connects Slack from Settings or connects a verified Slack workspace from Organization settings.
2. OAuth state is stored temporarily in Redis.
3. Slack returns to the backend callback.
4. The backend stores encrypted Slack credentials.
5. Slack sends message events to `/api/webhooks/slack/events`.
6. FastAPI verifies the Slack signature.
7. The webhook handler ignores duplicates, bot messages, empty mentions, and unrelated messages.
8. Redis rate limiting checks whether the AI request is allowed.
9. The event ID is queued in ARQ.
10. The worker loads the event payload.
11. The worker resolves sender, mentioned users, channel, organization context, and project board mapping.
12. The AI provider returns strict task data.
13. The ticket factory creates private or organization tickets.
14. Supabase persists the tickets.
15. Supabase Realtime updates the frontend board.

## Organization ticket rules

KanbanKaii separates personal and formal organization work:

- If a member mentions another member, the result is normally a private task.
- If a manager or team lead assigns work to a member in an organization context, the result can become an organization ticket.
- If the Slack channel is linked to a project board, the ticket is attached to that project board.
- If no board-channel mapping exists, the ticket remains visible in the organization-wide board where permitted.
- Direct messages stay private.
- Private Slack channels require one manual app invite.

## Environment configuration

Copy example files and keep real secrets out of git.

### Frontend: `frontend/.env`

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

Never put service-role keys or backend secrets in `VITE_` variables.

### Backend: `backend/.env`

```env
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-key

REDIS_URL=redis://localhost:6379/0

AI_MODEL_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.1-flash-lite

OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b

SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_SIGNING_SECRET=
SLACK_REDIRECT_URI=https://your-public-api/api/integrations/slack/callback
SLACK_FRONTEND_RETURN_URL=http://localhost:5173/settings
INTEGRATION_ENCRYPTION_KEY=

SLACK_AI_RATE_LIMIT_REQUESTS=10
SLACK_AI_RATE_LIMIT_WINDOW_SECONDS=60
```

Use `AI_MODEL_PROVIDER=ollama` when running a local model and
`AI_MODEL_PROVIDER=gemini` when using Gemini.

## Local setup

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

### Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Redis

Redis is required for:

- ARQ jobs,
- Slack webhook queueing,
- OAuth state,
- organization invitations,
- AI rate limiting.

Check `COMMANDS.md` for the exact local Redis commands used in this project.

### Ollama

Only required when `AI_MODEL_PROVIDER=ollama`.

```powershell
ollama pull llama3.2:3b
```

### Local launcher

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-server.ps1 -UseNgrok
```

To run backend services without Ollama:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-server.ps1 -UseNgrok -SkipOllama
```

## Tests and checks

Backend:

```powershell
cd backend
.\venv\Scripts\python.exe -m unittest discover -s tests -v
```

Frontend:

```powershell
cd frontend
npm run typecheck
npm run lint
npm run build
```

## Deployment model

The current deployment model is intentionally simple for learning:

- Vercel hosts the React frontend.
- Supabase hosts Auth, Postgres, RLS, and Realtime.
- The backend can run locally on the developer machine.
- ngrok exposes the local FastAPI backend to Slack and Vercel.
- Redis and the ARQ worker run beside the backend.
- Gemini can replace local Ollama when the local machine should not run a model.

For Vercel:

- set `VITE_API_BASE_URL` to the public backend URL,
- set Supabase frontend environment variables,
- add the Vercel origin to backend `FRONTEND_ORIGINS`,
- configure Slack OAuth and Event Subscriptions to use the public backend URL.

If the local backend is offline, the frontend can still load, but tickets,
Slack processing, and organization APIs will not be reachable.

## PWA notes

The app includes:

- `manifest.webmanifest`
- `sw.js`
- `offline.html`
- mobile home-screen icons

After deployment over HTTPS, mobile browsers can offer install options:

- Android Chrome: browser menu -> `Install app` or `Add to Home screen`
- iOS Safari: Share -> `Add to Home Screen`

## Security and data notes

- `.env` files are ignored and should never be committed.
- Supabase service-role credentials stay on the backend.
- Supabase JWTs authenticate API requests.
- Ticket queries are scoped to the authenticated user or permitted organization context.
- Supabase RLS protects browser-side access.
- Slack webhook signatures are verified.
- OAuth state is one-time and stored in Redis with a short TTL.
- Slack tokens are encrypted before storage.
- AI requests are rate-limited per connected Slack user.
- Webhook deliveries are cleaned up by status and age.
- Temporary organization invitations are stored in Redis instead of permanent database rows.

## Status

KanbanKaii currently supports the full private-ticket flow, organization
workspace flow, Slack-to-ticket automation, project-board channel routing,
manual ticket management, realtime updates, settings/profile pages, analytics,
and mobile PWA installation metadata.
