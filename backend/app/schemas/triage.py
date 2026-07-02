from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


Priority = Literal["HIGH", "MEDIUM", "LOW"]


class IncomingMessage(BaseModel):
    """Normalized payload accepted from an external webhook adapter."""

    model_config = ConfigDict(extra="forbid", strict=True, str_strip_whitespace=True)

    text: str = Field(min_length=1, description="Message text to evaluate")
    user_name: str = Field(min_length=1, description="Display name of the message author")


class TriageRequest(IncomingMessage):
    """Temporary normalized webhook input used to test the complete flow."""

    owner_id: UUID = Field(
        strict=False,
        description="Supabase auth user who owns the ticket",
    )
    source: Literal["SLACK", "GITHUB"]


class AIAnalysisResult(BaseModel):
    """Strict structured result expected from the AI triage layer."""

    model_config = ConfigDict(extra="forbid", strict=True, str_strip_whitespace=True)

    isActionableTask: bool
    extractedTitle: str
    cleanDescription: str
    estimatedPriority: Priority


class ExtractedTask(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=5_000)
    priority: Priority


class AITaskBatchResult(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    isActionableTask: bool
    tasks: list[ExtractedTask] = Field(max_length=5)

    @model_validator(mode="after")
    def validate_task_consistency(self):
        if self.isActionableTask and not self.tasks:
            raise ValueError("Actionable analysis must contain at least one task")
        if not self.isActionableTask and self.tasks:
            raise ValueError("Non-actionable analysis cannot contain tasks")
        return self
