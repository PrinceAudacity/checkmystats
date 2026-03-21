import React from 'react'

export default function Spinner({ label }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-canvas)', zIndex: 200, gap: 14
    }}>
      <svg width="40" height="40" viewBox="0 0 40 40" style={{ animation: 'cms-spin 0.9s linear infinite' }}>
        <style>{`
          @keyframes cms-spin { to { transform: rotate(360deg); } }
          @keyframes cms-dash {
            0%   { stroke-dashoffset: 100; }
            50%  { stroke-dashoffset: 25; }
            100% { stroke-dashoffset: 100; }
          }
        `}</style>
        <circle
          cx="20" cy="20" r="16"
          fill="none"
          stroke="var(--accent-blue)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="100"
          style={{ animation: 'cms-dash 1.5s ease-in-out infinite', transformOrigin: 'center' }}
        />
      </svg>
      {label && (
        <span style={{ color: 'var(--text-dim)', fontSize: 12, fontFamily: 'var(--font)' }}>
          {label}
        </span>
      )}
    </div>
  )
}
