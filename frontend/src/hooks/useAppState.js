import { useState, useCallback } from 'react'
import { nById, leadsTo, buildFullPath, layoutCareerDAG } from '../utils/graph'

export default function useAppState() {
  const [addedCareers, setAddedCareers] = useState([])
  const [activeCareer, setActiveCareer] = useState(null)
  const [sidebarMode, setSidebarMode] = useState('map')
  const [activeCatFilter, setActiveCatFilter] = useState(null)
  const [selNode, setSelNode] = useState(null)
  const [activePath, setActivePath] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  const highlightPath = useCallback((id) => {
    const path = buildFullPath(id)
    setActivePath(path)
    return path
  }, [])

  const clearPath = useCallback(() => {
    setActivePath(null)
  }, [])

  const addCareer = useCallback((specId) => {
    const n = nById[specId]
    if (!n) return
    const { nodeSet, edgeSet } = buildFullPath(specId)
    // Include tier-3 career outcomes from this specialization
    ;(leadsTo[specId] || []).forEach(cid => {
      if (nById[cid]?.tier === 3) {
        nodeSet.add(cid)
        edgeSet.add(specId + '→' + cid)
      }
    })
    const positions = layoutCareerDAG(specId, nodeSet, edgeSet)
    setAddedCareers(prev => {
      if (prev.find(c => c.id === specId)) return prev
      return [...prev, { id: specId, name: n.name, cat: n.cat, nodeSet, edgeSet, positions }]
    })
    setModalOpen(false)
    setSidebarMode('careers')
    setActiveCareer(specId)
    setActiveCatFilter(null)
    setActivePath(null)
    setSelNode(null)
  }, [])

  const removeCareer = useCallback((specId) => {
    setAddedCareers(prev => prev.filter(c => c.id !== specId))
    setActiveCareer(prev => prev === specId ? null : prev)
  }, [])

  const selectCareer = useCallback((specId) => {
    setActiveCareer(specId)
    setActiveCatFilter(null)
    setActivePath(null)
    setSelNode(null)
  }, [])

  const backToFullMap = useCallback(() => {
    setActiveCareer(null)
    setActivePath(null)
    setActiveCatFilter(null)
    setSelNode(null)
  }, [])

  const filterCat = useCallback((cat) => {
    setActiveCatFilter(cat)
    setActiveCareer(null)
    setActivePath(null)
  }, [])

  const switchMode = useCallback((m) => {
    setSidebarMode(m)
    if (m === 'map') backToFullMap()
  }, [backToFullMap])

  return {
    addedCareers, activeCareer, sidebarMode, activeCatFilter,
    selNode, setSelNode, activePath, setActivePath, modalOpen, setModalOpen,
    highlightPath, clearPath, addCareer, removeCareer, selectCareer,
    backToFullMap, filterCat, switchMode
  }
}
