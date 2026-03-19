import { useState, useCallback, useEffect } from 'react'
import { nById, leadsTo, buildFullPath, layoutCareerDAG } from '../utils/graph'
import useAuth from './useAuth'
import { fetchUserCareerPaths, insertCareerPath, deleteCareerPath } from '../services/dataService'

function buildCareerObj(specId) {
  const n = nById[specId]
  if (!n) return null
  const { nodeSet, edgeSet } = buildFullPath(specId)
  ;(leadsTo[specId] || []).forEach(cid => {
    if (nById[cid]?.tier === 3) { nodeSet.add(cid); edgeSet.add(specId + '→' + cid) }
  })
  const positions = layoutCareerDAG(specId, nodeSet, edgeSet)
  return { id: specId, name: n.name, cat: n.cat, nodeSet, edgeSet, positions }
}

export default function useAppState() {
  const { session } = useAuth()
  const userId = session?.user?.id

  const [addedCareers, setAddedCareers] = useState([])
  const [activeCareer, setActiveCareer] = useState(null)
  const [sidebarMode, setSidebarMode] = useState('map')
  const [activeCatFilter, setActiveCatFilter] = useState(null)
  const [selNode, setSelNode] = useState(null)
  const [activePath, setActivePath] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    if (!userId) return
    fetchUserCareerPaths(userId).then(ids => {
      setAddedCareers(prev => {
        const existingIds = new Set(prev.map(c => c.id))
        const loaded = ids.map(buildCareerObj).filter(c => c && !existingIds.has(c.id))
        return loaded.length ? [...prev, ...loaded] : prev
      })
    })
  }, [userId])

  const highlightPath = useCallback((id) => {
    const path = buildFullPath(id)
    setActivePath(path)
    return path
  }, [])

  const clearPath = useCallback(() => {
    setActivePath(null)
  }, [])

  const addCareer = useCallback((specId) => {
    const career = buildCareerObj(specId)
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
    if (userId) insertCareerPath(userId, specId)
  }, [userId])

  const removeCareer = useCallback((specId) => {
    setAddedCareers(prev => prev.filter(c => c.id !== specId))
    setActiveCareer(prev => prev === specId ? null : prev)
    if (userId) deleteCareerPath(userId, specId)
  }, [userId])

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
