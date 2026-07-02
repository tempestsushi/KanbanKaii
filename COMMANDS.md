# KanbanKaii command cheat sheet

## Deployed frontend: start the complete local backend

The React frontend is already hosted by Vercel, so it does not need to run on
this computer. From the project root, this one command starts/checks Redis,
Ollama, FastAPI, the ARQ worker, and ngrok:

```powershell
cd D:\kanbanticket
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-server.ps1 -UseNgrok
```

Keep the opened FastAPI, ARQ, and ngrok windows running while the deployed app
needs backend access.

## Stop the complete local backend

Run this in PowerShell from any folder:

```powershell
$backend = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue; if ($backend) { Stop-Process -Id $backend.OwningProcess -Force }; Stop-Process -Name arq,ngrok -Force -ErrorAction SilentlyContinue; docker stop kanbankaii-redis; ollama stop llama3.2:3b
```

This stops FastAPI, the ARQ worker, ngrok, the Redis container, and unloads the
Ollama model. The Vercel frontend remains online, but its backend-dependent
features will be unavailable.

## Run FastAPI only

Use this only when Redis, Ollama, ARQ, and ngrok are already running or are not
needed for the endpoint being tested:

```powershell
cd D:\kanbanticket\backend
.\venv\Scripts\uvicorn.exe app.main:app --reload --host 127.0.0.1 --port 8000
```

Stop FastAPI with `Ctrl+C` in that terminal.

## 1. Start Ollama

```cmd
ollama serve
```

If Ollama is already running in the system tray, you do not need to run this command.

Confirm that the model is installed:

```cmd
ollama list
```

Download the model if it is missing:

```cmd
ollama pull llama3.2:3b
```

## 2. Start the FastAPI backend

Open a new CMD window:

```cmd
venv\Scripts\activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend Swagger UI:

```text
http://127.0.0.1:8000/docs
```

Backend health endpoint:

```text
http://127.0.0.1:8000/health
```

Redis health endpoint:

```text
http://127.0.0.1:8000/health/redis
```

## 3. Start the React frontend

Open another CMD window:

```cmd
cd frontend
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

## 4. Start ngrok from `C:\ngrok`

```cmd
cd /d C:\ngrok
ngrok.exe http 8000
```

Equivalent two-command version:

```cmd
C:
cd \ngrok
ngrok.exe http 8000
```

Keep the ngrok window open while testing Slack.

## Start the Slack queue worker

Open another CMD window. The worker processes one Ollama job at a time:

```cmd
cd backend
venv\Scripts\activate
arq app.workers.slack_worker.WorkerSettings
```

Redis and Ollama must already be running before starting the worker.

Current public ngrok base URL:

```text
https://fernlike-dollar-stinging.ngrok-free.dev
```

Slack OAuth redirect URL:

```text
https://fernlike-dollar-stinging.ngrok-free.dev/api/integrations/slack/callback
```

Slack Event Subscriptions URL:

```text
https://fernlike-dollar-stinging.ngrok-free.dev/api/webhooks/slack/events
```

If ngrok reports that the endpoint is already online, close the old ngrok terminal or stop the old ngrok process before starting it again.

## 5. Apply the latest Supabase migration

Open the following file, copy its contents, and run them in the Supabase SQL Editor:

```text
D:\kanbanticket\backend\supabase\migrations\202607010006_personal_slack_mentions.sql
```

After applying this migration, reconnect Slack from the KanbanKaii Settings page.

Also apply the delivery outcome migration:

```text
D:\kanbanticket\backend\supabase\migrations\202607010007_slack_delivery_outcomes.sql
```

Enable realtime ticket updates by applying:

```text
D:\kanbanticket\backend\supabase\migrations\202607010008_ticket_realtime.sql
```

## 6. Run backend tests

```cmd
cd /d D:\kanbanticket\backend
venv\Scripts\activate
python -m unittest discover -s tests -v
```

## 7. Check the frontend

Type checking:

```cmd
cd /d D:\kanbanticket\frontend
npm run typecheck
```

Linting:

```cmd
cd /d D:\kanbanticket\frontend
npm run lint
```

Production build:

```cmd
cd /d D:\kanbanticket\frontend
npm run build
```

## Normal startup order

1. Start Ollama.
2. Start the FastAPI backend on port `8000`.
3. Start the React frontend on port `5173`.
4. Start the ARQ Slack worker.
5. Start ngrok and forward it to port `8000`.
6. Send a Slack message mentioning the connected person in a channel containing the KanbanKaii app.
