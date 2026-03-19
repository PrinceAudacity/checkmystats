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
