import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import { supabase } from '../services/supabase'

export default function Header({ breadcrumb, onResetView, onClearPath, onToggleTheme, theme }) {
  const { session } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const user = session?.user
  const fullName = user?.user_metadata?.full_name || ''
  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email ? user.email[0].toUpperCase() : '?'

  async function handleSignOut() {
    if (supabase) await supabase.auth.signOut()
    navigate('/signin')
  }

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
        <button onClick={onToggleTheme} style={themeToggleStyle} title="Toggle theme">
          {theme === 'dark'
            ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/></svg>
            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          }
        </button>

        {/* Account icon */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              border: '1px solid var(--border-light)',
              background: menuOpen ? 'var(--accent-blue-dim)' : 'var(--bg-hover)',
              color: 'var(--text-main)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, fontFamily: 'var(--font)',
              letterSpacing: '.5px'
            }}
            title="Account"
          >
            {initials}
          </button>

          {menuOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              background: 'var(--bg-panel-solid)', border: '1px solid var(--border-light)',
              borderRadius: 8, minWidth: 200, zIndex: 500,
              boxShadow: '0 8px 24px rgba(0,0,0,.5)', overflow: 'hidden'
            }}>
              {user && (
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-main)' }}>
                    {fullName || 'User'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                    {user.email}
                  </div>
                </div>
              )}
              <button
                onClick={handleSignOut}
                style={{
                  width: '100%', padding: '10px 14px', background: 'transparent',
                  border: 'none', color: 'var(--text-dark)', fontSize: 12,
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)',
                  display: 'flex', alignItems: 'center', gap: 8
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
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
