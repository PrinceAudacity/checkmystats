// frontend/src/hooks/useCareerPaths.js
import { useState, useEffect, useCallback } from 'react'
import { getUserCareers, addUserCareer, removeUserCareer } from '../services/api'

export default function useCareerPaths() {
  const [careerIds, setCareerIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getUserCareers()
      .then(ids => {
        if (cancelled) return
        setCareerIds(ids)
        setLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        setError(err.message || 'Failed to load career paths')
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const addCareer = useCallback(async targetId => {
    try {
      await addUserCareer(targetId)
      setCareerIds(prev => prev.includes(targetId) ? prev : [...prev, targetId])
    } catch (err) {
      setError(err.message || 'Failed to add career path')
    }
  }, [])

  const removeCareer = useCallback(async targetId => {
    try {
      await removeUserCareer(targetId)
      setCareerIds(prev => prev.filter(id => id !== targetId))
    } catch (err) {
      setError(err.message || 'Failed to remove career path')
    }
  }, [])

  return { careerIds, addCareer, removeCareer, loading, error }
}
