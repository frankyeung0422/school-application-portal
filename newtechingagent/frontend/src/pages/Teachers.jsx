import { Link } from 'react-router-dom'

const GROUPS = [
  {
    label: '行政',
    teachers: [
      {
        id: 'principal',
        icon: '🏫',
        name: '校長',
        subject: 'admin',
        subjectLabel: '行政',
        desc: '智學坊主管，負責分析學生問題並路由至最合適嘅科目老師，協調全校 AI 老師團隊。',
        internal: true,
      },
      {
        id: 'advisor',
        icon: '📋',
        name: '學務主任Miss Chan',
        subject: 'admin',
        subjectLabel: '學務',
        desc: '制定個人化讀書計劃，追蹤學習進度，提供 DSE 備考策略，同埋心理支持。',
        internal: true,
      },
    ],
  },
  {
    label: '核心科目 (Core Subjects)',
    teachers: [
      {
        id: 'math_teacher',
        icon: '📐',
        name: '數學老師陳博士',
        subject: 'math',
        subjectLabel: '數學',
        desc: 'HKDSE 數學必修科 + M1/M2 延伸單元，步驟化解題，代數、幾何、微積分、統計全部涵蓋。',
      },
      {
        id: 'english_teacher',
        icon: '📖',
        name: '英文老師Miss Wong',
        subject: 'english',
        subjectLabel: 'English',
        desc: 'HKDSE English Language specialist — writing, reading comprehension, grammar, listening and speaking skills.',
      },
      {
        id: 'chinese_teacher',
        icon: '🀄',
        name: '中文老師李老師',
        subject: 'chinese',
        subjectLabel: '中文',
        desc: 'HKDSE 中國語文科，閱讀理解、作文技巧、文言文解析、說話表達，各卷全面輔導。',
      },
    ],
  },
  {
    label: '理科 (Sciences)',
    teachers: [
      {
        id: 'physics_teacher',
        icon: '⚡',
        name: '物理老師張博士',
        subject: 'physics',
        subjectLabel: '物理',
        desc: 'HKDSE 物理科專科，力學、波動、電磁學、光學、現代物理，以直觀圖解解釋複雜概念。',
      },
      {
        id: 'chemistry_teacher',
        icon: '🧪',
        name: '化學老師林老師',
        subject: 'chemistry',
        subjectLabel: '化學',
        desc: 'HKDSE 化學科，有機化學、無機化學、氧化還原反應、滴定計算，助你掌握化學思維。',
      },
      {
        id: 'biology_teacher',
        icon: '🧬',
        name: '生物老師吳老師',
        subject: 'biology',
        subjectLabel: '生物',
        desc: 'HKDSE 生物科，細胞生物學、遺傳學、生態學、人體生理，生動例子幫你輕鬆記憶。',
      },
    ],
  },
  {
    label: '人文科 (Humanities)',
    teachers: [
      {
        id: 'economics_teacher',
        icon: '📊',
        name: '經濟老師黃老師',
        subject: 'economics',
        subjectLabel: '經濟',
        desc: 'HKDSE 經濟科，微觀經濟、宏觀經濟、供求分析、市場結構，結合香港實例深入淺出。',
      },
      {
        id: 'history_teacher',
        icon: '🏛️',
        name: '歷史老師鄭老師',
        subject: 'history',
        subjectLabel: '歷史',
        desc: 'HKDSE 歷史科，20世紀中國史與世界史，幫你掌握因果分析同 DSE 論述答題技巧。',
      },
    ],
  },
  {
    label: '科技 (Technology)',
    teachers: [
      {
        id: 'ict_teacher',
        icon: '💻',
        name: '資訊科技老師何老師',
        subject: 'ict',
        subjectLabel: 'ICT',
        desc: 'HKDSE ICT 科，算法設計、程式設計（Python/VBA）、資料庫、網絡知識、試算表應用。',
      },
    ],
  },
]

export default function Teachers() {
  return (
    <div className="teachers-page">
      <h1>🎓 師資團隊</h1>
      <p className="sub">智學坊 AI School 共有 11 位 AI 老師，各司其職，各有專長</p>

      {GROUPS.map(group => (
        <div key={group.label}>
          <div className="group-label">{group.label}</div>
          <div className="teacher-cards">
            {group.teachers.map(t => (
              <div key={t.id} className="teacher-card">
                <div className="tc-top">
                  <div className="tc-icon">{t.icon}</div>
                  <div className="tc-info">
                    <h3>
                      {t.name}
                      {t.internal && <span className="internal-badge">內部</span>}
                    </h3>
                    <div className="subj">{t.subjectLabel}</div>
                  </div>
                </div>
                <p className="tc-desc">{t.desc}</p>
                <Link to="/study" className="tc-btn">立即試問 →</Link>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
