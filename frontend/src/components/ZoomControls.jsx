import React from 'react'

const zbStyle = {
  width: 28, height: 28,
  background: 'var(--bg-panel-solid)', border: '1px solid var(--border-light)',
  borderRadius: 'var(--radius-sm)', color: 'var(--text-dim)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, userSelect: 'none'
}

export default function ZoomControls({ zlblRef, onZoomIn, onZoomOut }) {
  return (
    <div style={{ position: 'absolute', bottom: 20, left: 16, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 20 }}>
      <div style={zbStyle} onClick={onZoomIn}>+</div>
      <div ref={zlblRef} className="zlbl">100%</div>
      <div style={zbStyle} onClick={onZoomOut}>−</div>
    </div>
  )
}
