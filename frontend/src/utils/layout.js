// frontend/src/utils/layout.js
const CX = 2400, CY = 2400

const DS = {
  MATH:{a:-Math.PI/2,s:.55},SCI:{a:-Math.PI/2-.58,s:.52},CS:{a:-Math.PI/2+.6,s:.42},
  ENG:{a:-Math.PI/2+1.05,s:.35},ME:{a:-Math.PI/2+1.45,s:.58},EE:{a:-Math.PI/2+2.1,s:.6},
  CE:{a:-Math.PI/2+2.78,s:.56},CHE:{a:Math.PI/2+.6,s:.52},AERO:{a:Math.PI/2+.05,s:.5},
  BME:{a:Math.PI/2-.55,s:.52},ENVE:{a:-Math.PI/2-1.18,s:.44},IE:{a:-Math.PI/2-1.7,s:.46},
  MAT:{a:Math.PI/2+1.22,s:.44},NUKE:{a:Math.PI/2+1.72,s:.42},ROB:{a:Math.PI/2-1.1,s:.48},
  CRED:{a:0,s:Math.PI*2}
}

const R_T1=680,R_SP=960,R_BSC=1190,R_MSC=1400,R_PHDC=1590
const LR = { bs:R_BSC, ms:R_MSC, phd:R_PHDC }

export const RINGS = [
  {r:160,l:'Elementary',la:-Math.PI/2-.12},
  {r:310,l:'Middle School',la:-Math.PI/2-.12},
  {r:440,l:'High School / GED',la:-Math.PI/2-.12},
  {r:1100,l:"Bachelor's",la:-Math.PI/2-.08},
  {r:1320,l:"Master's",la:-Math.PI/2-.08},
  {r:1510,l:'PhD',la:-Math.PI/2-.08}
]

export const CANVAS_CENTER = { CX, CY }
export { DS }

const T0_IDS = ['f_counting','f_addition','f_subtraction','f_multiplication','f_division','f_fractions','f_negative','f_ratios','f_percentages','f_algebra1','f_geometry','f_logic','f_stats_basic','f_sci_method','f_comp_basics','f_spreadsheets','f_algebra2','f_trig','f_precalc','f_calculus1','f_calculus2','f_physics_mech','f_physics_em','f_physics_waves','f_chem_general','f_bio_basic','f_tech_writing']

/**
 * Compute canvas positions for all nodes.
 * @param {Array} nodes - array of node objects with { id, tier, subject_category, degree_level }
 * @returns {Object} id → { x, y }
 */
export function computeNodePositions(nodes) {
  const fP = {}

  // Tier 0 — foundation spiral (fixed order)
  T0_IDS.forEach((id, i, arr) => {
    const t = i / (arr.length - 1)
    const r = 70 + t * 350
    const a = -Math.PI / 2 + t * Math.PI * 2 * 2.6
    fP[id] = { x: CX + Math.cos(a) * (r + (i % 3 - 1) * 12), y: CY + Math.sin(a) * (r + (i % 3 - 1) * 12) }
  })

  // Tier 1 — domain ring
  const dg = {}
  nodes.filter(n => n.tier === 1).forEach(n => {
    if (!dg[n.subject_category]) dg[n.subject_category] = []
    dg[n.subject_category].push(n)
  })
  Object.entries(dg).forEach(([c, ns]) => {
    const s = DS[c]
    if (!s) return
    const b = s.a - s.s / 2
    ns.forEach((n, i) => {
      const t = ns.length === 1 ? .5 : i / (ns.length - 1)
      const a = b + t * s.s
      fP[n.id] = { x: CX + Math.cos(a) * (R_T1 + (i % 3 - 1) * 28), y: CY + Math.sin(a) * (R_T1 + (i % 3 - 1) * 28) }
    })
  })

  // Tier 2 — specialization ring
  nodes.filter(n => n.tier === 2).forEach(n => {
    const s = DS[n.subject_category]
    if (!s) { fP[n.id] = { x: CX, y: CY - R_SP }; return }
    const d1 = nodes.filter(x => x.tier === 1 && x.subject_category === n.subject_category)
    let ax = 0, ay = 0
    d1.forEach(x => { const p = fP[x.id]; if (p) { ax += p.x - CX; ay += p.y - CY } })
    const c = d1.length || 1
    const ca = Math.atan2(ay / c, ax / c)
    const d2 = nodes.filter(x => x.tier === 2 && x.subject_category === n.subject_category)
    const idx = d2.indexOf(n)
    const sp = (d2.length - 1) * .14
    fP[n.id] = {
      x: CX + Math.cos(ca + (idx / Math.max(d2.length - 1, 1)) * sp - sp / 2) * R_SP,
      y: CY + Math.sin(ca + (idx / Math.max(d2.length - 1, 1)) * sp - sp / 2) * R_SP
    }
  })

  // Tier 3 — career/cert outer rings (bucketed by degree_level)
  const cg2 = {}
  nodes.filter(n => n.tier === 3).forEach(n => {
    const k = n.subject_category + '-' + (n.degree_level || 'bs')
    if (!cg2[k]) cg2[k] = []
    cg2[k].push(n)
  })
  Object.entries(cg2).forEach(([k, ns]) => {
    const c = k.split('-')[0], lv = k.split('-')[1]
    const r = LR[lv] || R_BSC
    const s = DS[c] || { a: 0, s: .3 }
    const sm = c === 'CRED' ? .4 : 1.3
    const b = s.a - s.s / 2 * sm
    ns.forEach((n, i) => {
      const t = ns.length === 1 ? .5 : i / (ns.length - 1)
      fP[n.id] = {
        x: CX + Math.cos(b + t * s.s * sm) * (r + (i % 2) * 20),
        y: CY + Math.sin(b + t * s.s * sm) * (r + (i % 2) * 20)
      }
    })
  })

  return fP
}
