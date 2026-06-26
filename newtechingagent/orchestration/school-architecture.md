# 智學坊 AI School — 系統架構文件

## 概覽

智學坊係一個仿照真實學校運作嘅 AI 多 Agent 輔導系統。校長負責接待學生、分析問題、路由至合適嘅科目老師；老師提供專科輔導；學務主任負責學習計劃。

## 架構圖

```
前端 (React + Vite :5274)
        │ HTTP /api/chat
        ▼
後端 (FastAPI :8088)
        │
        ▼
LangGraph StateGraph
        │
        ▼
principal_router_node
  └─ detect_subject() → keyword scoring
  └─ wants_study_advice() → advisor routing
        │
        ├─→ math_teacher_node      → 數學老師陳博士
        ├─→ english_teacher_node   → 英文老師Miss Wong
        ├─→ chinese_teacher_node   → 中文老師李老師
        ├─→ physics_teacher_node   → 物理老師張博士
        ├─→ chemistry_teacher_node → 化學老師林老師
        ├─→ biology_teacher_node   → 生物老師吳老師
        ├─→ economics_teacher_node → 經濟老師黃老師
        ├─→ history_teacher_node   → 歷史老師鄭老師
        ├─→ ict_teacher_node       → 資訊科技老師何老師
        └─→ advisor_node           → 學務主任Miss Chan
                │
                ▼
        principal_synthesize_node
                │
                ▼
              END
```

## Agent 規格

| Agent ID | 名稱 | 科目 | 節點 | 內部 |
|----------|------|------|------|------|
| principal | 校長 | admin | principal_router | ✓ |
| math_teacher | 數學老師陳博士 | math | math_teacher | - |
| english_teacher | 英文老師Miss Wong | english | english_teacher | - |
| chinese_teacher | 中文老師李老師 | chinese | chinese_teacher | - |
| physics_teacher | 物理老師張博士 | physics | physics_teacher | - |
| chemistry_teacher | 化學老師林老師 | chemistry | chemistry_teacher | - |
| biology_teacher | 生物老師吳老師 | biology | biology_teacher | - |
| economics_teacher | 經濟老師黃老師 | economics | economics_teacher | - |
| history_teacher | 歷史老師鄭老師 | history | history_teacher | - |
| ict_teacher | 資訊科技老師何老師 | ict | ict_teacher | - |
| advisor | 學務主任Miss Chan | admin | advisor | ✓ |

## State 設計

```python
class SchoolState(TypedDict):
    session_id: str               # 對話 Session ID
    student_message: str          # 學生最新訊息
    detected_subject: str         # 偵測到的科目
    current_teacher: str          # 當前回覆老師
    conversation_history: list    # 對話歷史（最近20條）
    learning_context: dict        # 學習上下文（已學主題、弱項）
    practice_mode: bool           # 練習模式
    final_response: str           # 最終回覆
    active_agents: list[str]      # 活躍的 Agent 名稱
    route: str                    # 路由目標
    progress_stage: str           # 進度（new/routing/teaching/done）
    quiz_data: dict               # 測驗資料
    case_log: list[dict]          # 操作記錄
```

## LLM 支援

優先順序：
1. Google Gemini 2.0 Flash (`GEMINI_API_KEY`)
2. OpenAI GPT-4o-mini (`OPENAI_API_KEY`)
3. Rule-based fallback（無需 API Key）

## 科目偵測算法

`detect_subject()` 使用關鍵詞評分：
- 每個科目有對應嘅關鍵詞列表（中英混合）
- 計算每個科目嘅關鍵詞匹配數量
- 返回最高分數嘅科目
- 若無匹配：返回 "general"

## 目錄結構

```
newtechingagent/
├── backend/
│   ├── app/
│   │   ├── agents/base.py        # Agent dataclass + Registry
│   │   ├── graph/school_graph.py # LangGraph StateGraph
│   │   ├── nodes/teachers.py     # 所有 node 函數
│   │   ├── prompts/registry.py   # AGENT_SPECS + load_system_prompt()
│   │   ├── services/
│   │   │   ├── llm.py            # Gemini/OpenAI LLM wrapper
│   │   │   └── detectors.py      # detect_subject()
│   │   ├── state.py              # SchoolState TypedDict
│   │   ├── db.py                 # SQLite sessions
│   │   └── main.py               # FastAPI routes
│   ├── run.py                    # uvicorn launcher
│   └── requirements.txt
├── agents/subjects/              # Agent system prompt .md files
├── frontend/                     # React + Vite
└── orchestration/                # 架構文件
```
