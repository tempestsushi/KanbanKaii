import os

from dotenv import load_dotenv


load_dotenv()


DEFAULT_FRONTEND_ORIGINS = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
)


def get_frontend_origins() -> list[str]:
    """Return allowed frontend origins from a comma-separated environment value."""
    configured_origins = os.environ.get("FRONTEND_ORIGINS", "")
    if not configured_origins.strip():
        return list(DEFAULT_FRONTEND_ORIGINS)

    return [
        origin.strip().rstrip("/")
        for origin in configured_origins.split(",")
        if origin.strip()
    ]


def get_ollama_host() -> str:
    return os.environ.get("OLLAMA_HOST", "http://localhost:11434").rstrip("/")


def get_ollama_model() -> str:
    return os.environ.get("OLLAMA_MODEL", "llama3.2:3b")


def get_ai_model_provider() -> str:
    return os.environ.get("AI_MODEL_PROVIDER", "ollama").strip().lower()


def get_gemini_api_key() -> str:
    return os.environ.get("GEMINI_API_KEY", "").strip()


def get_gemini_model() -> str:
    return os.environ.get("GEMINI_MODEL", "gemini-3.1-flash-lite").strip()


def get_supabase_url() -> str:
    return os.environ.get("SUPABASE_URL", "")


def get_supabase_service_role_key() -> str:
    return os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def get_redis_url() -> str:
    return os.environ.get("REDIS_URL", "").strip()
