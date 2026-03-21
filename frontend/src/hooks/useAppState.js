// frontend/src/hooks/useAppState.js
import { useState, useCallback, useEffect } from 'react'
import { buildFullPath, layoutCareerDAG } from '../utils/graph'
import useCareerPaths from './useCareerPaths'

/**
 * Build a career object for display.
 * Uses pure graph functions that accept data as parameters.
 */
function buildCareerObj(specId, nodeMap, prereqOf, leadsTo) {
  const n = nodeMap[specId]
  if (!n) return null
  const { nodeSet, edgeSet } = buildFullPath(nodeMap, prereqOf, leadsTo, specId)
  ;(leadsTo[specId] || []).forEach(cid => {
    if (nodeMap[cid]?.tier === 3) { nodeSet.add(cid); edgeSet.add(specId + '→' + cid) }
  })
  const positions = layoutCareerDAG(nodeMap, specId, nodeSet, edgeSet)
  return { id: specId, name: n.display_name, cat: n.subject_category, nodeSet, edgeSet, positions }
}

export default function useAppState({ nodes, nodeMap, prereqOf, leadsTo, positions }) {
  const { careerIds, addCareer: persistAddCareer, removeCareer: persistRemoveCareer } = useCareerPaths()

  const [addedCareers, setAddedCareers] = useState([])
  const [activeCareer, setActiveCareer] = useState(null)
  const [sidebarMode, setSidebarMode] = useState('map')
  const [activeCatFilter, setActiveCatFilter] = useState(null)
  const [selNode, setSelNode] = useState(null)
  const [activePath, setActivePath] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  // When graph data and career IDs are loaded, hydrate addedCareers
  useEffect(() => {
    if (!nodeMap || Object.keys(nodeMap).length === 0) return
    if (careerIds.length === 0) return
    setAddedCareers(prev => {
      const existingIds = new Set(prev.map(c => c.id))
      const loaded = careerIds
        .filter(id => !existingIds.has(id))
        .map(id => buildCareerObj(id, nodeMap, prereqOf, leadsTo))
        .filter(Boolean)
      return loaded.length ? [...prev, ...loaded] : prev
    })
  }, [careerIds, nodeMap, prereqOf, leadsTo])

  const highlightPath = useCallback((id) => {
    const path = buildFullPath(nodeMap, prereqOf, leadsTo, id)
    setActivePath(path)
    return path
  }, [nodeMap, prereqOf, leadsTo])

  const clearPath = useCallback(() => setActivePath(null), [])

  const addCareer = useCallback((specId) => {
    const career = buildCareerObj(specId, nodeMap, prereqOf, leadsTo)
    if (!career) return
    setAddedCareers(prev => {
      if (prev.find(c => c.id === specId)) return prev
      return [...prev, career]
    })
    setModalOpen(false)
    setSidebarMode('careers')
    setActiveCareer(specId)
    setActiveCatFilter(null)
    setActivePath(null)
    setSelNode(null)
    persistAddCareer(specId)
  }, [nodeMap, prereqOf, leadsTo, persistAddCareer])

  const removeCareer = useCallback((specId) => {
    setAddedCareers(prev => prev.filter(c => c.id !== specId))
    setActiveCareer(prev => prev === specId ? null : prev)
    persistRemoveCareer(specId)
  }, [persistRemoveCareer])

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
