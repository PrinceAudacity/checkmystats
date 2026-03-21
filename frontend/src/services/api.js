// frontend/src/services/api.js
import axios from 'axios'
import { supabase } from './supabase'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
})

// Attach JWT from Supabase session to every request
api.interceptors.request.use(async config => {
  if (!supabase) return config
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  return config
})

// On 401, sign out and redirect to sign-in
api.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401) {
      if (supabase) await supabase.auth.signOut()
      window.location.href = '/'
    }
    return Promise.reject(err)
  }
)

// ── Graph ──────────────────────────────────────────────
export const getGraph = () =>
  api.get('/nodes/').then(r => r.data)

export const getNode = nodeId =>
  api.get(`/nodes/${nodeId}`).then(r => r.data)

export const searchNodes = query =>
  api.get('/search/', { params: { q: query } }).then(r => r.data)

export const getPath = (startId, endId) =>
  api.get('/paths/', { params: { start: startId, end: endId } }).then(r => r.data)

// ── User skill status ──────────────────────────────────
export const getUserSkills = () =>
  api.get('/user/skills').then(r => r.data)

export const updateSkillStatus = (skillId, status) =>
  api.put(`/user/skills/${skillId}`, { status }).then(r => r.data)

// ── User career paths ──────────────────────────────────
export const getUserCareers = () =>
  api.get('/user/careers').then(r => r.data)

export const addUserCareer = targetId =>
  api.post('/user/careers', { target_id: targetId }).then(r => r.data)

export const removeUserCareer = careerId =>
  api.delete(`/user/careers/${careerId}`).then(r => r.data)
