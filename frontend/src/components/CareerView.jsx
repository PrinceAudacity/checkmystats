import React, { useRef, useEffect, useCallback } from 'react'
import { TIER_LABEL } from '../utils/constants'
import { buildFullPath } from '../utils/graph'

const CARD_W = 160, CARD_H = 58

export default function CareerView({ career, progress = {}, zlblRef, nodeMap, prereqOf, leadsTo, catColorMap, onNodeSelect, onHighlightPath, onOpenDashboard }) {
  const viewRef = useRef(null)
  const panRef = useRef(null)
  const edgesRef = useRef(null)
  const nodesRef = useRef(null)
  const panState = useRef({ tx: 0, ty: 0, scale: 1, isPan: false, sx: 0, sy: 0 })

  function applyTransform() {
    const s = panState.current
    if (panRef.current) panRef.current.style.transform = `translate(${s.tx}px,${s.ty}px) scale(${s.scale})`
    if (zlblRef?.current) zlblRef.current.textContent = Math.round(s.scale * 100) + '%'
  }

  const render = useCallback(() => {
    if (!career || !nodesRef.current || !edgesRef.current || !panRef.current) return
    const getStatus = id => progress[id] || 'notstarted'

    const { nodeSet, edgeSet, positions: pos } = career
    nodesRef.current.innerHTML = ''
    edgesRef.current.innerHTML = ''

    const xs = Object.values(pos).map(p => p.x)
    const ys = Object.values(pos).map(p => p.y)
    const svgW = Math.max(...xs) + CARD_W + 100
    const svgH = Math.max(...ys) + CARD_H + 100

    edgesRef.current.setAttribute('width', svgW)
    edgesRef.current.setAttribute('height', svgH)
    edgesRef.current.style.width = svgW + 'px'
    edgesRef.current.style.height = svgH + 'px'
    panRef.current.style.width = svgW + 'px'
    panRef.current.style.height = svgH + 'px'

    // Draw bezier edges
    const edgeArr = [...edgeSet].map(e => e.split('→'))
    edgeArr.forEach(([aId, bId]) => {
      const pa = pos[aId], pb = pos[bId]
      if (!pa || !pb) return
      const x1 = pa.x + CARD_W, y1 = pa.y + CARD_H / 2
      const x2 = pb.x, y2 = pb.y + CARD_H / 2
      const dx = x2 - x1
      const cpx = Math.max(Math.abs(dx) * .45, 30)
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', `M ${x1} ${y1} C ${x1 + cpx} ${y1}, ${x2 - cpx} ${y2}, ${x2} ${y2}`)
      path.setAttribute('class', 'career-edge')
      path.dataset.from = aId
      path.dataset.to = bId
      edgesRef.current.appendChild(path)
    })

    // Draw node cards
    ;[...nodeSet].forEach(id => {
      const n = nodeMap[id]
      if (!n) return
      const p = pos[id]
      if (!p) return
      const col = catColorMap[n.subject_category] || '#888'
      const tierCls = n.tier === 0 ? 'cn-tier0' : n.tier === 2 ? 'cn-tier2' : n.tier === 3 ? 'cn-tier3' : ''
      const st = getStatus(id)
      const stCls = st === 'mastered' ? 'cn-mastered' : st === 'inprogress' ? 'cn-inprogress' : 'cn-notstarted'
      const card = document.createElement('div')
      card.className = `career-node${tierCls ? ' ' + tierCls : ''} ${stCls}`
      card.style.left = p.x + 'px'
      card.style.top = p.y + 'px'
      card.dataset.id = id
      const dotStyle = n.tier === 3
        ? `background:${col};border-radius:2px;transform:rotate(45deg)`
        : n.tier === 2 ? `background:${col};box-shadow:0 0 6px ${col}` : `background:${col}`
      const stIcon  = st === 'mastered' ? '✓' : st === 'inprogress' ? '◑' : ''
      const stColor = st === 'mastered' ? '#22c55e' : st === 'inprogress' ? 'var(--accent-blue)' : col
      const stLabel = st === 'mastered' ? 'Mastered' : st === 'inprogress' ? 'In Progress' : TIER_LABEL[n.tier] || ''
      card.innerHTML = `
        <div class="cn-header">
          <div class="cn-dot" style="${dotStyle}"></div>
          <div class="cn-title">${n.display_name}</div>
          ${stIcon ? `<div class="cn-st-icon" style="color:${stColor};font-size:11px;margin-left:auto;flex-shrink:0">${stIcon}</div>` : ''}
        </div>
        <div class="cn-meta">
          <span class="cn-status" style="color:${stColor}">${stLabel}</span>
          ${n.hrs ? `<span>${n.hrs}h</span>` : ''}
        </div>`
      if (n.tier === 2 && onOpenDashboard) {
        const btn = document.createElement('button')
        btn.className = 'cn-planner-btn'
        btn.textContent = '→ Planner'
        btn.addEventListener('click', e => {
          e.stopPropagation()
          onOpenDashboard({ id: id })
        })
        card.appendChild(btn)
      }
      card.addEventListener('click', () => {
        nodesRef.current.querySelectorAll('.cn-selected').forEach(el => el.classList.remove('cn-selected'))
        card.classList.add('cn-selected')
        onNodeSelect(n)
        const path = buildFullPath(nodeMap, prereqOf, leadsTo, id)
        onHighlightPath(path)
        edgesRef.current.querySelectorAll('.career-edge').forEach(pe => {
          const key = pe.dataset.from + '→' + pe.dataset.to
          pe.classList.toggle('ce-hl', path.edgeSet.has(key))
        })
      })
      nodesRef.current.appendChild(card)
    })

    // Fit view
    if (viewRef.current) {
      const vw = viewRef.current.offsetWidth, vh = viewRef.current.offsetHeight
      const bx1 = Math.max(...xs) + CARD_W + 40, by1 = Math.max(...ys) + CARD_H + 40
      const bx0 = Math.min(...xs) - 40, by0 = Math.min(...ys) - 40
      const ts = 1.0
      panState.current = { tx: 40 * (1 - ts), ty: vh / 2 - (by0 + by1) / 2 * ts, scale: ts, isPan: false, sx: 0, sy: 0 }
      applyTransform()
    }
  }, [career, progress, nodeMap, prereqOf, leadsTo, catColorMap, onNodeSelect, onHighlightPath])

  useEffect(() => { render() }, [render])

  // Pan/zoom events
  useEffect(() => {
    const cv = viewRef.current
    if (!cv) return

    function onWheel(e) {
      e.preventDefault()
      const r = cv.getBoundingClientRect()
      const mx = e.clientX - r.left, my = e.clientY - r.top
      const ns = Math.max(.15, Math.min(4, panState.current.scale * (e.deltaY < 0 ? 1.12 : .9)))
      panState.current.tx = mx - (mx - panState.current.tx) * (ns / panState.current.scale)
      panState.current.ty = my - (my - panState.current.ty) * (ns / panState.current.scale)
      panState.current.scale = ns
      applyTransform()
    }
    function onMouseDown(e) {
      if (e.target.closest('.career-node')) return
      panState.current.isPan = true
      panState.current.sx = e.clientX - panState.current.tx
      panState.current.sy = e.clientY - panState.current.ty
      cv.style.cursor = 'grabbing'
    }
    function onMouseMove(e) {
      if (!panState.current.isPan) return
      panState.current.tx = e.clientX - panState.current.sx
      panState.current.ty = e.clientY - panState.current.sy
      applyTransform()
    }
    function onMouseUp() {
      panState.current.isPan = false
      cv.style.cursor = 'grab'
    }

    cv.addEventListener('wheel', onWheel, { passive: false })
    cv.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      cv.removeEventListener('wheel', onWheel)
      cv.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return (
    <div ref={viewRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', cursor: 'grab' }}>
      <div ref={panRef} style={{ position: 'absolute', top: 0, left: 0, transformOrigin: '0 0', willChange: 'transform' }}>
        <svg ref={edgesRef} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }} />
        <div ref={nodesRef} />
      </div>
      {onOpenDashboard && (
        <button
          onClick={() => onOpenDashboard(career)}
          style={{
            position: 'absolute', top: 12, right: 12, zIndex: 10,
            background: 'var(--bg-panel)', border: '1px solid var(--border-light)',
            color: 'var(--text-main)', fontSize: 12, padding: '7px 14px',
            borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)',
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,.3)'
          }}
        >
          📊 Path Planner
        </button>
      )}
    </div>
  )
}
