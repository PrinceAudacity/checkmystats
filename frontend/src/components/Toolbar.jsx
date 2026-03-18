import React from 'react'

export default function Toolbar({ sidebarMode, onSwitchToMap, onOpenAddCareer }) {
  return (
    <nav style={{
      gridArea: 'toolbar',
      background: 'var(--bg-panel-solid)',
      borderRight: '1px solid var(--border-light)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '16px 0', gap: 6, zIndex: 5
    }}>
      <ToolIcon active={sidebarMode === 'map'} onClick={onSwitchToMap} label="Skill Map">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
          <line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
      </ToolIcon>

      <ToolIcon onClick={onOpenAddCareer} label="Add Career Path">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="16"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
      </ToolIcon>

      <ToolIcon label="Resume Builder">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      </ToolIcon>
    </nav>
  )
}

function ToolIcon({ active, onClick, label, children }) {
  return (
    <div
      onClick={onClick}
      className="tool-icon"
      style={{
        width: 36, height: 36, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: active ? 'var(--accent-blue)' : 'var(--text-dim)',
        background: active ? 'var(--accent-blue-dim)' : 'transparent',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        transition: 'background .15s, color .15s'
      }}
    >
      {children}
      <span className="tool-tooltip">{label}</span>
    </div>
  )
}
