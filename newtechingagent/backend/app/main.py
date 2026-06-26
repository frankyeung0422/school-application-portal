from __future__ import annotations

import os
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.agents.base import get_agent, get_registry
from app.db import get_session, init_db, log_study, save_session
from app.graph.school_graph import build_school_graph
from app.prompts.registry import load_system_prompt

load_dotenv()

app = FastAPI(title="智學坊 AI School API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

school_graph = build_school_graph()
SESSIONS: dict[str, dict[str, Any]] = {}

init_db()


class ChatRequest(BaseModel):
    session_id: str = Field(default="demo-session")
    message: str


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    detected_subject: str
    current_teacher: str
    active_agents: list[str]
    progress_stage: str
    llm_enabled: bool


class AgentInvokeRequest(BaseModel):
    message: str
    context: dict = Field(default_factory=dict)
    history: list[dict[str, str]] = Field(default_factory=list)


@app.get("/health")
def health():
    from app.services.llm import get_llm
    llm = get_llm()
    return {
        "status": "ok",
        "llm_enabled": llm.enabled,
        "provider": llm.provider,
        "agent_count": len(get_registry().list()),
    }


@app.get("/api/agents")
def list_agents_api(subject: str | None = None):
    agents = get_registry().list(subject)
    return {"agents": [a.to_dict() for a in agents], "count": len(agents)}


@app.get("/api/agents/{agent_id}")
def get_agent_api(agent_id: str):
    try:
        agent = get_agent(agent_id)
        return agent.to_dict()
    except KeyError as e:
        raise HTTPException(404, str(e)) from e


@app.get("/api/agents/{agent_id}/prompt")
def get_agent_prompt(agent_id: str):
    try:
        prompt = load_system_prompt(agent_id)
        agent = get_agent(agent_id)
        return {
            "agent_id": agent_id,
            "name": agent.name,
            "subject": agent.subject,
            "system_prompt": prompt,
        }
    except (KeyError, FileNotFoundError, ValueError) as e:
        raise HTTPException(404, str(e)) from e


@app.post("/api/agents/{agent_id}/invoke")
def invoke_agent_direct(agent_id: str, req: AgentInvokeRequest):
    try:
        agent = get_agent(agent_id)
    except KeyError as e:
        raise HTTPException(404, str(e)) from e
    reply = agent.run(
        req.message,
        context=req.context,
        history=req.history,
        fallback=f"[{agent.name}] 請設置 GEMINI_API_KEY 或 OPENAI_API_KEY 以啟用 LLM 回覆。",
    )
    return {
        "agent_id": agent_id,
        "name": agent.name,
        "reply": reply,
        "llm_enabled": agent.to_dict()["llm_enabled"],
    }


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    from app.services.llm import get_llm

    existing = SESSIONS.get(req.session_id, {})
    state = {
        "session_id": req.session_id,
        "student_message": req.message,
        "detected_subject": existing.get("detected_subject", "general"),
        "current_teacher": existing.get("current_teacher", "校長"),
        "conversation_history": existing.get("conversation_history", []),
        "learning_context": existing.get("learning_context", {}),
        "practice_mode": existing.get("practice_mode", False),
        "final_response": "",
        "active_agents": [],
        "route": "",
        "progress_stage": "new",
        "quiz_data": existing.get("quiz_data", {}),
        "case_log": [],
    }

    result = school_graph.invoke(state)

    SESSIONS[req.session_id] = {
        "detected_subject": result.get("detected_subject", "general"),
        "current_teacher": result.get("current_teacher", "校長"),
        "conversation_history": result.get("conversation_history", []),
        "learning_context": result.get("learning_context", {}),
        "practice_mode": result.get("practice_mode", False),
        "quiz_data": result.get("quiz_data", {}),
        "progress_stage": result.get("progress_stage", "done"),
    }

    subject = result.get("detected_subject", "general")
    teacher = result.get("current_teacher", "校長")
    save_session(req.session_id, subject, result.get("conversation_history", []))
    if teacher and teacher != "校長":
        log_study(req.session_id, teacher, subject)

    return ChatResponse(
        session_id=req.session_id,
        reply=result.get("final_response", "你好！歡迎來到智學坊！"),
        detected_subject=subject,
        current_teacher=teacher,
        active_agents=result.get("active_agents", []),
        progress_stage=result.get("progress_stage", "done"),
        llm_enabled=get_llm().enabled,
    )


@app.get("/api/session/{session_id}")
def get_session_api(session_id: str):
    db_session = get_session(session_id)
    if db_session:
        return db_session
    return SESSIONS.get(session_id, {})


def _mount_frontend() -> None:
    from pathlib import Path
    from fastapi.responses import FileResponse
    from fastapi.staticfiles import StaticFiles

    dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
    if not dist.is_dir():
        return

    assets = dist / "assets"
    if assets.is_dir():
        app.mount("/assets", StaticFiles(directory=assets), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa_fallback(full_path: str):
        if full_path.startswith(("api/", "docs", "redoc", "openapi.json")):
            raise HTTPException(404)
        candidate = dist / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        index = dist / "index.html"
        if index.is_file():
            return FileResponse(index)
        raise HTTPException(404)


_mount_frontend()
