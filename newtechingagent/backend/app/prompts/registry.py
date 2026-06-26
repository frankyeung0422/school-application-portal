from __future__ import annotations

import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]


@dataclass(frozen=True)
class AgentSpec:
    id: str
    name: str
    subject: str
    spec_file: str
    icon: str = "🎓"
    description: str = ""
    internal: bool = False


AGENT_SPECS: list[AgentSpec] = [
    AgentSpec(
        "principal",
        "校長",
        "admin",
        "agents/subjects/00-principal.md",
        "🏫",
        "Master router — detects subject and coordinates teacher agents",
        internal=True,
    ),
    AgentSpec(
        "math_teacher",
        "數學老師陳博士",
        "math",
        "agents/subjects/01-math-teacher.md",
        "📐",
        "HKDSE Mathematics (Compulsory + M1/M2), step-by-step problem solving",
    ),
    AgentSpec(
        "english_teacher",
        "英文老師Miss Wong",
        "english",
        "agents/subjects/02-english-teacher.md",
        "📖",
        "HKDSE English Language — writing, reading, listening and speaking",
    ),
    AgentSpec(
        "chinese_teacher",
        "中文老師李老師",
        "chinese",
        "agents/subjects/03-chinese-teacher.md",
        "🀄",
        "HKDSE Chinese Language — 閱讀、寫作、說話、聆聽",
    ),
    AgentSpec(
        "physics_teacher",
        "物理老師張博士",
        "physics",
        "agents/subjects/04-physics-teacher.md",
        "⚡",
        "HKDSE Physics — mechanics, waves, electricity, modern physics",
    ),
    AgentSpec(
        "chemistry_teacher",
        "化學老師林老師",
        "chemistry",
        "agents/subjects/05-chemistry-teacher.md",
        "🧪",
        "HKDSE Chemistry — organic, inorganic, redox, titration",
    ),
    AgentSpec(
        "biology_teacher",
        "生物老師吳老師",
        "biology",
        "agents/subjects/06-biology-teacher.md",
        "🧬",
        "HKDSE Biology — cells, genetics, ecology, human biology",
    ),
    AgentSpec(
        "economics_teacher",
        "經濟老師黃老師",
        "economics",
        "agents/subjects/07-economics-teacher.md",
        "📊",
        "HKDSE Economics — microeconomics, macroeconomics, supply and demand",
    ),
    AgentSpec(
        "history_teacher",
        "歷史老師鄭老師",
        "history",
        "agents/subjects/08-history-teacher.md",
        "🏛️",
        "HKDSE History — 20th century, colonialism, modern China and World Wars",
    ),
    AgentSpec(
        "ict_teacher",
        "資訊科技老師何老師",
        "ict",
        "agents/subjects/09-ict-teacher.md",
        "💻",
        "HKDSE ICT — algorithms, networks, databases, spreadsheets",
    ),
    AgentSpec(
        "advisor",
        "學務主任Miss Chan",
        "admin",
        "agents/subjects/10-advisor.md",
        "📋",
        "Study advisor — tracks progress, creates study plans, motivates students",
        internal=True,
    ),
]


def _spec_path(spec_file: str) -> Path:
    return PROJECT_ROOT / spec_file


@lru_cache(maxsize=32)
def load_system_prompt(agent_id: str) -> str:
    spec = get_agent_spec(agent_id)
    path = _spec_path(spec.spec_file)
    if not path.exists():
        raise FileNotFoundError(f"Agent spec not found: {path}")
    text = path.read_text(encoding="utf-8")
    match = re.search(r"## 1\. System Prompt\s+```\n(.*?)```", text, re.DOTALL)
    if not match:
        raise ValueError(f"No system prompt block in {path}")
    return match.group(1).strip()


def get_agent_spec(agent_id: str) -> AgentSpec:
    for spec in AGENT_SPECS:
        if spec.id == agent_id:
            return spec
    raise KeyError(f"Unknown agent: {agent_id}")


def list_agents(subject: str | None = None) -> list[AgentSpec]:
    if subject:
        return [s for s in AGENT_SPECS if s.subject == subject]
    return list(AGENT_SPECS)
