import React from 'react'
import { CAT_COLOR, CAT_NAMES, TIER_LABEL, EDU_LABELS } from '../data/skillData'
import { prereqOf, leadsTo, nById } from '../utils/graph'

export default function NodeDetail({ node, panelOpen, addedCareers, onNodeSelect, onTraceNode, onClearPath, onOpenDashboard, onClosePanel }) {
  if (!panelOpen) return null

  if (!node) {
    return (
      <aside style={panelStyle}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', padding: 20 }}>
          Click a node on the map to view details
        </div>
        <button onClick={onClosePanel} style={closeBtn} title="Close panel">×</button>
      </aside>
    )
  }

  const col = CAT_COLOR[node.cat] || '#888'
  const catName = CAT_NAMES[node.cat] || node.cat
  const tierLabel = TIER_LABEL[node.tier] || ''
  const eduLabel = node.edu ? EDU_LABELS[node.edu] : null

  const pres = (prereqOf[node.id] || []).map(id => nById[id]).filter(Boolean)
  const leads = (leadsTo[node.id] || []).map(id => nById[id]).filter(Boolean)

  const matchedCareer = addedCareers
    ? (node.tier === 2
        ? addedCareers.find(c => c.id === node.id)
        : addedCareers.find(c => c.nodeSet && c.nodeSet.has(node.id)))
    : null

  // Breadcrumb: category > tier
  const breadcrumb = `${catName} › ${tierLabel}`

  return (
    <aside style={panelStyle}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* Close button */}
        <button onClick={onClosePanel} style={closeBtn} title="Close panel">×</button>

        {/* Header */}
        <div style={{ padding: '20px 18px 14px', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-dim)', marginBottom: 5 }}>
            {breadcrumb}
          </div>
          <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8, paddingRight: 20 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, flexShrink: 0, background: col }} />
            {node.name}
          </div>
          {/* Status pills */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <span className="pill-tag" style={{ borderColor: col + '44', color: col }}>{catName}</span>
            <span className="pill-tag">Tier {node.tier}</span>
            {eduLabel && <span className="pill-tag">{eduLabel}</span>}
            {node.level && <span className="pill-tag">{node.level.toUpperCase()}</span>}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <StatCell label="Tier" value={tierLabel} />
            <StatCell label="Hours" value={node.hrs ? node.hrs + 'h' : '—'} />
            <StatCell label="Category" value={catName} />
            <StatCell label="Level" value={eduLabel || node.level?.toUpperCase() || '—'} />
          </div>

          {/* Prerequisites */}
          {pres.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="label-caps">Prerequisites ({pres.length})</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {pres.map(p => (
                  <div key={p.id} className="prereq-item" onClick={() => onNodeSelect(p)}>
                    <div className="prereq-dot" style={{ background: CAT_COLOR[p.cat] || '#888' }} />
                    {p.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Leads to */}
          {leads.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="label-caps">Leads to ({leads.length})</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {leads.slice(0, 15).map(l => (
                  <div key={l.id} className="prereq-item" onClick={() => onNodeSelect(l)}>
                    <div className="prereq-dot" style={{ background: CAT_COLOR[l.cat] || '#888' }} />
                    {l.name}
                    {l.level && <span style={{ color: 'var(--text-dim)', fontSize: 9, marginLeft: 'auto' }}>{l.level.toUpperCase()}</span>}
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
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {matchedCareer && onOpenDashboard && (
            <button
              onClick={() => onOpenDashboard(matchedCareer)}
              style={{
                width: '100%', padding: 10, borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(58,123,255,.4)',
                background: 'linear-gradient(135deg, rgba(58,123,255,.15), rgba(124,92,255,.1))',
                color: 'var(--accent-blue)', fontSize: 12, cursor: 'pointer',
                fontFamily: 'var(--font)', fontWeight: 500
              }}
            >
              Open Path Planner
            </button>
          )}
          <button
            onClick={() => onTraceNode(node.id)}
            style={{
              width: '100%', padding: 9, borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(200,168,75,.4)', background: 'var(--gold-dim)',
              color: 'var(--gold)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)'
            }}
          >
            Trace prerequisite path
          </button>
          <button
            onClick={onClearPath}
            style={{
              width: '100%', padding: 7, borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-light)', background: 'transparent',
              color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)'
            }}
          >
            Clear path
          </button>
        </div>
      </div>
    </aside>
  )
}

function StatCell({ label, value }) {
  return (
    <div style={{
      background: 'var(--bg-hover)', borderRadius: 5, padding: 12,
      border: '1px solid var(--border-light)'
    }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-dim)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-main)' }}>{value}</div>
    </div>
  )
}

const panelStyle = {
  gridArea: 'panel',
  background: 'var(--bg-panel)',
  borderLeft: '1px solid var(--border-light)',
  display: 'flex', flexDirection: 'column', zIndex: 4, overflow: 'hidden',
  position: 'relative'
}

const closeBtn = {
  position: 'absolute', top: 10, right: 10, zIndex: 10,
  width: 24, height: 24, borderRadius: '50%',
  border: '1px solid var(--border-light)', background: 'transparent',
  color: 'var(--text-dim)', fontSize: 16, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  lineHeight: 1, fontFamily: 'var(--font)', padding: 0
}
