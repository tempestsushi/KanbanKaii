# AI Ticket Management API

## Local setup

Use Python 3.11 or newer, then install and run the API:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API documentation is available at `http://localhost:8000/docs` and the health check at `http://localhost:8000/health`.

Route handlers live in `app/routes`. Each route module exposes an `APIRouter`, which is exported from `app/routes/__init__.py` and registered in `app/main.py`. The local Ollama triage endpoint follows this pattern in `app/routes/triage.py`.

Copy `.env.example` to `.env` and ensure Ollama is running locally. Multiple frontend origins can be supplied as a comma-separated `FRONTEND_ORIGINS` value.

The triage endpoint is `POST /api/webhook/triage`. It returns `201` for an actionable task and `200` for ignored chatter. Run `ollama pull llama3.2:3b` before making a live request.

## Supabase setup

1. Create a Supabase project.
2. Open the SQL Editor and run `supabase/migrations/202606290001_private_ticket_schema.sql`.
3. Add the project URL and backend service-role key to `.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
```

Never expose the service-role key in the frontend. It bypasses row-level security and is reserved for verified backend webhook operations. Authenticated browser requests will later use the user's JWT so the ticket and integration RLS policies apply.
