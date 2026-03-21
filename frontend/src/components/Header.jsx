import React, { useState, useRef, useEffect } from 'react'
import { supabase } from '../services/supabase'

export default function Header({ breadcrumb, onResetView, onClearPath, session }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  function handleSignOut() {
    setMenuOpen(false)
    if (supabase) supabase.auth.signOut().catch(() => {})
  }

  const email = session?.user?.email ?? ''
  const initial = email ? email[0].toUpperCase() : ''

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

        {session?.user && (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              style={avatarStyle}
              title={email}
            >
              {initial}
            </button>

            {menuOpen && (
              <div style={dropdownStyle}>
                <div style={emailRowStyle}>{email}</div>
                <button onClick={handleSignOut} style={signOutStyle}>
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

const hdrBtnStyle = {
  padding: '5px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)',
  background: 'transparent', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer',
  fontFamily: 'var(--font)'
}

const avatarStyle = {
  width: 28, height: 28, borderRadius: '50%',
  background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-violet))',
  border: 'none', color: '#fff', fontSize: 11, fontWeight: 600,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'var(--font)', flexShrink: 0
}

const dropdownStyle = {
  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
  background: 'var(--bg-panel-solid)', border: '1px solid var(--border-light)',
  borderRadius: 'var(--radius-sm)', minWidth: 180, zIndex: 300,
  boxShadow: '0 4px 16px rgba(0,0,0,0.4)', overflow: 'hidden'
}

const emailRowStyle = {
  padding: '8px 12px', fontSize: 11, color: 'var(--text-dim)',
  maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  borderBottom: '1px solid var(--border-light)'
}

const signOutStyle = {
  display: 'block', width: '100%', padding: '8px 12px',
  background: 'transparent', border: 'none', color: 'var(--text-dim)',
  fontSize: 11, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)'
}
