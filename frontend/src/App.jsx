// frontend/src/App.jsx
import React, { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useGraph from './hooks/useGraph'
import useAppState from './hooks/useAppState'
import useCanvasView from './hooks/useCanvasView'
import { useAuthContext } from './contexts/AuthContext'

import Header from './components/Header'
import Spinner from './components/Spinner'
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
  const navigate = useNavigate()
  const { session } = useAuthContext()

  const {
    nodes, edges, nodeMap, prereqOf, leadsTo,
    positions, catColorMap, catNameMap,
    loading: graphLoading, error: graphError
  } = useGraph()

  const { vTx, vTy, vScale, zlblRef, resetView, zoomBy, animateTo } = useCanvasView(wrapRef)

  const [panelOpen, setPanelOpen] = useState(false)

  const {
    addedCareers, activeCareer, sidebarMode, activeCatFilter,
    selNode, setSelNode, activePath, setActivePath, modalOpen, setModalOpen,
    highlightPath, clearPath, addCareer, removeCareer, selectCareer,
    backToFullMap, filterCat, switchMode
  } = useAppState({ nodes, nodeMap, prereqOf, leadsTo, positions })

  useEffect(() => {
    document.documentElement.style.setProperty('--panel-w', panelOpen ? '300px' : '0px')
  }, [panelOpen])

  function openDashboard(career) { navigate('/career/' + career.id) }

  const activeCareerData = addedCareers.find(c => c.id === activeCareer) || null

  const [careerProgress, setCareerProgress] = useState({})
  useEffect(() => {
    if (!activeCareer) { setCareerProgress({}); return }
    try { setCareerProgress(JSON.parse(localStorage.getItem('cms_progress_' + activeCareer)) || {}) }
    catch { setCareerProgress({}) }
  }, [activeCareer])

  function handleNodeClick(node) {
    setSelNode(node)
    setPanelOpen(true)
    highlightPath(node.id)
    const p = positions[node.id]
    if (p) {
      const ts = Math.max(vScale.current, .5)
      animateTo(wrapRef.current.offsetWidth / 2 - p.x * ts, wrapRef.current.offsetHeight / 2 - p.y * ts, ts, 500)
    }
  }

  function handleNodeSelect(node) {
    setSelNode(node)
    setPanelOpen(true)
    highlightPath(node.id)
    if (activeCareer) return
    const p = positions[node.id]
    if (p) {
      const ts = Math.max(vScale.current, .5)
      animateTo(wrapRef.current.offsetWidth / 2 - p.x * ts, wrapRef.current.offsetHeight / 2 - p.y * ts, ts, 500)
    }
  }

  function handleFilterCat(cat) {
    filterCat(cat)
    if (cat) {
      const ns = nodes.filter(n => n.subject_category === cat)
      if (ns.length) {
        let mx = 0, my = 0, c = 0
        ns.forEach(n => { const pos = positions[n.id]; if (pos) { mx += pos.x; my += pos.y; c++ } })
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

  let breadcrumb = <span>Passive Skill Tree</span>
  if (activeCareer && activeCareerData) {
    breadcrumb = <><span>Career Path</span><span style={{ color: 'var(--accent-amber)', fontWeight: 500, marginLeft: 8 }}>{activeCareerData.name}</span></>
  } else if (activeCatFilter) {
    breadcrumb = <><span>Passive Skill Tree</span><span style={{ color: 'var(--accent-amber)', fontWeight: 500, marginLeft: 8 }}>{catNameMap[activeCatFilter]}</span></>
  }

  if (graphLoading) return <Spinner label="Loading skill data…" />

  if (graphError) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', color: 'var(--accent-red)', fontSize: 13, fontFamily: 'var(--font)',
        background: 'var(--bg-canvas)'
      }}>
        Failed to load skill data: {graphError}
      </div>
    )
  }

  return (
    <>
      <Header breadcrumb={breadcrumb} onResetView={resetView} onClearPath={clearPath} session={session} />

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
        nodes={nodes}
        catColorMap={catColorMap}
        catNameMap={catNameMap}
        onSwitchMode={switchMode}
        onFilterCat={handleFilterCat}
        onSelectCareer={selectCareer}
        onRemoveCareer={removeCareer}
        onBackToFullMap={handleBackToFullMap}
        onNodeSelect={handleNodeSelect}
      />

      <div style={{ gridArea: 'canvas', position: 'relative', overflow: 'hidden' }}>
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
            vTx={vTx} vTy={vTy} vScale={vScale} zlblRef={zlblRef}
            nodes={nodes}
            edges={edges}
            nodeMap={nodeMap}
            prereqOf={prereqOf}
            positions={positions}
            catColorMap={catColorMap}
            catNameMap={catNameMap}
            selNode={selNode}
            activePath={activePath}
            activeCatFilter={activeCatFilter}
            onNodeClick={handleNodeClick}
            onResetView={resetView}
          />
        </div>

        {activeCareer && activeCareerData && (
          <CareerView
            career={activeCareerData}
            progress={careerProgress}
            zlblRef={zlblRef}
            nodeMap={nodeMap}
            prereqOf={prereqOf}
            leadsTo={leadsTo}
            catColorMap={catColorMap}
            onNodeSelect={node => { setSelNode(node); setPanelOpen(true) }}
            onHighlightPath={path => setActivePath(path)}
            onOpenDashboard={openDashboard}
          />
        )}

        <PathInfo activePath={activePath} selNode={selNode} />
        <ZoomControls zlblRef={zlblRef} onZoomIn={() => zoomBy(1.3)} onZoomOut={() => zoomBy(.75)} />
        <Legend />
      </div>

      <NodeDetail
        node={selNode}
        panelOpen={panelOpen}
        addedCareers={addedCareers}
        nodeMap={nodeMap}
        prereqOf={prereqOf}
        leadsTo={leadsTo}
        catColorMap={catColorMap}
        catNameMap={catNameMap}
        onNodeSelect={handleNodeSelect}
        onTraceNode={id => { highlightPath(id) }}
        onClearPath={clearPath}
        onOpenDashboard={openDashboard}
        onClosePanel={() => setPanelOpen(false)}
      />

      <AddCareerModal
        open={modalOpen}
        addedCareers={addedCareers}
        nodes={nodes}
        prereqOf={prereqOf}
        catColorMap={catColorMap}
        catNameMap={catNameMap}
        onAdd={addCareer}
        onClose={() => setModalOpen(false)}
      />
    </>
  )
}
