import re

from app.schemas.triage import AIAnalysisResult


STATUS_ONLY_PATTERNS = (
    re.compile(r"^\s*when\s+(?:can|could|will|would|is|are|do|does)\b.*\?\s*$", re.I),
    re.compile(r"^\s*(?:what(?:'s| is) the status|any updates?|do you know when)\b.*\?*\s*$", re.I),
)


def deterministic_non_actionable(text: str) -> AIAnalysisResult | None:
    """Reject status/timeline-only questions before a small model can reinterpret them."""
    if any(pattern.match(text) for pattern in STATUS_ONLY_PATTERNS):
        return AIAnalysisResult(
            isActionableTask=False,
            extractedTitle="",
            cleanDescription="",
            estimatedPriority="MEDIUM",
        )
    return None
