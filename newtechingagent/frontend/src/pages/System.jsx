const AGENTS = [
  { id: 'principal', name: '校長', subject: 'admin', icon: '🏫', role: 'Master Router', node: 'principal_router' },
  { id: 'math_teacher', name: '數學老師陳博士', subject: 'math', icon: '📐', role: 'Math Specialist', node: 'math_teacher' },
  { id: 'english_teacher', name: '英文老師Miss Wong', subject: 'english', icon: '📖', role: 'English Specialist', node: 'english_teacher' },
  { id: 'chinese_teacher', name: '中文老師李老師', subject: 'chinese', icon: '🀄', role: 'Chinese Specialist', node: 'chinese_teacher' },
  { id: 'physics_teacher', name: '物理老師張博士', subject: 'physics', icon: '⚡', role: 'Physics Specialist', node: 'physics_teacher' },
  { id: 'chemistry_teacher', name: '化學老師林老師', subject: 'chemistry', icon: '🧪', role: 'Chemistry Specialist', node: 'chemistry_teacher' },
  { id: 'biology_teacher', name: '生物老師吳老師', subject: 'biology', icon: '🧬', role: 'Biology Specialist', node: 'biology_teacher' },
  { id: 'economics_teacher', name: '經濟老師黃老師', subject: 'economics', icon: '📊', role: 'Economics Specialist', node: 'economics_teacher' },
  { id: 'history_teacher', name: '歷史老師鄭老師', subject: 'history', icon: '🏛️', role: 'History Specialist', node: 'history_teacher' },
  { id: 'ict_teacher', name: '資訊科技老師何老師', subject: 'ict', icon: '💻', role: 'ICT Specialist', node: 'ict_teacher' },
  { id: 'advisor', name: '學務主任Miss Chan', subject: 'admin', icon: '📋', role: 'Study Advisor', node: 'advisor' },
]

export default function System() {
  return (
    <div className="system-page">
      <h1>🔧 技術系統</h1>
      <p className="sub">智學坊 AI School 架構概覽 — LangGraph 多 Agent 路由系統</p>

      <div className="sys-section">
        <h2>LangGraph 流程圖</h2>
        <div className="arch-box">{`
  學生問題
      │
      ▼
 ┌──────────────┐
 │  校長路由器   │  principal_router_node
 │  (偵測科目)  │  detect_subject() → keyword matching
 └──────┬───────┘
        │ 條件路由 (Conditional Edges)
        │
   ┌────┴────────────────────────────────────┐
   │    │    │    │    │    │    │    │    │  │
   ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼  ▼
  📐   📖   🀄   ⚡   🧪   🧬   📊   🏛️   💻  📋
  數學 英文 中文 物理 化學 生物 經濟 歷史  ICT 學務
   │    │    │    │    │    │    │    │    │  │
   └────┴────┴────┴────┴────┴────┴────┴────┴──┘
                         │
                         ▼
               ┌─────────────────┐
               │  校長整合回覆    │  principal_synthesize_node
               └────────┬────────┘
                         │
                         ▼
                        END
`}</div>
      </div>

      <div className="sys-section">
        <h2>技術棧</h2>
        <div className="tech-tags">
          {[
            'Python 3.11+', 'FastAPI', 'LangGraph', 'LangChain',
            'Google Gemini 2.0 Flash', 'OpenAI GPT-4o-mini (fallback)',
            'SQLite', 'React 18', 'Vite 5', 'React Router v6',
            'uvicorn', 'pydantic v2',
          ].map(t => <span key={t} className="tech-tag">{t}</span>)}
        </div>
      </div>

      <div className="sys-section">
        <h2>API 端點</h2>
        <table className="agent-table">
          <thead>
            <tr>
              <th>方法</th>
              <th>端點</th>
              <th>說明</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['GET', '/health', '系統狀態、LLM 連接、Agent 數量'],
              ['GET', '/api/agents', '列出所有 Agent（可篩選 ?subject=math）'],
              ['GET', '/api/agents/{id}', '取得單一 Agent 資訊'],
              ['GET', '/api/agents/{id}/prompt', '查看 Agent System Prompt'],
              ['POST', '/api/agents/{id}/invoke', '直接測試單一 Agent'],
              ['POST', '/api/chat', '主要對話端點（自動路由）'],
              ['GET', '/api/session/{id}', '查看對話Session記錄'],
            ].map(([m, e, d]) => (
              <tr key={e}>
                <td><strong>{m}</strong></td>
                <td><code>{e}</code></td>
                <td>{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sys-section">
        <h2>Agent 一覽（{AGENTS.length} 個）</h2>
        <table className="agent-table">
          <thead>
            <tr>
              <th>圖示</th>
              <th>ID</th>
              <th>名稱</th>
              <th>角色</th>
              <th>Graph Node</th>
            </tr>
          </thead>
          <tbody>
            {AGENTS.map(a => (
              <tr key={a.id}>
                <td>{a.icon}</td>
                <td><code>{a.id}</code></td>
                <td>{a.name}</td>
                <td>{a.role}</td>
                <td><code>{a.node}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sys-section">
        <h2>LLM 設定優先順序</h2>
        <div className="arch-box">{`
1. GEMINI_API_KEY 存在  →  Google Gemini 2.0 Flash (langchain-google-genai)
2. OPENAI_API_KEY 存在  →  GPT-4o-mini (langchain-openai)
3. 兩者皆無             →  Rule-based fallback (預設回應)

設定方法：複製 backend/.env.example → backend/.env，填入 API Key
`}</div>
      </div>
    </div>
  )
}
