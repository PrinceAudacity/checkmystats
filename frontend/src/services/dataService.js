import { supabase } from './supabase'
import { SKILL_NODES, EDGES } from '../data/skillData'

export async function fetchNodes() {
  if (!supabase) return SKILL_NODES
  const { data, error } = await supabase.from('nodes').select('*')
  if (error || !data?.length) return SKILL_NODES
  return data
}

export async function fetchEdges() {
  if (!supabase) return EDGES
  const { data, error } = await supabase.from('edges').select('*')
  if (error || !data?.length) return EDGES
  return data
}

export async function fetchCategories() {
  if (!supabase) return null
  const { data, error } = await supabase.from('categories').select('*')
  if (error) return null
  return data
}

// ── Status helpers ──────────────────────────────────────
const TO_BACKEND  = { notstarted: 'not_started', inprogress: 'in_progress', mastered: 'mastered' }
const TO_FRONTEND = { not_started: 'notstarted', in_progress: 'inprogress', mastered: 'mastered' }

export async function fetchUserSkillStatuses(userId) {
  if (!supabase || !userId) return {}
  const { data, error } = await supabase
    .from('user_skill_status')
    .select('skill_id, status')
    .eq('user_id', userId)
  if (error || !data) return {}
  return Object.fromEntries(data.map(r => [r.skill_id, TO_FRONTEND[r.status] ?? r.status]))
}

export async function upsertSkillStatus(userId, skillId, frontendStatus) {
  if (!supabase || !userId) return
  const status = TO_BACKEND[frontendStatus] ?? 'not_started'
  const extra = {}
  if (frontendStatus === 'inprogress') extra.started_at = new Date().toISOString()
  if (frontendStatus === 'mastered')   extra.completed_at = new Date().toISOString()
  if (frontendStatus === 'notstarted') { extra.started_at = null; extra.completed_at = null }
  await supabase
    .from('user_skill_status')
    .upsert({ user_id: userId, skill_id: skillId, status, ...extra }, { onConflict: 'user_id,skill_id' })
}

// ── Career path helpers ─────────────────────────────────
export async function fetchUserCareerPaths(userId) {
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from('user_career_paths')
    .select('target_id')
    .eq('user_id', userId)
  if (error || !data) return []
  return data.map(r => r.target_id)
}

export async function insertCareerPath(userId, targetId) {
  if (!supabase || !userId) return
  await supabase
    .from('user_career_paths')
    .upsert({ user_id: userId, target_id: targetId }, { onConflict: 'user_id,target_id' })
}

export async function deleteCareerPath(userId, targetId) {
  if (!supabase || !userId) return
  await supabase
    .from('user_career_paths')
    .delete()
    .eq('user_id', userId)
    .eq('target_id', targetId)
}
