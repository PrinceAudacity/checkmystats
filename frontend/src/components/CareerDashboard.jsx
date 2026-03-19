import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CAT_COLOR, CAT_NAMES, TIER_LABEL } from '../data/skillData'
import { nById, leadsTo, prereqOf, buildFullPath, layoutCareerDAG } from '../utils/graph'
import '../styles/dashboard.css'

// Build a career object from a spec node id (same logic as useAppState.addCareer)
function buildCareer(specId) {
  const n = nById[specId]
  if (!n) return null
  const { nodeSet, edgeSet } = buildFullPath(specId)
  ;(leadsTo[specId] || []).forEach(cid => {
    if (nById[cid]?.tier === 3) {
      nodeSet.add(cid)
      edgeSet.add(specId + '→' + cid)
    }
  })
  const positions = layoutCareerDAG(specId, nodeSet, edgeSet)
  return { id: specId, name: n.name, cat: n.cat, nodeSet, edgeSet, positions }
}

// ── Derive phases from nodes grouped by tier ────────────────────────────────
function buildPhases(career) {
  const byTier = { 0: [], 1: [], 2: [], 3: [] }
  for (const id of career.nodeSet) {
    const n = nById[id]
    if (n && byTier[n.tier] !== undefined) byTier[n.tier].push(id)
  }
  return [
    { id: 'p0', name: 'Phase 1 — Foundation',        color: '#5577ee', desc: 'Elementary through high school mathematics and science.',              nodes: byTier[0] },
    { id: 'p1', name: 'Phase 2 — Advanced Skills',    color: '#7799cc', desc: 'University-level technical courses in your discipline.',              nodes: byTier[1] },
    { id: 'p2', name: 'Phase 3 — Specialization',     color: '#aa66ee', desc: 'Degree-level mastery across your chosen engineering discipline.',     nodes: byTier[2] },
    { id: 'p3', name: 'Phase 4 — Career & Credentials', color: '#c8a84b', desc: 'Credentials and career outcomes this specialization unlocks.',    nodes: byTier[3] },
  ].filter(p => p.nodes.length > 0)
}

// ── Compute critical path (longest-chain through DAG) ────────────────────────
function computeCriticalPath(career) {
  const { nodeSet, edgeSet } = career
  const edges = [...edgeSet].map(e => e.split('→')).filter(([a, b]) => nodeSet.has(a) && nodeSet.has(b))
  const ids = [...nodeSet]

  // Find target: the specialization node (tier 2) — the one whose id matches career.id
  const target = career.id

  // Longest distance from any root to each node (relax repeatedly)
  const dist = {}
  ids.forEach(id => (dist[id] = 0))
  for (let i = 0; i < ids.length; i++) {
    edges.forEach(([a, b]) => { if (dist[a] + 1 > dist[b]) dist[b] = dist[a] + 1 })
  }

  // Trace back from target following highest-dist predecessors
  const path = [target]
  let cur = target
  const visited = new Set([target])
  for (let i = 0; i < ids.length; i++) {
    const preds = edges.filter(([a, b]) => b === cur && !visited.has(a)).map(([a]) => a)
    if (!preds.length) break
    const best = preds.reduce((a, b) => (dist[a] > dist[b] ? a : b))
    path.unshift(best)
    visited.add(best)
    cur = best
  }
  return path
}

// ── Progress storage key per career ─────────────────────────────────────────
function storageKey(careerId) { return 'cms_progress_' + careerId }

