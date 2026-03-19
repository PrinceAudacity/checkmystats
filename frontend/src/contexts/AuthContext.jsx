import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

const SUPABASE_CONFIGURED = !!supabase

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
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

  const isAuthenticated = !!session

  return (
    <AuthContext.Provider value={{ session, loading: session === undefined, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  return useContext(AuthContext)
}
