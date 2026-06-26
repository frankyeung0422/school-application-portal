from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "school.db"


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                subject TEXT,
                created_at TEXT,
                messages_json TEXT
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS study_logs (
                id TEXT PRIMARY KEY,
                session_id TEXT,
                teacher_id TEXT,
                topic TEXT,
                timestamp TEXT
            )
        """)
        conn.commit()


def save_session(session_id: str, subject: str, messages: list) -> None:
    with _conn() as conn:
        existing = conn.execute(
            "SELECT session_id FROM sessions WHERE session_id = ?", (session_id,)
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE sessions SET subject = ?, messages_json = ? WHERE session_id = ?",
                (subject, json.dumps(messages, ensure_ascii=False), session_id),
            )
        else:
            conn.execute(
                "INSERT INTO sessions (session_id, subject, created_at, messages_json) VALUES (?, ?, ?, ?)",
                (session_id, subject, datetime.now(timezone.utc).isoformat(), json.dumps(messages, ensure_ascii=False)),
            )
        conn.commit()


def get_session(session_id: str) -> dict | None:
    with _conn() as conn:
        row = conn.execute(
            "SELECT * FROM sessions WHERE session_id = ?", (session_id,)
        ).fetchone()
        if not row:
            return None
        return {
            "session_id": row["session_id"],
            "subject": row["subject"],
            "created_at": row["created_at"],
            "messages": json.loads(row["messages_json"] or "[]"),
        }


def log_study(session_id: str, teacher_id: str, topic: str) -> None:
    with _conn() as conn:
        conn.execute(
            "INSERT INTO study_logs (id, session_id, teacher_id, topic, timestamp) VALUES (?, ?, ?, ?, ?)",
            (uuid.uuid4().hex, session_id, teacher_id, topic, datetime.now(timezone.utc).isoformat()),
        )
        conn.commit()
