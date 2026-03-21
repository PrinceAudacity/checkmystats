import React, { useEffect } from 'react'

export default function AddCareerModal({ open, addedCareers, nodes, prereqOf, catColorMap, catNameMap, onAdd, onClose }) {
  useEffect(() => {
    function handler(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!open) return null

  const specializations = nodes.filter(n => n.tier === 2)

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <h3>Add Career Path</h3>
        <p>Choose a specialization to track. Its full prerequisite constellation will be generated.</p>
        <div className="modal-list">
          {specializations.map(n => {
            const added = addedCareers.find(c => c.id === n.id)
            return (
              <div
                key={n.id}
                className={`modal-career-item${added ? ' disabled' : ''}`}
                onClick={added ? undefined : () => onAdd(n.id)}
              >
                <div className="mci-dot" style={{ background: catColorMap[n.subject_category] }} />
                <div className="mci-info">
                  <div className="mci-name">{n.display_name}</div>
                  <div className="mci-meta">
                    {catNameMap[n.subject_category]} · {(prereqOf[n.id] || []).length} prereqs{added ? ' · Added' : ''}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <button
          onClick={onClose}
          style={{
            width: '100%', background: 'transparent', border: '1px solid var(--border-light)',
            color: 'var(--text-dim)', padding: 9, borderRadius: 'var(--radius-sm)',
            fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
