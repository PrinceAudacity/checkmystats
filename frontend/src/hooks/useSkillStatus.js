// frontend/src/hooks/useSkillStatus.js
import { useState, useEffect, useCallback } from 'react'
import { getUserSkills, updateSkillStatus } from '../services/api'

// Map legacy frontend strings to backend canonical values
const TO_BACKEND = { notstarted: 'not_started', inprogress: 'in_progress', mastered: 'mastered' }
// Map backend values back to frontend strings
const TO_FRONTEND = { not_started: 'notstarted', in_progress: 'inprogress', mastered: 'mastered' }

export default function useSkillStatus() {
  const [statuses, setStatuses] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getUserSkills()
      .then(data => {
        if (cancelled) return
        const converted = Object.fromEntries(
          Object.entries(data).map(([id, s]) => [id, TO_FRONTEND[s] ?? s])
        )
        setStatuses(converted)
        setLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        setError(err.message || 'Failed to load skill statuses')
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const updateStatus = useCallback(async (skillId, frontendStatus) => {
    const backendStatus = TO_BACKEND[frontendStatus] ?? 'not_started'
    try {
      await updateSkillStatus(skillId, backendStatus)
      setStatuses(prev => ({ ...prev, [skillId]: frontendStatus }))
    } catch (err) {
      setError(err.message || 'Failed to update skill status')
    }
  }, [])

  return { statuses, updateStatus, loading, error }
}
