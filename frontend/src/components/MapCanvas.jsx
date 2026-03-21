import React, { useRef, useEffect } from 'react'
import { RINGS, CANVAS_CENTER, DS } from '../utils/layout'
import { TIER_LABEL, EDU_LABELS } from '../utils/constants'

const { CX, CY } = CANVAS_CENTER
let _stars = null

export default function MapCanvas({
  wrapRef, canvasRef, vTx, vTy, vScale, zlblRef,
  nodes, edges, nodeMap, prereqOf, positions, catColorMap, catNameMap,
  selNode, activePath, activeCatFilter,
  onNodeClick, onResetView
}) {
  // Use refs so the RAF loop always reads current values without re-registering
  const selNodeRef = useRef(selNode)
  const activePathRef = useRef(activePath)
  const activeCatRef = useRef(activeCatFilter)
  useEffect(() => { selNodeRef.current = selNode }, [selNode])
  useEffect(() => { activePathRef.current = activePath }, [activePath])
  useEffect(() => { activeCatRef.current = activeCatFilter }, [activeCatFilter])

  // Refs for async-loaded graph data (required for RAF loop correctness)
  const nodesRef       = useRef(nodes)
  const edgesRef       = useRef(edges)
  const nodeMapRef     = useRef(nodeMap)
  const prereqOfRef    = useRef(prereqOf)
  const positionsRef   = useRef(positions)
  const catColorMapRef = useRef(catColorMap)
  const catNameMapRef  = useRef(catNameMap)
  useEffect(() => { nodesRef.current = nodes },       [nodes])
  useEffect(() => { edgesRef.current = edges },       [edges])
  useEffect(() => { nodeMapRef.current = nodeMap },   [nodeMap])
  useEffect(() => { prereqOfRef.current = prereqOf }, [prereqOf])
  useEffect(() => { positionsRef.current = positions },[positions])
  useEffect(() => { catColorMapRef.current = catColorMap }, [catColorMap])
  useEffect(() => { catNameMapRef.current = catNameMap },   [catNameMap])

  const hovNodeRef = useRef(null)
  const isPanRef = useRef(false)
  const psxRef = useRef(0)
  const psyRef = useRef(0)
  const tipRef = useRef(null)

  function isLight() { return document.body.classList.contains('light') }
  function w2s(x, y) { return { sx: x * vScale.current + vTx.current, sy: y * vScale.current + vTy.current } }

  function resize() {
    const wrap = wrapRef.current, cvs = canvasRef.current
    if (!wrap || !cvs) return
    const dpr = devicePixelRatio || 1
    cvs.width = wrap.offsetWidth * dpr
    cvs.height = wrap.offsetHeight * dpr
    cvs.style.width = wrap.offsetWidth + 'px'
    cvs.style.height = wrap.offsetHeight + 'px'
    cvs.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function draw() {
    const cvs = canvasRef.current, wrap = wrapRef.current
    if (!cvs || !wrap) return
    const ctx = cvs.getContext('2d')
    const W = wrap.offsetWidth, H = wrap.offsetHeight
    const li = isLight()
    const scale = vScale.current
    const selN = selNodeRef.current
    const aPath = activePathRef.current
    const aCat = activeCatRef.current
    // Read async data via refs
    const nodes       = nodesRef.current
    const edges       = edgesRef.current
    const nodeMap     = nodeMapRef.current
    const prereqOf    = prereqOfRef.current
    const positions   = positionsRef.current
    const catColorMap = catColorMapRef.current
    const catNameMap  = catNameMapRef.current

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = li ? '#EEF0F8' : '#0e0e1a'
    ctx.fillRect(0, 0, W, H)

    const { sx: ccx, sy: ccy } = w2s(CX, CY)

    // Sector background glow
    if (!li) {
      Object.entries(DS).forEach(([cat, sec]) => {
        if (!sec.s || sec.s > Math.PI) return
        const r1 = 160 * scale * .5, r2 = 1590 * scale * 1.08
        ctx.save()
        ctx.globalAlpha = .02
        ctx.beginPath()
        ctx.moveTo(ccx + Math.cos(sec.a - sec.s / 2) * r1, ccy + Math.sin(sec.a - sec.s / 2) * r1)
        ctx.arc(ccx, ccy, r2, sec.a - sec.s / 2, sec.a + sec.s / 2)
        ctx.arc(ccx, ccy, r1, sec.a + sec.s / 2, sec.a - sec.s / 2, true)
        ctx.closePath()
        ctx.fillStyle = catColorMap[cat] || '#888'
        ctx.fill()
        ctx.restore()
      })
      if (!_stars) {
        _stars = []
        for (let i = 0; i < 300; i++)
          _stars.push({ x: (Math.random() - .5) * 6000 + CX, y: (Math.random() - .5) * 6000 + CY, r: Math.random() * .7 + .2, a: Math.random() * .12 + .03 })
      }
      _stars.forEach(s => {
        const { sx, sy } = w2s(s.x, s.y)
        if (sx < -2 || sx > W + 2 || sy < -2 || sy > H + 2) return
        ctx.beginPath(); ctx.arc(sx, sy, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(200,210,235,${s.a})`; ctx.fill()
      })
    }

    // Orbital rings
    RINGS.forEach(ring => {
      const sr = ring.r * scale
      ctx.save()
      ctx.beginPath(); ctx.arc(ccx, ccy, sr, 0, Math.PI * 2)
      ctx.strokeStyle = li ? 'rgba(140,120,60,.25)' : 'rgba(200,180,120,.18)'
      ctx.lineWidth = 1.5; ctx.stroke()
      ctx.globalAlpha = li ? .02 : .015
      ctx.beginPath(); ctx.arc(ccx, ccy, sr, 0, Math.PI * 2)
      ctx.fillStyle = li ? 'rgba(140,120,60,1)' : 'rgba(200,180,120,1)'; ctx.fill()
      ctx.restore()
      const lx = ccx + Math.cos(ring.la) * sr, ly = ccy + Math.sin(ring.la) * sr
      const fs = Math.max(11, 16 * scale)
      ctx.save(); ctx.font = `600 ${fs}px -apple-system,sans-serif`; ctx.textAlign = 'left'
      ctx.fillStyle = li ? 'rgba(120,100,40,.55)' : 'rgba(200,180,120,.4)'
      if (!li) { ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 4 }
      ctx.fillText(ring.l, lx + 8, ly - 6); ctx.restore()
    })

    // Edges — backend returns {source, target} objects
    edges.forEach(({ source: aId, target: bId }) => {
      const pa = positions[aId], pb = positions[bId]
      if (!pa || !pb) return
      const { sx: ax, sy: ay } = w2s(pa.x, pa.y)
      const { sx: bx, sy: by } = w2s(pb.x, pb.y)
      const na = nodeMap[aId]
      const onP = aPath?.edgeSet.has(aId + '→' + bId)
      const dim = aPath && !onP
      const catDim = !aPath && aCat && na?.subject_category !== aCat && nodeMap[bId]?.subject_category !== aCat
      ctx.save()
      if (onP) {
        ctx.globalAlpha = .95; ctx.strokeStyle = catColorMap[na?.subject_category] || '#aaa'
        ctx.lineWidth = 2.8 * Math.min(scale, 1)
        ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 10
      } else if (dim || catDim) {
        ctx.globalAlpha = .03; ctx.strokeStyle = li ? 'rgba(80,80,120,1)' : 'rgba(120,130,160,1)'; ctx.lineWidth = .5
      } else {
        ctx.globalAlpha = li ? .14 : .16; ctx.strokeStyle = catColorMap[na?.subject_category] || '#888'; ctx.lineWidth = .7
      }
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke()
      ctx.restore()
    })

    // Nodes
    nodes.forEach(n => {
      const p = positions[n.id]
      if (!p) return
      const { sx, sy } = w2s(p.x, p.y)
      if (sx < -80 || sx > W + 80 || sy < -80 || sy > H + 80) return
      const isH = hovNodeRef.current?.id === n.id
      const isS = selN?.id === n.id
      const onP = aPath?.nodeSet.has(n.id)
      const dim = (aPath && !onP && !isS) || (aCat && n.subject_category !== aCat && !onP)
      const col = catColorMap[n.subject_category] || '#888'
      let r = n.tier === 0 ? 5 : n.tier === 1 ? 8 : n.tier === 2 ? 13 : 10
      r = r * (isH || isS ? 1.35 : 1) * Math.min(scale * 1.1, 1.4)
      ctx.save(); ctx.globalAlpha = dim ? .08 : 1

      if (n.tier === 2) {
        ctx.shadowColor = col; ctx.shadowBlur = isS || onP ? 28 : 12
        ctx.beginPath(); ctx.arc(sx, sy, r * 1.5, 0, Math.PI * 2)
        ctx.strokeStyle = col + '55'; ctx.lineWidth = 1; ctx.stroke()
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill()
        ctx.strokeStyle = li ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.2; ctx.stroke()
        ctx.shadowBlur = 0
        ctx.beginPath(); ctx.arc(sx, sy, r * .3, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fill()
      } else if (n.tier === 3) {
        ctx.shadowColor = col; ctx.shadowBlur = isS || onP ? 20 : 6
        ctx.beginPath(); ctx.moveTo(sx, sy - r * 1.4); ctx.lineTo(sx + r * .9, sy)
        ctx.lineTo(sx, sy + r * 1.4); ctx.lineTo(sx - r * .9, sy); ctx.closePath()
        ctx.fillStyle = col; ctx.fill()
        if (isS || onP) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke() }
        ctx.shadowBlur = 0
        ctx.beginPath(); ctx.arc(sx, sy, r * .25, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fill()
      } else if (n.tier === 1) {
        ctx.shadowColor = col; ctx.shadowBlur = onP ? 14 : isH ? 8 : 0
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2)
        if (onP) {
          ctx.fillStyle = col; ctx.fill()
          ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.2; ctx.stroke()
        } else {
          ctx.fillStyle = li ? 'rgba(200,210,240,.85)' : 'rgba(20,22,35,.95)'; ctx.fill()
          ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke()
        }
      } else {
        ctx.shadowColor = col; ctx.shadowBlur = onP ? 10 : isH ? 6 : 0
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2)
        if (onP) { ctx.fillStyle = col; ctx.fill() }
        else {
          ctx.fillStyle = li ? 'rgba(190,200,230,.6)' : 'rgba(30,33,55,.9)'; ctx.fill()
          ctx.strokeStyle = col + '80'; ctx.lineWidth = .8; ctx.stroke()
        }
      }
      ctx.shadowBlur = 0

      const showLbl = n.tier >= 2 || scale > .35 || isH || isS || onP
      if (showLbl) {
        const fs = n.tier >= 2 ? Math.max(10, 12 * scale) : Math.max(9, 10 * scale)
        ctx.globalAlpha = dim ? .06 : n.tier >= 2 ? .95 : .80
        ctx.font = `${n.tier >= 2 ? '600' : '400'} ${fs}px -apple-system,sans-serif`
        ctx.textAlign = 'center'
        if (!li) { ctx.shadowColor = 'rgba(0,0,0,.9)'; ctx.shadowBlur = 4 }
        ctx.fillStyle = li ? 'rgba(10,10,30,.9)' : 'rgba(225,228,245,.95)'
        ctx.fillText(n.display_name, sx, sy + r * 1.5 + fs + 1)
        if (n.degree_level && (scale > .3 || isH || isS || onP)) {
          ctx.font = `500 ${Math.max(8, 9 * scale)}px -apple-system,sans-serif`
          ctx.fillStyle = li ? 'rgba(100,90,50,.5)' : 'rgba(200,180,120,.45)'
          ctx.fillText(n.degree_level.toUpperCase(), sx, sy + r * 1.5 + fs + 1 + fs * .85)
        }
        ctx.shadowBlur = 0
      }
      ctx.restore()
    })

    // Category overlay labels at very low zoom
    if (scale < .28) {
      Object.entries(DS).forEach(([cat, sec]) => {
        if (!sec.s || sec.s > Math.PI || cat === 'CRED') return
        const { sx, sy } = w2s(CX + Math.cos(sec.a) * 760, CY + Math.sin(sec.a) * 760)
        if (sx < 0 || sx > W || sy < 0 || sy > H) return
        ctx.save()
        ctx.globalAlpha = Math.max(0, (.28 - scale) / .18 * .6)
        ctx.font = `600 ${Math.max(11, 13 * scale)}px -apple-system,sans-serif`
        ctx.textAlign = 'center'
        ctx.fillStyle = catColorMap[cat] || '#888'
        ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 6
        ctx.fillText(catNameMap[cat] || cat, sx, sy)
        ctx.restore()
      })
    }
  }

  // Single RAF loop — runs once, always reads current refs
  useEffect(() => {
    let raf
    function tick() { draw(); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, []) // eslint-disable-line

  // Resize
  useEffect(() => {
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // Call reset view on first mount
  useEffect(() => { onResetView() }, [])

  // Hover helper
  function hoverCheck(e) {
    const wrap = wrapRef.current
    if (!wrap) return
    const nodes     = nodesRef.current
    const prereqOf  = prereqOfRef.current
    const positions = positionsRef.current
    const catNameMap = catNameMapRef.current
    const r = wrap.getBoundingClientRect()
    const mx = e.clientX - r.left, my = e.clientY - r.top
    let found = null, md = Infinity
    nodes.forEach(n => {
      const p = positions[n.id]
      if (!p) return
      const { sx, sy } = w2s(p.x, p.y)
      const hit = (n.tier === 0 ? 6 : n.tier === 1 ? 10 : n.tier === 2 ? 16 : 12) * Math.min(vScale.current * 1.1, 1.4) + 10
      const d = Math.hypot(mx - sx, my - sy)
      if (d < hit && d < md) { md = d; found = n }
    })
    hovNodeRef.current = found
    if (found && tipRef.current) {
      const parts = [TIER_LABEL[found.tier], catNameMap[found.subject_category]]
      if (found.edu) parts.push(EDU_LABELS[found.edu])
      if (found.hrs) parts.push(found.hrs + 'h')
      if (found.degree_level) parts.push(found.degree_level.toUpperCase())
      parts.push((prereqOf[found.id] || []).length + ' prereqs')
      tipRef.current.children[0].textContent = found.display_name
      tipRef.current.children[1].textContent = parts.filter(Boolean).join(' · ')
      tipRef.current.style.left = (e.clientX + 14) + 'px'
      tipRef.current.style.top = (e.clientY - 8) + 'px'
      tipRef.current.style.opacity = 1
      wrap.style.cursor = 'pointer'
    } else {
      if (tipRef.current) tipRef.current.style.opacity = 0
      if (!isPanRef.current && wrapRef.current) wrapRef.current.style.cursor = 'grab'
    }
  }

  // Mouse events
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return

    function onWheel(e) {
      e.preventDefault()
      const r = wrap.getBoundingClientRect()
      const mx = e.clientX - r.left, my = e.clientY - r.top
      const ns = Math.max(.05, Math.min(5, vScale.current * (e.deltaY < 0 ? 1.13 : .885)))
      vTx.current = mx - (mx - vTx.current) * (ns / vScale.current)
      vTy.current = my - (my - vTy.current) * (ns / vScale.current)
      vScale.current = ns
      if (zlblRef?.current) zlblRef.current.textContent = Math.round(ns * 100) + '%'
    }
    function onMouseDown(e) {
      isPanRef.current = true
      psxRef.current = e.clientX - vTx.current
      psyRef.current = e.clientY - vTy.current
      wrap.style.cursor = 'grabbing'
    }
    function onMouseMove(e) {
      if (isPanRef.current) {
        vTx.current = e.clientX - psxRef.current
        vTy.current = e.clientY - psyRef.current
      } else {
        hoverCheck(e)
      }
    }
    function onMouseUp() { isPanRef.current = false; wrap.style.cursor = 'grab' }
    function onClick(e) {
      const nodes     = nodesRef.current
      const positions = positionsRef.current
      const r = wrap.getBoundingClientRect()
      const mx = e.clientX - r.left, my = e.clientY - r.top
      let cl = null, md = Infinity
      nodes.forEach(n => {
        const p = positions[n.id]
        if (!p) return
        const { sx, sy } = w2s(p.x, p.y)
        const hit = (n.tier === 0 ? 6 : n.tier === 1 ? 10 : n.tier === 2 ? 16 : 12) * Math.min(vScale.current * 1.1, 1.4) + 10
        const d = Math.hypot(mx - sx, my - sy)
        if (d < hit && d < md) { md = d; cl = n }
      })
      if (cl) onNodeClick(cl)
    }

    wrap.addEventListener('wheel', onWheel, { passive: false })
    wrap.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    wrap.addEventListener('click', onClick)
    return () => {
      wrap.removeEventListener('wheel', onWheel)
      wrap.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      wrap.removeEventListener('click', onClick)
    }
  }, [onNodeClick])

  return (
    <>
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />
      <div
        ref={tipRef}
        style={{
          position: 'fixed', pointerEvents: 'none',
          background: 'var(--bg-panel-solid)', border: '1px solid rgba(200,168,75,.3)',
          borderRadius: 'var(--radius-sm)', padding: '8px 11px', fontSize: 11,
          color: 'var(--text-main)', boxShadow: '0 4px 20px rgba(0,0,0,.6)',
          opacity: 0, transition: 'opacity .1s', zIndex: 200, maxWidth: 220
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 2 }} />
        <div style={{ color: 'var(--text-dim)' }} />
      </div>
    </>
  )
}
