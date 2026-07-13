from app.core.config import get_ai_model_provider
from app.services.ai_provider import AIModelConfigurationError, AIModelService
from app.services.gemini_service import get_gemini_service
from app.services.ollama_service import get_ollama_service


def get_ai_model_service() -> AIModelService:
    provider = get_ai_model_provider()
    if provider == "ollama":
        return get_ollama_service()
    if provider == "gemini":
        return get_gemini_service()

    raise AIModelConfigurationError(
        "AI_MODEL_PROVIDER must be one of: ollama, gemini"
    )
