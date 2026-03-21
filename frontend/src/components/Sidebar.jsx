import React, { useState, useRef, useEffect } from 'react'
import { TIER_LABEL } from '../utils/constants'

const CATS = 'MATH SCI CS ENG ME EE CE CHE AERO BME ENVE IE MAT NUKE ROB CRED'.split(' ')

function hlQ(text, q) {
  const i = text.toLowerCase().indexOf(q)
  if (i < 0) return text
  return (
    <>
      {text.slice(0, i)}
      <strong style={{ color: 'var(--text-main)' }}>{text.slice(i, i + q.length)}</strong>
      {text.slice(i + q.length)}
    </>
  )
}

export default function Sidebar({
  sidebarMode, activeCatFilter, activeCareer, addedCareers,
  nodes, catColorMap, catNameMap,
  onSwitchMode, onFilterCat, onSelectCareer, onRemoveCareer, onBackToFullMap,
  onNodeSelect
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [ddOpen, setDdOpen] = useState(false)
  const [selIdx, setSelIdx] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!query.trim()) { setResults([]); setDdOpen(false); return }
    const q = query.trim().toLowerCase()
    const m = nodes.filter(n => n.display_name.toLowerCase().includes(q)).slice(0, 10)
    setResults(m)
    setSelIdx(0)
    setDdOpen(m.length > 0 || true)
  }, [query, nodes])

  function pickResult(node) {
    setQuery('')
    setDdOpen(false)
    onNodeSelect(node)
  }

  function handleKeyDown(e) {
    if (!ddOpen) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelIdx(i => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && results[selIdx]) pickResult(results[selIdx])
    else if (e.key === 'Escape') setDdOpen(false)
  }

  return (
    <aside style={{
      gridArea: 'sidebar',
      background: 'var(--bg-panel)',
      borderRight: '1px solid var(--border-light)',
      display: 'flex', flexDirection: 'column', zIndex: 4, overflow: 'hidden'
    }}>
      {/* Header area */}
      <div style={{ padding: '12px 12px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Search */}
        <div
          style={{
            background: 'rgba(255,255,255,.03)', border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-sm)', padding: '8px 10px',
            display: 'flex', alignItems: 'center', gap: 8, position: 'relative'
          }}
          onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDdOpen(false) }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search skills…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => query && setDdOpen(true)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: 13, width: '100%', outline: 'none' }}
          />
          <div className={`search-dropdown${ddOpen && query ? ' visible' : ''}`}>
            {results.length === 0 && query
              ? <div className="search-no-results">No skills found</div>
              : results.map((n, i) => (
                <div
                  key={n.id}
                  className={`search-result-item${i === selIdx ? ' hi' : ''}`}
                  onMouseDown={e => { e.preventDefault(); pickResult(n) }}
                >
                  <div className="search-result-name">{hlQ(n.display_name, query.trim().toLowerCase())}</div>
                  <div className="search-result-meta">
                    <span>{catNameMap[n.subject_category] || ''}</span>
                    <span>{TIER_LABEL[n.tier]}</span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
          {['map', 'careers'].map(m => (
            <div
              key={m}
              onClick={() => onSwitchMode(m)}
              style={{
                flex: 1, padding: '11px 0', textAlign: 'center', fontSize: 11,
                fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em',
                color: sidebarMode === m ? 'var(--accent-blue)' : 'var(--text-dim)',
                cursor: 'pointer',
                borderBottom: sidebarMode === m ? '2px solid var(--accent-blue)' : '2px solid transparent',
                transition: 'color .2s, border-color .2s'
              }}
            >
              {m === 'map' ? 'Full Map' : 'Careers'}
            </div>
          ))}
        </div>
      </div>

      {/* List section */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {sidebarMode === 'map' ? (
          <>
            <div
              className={`list-item${!activeCatFilter ? ' active' : ''}`}
              onClick={() => onFilterCat(null)}
            >
              <div className="cat-dot" style={{ background: 'linear-gradient(135deg,var(--accent-blue),var(--accent-violet))' }} />
              <span className="li-name">All Skills</span>
              <span className="li-count">{nodes.length}</span>
            </div>
            <div className="list-group-label">Categories</div>
            {CATS.map(cat => (
              <div
                key={cat}
                className={`list-item${activeCatFilter === cat ? ' active' : ''}`}
                onClick={() => onFilterCat(cat)}
              >
                <div className="cat-dot" style={{ background: catColorMap[cat] }} />
                <span className="li-name">{catNameMap[cat]}</span>
                <span className="li-count">{nodes.filter(n => n.subject_category === cat).length}</span>
              </div>
            ))}
          </>
        ) : (
          <>
            <div
              className={`list-item${!activeCareer ? ' active' : ''}`}
              onClick={onBackToFullMap}
            >
              <div className="cat-dot" style={{ background: 'linear-gradient(135deg,var(--accent-blue),var(--accent-violet))' }} />
              <span className="li-name">Full Map</span>
              <span className="li-count">{nodes.length}</span>
            </div>
            {addedCareers.length > 0 ? (
              <>
                <div className="list-group-label">Your Career Paths</div>
                {addedCareers.map(c => (
                  <div
                    key={c.id}
                    className={`list-item${activeCareer === c.id ? ' active' : ''}`}
                    onClick={() => onSelectCareer(c.id)}
                  >
                    <div className="cat-dot" style={{ background: catColorMap[c.cat] }} />
                    <span className="li-name">{c.name}</span>
                    <span className="li-count">{c.nodeSet.size}</span>
                    <span
                      className="li-remove"
                      onClick={e => { e.stopPropagation(); onRemoveCareer(c.id) }}
                      title="Remove"
                    >×</span>
                  </div>
                ))}
              </>
            ) : (
              <div style={{ padding: '24px 12px', color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', lineHeight: 1.7 }}>
                No career paths added yet.<br />
                Click the <strong style={{ color: 'var(--text-dark)' }}>⊕</strong> button to add one.
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  )
}