function loadProgress(careerId) {
  try { return JSON.parse(localStorage.getItem(storageKey(careerId))) || {} } catch { return {} }
}
function saveProgress(careerId, p) {
  try { localStorage.setItem(storageKey(careerId), JSON.stringify(p)) } catch {}
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CareerDashboard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const career = useMemo(() => buildCareer(id), [id])

  const [progress, setProgress]     = useState(() => loadProgress(id))
  const [viewMode, setViewMode]     = useState('phases')
  const [activePhase, setActivePhase] = useState(null)

  useEffect(() => { saveProgress(id, progress) }, [id, progress])

  if (!career) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-dim)', fontFamily: 'var(--font)', fontSize: 14 }}>
      Career not found: {id}
      <button onClick={() => navigate('/')} style={{ marginLeft: 12, padding: '5px 12px', cursor: 'pointer' }}>← Back</button>
    </div>
  )

  const phases      = useMemo(() => buildPhases(career),         [career])
  const critPath    = useMemo(() => computeCriticalPath(career), [career])

  const getStatus = useCallback((id) => progress[id] || 'notstarted', [progress])

  function cycleStatus(id) {
    const next = { notstarted: 'inprogress', inprogress: 'mastered', mastered: 'notstarted' }
    setProgress(p => ({ ...p, [id]: next[p[id] || 'notstarted'] }))
  }

  function isUnlocked(id) {
    return [...career.edgeSet]
      .filter(e => e.endsWith('→' + id))
      .map(e => e.split('→')[0])
      .every(p => getStatus(p) === 'mastered')
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const allIds = [...career.nodeSet]
    const total    = allIds.length
    const mastered = allIds.filter(id => getStatus(id) === 'mastered').length
    const inprog   = allIds.filter(id => getStatus(id) === 'inprogress').length
    const totalHrs = allIds.reduce((s, id) => s + (nById[id]?.hrs || 0), 0)
    const doneHrs  = allIds.filter(id => getStatus(id) === 'mastered').reduce((s, id) => s + (nById[id]?.hrs || 0), 0)
    const pct = total ? Math.round(mastered / total * 100) : 0
    return { total, mastered, inprog, totalHrs, doneHrs, remainHrs: totalHrs - doneHrs, pct }
  }, [career, progress, getStatus])

  const allPathIds = useMemo(() => phases.flatMap(p => p.nodes), [phases])

  const nextUp = useMemo(() =>
    allPathIds.filter(id => getStatus(id) === 'notstarted' && isUnlocked(id)),
    [allPathIds, progress]
  )
  const blockedCount = useMemo(() =>
    allPathIds.filter(id => getStatus(id) === 'notstarted' && !isUnlocked(id)).length,
    [allPathIds, progress]
  )

  const phaseHrs = useMemo(() =>
    phases.map(p => p.nodes.reduce((s, id) => s + (nById[id]?.hrs || 0), 0)),
    [phases]
  )
  const totalH = phaseHrs.reduce((a, b) => a + b, 0) || 1

  const careerNode = nById[career.id]
  const catCol     = CAT_COLOR[career.cat] || '#888'

  // ── Progress ring math ────────────────────────────────────────────────────
  const CIRC = 2 * Math.PI * 38
  const ringOffset = CIRC * (1 - stats.pct / 100)

  // ── Status icon helpers ───────────────────────────────────────────────────
  function statusIcon(st) {
    if (st === 'mastered')   return '✓'
    if (st === 'inprogress') return '◑'
    return ''
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, overflowY: 'auto', zIndex: 200,
      display: 'grid',
      gridTemplateColumns: '260px 1fr',
      gridTemplateRows: '48px 1fr',
      gridTemplateAreas: '"nav nav" "sidebar main"',
      background: 'var(--bg-canvas)',
      color: 'var(--text-main)',
      fontFamily: 'var(--font)',
      fontSize: 13,
    }}>

      {/* ── Nav ── */}
      <nav style={{
        gridArea: 'nav',
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--bg-panel-solid)',
        borderBottom: '1px solid var(--border-light)',
        display: 'flex', alignItems: 'center', padding: '0 18px', gap: 10,
      }}>
        <button onClick={() => navigate(-1)} style={{
          padding: '4px 10px', borderRadius: 4, border: '1px solid var(--border-light)',
          background: 'transparent', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer',
          fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 5
        }}>← Back to map</button>

        <div style={{ width: 1, height: 16, background: 'var(--border-light)' }} />

        <div style={{ fontWeight: 600, fontSize: 13, letterSpacing: '.3px', display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 8, height: 8, background: 'var(--gold)', borderRadius: 2, boxShadow: '0 0 6px rgba(200,168,75,.5)' }} />
          CheckMyStats
        </div>
        <div style={{ width: 1, height: 16, background: 'var(--border-light)' }} />
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Path Planner →</span>
        <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 500 }}>{careerNode?.name || career.name}</span>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button
            onClick={() => { if (confirm('Reset all progress for this career?')) setProgress({}) }}
            style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid var(--border-light)', background: 'transparent', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}
          >Reset progress</button>
        </div>
      </nav>

      {/* ── Sidebar ── */}
      <aside style={{
        gridArea: 'sidebar',
        background: 'var(--bg-panel-solid)',
        borderRight: '1px solid var(--border-light)',
        padding: '16px 14px',
        display: 'flex', flexDirection: 'column', gap: 18,
        alignSelf: 'start', position: 'sticky', top: 48,
        maxHeight: 'calc(100vh - 48px)', overflowY: 'auto',
      }}>

        {/* Progress ring */}
        <div>
          <div style={sbTitleStyle}>Your progress</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '8px 0' }}>
            <svg width="90" height="90" viewBox="0 0 90 90">
              <circle cx="45" cy="45" r="38" fill="none" stroke="var(--bg-hover)" strokeWidth="7" />
              <circle cx="45" cy="45" r="38" fill="none" stroke="var(--green,#2dd4bf)"
                strokeWidth="7" strokeLinecap="round"
                strokeDasharray={CIRC} strokeDashoffset={ringOffset}
                transform="rotate(-90 45 45)"
                style={{ transition: 'stroke-dashoffset .5s' }}
              />
            </svg>
            <div style={{ marginTop: -8, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{stats.pct}%</div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', textAlign: 'center' }}>{stats.mastered} of {stats.total} done</div>
            </div>
          </div>
        </div>

        {/* Phase list */}
        <div>
          <div style={sbTitleStyle}>Study phases</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {phases.map(p => {
              const done = p.nodes.filter(id => getStatus(id) === 'mastered').length
              const isActive = activePhase === p.id
              return (
                <div key={p.id}
                  onClick={() => setActivePhase(ap => ap === p.id ? null : p.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 9px',
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all .15s',
                    border: isActive ? '1px solid var(--gold-border,rgba(200,168,75,.3))' : '1px solid var(--border-light)',
                    background: isActive ? 'var(--gold-dim)' : 'var(--bg-panel)',
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: p.color }} />
                  <span style={{ fontSize: 12, fontWeight: 500, flex: 1 }}>{p.name.replace('Phase ', 'Ph.')}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{p.nodes.length}</span>
                  {done > 0 && <span style={{ fontSize: 10, color: '#2dd4bf' }}>✓{done}</span>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Mode toggle */}
        <div>
          <div style={sbTitleStyle}>View mode</div>
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-panel)', borderRadius: 'var(--radius-sm)', padding: 3 }}>
            {['phases', 'critical'].map(m => (
              <button key={m} onClick={() => setViewMode(m)} style={{
                flex: 1, padding: '5px 0', border: viewMode === m ? '1px solid var(--border-light)' : '1px solid transparent',
                borderRadius: 4, fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)',
                background: viewMode === m ? 'var(--bg-panel-solid)' : 'transparent',
                color: viewMode === m ? 'var(--text-main)' : 'var(--text-dim)',
                transition: 'all .15s'
              }}>
                {m === 'phases' ? 'By phase' : 'Critical path'}
              </button>
            ))}
          </div>
        </div>

        {/* Hours remaining */}
        <div>
          <div style={sbTitleStyle}>Hours remaining</div>
          <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--gold)' }}>
            {stats.remainHrs}h
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>
            {stats.mastered > 0 ? 'remaining' : 'total estimated'}
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ gridArea: 'main', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Career header */}
        <div style={{
          background: 'var(--bg-panel-solid)', border: '1px solid var(--border-light)',
          borderRadius: 10, padding: '20px 22px', display: 'flex', alignItems: 'flex-start', gap: 16
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 10, background: catCol + '18',
            border: `1px solid ${catCol}44`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 22, flexShrink: 0
          }}>⚙</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4, letterSpacing: '-.02em' }}>
              {careerNode?.name || career.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6 }}>
              {CAT_NAMES[career.cat]} engineering path · {career.nodeSet.size} prerequisite nodes
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
              {[
                { val: stats.totalHrs + 'h', lbl: 'Total study',   col: 'var(--gold)' },
                { val: stats.total,           lbl: 'Nodes' },
                { val: stats.mastered,         lbl: 'Mastered',     col: '#2dd4bf' },
                { val: stats.inprog,           lbl: 'In progress',  col: 'var(--accent-blue)' },
              ].map(({ val, lbl, col }) => (
                <div key={lbl} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-mono)', color: col }}>{val}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Instruction */}
        <div style={{
          background: 'var(--accent-blue-dim)', border: '1px solid var(--border-blue)',
          borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 12,
          color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1.5
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/>
          </svg>
          <span><strong style={{ color: 'var(--text-main)' }}>Click any node</strong> to cycle its status: not started → in progress → mastered. The plan updates in real time to show what unlocks next.</span>
        </div>

        {/* Gap analysis */}
        <div style={{ background: 'var(--bg-panel-solid)', border: '1px solid var(--border-light)', borderRadius: 10, padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Where you stand</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14, lineHeight: 1.6 }}>
            Based on your current progress — what's available right now vs. what's locked behind unmet prerequisites.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {[
              { lbl: 'Completed',    val: stats.pct + '%', sub: `${stats.mastered} nodes mastered`,   cls: stats.pct >= 50 ? 'good' : 'warn' },
              { lbl: 'Unlocked now', val: nextUp.length,    sub: 'ready to start',                     cls: nextUp.length > 0 ? 'good' : 'warn' },
              { lbl: 'Still locked', val: blockedCount,     sub: 'need prereqs first',                 cls: blockedCount === 0 ? 'good' : blockedCount < 5 ? 'warn' : 'bad' },
            ].map(({ lbl, val, sub, cls }) => (
              <div key={lbl} style={{
                padding: '12px 14px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-light)', background: 'var(--bg-panel)'
              }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-dim)', marginBottom: 6 }}>{lbl}</div>
                <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'var(--font-mono)', marginBottom: 2, color: cls === 'good' ? '#2dd4bf' : cls === 'warn' ? 'var(--gold)' : '#e94560' }}>{val}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{sub}</div>
              </div>
            ))}
          </div>
          {nextUp.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-dim)', marginBottom: 7 }}>Start with these next</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {nextUp.slice(0, 6).map(id => {
                  const n = nById[id]
                  const col = CAT_COLOR[n?.cat] || 'var(--text-dim)'
                  return (
                    <div key={id} onClick={() => cycleStatus(id)} style={{
                      padding: '5px 9px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 500,
                      border: `1px solid ${col}44`, background: col + '18', color: col
                    }}>
                      {n?.name}{n?.hrs ? <span style={{ opacity: .55 }}> {n.hrs}h</span> : ''}
                    </div>
                  )
                })}
                {nextUp.length > 6 && <div style={{ padding: '5px 9px', fontSize: 11, color: 'var(--text-dim)' }}>+{nextUp.length - 6} more below</div>}
              </div>
            </div>
          )}
        </div>

        {/* Time breakdown bar */}
        <div style={{ background: 'var(--bg-panel-solid)', border: '1px solid var(--border-light)', borderRadius: 10, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>Estimated study time</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>
            {stats.remainHrs}h remaining of {stats.totalHrs}h total
            {stats.mastered > 0 && ` · ${Math.round(stats.doneHrs / stats.totalHrs * 100)}% of hours complete`}
          </div>
          <div style={{ display: 'flex', height: 24, borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: 8 }}>
            {phases.map((p, i) => {
              const w = Math.round(phaseHrs[i] / totalH * 100)
              const doneInPhase = p.nodes.filter(id => getStatus(id) === 'mastered').length
              const pctDone = p.nodes.length ? doneInPhase / p.nodes.length : 0
              return (
                <div key={p.id} style={{
                  flex: w, background: p.color, opacity: 0.4 + pctDone * 0.6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,.8)',
                  overflow: 'hidden', whiteSpace: 'nowrap',
                }} title={`${p.name}: ${phaseHrs[i]}h`}>
                  {w >= 8 ? phaseHrs[i] + 'h' : ''}
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {phases.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-dim)' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, background: p.color }} />
                {p.name.replace(/Phase \d+ — /, '')} · {phaseHrs[i]}h
              </div>
            ))}
          </div>
        </div>

        {/* ── Phase blocks or Critical path ── */}
        {viewMode === 'phases' ? (
          phases.map(phase => {
            const isOpen = !activePhase || activePhase === phase.id
            const doneCount = phase.nodes.filter(id => getStatus(id) === 'mastered').length
            const inProgCount = phase.nodes.filter(id => getStatus(id) === 'inprogress').length
            const phasePct = phase.nodes.length ? Math.round(doneCount / phase.nodes.length * 100) : 0
            return (
              <div key={phase.id} style={{ background: 'var(--bg-panel-solid)', border: '1px solid var(--border-light)', borderRadius: 10, overflow: 'hidden' }}>
                {/* Phase header */}
                <div
                  onClick={() => setActivePhase(ap => ap === phase.id ? null : phase.id)}
                  style={{
                    padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12,
                    borderBottom: isOpen ? '1px solid var(--border-light)' : 'none',
                    cursor: 'pointer', userSelect: 'none',
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0,
                    fontFamily: 'var(--font-mono)',
                    background: phase.color + '22', color: phase.color, border: `1px solid ${phase.color}44`
                  }}>
                    {phasePct === 100 ? '✓' : doneCount}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{phase.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{phase.desc}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
                    {doneCount > 0 && <span style={{ fontSize: 11, color: '#2dd4bf' }}>{doneCount}/{phase.nodes.length} done</span>}
                    {inProgCount > 0 && <span style={{ fontSize: 11, color: 'var(--accent-blue)' }}>{inProgCount} in progress</span>}
                  </div>
                  <span style={{ color: 'var(--text-dim)', fontSize: 12, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>▶</span>
                </div>
                {/* Node grid */}
                {isOpen && (
                  <div style={{ padding: '16px 18px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 8 }}>
                      {phase.nodes.map(id => {
                        const n = nById[id]
                        if (!n) return null
                        const st = getStatus(id)
                        const unlocked = isUnlocked(id) || st !== 'notstarted'
                        const isTarget = id === career.id
                        const col = CAT_COLOR[n.cat] || '#888'
                        return (
                          <div key={id}
                            onClick={() => unlocked ? cycleStatus(id) : alert('This node is locked. Complete its prerequisites first.')}
                            style={{
                              border: isTarget
                                ? '1px solid var(--gold-border,rgba(200,168,75,.3))'
                                : st === 'mastered'   ? '1px solid rgba(45,212,191,.3)'
                                : st === 'inprogress' ? '1px solid var(--border-blue)'
                                : '1px solid var(--border-light)',
                              borderRadius: 'var(--radius-sm)', padding: '10px 12px', cursor: unlocked ? 'pointer' : 'default',
                              background: isTarget
                                ? 'var(--gold-dim,rgba(200,168,75,.1))'
                                : st === 'mastered'   ? 'rgba(45,212,191,.08)'
                                : st === 'inprogress' ? 'var(--accent-blue-dim)'
                                : 'var(--bg-panel)',
                              opacity: !unlocked && st === 'notstarted' ? .45 : 1,
                              position: 'relative', transition: 'all .15s'
                            }}
                          >
                            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 3, paddingRight: 20 }}>{n.name}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-dim)', display: 'flex', gap: 6, alignItems: 'center' }}>
                              <span style={{
                                padding: '1px 5px', borderRadius: 3, fontSize: 9, fontWeight: 600,
                                textTransform: 'uppercase', letterSpacing: '.04em',
                                background: col + '22', color: col
                              }}>{n.cat}</span>
                              {n.hrs > 0 && <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>{n.hrs}h</span>}
                              {!unlocked && st === 'notstarted' && <span style={{ color: '#e94560', fontSize: 9 }}>🔒 locked</span>}
                            </div>
                            <div style={{
                              position: 'absolute', top: 8, right: 8, width: 16, height: 16,
                              borderRadius: '50%', border: '1.5px solid var(--border-light)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 9,
                              background: st === 'mastered' ? '#2dd4bf' : st === 'inprogress' ? 'var(--accent-blue)' : 'transparent',
                              borderColor: st === 'mastered' ? '#2dd4bf' : st === 'inprogress' ? 'var(--accent-blue)' : 'var(--border-light)',
                              color: '#fff'
                            }}>
                              {statusIcon(st)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        ) : (
          /* Critical path view */
          <div style={{ background: 'var(--bg-panel-solid)', border: '1px solid var(--border-light)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 3 }}>Minimum viable path</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                The single most direct chain from zero to {careerNode?.name}. {critPath.length} nodes, no detours.
              </div>
            </div>
            <div style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {critPath.map((id, i) => {
                  const n = nById[id]
                  if (!n) return null
                  const st = getStatus(id)
                  const isTarget = id === career.id
                  const prevDone = i === 0 || getStatus(critPath[i - 1]) === 'mastered'
                  return (
                    <React.Fragment key={id}>
                      {i > 0 && (
                        <div style={{
                          height: 16, borderLeft: `2px solid ${getStatus(critPath[i - 1]) === 'mastered' ? '#2dd4bf' : 'var(--border-light)'}`,
                          marginLeft: 12, width: 0
                        }} />
                      )}
                      <div
                        onClick={() => cycleStatus(id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 14px', borderLeft: `2px solid ${isTarget ? 'var(--gold)' : 'var(--border-light)'}`,
                          marginLeft: 12, position: 'relative', cursor: 'pointer', transition: 'all .2s'
                        }}
                      >
                        {/* dot */}
                        <div style={{
                          position: 'absolute', left: isTarget ? -9 : -7, top: '50%', transform: 'translateY(-50%)',
                          width: isTarget ? 16 : 12, height: isTarget ? 16 : 12,
                          borderRadius: '50%',
                          background: st === 'mastered' ? '#2dd4bf' : st === 'inprogress' ? 'var(--accent-blue)' : isTarget ? 'var(--gold)' : 'var(--bg-panel-solid)',
                          border: `1.5px solid ${st === 'mastered' ? '#2dd4bf' : st === 'inprogress' ? 'var(--accent-blue)' : isTarget ? 'var(--gold)' : 'var(--border-light)'}`,
                          boxShadow: isTarget ? '0 0 8px rgba(200,168,75,.5)' : 'none',
                        }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: isTarget ? 'var(--gold)' : 'var(--text-main)' }}>
                            {n.name}{isTarget ? ' 🎯' : ''}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                            {TIER_LABEL[n.tier]} · {n.cat}{n.hrs > 0 ? ` · ${n.hrs}h` : ''}
                            {st === 'mastered' ? ' · ✓ Done' : st === 'inprogress' ? ' · In progress' : ''}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}

const sbTitleStyle = {
  fontSize: 9, textTransform: 'uppercase', letterSpacing: '.07em',
  color: 'var(--text-dim)', fontWeight: 600, marginBottom: 8
}
