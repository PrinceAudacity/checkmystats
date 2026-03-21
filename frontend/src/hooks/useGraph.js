import { useState, useEffect } from 'react'
import { getGraph } from '../services/api'
import { buildGraphMaps } from '../utils/graph'
import { computeNodePositions } from '../utils/layout'

export default function useGraph() {
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [categories, setCategories] = useState([])
  const [nodeMap, setNodeMap] = useState({})
  const [prereqOf, setPrereqOf] = useState({})
  const [leadsTo, setLeadsTo] = useState({})
  const [positions, setPositions] = useState({})
  const [catColorMap, setCatColorMap] = useState({})
  const [catNameMap, setCatNameMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getGraph()
      .then(data => {
        if (cancelled) return
        const { nodes: rawNodes, edges: rawEdges, categories: rawCats } = data
        const maps = buildGraphMaps(rawNodes, rawEdges)
        const pos = computeNodePositions(rawNodes)
        const colorMap = Object.fromEntries(rawCats.map(c => [c.code, c.color]))
        const nameMap = Object.fromEntries(rawCats.map(c => [c.code, c.name]))
        setNodes(rawNodes)
        setEdges(rawEdges)
        setCategories(rawCats)
        setNodeMap(maps.nodeMap)
        setPrereqOf(maps.prereqOf)
        setLeadsTo(maps.leadsTo)
        setPositions(pos)
        setCatColorMap(colorMap)
        setCatNameMap(nameMap)
        setLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        setError(err.message || 'Failed to load skill data')
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  return {
    nodes, edges, categories,
    nodeMap, prereqOf, leadsTo,
    positions, catColorMap, catNameMap,
    loading, error,
  }
}
