import React from 'react'
import { CAT_COLOR, CAT_NAMES, TIER_LABEL, EDU_LABELS } from '../data/skillData'
import { prereqOf, leadsTo, nById } from '../utils/graph'

export default function NodeDetail({ node, onNodeSelect, onTraceNode, onClearPath }) {
  if (!node) {
    return (
      <aside style={panelStyle}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', padding: 20 }}>
          Click a node on the map to view details
        </div>
      </aside>
    )
  }

  const col = CAT_COLOR[node.cat] || '#888'
  const tierLabel = [TIER_LABEL[node.tier], node.edu ? EDU_LABELS[node.edu] : null, node.level ? node.level.toUpperCase() : null].filter(Boolean).join(' · ')
  const tags = [
    { label: CAT_NAMES[node.cat] || node.cat, style: { borderColor: col + '44', color: col } },
    node.hrs && { label: node.hrs + 'h' },
    node.edu && { label: EDU_LABELS[node.edu] },
    node.level && { label: node.level.toUpperCase() },
    { label: 'Tier ' + node.tier },
  ].filter(Boolean)

  const pres = (prereqOf[node.id] || []).map(id => nById[id]).filter(Boolean)
  const leads = (leadsTo[node.id] || []).map(id => nById[id]).filter(Boolean)

  return (
    <aside style={panelStyle}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 18px 14px', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-dim)', marginBottom: 6 }}>
            {tierLabel}
          </div>
          <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, flexShrink: 0, background: col }} />
            {node.name}
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {tags.map((t, i) => (
              <span key={i} className="pill-tag" style={t.style || {}}>{t.label}</span>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {pres.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="label-caps">Prerequisites ({pres.length})</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {pres.map(p => (
                  <div key={p.id} className="prereq-item" onClick={() => onNodeSelect(p)}>
                    <div className="prereq-dot" style={{ background: CAT_COLOR[p.cat] || '#888' }} />
                    {p.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {leads.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="label-caps">Leads to ({leads.length})</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {leads.slice(0, 15).map(l => (
                  <div key={l.id} className="prereq-item" onClick={() => onNodeSelect(l)}>
                    <div className="prereq-dot" style={{ background: CAT_COLOR[l.cat] || '#888' }} />
                    {l.name}
                    {l.level && <span style={{ color: 'var(--text-dim)', fontSize: 9 }}>{l.level.toUpperCase()}</span>}
                  </div>
                ))}
                {leads.length > 15 && (
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>+{leads.length - 15} more</div>
                )}
              </div>
            </div>
          )}

          {pres.length === 0 && leads.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-dark)', padding: '8px 0' }}>No connections.</p>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border-light)' }}>
          <button
            onClick={() => onTraceNode(node.id)}
            style={{
              width: '100%', padding: 10, borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(200,168,75,.4)', background: 'var(--gold-dim)',
              color: 'var(--gold)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)'
            }}
          >
            Trace prerequisite path
          </button>
          <button
            onClick={onClearPath}
            style={{
              width: '100%', padding: 8, borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-light)', background: 'transparent',
              color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)', marginTop: 6
            }}
          >
            Clear path
          </button>
        </div>
      </div>
    </aside>
  )
}

const panelStyle = {
  gridArea: 'panel',
  background: 'var(--bg-panel)',
  borderLeft: '1px solid var(--border-light)',
  display: 'flex', flexDirection: 'column', zIndex: 4, overflow: 'hidden'
}
