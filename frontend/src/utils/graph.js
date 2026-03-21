// frontend/src/utils/graph.js
// Pure graph utility functions — no module-level singletons.
// All functions accept nodeMap and/or edges as first parameters.

/**
 * Build lookup maps from raw nodes and edges arrays.
 * @param {Array} nodes - array of node objects with .id
 * @param {Array} edges - array of {source, target} objects
 * @returns {{ nodeMap, prereqOf, leadsTo }}
 */
export function buildGraphMaps(nodes, edges) {
  const nodeMap = {}
  const prereqOf = {}
  const leadsTo = {}
  nodes.forEach(n => {
    nodeMap[n.id] = n
    prereqOf[n.id] = []
    leadsTo[n.id] = []
  })
  edges.forEach(({ source, target }) => {
    if (nodeMap[source] && nodeMap[target]) {
      leadsTo[source].push(target)
      prereqOf[target].push(source)
    }
  })
  return { nodeMap, prereqOf, leadsTo }
}

/**
 * Build the full prerequisite path from a target node back to foundations.
 * @param {Object} nodeMap - id → node
 * @param {Object} prereqOf - id → [prerequisite ids]
 * @param {Object} leadsTo  - id → [unlock ids]
 * @param {string} sid      - starting node id
 * @returns {{ nodeSet: Set, edgeSet: Set }}
 */
export function buildFullPath(nodeMap, prereqOf, leadsTo, sid) {
  const n = nodeMap[sid]
  if (!n) return { nodeSet: new Set([sid]), edgeSet: new Set() }
  const ns = new Set(), es = new Set()
  ns.add(sid)
  const dc = n.subject_category
  const q = [sid], vis = new Set([sid])
  while (q.length) {
    const cur = q.shift()
    const cn = nodeMap[cur]
    if (!cn) continue
    let acc = []
    if (cn.tier === 3)
      acc = (prereqOf[cur] || []).filter(p => {
        const pn = nodeMap[p]
        return pn && (pn.tier === 2 ? pn.subject_category === dc : pn.subject_category === dc || 'MATH CS ENG'.includes(pn.subject_category))
      })
    else if (cn.tier === 2)
      acc = (prereqOf[cur] || []).filter(p => {
        const pn = nodeMap[p]
        return pn && (pn.subject_category === cn.subject_category || 'MATH CS ENG'.includes(pn.subject_category))
      })
    else if (cn.tier === 1)
      acc = (prereqOf[cur] || []).filter(p => {
        const pn = nodeMap[p]
        return pn && (pn.tier === 0 || pn.subject_category === dc || 'MATH CS ENG'.includes(pn.subject_category))
      })
    else
      acc = (prereqOf[cur] || []).filter(p => nodeMap[p]?.tier === 0)
    for (const pid of acc) {
      es.add(pid + '→' + cur)
      ns.add(pid)
      if (!vis.has(pid)) { vis.add(pid); q.push(pid) }
    }
  }
  return { nodeSet: ns, edgeSet: es }
}

/**
 * Layout nodes of a career DAG into a column-based grid.
 * @param {Object} nodeMap - id → node
 * @param {string} specId  - root career node id
 * @param {Set}    nodeSet - set of node ids to lay out
 * @param {Set}    edgeSet - set of "from→to" edge strings
 * @returns {Object} id → { x, y }
 */
export function layoutCareerDAG(nodeMap, specId, nodeSet, edgeSet) {
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
      const na = nodeMap[a], nb = nodeMap[b]
      if (!na || !nb) return 0
      if (na.subject_category !== nb.subject_category) return na.subject_category < nb.subject_category ? -1 : 1
      return na.display_name < nb.display_name ? -1 : 1
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
