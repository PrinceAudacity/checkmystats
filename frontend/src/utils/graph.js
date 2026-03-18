import { SKILL_NODES, EDGES } from '../data/skillData'

export function buildGraphMaps() {
  const nById = {}
  const prereqOf = {}
  const leadsTo = {}
  SKILL_NODES.forEach(n => {
    nById[n.id] = n
    prereqOf[n.id] = []
    leadsTo[n.id] = []
  })
  EDGES.forEach(([a, b]) => {
    if (nById[a] && nById[b]) {
      leadsTo[a].push(b)
      prereqOf[b].push(a)
    }
  })
  return { nById, prereqOf, leadsTo }
}

const { nById, prereqOf, leadsTo } = buildGraphMaps()
export { nById, prereqOf, leadsTo }

export function buildFullPath(sid) {
  const n = nById[sid]
  if (!n) return { nodeSet: new Set([sid]), edgeSet: new Set() }
  const ns = new Set(), es = new Set()
  ns.add(sid)
  const dc = n.cat
  const q = [sid], vis = new Set([sid])
  while (q.length) {
    const cur = q.shift()
    const cn = nById[cur]
    if (!cn) continue
    let acc = []
    if (cn.tier === 3)
      acc = (prereqOf[cur] || []).filter(p => {
        const pn = nById[p]
        return pn && (pn.tier === 2 ? pn.cat === dc : pn.cat === dc || 'MATH CS ENG'.includes(pn.cat))
      })
    else if (cn.tier === 2)
      acc = (prereqOf[cur] || []).filter(p => {
        const pn = nById[p]
        return pn && (pn.cat === cn.cat || 'MATH CS ENG'.includes(pn.cat))
      })
    else if (cn.tier === 1)
      acc = (prereqOf[cur] || []).filter(p => {
        const pn = nById[p]
        return pn && (pn.tier === 0 || pn.cat === dc || 'MATH CS ENG'.includes(pn.cat))
      })
    else
      acc = (prereqOf[cur] || []).filter(p => nById[p]?.tier === 0)
    for (const pid of acc) {
      es.add(pid + '→' + cur)
      ns.add(pid)
      if (!vis.has(pid)) { vis.add(pid); q.push(pid) }
    }
  }
  return { nodeSet: ns, edgeSet: es }
}

export function layoutCareerDAG(specId, nodeSet, edgeSet) {
  const pos = {}
  const ids = [...nodeSet]
  const depth = {}
  ids.forEach(id => depth[id] = 0)
  let changed = true
  while (changed) {
    changed = false
    edgeSet.forEach(e => {
      const [a, b] = e.split('→')
      if (depth[b] !== undefined && depth[a] !== undefined && depth[b] <= depth[a]) {
        depth[b] = depth[a] + 1
        changed = true
      }
    })
  }
  const cols = {}
  ids.forEach(id => {
    const d = depth[id]
    if (!cols[d]) cols[d] = []
    cols[d].push(id)
  })
  const colKeys = Object.keys(cols).map(Number).sort((a, b) => a - b)
  colKeys.forEach(c => {
    cols[c].sort((a, b) => {
      const na = nById[a], nb = nById[b]
      if (na.cat !== nb.cat) return na.cat < nb.cat ? -1 : 1
      return na.name < nb.name ? -1 : 1
    })
  })
  const CARD_W = 160, CARD_H = 58, COL_GAP = 90, ROW_GAP = 22
  const maxRows = Math.max(...colKeys.map(c => cols[c].length))
  colKeys.forEach((c, ci) => {
    const rows = cols[c]
    const groupH = rows.length * (CARD_H + ROW_GAP) - ROW_GAP
    const totalH = maxRows * (CARD_H + ROW_GAP) - ROW_GAP
    const yOff = (totalH - groupH) / 2
    rows.forEach((id, ri) => {
      pos[id] = { x: ci * (CARD_W + COL_GAP) + 40, y: yOff + ri * (CARD_H + ROW_GAP) + 40 }
    })
  })
  return pos
}
