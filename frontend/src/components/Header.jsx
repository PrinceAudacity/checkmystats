import React from 'react'
import NavActions from './NavActions'

export default function Header({ breadcrumb, onResetView, onClearPath }) {
  return (
    <header style={{
      gridArea: 'nav',
      background: 'var(--bg-panel-solid)',
      borderBottom: '1px solid var(--border-light)',
      display: 'flex', alignItems: 'center', padding: '0 20px', zIndex: 100
    }}>
      <div style={{ fontWeight: 600, fontSize: 14, letterSpacing: '.5px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 10, height: 10, background: 'linear-gradient(135deg,var(--accent-blue),var(--accent-violet))', borderRadius: 3, boxShadow: '0 0 10px var(--accent-blue-glow)' }} />
        CheckMyStats
      </div>

      <div style={{ marginLeft: 20, paddingLeft: 20, borderLeft: '1px solid var(--border-light)', color: 'var(--text-dim)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        {breadcrumb}
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={onResetView} style={hdrBtnStyle}>Reset view</button>
        <button onClick={onClearPath} style={hdrBtnStyle}>Clear path</button>
        <NavActions />
      </div>
    </header>
  )
}

const hdrBtnStyle = {
  padding: '5px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)',
  background: 'transparent', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer',
  fontFamily: 'var(--font)'
}

const themeToggleStyle = {
  width: 32, height: 32, borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-light)',
  background: 'var(--bg-hover)', color: 'var(--text-dim)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center'
}
