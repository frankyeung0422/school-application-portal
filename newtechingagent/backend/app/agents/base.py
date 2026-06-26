from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

from app.prompts.registry import AgentSpec, get_agent_spec, load_system_prompt
from app.services.llm import get_llm


@dataclass
class Agent:
    spec: AgentSpec
    system_prompt: str = field(init=False)

    def __post_init__(self) -> None:
        self.system_prompt = load_system_prompt(self.spec.id)

    @property
    def id(self) -> str:
        return self.spec.id

    @property
    def name(self) -> str:
        return self.spec.name

    @property
    def subject(self) -> str:
        return self.spec.subject

    def run(
        self,
        user_message: str,
        *,
        context: dict[str, Any] | None = None,
        history: list[dict[str, str]] | None = None,
        extra_instructions: str = "",
        fallback: str = "",
    ) -> str:
        llm = get_llm()
        if llm.enabled:
            result = llm.invoke(
                self.spec.id,
                user_message,
                context=context,
                history=history,
                extra_instructions=extra_instructions,
            )
            if result:
                return result
        return fallback

    def run_json(
        self,
        user_message: str,
        *,
        context: dict[str, Any] | None = None,
        schema_hint: str = "",
        fallback: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        llm = get_llm()
        if llm.enabled:
            result = llm.invoke_json(
                self.spec.id,
                user_message,
                context=context,
                schema_hint=schema_hint,
            )
            if result and "raw_response" not in result:
                return result
        return fallback or {}

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.spec.id,
            "name": self.spec.name,
            "subject": self.spec.subject,
            "icon": self.spec.icon,
            "description": self.spec.description,
            "internal": self.spec.internal,
            "system_prompt_preview": self.system_prompt[:200] + "…",
            "system_prompt_length": len(self.system_prompt),
            "llm_enabled": get_llm().enabled,
        }


class AgentRegistry:
    def __init__(self) -> None:
        self._agents: dict[str, Agent] = {}

    def get(self, agent_id: str) -> Agent:
        if agent_id not in self._agents:
            self._agents[agent_id] = Agent(get_agent_spec(agent_id))
        return self._agents[agent_id]

    def list(self, subject: str | None = None) -> list[Agent]:
        from app.prompts.registry import list_agents
        return [self.get(s.id) for s in list_agents(subject)]

    def reload(self, agent_id: str | None = None) -> None:
        load_system_prompt.cache_clear()
        if agent_id:
            self._agents.pop(agent_id, None)
        else:
            self._agents.clear()


_registry = AgentRegistry()


def get_agent(agent_id: str) -> Agent:
    return _registry.get(agent_id)


def get_registry() -> AgentRegistry:
    return _registry
