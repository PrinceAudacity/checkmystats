import { useRef, useCallback } from 'react'
import { CANVAS_CENTER } from '../utils/layout'

const { CX, CY } = CANVAS_CENTER

export default function useCanvasView(wrapRef) {
  const vTx = useRef(0)
  const vTy = useRef(0)
  const vScale = useRef(1)
  const zlblRef = useRef(null)

  function updateZlbl() {
    if (zlblRef.current) zlblRef.current.textContent = Math.round(vScale.current * 100) + '%'
  }

  function animateTo(tx, ty, sc, dur) {
    const s0 = vTx.current, t0 = vTy.current, sc0 = vScale.current
    const st = performance.now()
    function ease(x) { return x < .5 ? 2 * x * x : -1 + (4 - 2 * x) * x }
    function step(now) {
      const p = Math.min(1, (now - st) / dur), e = ease(p)
      vTx.current = s0 + (tx - s0) * e
      vTy.current = t0 + (ty - t0) * e
      vScale.current = sc0 + (sc - sc0) * e
      updateZlbl()
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  const resetView = useCallback(() => {
    if (!wrapRef.current) return
    const R_PHDC = 1590
    const ts = Math.min(
      wrapRef.current.offsetWidth / (R_PHDC * 2.2),
      wrapRef.current.offsetHeight / (R_PHDC * 2.2)
    )
    animateTo(
      wrapRef.current.offsetWidth / 2 - CX * ts,
      wrapRef.current.offsetHeight / 2 - CY * ts,
      ts, 600
    )
  }, [wrapRef])

  function zoomBy(f) {
    if (!wrapRef.current) return
    const cx = wrapRef.current.offsetWidth / 2
    const cy = wrapRef.current.offsetHeight / 2
    const ns = Math.max(.05, Math.min(5, vScale.current * f))
    vTx.current = cx - (cx - vTx.current) * (ns / vScale.current)
    vTy.current = cy - (cy - vTy.current) * (ns / vScale.current)
    vScale.current = ns
    updateZlbl()
  }

  function panToNode(nodeId, nodePositions) {
    const p = nodePositions && nodePositions[nodeId]
    if (!p || !wrapRef.current) return
    const ts = Math.max(vScale.current, .5)
    animateTo(
      wrapRef.current.offsetWidth / 2 - p.x * ts,
      wrapRef.current.offsetHeight / 2 - p.y * ts,
      ts, 500
    )
  }

  function w2s(x, y) {
    return { sx: x * vScale.current + vTx.current, sy: y * vScale.current + vTy.current }
  }

  return { vTx, vTy, vScale, zlblRef, animateTo, resetView, zoomBy, panToNode, w2s }
}
