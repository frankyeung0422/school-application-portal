import { Link } from 'react-router-dom'

const SUBJECTS = [
  { icon: '📐', name: '數學', en: 'Mathematics', desc: 'HKDSE Math Compulsory + M1/M2' },
  { icon: '📖', name: '英文', en: 'English Language', desc: 'Reading, Writing, Listening, Speaking' },
  { icon: '🀄', name: '中文', en: 'Chinese Language', desc: '閱讀、寫作、說話、聆聽' },
  { icon: '⚡', name: '物理', en: 'Physics', desc: 'Mechanics, Waves, Electricity, Modern Physics' },
  { icon: '🧪', name: '化學', en: 'Chemistry', desc: 'Organic, Inorganic, Redox, Titration' },
  { icon: '🧬', name: '生物', en: 'Biology', desc: 'Cells, Genetics, Ecology, Human Biology' },
  { icon: '📊', name: '經濟', en: 'Economics', desc: 'Micro, Macro, Supply & Demand' },
  { icon: '🏛️', name: '歷史', en: 'History', desc: '20th Century, China, World Wars' },
  { icon: '💻', name: '資訊科技', en: 'ICT', desc: 'Algorithms, Networks, Databases' },
]

const HOW = [
  { num: '01', title: '提問', desc: '直接輸入你的問題，或貼上題目，不需要選科目。' },
  { num: '02', title: 'AI 校長路由', desc: '校長分析問題，自動安排最合適的科目專科老師。' },
  { num: '03', title: '專科老師回覆', desc: '老師以步驟化方式解釋，附例子和練習題。' },
  { num: '04', title: '持續學習', desc: '繼續追問，老師記住對話脈絡，深化理解。' },
]

export default function Landing() {
  return (
    <div>
      <div className="hero">
        <h1>智學坊 <span>AI School</span></h1>
        <p>香港 HKDSE 專科 AI 補習平台 — 9 大科目，各有專科老師，即問即答</p>
        <Link to="/study" className="hero-cta">立即開始學習 →</Link>
      </div>

      <div className="section">
        <div className="section-title">📚 科目一覽</div>
        <div className="section-sub">涵蓋 9 大 HKDSE 核心科目，各有專科 AI 老師</div>
        <div className="subject-grid">
          {SUBJECTS.map(s => (
            <Link to="/study" key={s.name} className="subject-card">
              <div className="subject-icon">{s.icon}</div>
              <div className="subject-name">{s.icon} {s.name}</div>
              <div className="subject-desc">{s.en}</div>
              <div className="subject-desc" style={{ marginTop: '0.25rem' }}>{s.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      <div className="section" style={{ background: 'var(--surface)', maxWidth: '100%', padding: '3.5rem 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 2rem' }}>
          <div className="section-title">🤖 點樣運作？</div>
          <div className="section-sub">智能路由系統 + 11 位 AI 老師協作</div>
          <div className="how-grid">
            {HOW.map(h => (
              <div key={h.num} className="how-card">
                <div className="how-num">{h.num}</div>
                <div className="how-title">{h.title}</div>
                <div className="how-desc">{h.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section" style={{ textAlign: 'center', paddingBottom: '4rem' }}>
        <div className="section-title" style={{ marginBottom: '0.6rem' }}>準備好了嗎？</div>
        <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
          免費試用 · 即刻問問題 · 無需登記
        </p>
        <Link to="/study" className="hero-cta">開始學習</Link>
      </div>
    </div>
  )
}
