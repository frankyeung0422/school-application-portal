import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Study from './pages/Study.jsx'
import Teachers from './pages/Teachers.jsx'
import System from './pages/System.jsx'

function Nav() {
  const loc = useLocation()
  const links = [
    { to: '/', label: '首頁' },
    { to: '/teachers', label: '師資團隊' },
    { to: '/study', label: '開始學習' },
    { to: '/system', label: '技術系統' },
  ]
  return (
    <nav className="nav">
      <div className="nav-brand">
        <span className="nav-logo">🏫</span>
        <span>智學坊 AI School</span>
      </div>
      <div className="nav-links">
        {links.map(l => (
          <Link key={l.to} to={l.to} className={loc.pathname === l.to ? 'active' : ''}>
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/teachers" element={<Teachers />} />
        <Route path="/study" element={<Study />} />
        <Route path="/system" element={<System />} />
      </Routes>
    </BrowserRouter>
  )
}
