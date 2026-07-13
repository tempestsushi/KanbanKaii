from typing import Protocol

from app.schemas.triage import AIAnalysisResult, AITaskBatchResult, IncomingMessage


class AIModelConfigurationError(RuntimeError):
    """Raised when the selected AI model provider is not configured."""


class AIModelUnavailableError(RuntimeError):
    """Raised when the selected AI model provider cannot be reached."""


class AIModelServiceError(RuntimeError):
    """Raised when the selected AI model provider fails or returns invalid data."""


class AIModelService(Protocol):
    async def analyze(self, message: IncomingMessage) -> AIAnalysisResult:
        """Classify one message and return one possible ticket."""

    async def analyze_tasks(self, message: IncomingMessage) -> AITaskBatchResult:
        """Classify one message and return zero or more possible tasks."""
