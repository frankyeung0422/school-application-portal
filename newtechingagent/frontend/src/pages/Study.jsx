import { useState, useRef, useEffect } from 'react'

const SUBJECT_META = {
  math: { icon: '📐', label: '數學', teacher: '數學老師陳博士' },
  english: { icon: '📖', label: 'English', teacher: '英文老師Miss Wong' },
  chinese: { icon: '🀄', label: '中文', teacher: '中文老師李老師' },
  physics: { icon: '⚡', label: '物理', teacher: '物理老師張博士' },
  chemistry: { icon: '🧪', label: '化學', teacher: '化學老師林老師' },
  biology: { icon: '🧬', label: '生物', teacher: '生物老師吳老師' },
  economics: { icon: '📊', label: '經濟', teacher: '經濟老師黃老師' },
  history: { icon: '🏛️', label: '歷史', teacher: '歷史老師鄭老師' },
  ict: { icon: '💻', label: 'ICT', teacher: '資訊科技老師何老師' },
  general: { icon: '🏫', label: '一般', teacher: '校長' },
  advisor: { icon: '📋', label: '學習', teacher: '學務主任Miss Chan' },
}

const STEPS = [
  { key: 'new', label: '等待提問' },
  { key: 'routing', label: '校長分析路由' },
  { key: 'teaching', label: '老師回答中' },
  { key: 'done', label: '回答完成' },
]

const SESSION_ID = `student-${Math.random().toString(36).slice(2, 9)}`

export default function Study() {
  const [messages, setMessages] = useState([
    {
      role: 'teacher',
      teacher: '校長',
      text: '你好！歡迎來到智學坊 AI School！\n\n我係校長，我哋有以下 HKDSE 科目 AI 老師：\n\n📐 數學 · 📖 英文 · 🀄 中文\n⚡ 物理 · 🧪 化學 · 🧬 生物\n📊 經濟 · 🏛️ 歷史 · 💻 資訊科技\n\n直接問你的問題，我會幫你安排最合適的老師！',
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState('new')
  const [subject, setSubject] = useState('general')
  const [currentTeacher, setCurrentTeacher] = useState('校長')
  const [activeAgents, setActiveAgents] = useState([])
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setMessages(prev => [...prev, { role: 'user', text }])
    setInput('')
    setLoading(true)
    setStage('routing')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: SESSION_ID, message: text }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'teacher',
        teacher: data.current_teacher || '老師',
        text: data.reply,
      }])
      if (data.progress_stage) setStage(data.progress_stage)
      if (data.detected_subject) setSubject(data.detected_subject)
      if (data.current_teacher) setCurrentTeacher(data.current_teacher)
      if (data.active_agents) setActiveAgents(data.active_agents)
    } catch {
      setMessages(prev => [...prev, {
        role: 'teacher',
        teacher: '系統',
        text: '⚠️ 連接唔到後端，請稍後再試。',
      }])
      setStage('new')
    } finally {
      setLoading(false)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const meta = SUBJECT_META[subject] || SUBJECT_META.general
  const stageIndex = STEPS.findIndex(s => s.key === stage)

  return (
    <div className="study-layout">
      <div className="teacher-panel">
        <div>
          <h3 style={{ marginBottom: '0.8rem' }}>當前老師</h3>
          <div className={`teacher-avatar ${stage === 'teaching' || stage === 'done' ? 'active' : ''}`}>
            <div className="t-icon">{meta.icon}</div>
            <div className="t-name">{currentTeacher}</div>
            <div className="t-subject">{meta.label}</div>
          </div>
        </div>

        <div>
          <h3 style={{ marginBottom: '0.8rem' }}>學習進度</h3>
          <div className="progress-steps">
            {STEPS.map((s, i) => {
              const isDone = i < stageIndex
              const isActive = i === stageIndex
              return (
                <div key={s.key} className="progress-step">
                  <div className={`step-dot ${isDone ? 'done' : isActive ? 'active' : ''}`} />
                  <span className={`step-label ${isDone ? 'done' : isActive ? 'active' : ''}`}>{s.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {activeAgents.length > 0 && (
          <div className="active-agents-panel">
            <h3 style={{ marginBottom: '0.5rem' }}>活躍老師</h3>
            {activeAgents.map(a => (
              <div key={a} className="agent-tag">▸ {a}</div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 'auto', fontSize: '0.72rem', opacity: 0.5, lineHeight: 1.5 }}>
          Session: {SESSION_ID}
        </div>
      </div>

      <div className="chat-main">
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role === 'user' ? 'user' : 'teacher'}`}>
              <div className="msg-label">
                {m.role === 'user' ? '學生' : m.teacher || '老師'}
              </div>
              <div className="msg-bubble">{m.text}</div>
            </div>
          ))}
          {loading && (
            <div className="msg teacher">
              <div className="msg-label">{currentTeacher}</div>
              <div className="msg-bubble" style={{ padding: 0, background: 'var(--surface)', border: '1.5px solid var(--border)' }}>
                <div className="typing-dots"><span /><span /><span /></div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="chat-input-area">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="輸入你的問題，例如：幫我解 2x+5=13 / Explain past tense / 光合作用點解釋"
            rows={2}
          />
          <button className="send-btn" onClick={send} disabled={loading || !input.trim()}>
            {loading ? '...' : '發送'}
          </button>
        </div>
      </div>
    </div>
  )
}
