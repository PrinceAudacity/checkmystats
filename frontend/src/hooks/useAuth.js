import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

const SUPABASE_CONFIGURED = !!supabase

export default function useAuth() {
  // undefined = still loading; null = no session; object = has session
  const [session, setSession] = useState(SUPABASE_CONFIGURED ? undefined : null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
    })
    return () => subscription.unsubscribe()
  }, [])

  // If Supabase not configured, bypass auth entirely
  const isAuthenticated = !SUPABASE_CONFIGURED || !!session
  return { session, loading: session === undefined, isAuthenticated }
}
