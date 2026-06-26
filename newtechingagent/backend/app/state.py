from __future__ import annotations

from typing import Any, TypedDict


class SchoolState(TypedDict, total=False):
    session_id: str
    student_message: str
    detected_subject: str
    current_teacher: str
    conversation_history: list[dict[str, str]]
    learning_context: dict[str, Any]
    practice_mode: bool
    final_response: str
    active_agents: list[str]
    route: str
    progress_stage: str
    quiz_data: dict[str, Any]
    case_log: list[dict[str, Any]]
