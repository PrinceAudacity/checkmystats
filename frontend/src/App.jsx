import React, { useRef } from 'react'
import useAppState from './hooks/useAppState'
import useTheme from './hooks/useTheme'
import useCanvasView from './hooks/useCanvasView'
import { NODE_POSITIONS } from './utils/layout'
import { SKILL_NODES, CAT_NAMES } from './data/skillData'

import Header from './components/Header'
import Toolbar from './components/Toolbar'
import Sidebar from './components/Sidebar'
import MapCanvas from './components/MapCanvas'
import CareerView from './components/CareerView'
import NodeDetail from './components/NodeDetail'
import Legend from './components/Legend'
import ZoomControls from './components/ZoomControls'
import PathInfo from './components/PathInfo'
import AddCareerModal from './components/AddCareerModal'

export default function App() {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)

  const { theme, toggleTheme } = useTheme()
  const { vTx, vTy, vScale, zlblRef, resetView, zoomBy, animateTo } = useCanvasView(wrapRef)

  const {
    addedCareers, activeCareer, sidebarMode, activeCatFilter,
    selNode, setSelNode, activePath, setActivePath, modalOpen, setModalOpen,
    highlightPath, clearPath, addCareer, removeCareer, selectCareer,
    backToFullMap, filterCat, switchMode
  } = useAppState()

  const activeCareerData = addedCareers.find(c => c.id === activeCareer) || null

  function handleNodeClick(node) {
    setSelNode(node)
    highlightPath(node.id)
    const p = NODE_POSITIONS[node.id]
    if (p) {
      const ts = Math.max(vScale.current, .5)
      animateTo(wrapRef.current.offsetWidth / 2 - p.x * ts, wrapRef.current.offsetHeight / 2 - p.y * ts, ts, 500)
    }
  }

  function handleNodeSelect(node) {
    setSelNode(node)
    highlightPath(node.id)
    if (activeCareer) return
    const p = NODE_POSITIONS[node.id]
    if (p) {
      const ts = Math.max(vScale.current, .5)
      animateTo(wrapRef.current.offsetWidth / 2 - p.x * ts, wrapRef.current.offsetHeight / 2 - p.y * ts, ts, 500)
    }
  }

  function handleFilterCat(cat) {
    filterCat(cat)
    if (cat) {
      const ns = SKILL_NODES.filter(n => n.cat === cat)
      if (ns.length) {
        let mx = 0, my = 0, c = 0
        ns.forEach(n => { const pos = NODE_POSITIONS[n.id]; if (pos) { mx += pos.x; my += pos.y; c++ } })
        if (c) {
          mx /= c; my /= c
          const sc = cat === 'CRED' ? .4 : .55
          animateTo(wrapRef.current.offsetWidth / 2 - mx * sc, wrapRef.current.offsetHeight / 2 - my * sc, sc, 600)
        }
      }
    } else {
      resetView()
    }
  }

  function handleBackToFullMap() {
    backToFullMap()
    resetView()
  }

  // Breadcrumb text
  let breadcrumb = <span>Passive Skill Tree</span>
  if (activeCareer && activeCareerData) {
    breadcrumb = <><span>Career Path</span><span style={{ color: 'var(--accent-amber)', fontWeight: 500, marginLeft: 8 }}>{activeCareerData.name}</span></>
  } else if (activeCatFilter) {
    breadcrumb = <><span>Passive Skill Tree</span><span style={{ color: 'var(--accent-amber)', fontWeight: 500, marginLeft: 8 }}>{CAT_NAMES[activeCatFilter]}</span></>
  }

  return (
    <>
      <Header
        breadcrumb={breadcrumb}
        onResetView={resetView}
        onClearPath={clearPath}
        onToggleTheme={toggleTheme}
        theme={theme}
      />

      <Toolbar
        sidebarMode={sidebarMode}
        onSwitchToMap={() => switchMode('map')}
        onOpenAddCareer={() => setModalOpen(true)}
      />

      <Sidebar
        sidebarMode={sidebarMode}
        activeCatFilter={activeCatFilter}
        activeCareer={activeCareer}
        addedCareers={addedCareers}
        onSwitchMode={switchMode}
        onFilterCat={handleFilterCat}
        onSelectCareer={selectCareer}
        onRemoveCareer={removeCareer}
        onBackToFullMap={handleBackToFullMap}
        onNodeSelect={handleNodeSelect}
      />

      {/* Canvas area */}
      <div
        style={{ gridArea: 'canvas', position: 'relative', overflow: 'hidden' }}
      >
        {/* Map canvas — hidden when viewing a career */}
        <div
          ref={wrapRef}
          style={{
            position: 'absolute', inset: 0, cursor: 'grab', overflow: 'hidden',
            display: activeCareer ? 'none' : 'block'
          }}
        >
          <MapCanvas
            wrapRef={wrapRef}
            canvasRef={canvasRef}
            vTx={vTx}
            vTy={vTy}
            vScale={vScale}
            zlblRef={zlblRef}
            selNode={selNode}
            activePath={activePath}
            activeCatFilter={activeCatFilter}
            onNodeClick={handleNodeClick}
            onResetView={resetView}
          />
        </div>

        {/* Career view — shown when a career is active */}
        {activeCareer && activeCareerData && (
          <CareerView
            career={activeCareerData}
            zlblRef={zlblRef}
            onNodeSelect={node => { setSelNode(node) }}
            onHighlightPath={path => setActivePath(path)}
          />
        )}

        <PathInfo activePath={activePath} selNode={selNode} />
        <ZoomControls
          zlblRef={zlblRef}
          onZoomIn={() => zoomBy(1.3)}
          onZoomOut={() => zoomBy(.75)}
        />
        <Legend />
      </div>

      <NodeDetail
        node={selNode}
        onNodeSelect={handleNodeSelect}
        onTraceNode={id => { highlightPath(id) }}
        onClearPath={clearPath}
      />

      <AddCareerModal
        open={modalOpen}
        addedCareers={addedCareers}
        onAdd={addCareer}
        onClose={() => setModalOpen(false)}
      />
    </>
  )
}
