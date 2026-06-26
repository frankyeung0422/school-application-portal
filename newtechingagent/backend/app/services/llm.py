from __future__ import annotations

import json
import os
from typing import Any

_llm_instance = None


class LLMService:
    def __init__(self) -> None:
        self._client = None
        self._provider = None
        self._model = None
        self._setup()

    def _setup(self) -> None:
        gemini_key = os.getenv("GEMINI_API_KEY", "")
        openai_key = os.getenv("OPENAI_API_KEY", "")

        if gemini_key and gemini_key != "your-key-here":
            try:
                from langchain_google_genai import ChatGoogleGenerativeAI
                model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
                self._client = ChatGoogleGenerativeAI(
                    model=model,
                    google_api_key=gemini_key,
                    temperature=0.7,
                )
                self._provider = "gemini"
                self._model = model
            except Exception:
                pass

        if self._client is None and openai_key and openai_key.startswith("sk-"):
            try:
                from langchain_openai import ChatOpenAI
                model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
                self._client = ChatOpenAI(
                    model=model,
                    api_key=openai_key,
                    temperature=0.7,
                )
                self._provider = "openai"
                self._model = model
            except Exception:
                pass

    @property
    def enabled(self) -> bool:
        return self._client is not None

    @property
    def provider(self) -> str:
        return self._provider or "none"

    def invoke(
        self,
        agent_id: str,
        user_message: str,
        *,
        context: dict[str, Any] | None = None,
        history: list[dict[str, str]] | None = None,
        extra_instructions: str = "",
    ) -> str:
        if not self._client:
            return ""
        try:
            from app.prompts.registry import load_system_prompt
            system_prompt = load_system_prompt(agent_id)
            if context:
                system_prompt += f"\n\n## Context\n{json.dumps(context, ensure_ascii=False, indent=2)}"
            if extra_instructions:
                system_prompt += f"\n\n## Additional Instructions\n{extra_instructions}"

            from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
            messages = [SystemMessage(content=system_prompt)]
            for h in (history or [])[-10:]:
                if h.get("role") == "user":
                    messages.append(HumanMessage(content=h["content"]))
                elif h.get("role") == "assistant":
                    messages.append(AIMessage(content=h["content"]))
            messages.append(HumanMessage(content=user_message))

            result = self._client.invoke(messages)
            return result.content or ""
        except Exception as e:
            print(f"LLM invoke error ({agent_id}): {e}")
            return ""

    def invoke_json(
        self,
        agent_id: str,
        user_message: str,
        *,
        context: dict[str, Any] | None = None,
        schema_hint: str = "",
    ) -> dict[str, Any]:
        if not self._client:
            return {}
        try:
            from app.prompts.registry import load_system_prompt
            system_prompt = load_system_prompt(agent_id)
            if context:
                system_prompt += f"\n\n## Context\n{json.dumps(context, ensure_ascii=False, indent=2)}"
            if schema_hint:
                system_prompt += f"\n\nRespond ONLY with valid JSON matching this schema: {schema_hint}"

            from langchain_core.messages import HumanMessage, SystemMessage
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_message),
            ]
            result = self._client.invoke(messages)
            text = result.content or ""
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(text[start:end])
            return {"raw_response": text}
        except Exception as e:
            print(f"LLM invoke_json error ({agent_id}): {e}")
            return {}


def get_llm() -> LLMService:
    global _llm_instance
    if _llm_instance is None:
        _llm_instance = LLMService()
    return _llm_instance
