import React from 'react'

const rows = [
  { dot: { width: 5, height: 5, borderRadius: '50%', background: '#8899bb' }, label: 'Foundation' },
  { dot: { width: 8, height: 8, borderRadius: '50%', background: '#6688dd' }, label: 'Advanced' },
  { dot: { width: 11, height: 11, borderRadius: '50%', background: '#aa66ee' }, label: 'Specialization' },
  { dot: { width: 9, height: 9, borderRadius: 2, background: '#c8a84b', transform: 'rotate(45deg)' }, label: 'Career / Cert' },
]

export default function Legend() {
  return (
    <div style={{
      position: 'absolute', bottom: 20, right: 16,
      background: 'var(--bg-panel-solid)', border: '1px solid var(--border-light)',
      borderRadius: 'var(--radius-sm)', padding: '10px 12px', zIndex: 20, fontSize: 11
    }}>
      {rows.map(({ dot, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: label === 'Career / Cert' ? 0 : 5 }}>
          <div style={{ width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={dot} />
          </div>
          <span style={{ color: 'var(--text-dark)' }}>{label}</span>
        </div>
      ))}
    </div>
  )
}
