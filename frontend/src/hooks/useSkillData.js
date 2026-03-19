import { useState, useEffect } from 'react'
import { fetchNodes, fetchEdges, fetchCategories } from '../services/dataService'

export default function useSkillData() {
  const [nodes, setNodes] = useState(null)
  const [edges, setEdges] = useState(null)
  const [categories, setCategories] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([fetchNodes(), fetchEdges(), fetchCategories()])
      .then(([n, e, c]) => {
        setNodes(n)
        setEdges(e)
        setCategories(c)
      })
      .catch(err => setError(err))
      .finally(() => setLoading(false))
  }, [])

  return { nodes, edges, categories, loading, error }
}
