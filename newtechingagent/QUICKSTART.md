# 智學坊 AI School — 快速啟動

## 一鍵啟動

```powershell
cd C:\Projects\newtechingagent
.\start.ps1
```

網站: http://localhost:5274  
API:  http://localhost:8088  
Docs: http://localhost:8088/docs

---

## 手動啟動

### 1. Backend (FastAPI + LangGraph)

```powershell
cd C:\Projects\newtechingagent\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python run.py
```

### 2. Frontend (React + Vite)

```powershell
cd C:\Projects\newtechingagent\frontend
npm install
npm run dev
```

---

## 設定 API Key

複製並編輯 `.env`：

```powershell
Copy-Item backend\.env.example backend\.env
notepad backend\.env
```

填入（Gemini 優先，OpenAI 次之）：
```
GEMINI_API_KEY=your-gemini-key
# 或
OPENAI_API_KEY=sk-your-openai-key
```

無 API Key 時，系統自動使用規則引擎 Fallback 回覆。

---

## 測試 API

### 健康檢查
```powershell
curl http://localhost:8088/health
```

### 查看所有老師
```powershell
curl http://localhost:8088/api/agents
```

### 直接測試數學老師
```powershell
curl -X POST http://localhost:8088/api/agents/math_teacher/invoke `
  -H "Content-Type: application/json" `
  -d '{"message":"幫我解 2x+5=13"}'
```

### 主對話端點
```powershell
curl -X POST http://localhost:8088/api/chat `
  -H "Content-Type: application/json" `
  -d '{"session_id":"test-1","message":"光合作用係咩？"}'
```

---

## 專案結構

```
newtechingagent/
├── backend/              # FastAPI + LangGraph
│   ├── app/
│   │   ├── agents/       # Agent base class + registry
│   │   ├── graph/        # LangGraph StateGraph
│   │   ├── nodes/        # Teacher node functions
│   │   ├── prompts/      # AGENT_SPECS + system prompt loader
│   │   ├── services/     # LLM (Gemini/OpenAI) + detectors
│   │   ├── state.py      # SchoolState TypedDict
│   │   ├── db.py         # SQLite sessions
│   │   └── main.py       # FastAPI routes
│   ├── run.py
│   └── requirements.txt
├── agents/subjects/      # 11 個 Agent .md 規格文件
├── frontend/             # React + Vite
│   └── src/pages/        # Landing, Study, Teachers, System
├── orchestration/        # 架構文件
├── start.ps1             # 一鍵啟動腳本
└── QUICKSTART.md
```

---

## Agent API

| 端點 | 說明 |
|------|------|
| `GET /api/agents` | 列出全部 11 位 Agent |
| `GET /api/agents/{id}/prompt` | 查看 System Prompt |
| `POST /api/agents/{id}/invoke` | 直接測試單一 Agent |
| `POST /api/chat` | 主對話（自動路由） |

## 科目偵測關鍵詞

系統會自動從你的問題偵測科目：

- **數學**: 方程、積分、algebra、sin、cos、matrix...
- **英文**: grammar、essay、tense、composition...
- **中文**: 作文、文言文、成語、閱讀理解...
- **物理**: 力學、force、電路、Newton...
- **化學**: 化學、acid、有機、氧化...
- **生物**: 細胞、DNA、genetics、光合作用...
- **經濟**: 供求、GDP、elasticity、market...
- **歷史**: 歷史、war、revolution、WWII...
- **ICT**: algorithm、database、programming...
