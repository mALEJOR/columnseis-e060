// ═══════════════════════════════════════════════════════════════════
// Irregularidades Sísmicas E.030-2025 — Motor de Cálculo
// ═══════════════════════════════════════════════════════════════════

// Table of Ro values by structural system
export const SISTEMAS_ESTRUCTURALES = [
  { nombre: 'Pórticos C.A.', Ro: 8 },
  { nombre: 'Dual C.A.', Ro: 7 },
  { nombre: 'Muros C.A.', Ro: 6 },
  { nombre: 'Muros Duct. Limitada', Ro: 4 },
  { nombre: 'Albañilería', Ro: 3 },
  { nombre: 'Madera', Ro: 7 },
]

// Max permitted drifts by material (Table N°11)
export const DERIVAS_PERMITIDAS = {
  'Concreto Armado': 0.007,
  'Acero': 0.010,
  'Albañilería': 0.005,
  'Madera': 0.010,
  'Muros Duct. Limitada': 0.005,
}

export const MATERIALES = Object.keys(DERIVAS_PERMITIDAS)

/**
 * Get Ro for a structural system name
 */
export function getRo(sistemaNombre) {
  const s = SISTEMAS_ESTRUCTURALES.find(s => s.nombre === sistemaNombre)
  return s ? s.Ro : 6
}

/**
 * Get the irregularity factor (0.75 for irregular, 0.85 for regular... wait)
 * Factor for drift amplification: 0.75 if regular, 0.85 if irregular
 */
export function getFactorDerivas(esIrregular) {
  return esIrregular ? 0.85 : 0.75
}

// ─── DERIVAS (Drift Verification) ─────────────────────────────────

/**
 * Calculate drift verification for one direction
 * @param {Array} pisos - Array of {hi, deltaElastico} for each floor (top to bottom, index 0 = top floor)
 * @param {number} nPisos - number of floors
 * @param {number} factor - 0.75 or 0.85
 * @param {number} R - R coefficient for this direction
 * @param {number} derivaPermitida - max permitted drift for this material
 * @returns {Array} results per floor with {piso, hi, deltaElastico, deltaInelastico, derivaPermitida, ratio, cumple}
 */
export function calcularDerivas(pisos, nPisos, factor, R, derivaPermitida) {
  const results = []
  for (let i = 0; i < nPisos; i++) {
    const p = pisos[i] || {}
    const deltaEl = p.deltaElastico
    if (deltaEl == null || deltaEl === '' || isNaN(deltaEl)) {
      results.push({
        piso: i === nPisos - 1 ? 'Azotea' : (nPisos - i),
        hi: p.hi || '',
        deltaElastico: '',
        deltaInelastico: '',
        derivaPermitida,
        ratio: '',
        cumple: '',
      })
      continue
    }
    const deltaInel = factor * R * deltaEl
    const ratio = derivaPermitida > 0 ? deltaInel / derivaPermitida : ''
    results.push({
      piso: i === nPisos - 1 ? 'Azotea' : (nPisos - i),
      hi: p.hi || '',
      deltaElastico: deltaEl,
      deltaInelastico: deltaInel,
      derivaPermitida,
      ratio: typeof ratio === 'number' ? ratio : '',
      cumple: typeof ratio === 'number' ? (ratio <= 1 ? 'CUMPLE' : 'NO CUMPLE') : '',
    })
  }
  return results
}

/**
 * Summary for one direction drift verification
 */
export function resumenDerivas(resultados) {
  const validos = resultados.filter(r => typeof r.deltaInelastico === 'number')
  if (validos.length === 0) return { maxCalc: '', maxPerm: '', ratio: '', cumple: '' }
  const maxCalc = Math.max(...validos.map(r => r.deltaInelastico))
  const maxPerm = validos[0]?.derivaPermitida || 0
  const ratio = maxPerm > 0 ? maxCalc / maxPerm : ''
  const cumple = validos.some(r => r.cumple === 'NO CUMPLE') ? 'NO CUMPLE' : 'CUMPLE'
  return { maxCalc, maxPerm, ratio, cumple }
}

// ─── IRREGULARIDAD EN PLANTA ──────────────────────────────────────

// 1. Torsión
/**
 * @param {Array} pisos - [{deltaMax, deltaProm}] for each floor
 * @param {Array} derivasInelasticas - deltaInelastico per floor (from drift calc)
 * @param {number} derivaPermitida - max permitted drift
 * @param {number} nPisos
 * @returns {object} {rows, ipTorsion}
 */
export function calcularTorsion(pisos, derivasInelasticas, derivaPermitida, nPisos) {
  const rows = []
  for (let i = 0; i < nPisos; i++) {
    const p = pisos[i] || {}
    const dMax = p.deltaMax
    const dProm = p.deltaProm
    const ratio = (dMax != null && dProm != null && dProm !== 0 && dMax !== '' && dProm !== '')
      ? dMax / dProm : ''
    const deltaI = (derivasInelasticas && derivasInelasticas[i] != null && derivasInelasticas[i] !== '')
      ? derivasInelasticas[i] : ''
    const excede05 = (typeof deltaI === 'number' && typeof derivaPermitida === 'number' && derivaPermitida > 0)
      ? (deltaI > 0.5 * derivaPermitida ? 'SI' : 'NO') : ''

    let cond = ''
    if (typeof ratio === 'number') {
      if (ratio > 1.5) cond = 'EXTR'
      else if (excede05 === 'SI' && ratio > 1.3) cond = 'TORS'
      else cond = 'REG'
    }

    rows.push({
      piso: i === nPisos - 1 ? 'Azotea' : (nPisos - i),
      deltaMax: dMax ?? '',
      deltaProm: dProm ?? '',
      ratio,
      deltaI,
      derivaPerm: derivaPermitida,
      excede05,
      cond,
    })
  }

  const hasExtr = rows.some(r => r.cond === 'EXTR')
  const hasTors = rows.some(r => r.cond === 'TORS')
  const ipTorsion = hasExtr ? 0.6 : (hasTors ? 0.75 : 1)

  return { rows, ipTorsion }
}

// 2. Esquinas Entrantes
export function calcularEsquinasEntrantes(aEntrante, aTotal, bEntrante, bTotal) {
  const limA = 0.2 * (aTotal || 0)
  const limB = 0.2 * (bTotal || 0)
  const irregX = (aEntrante || 0) > limA
  const irregY = (bEntrante || 0) > limB
  const ipX = irregX ? 0.9 : 1
  const ipY = irregY ? 0.9 : 1
  return { limA, limB, irregX, irregY, ipX, ipY }
}

// 3. Discontinuidad del Diafragma
export function calcularDiafragma(areaBruta, areaAberturas, dimLx, sumaHuecosX, dimLy, sumaHuecosY) {
  // Criterion 1: openings > 50% gross area
  const pctAberturas = (areaBruta && areaBruta > 0) ? (areaAberturas / areaBruta) * 100 : ''
  const crit1 = typeof pctAberturas === 'number' ? (pctAberturas > 50 ? 'IRREGULAR' : 'REGULAR') : ''

  // Criterion 2: net section < 50% per direction
  const netaX = (dimLx != null && sumaHuecosX != null) ? dimLx - sumaHuecosX : ''
  const pctNetaX = (dimLx && dimLx > 0 && netaX !== '') ? (netaX / dimLx) * 100 : ''
  const crit2X = typeof pctNetaX === 'number' ? (pctNetaX < 50 ? 'IRREGULAR' : 'REGULAR') : ''

  const netaY = (dimLy != null && sumaHuecosY != null) ? dimLy - sumaHuecosY : ''
  const pctNetaY = (dimLy && dimLy > 0 && netaY !== '') ? (netaY / dimLy) * 100 : ''
  const crit2Y = typeof pctNetaY === 'number' ? (pctNetaY < 50 ? 'IRREGULAR' : 'REGULAR') : ''

  // Ip: Crit1 applies to both dirs, Crit2 applies per direction
  const ipX = (crit1 === 'IRREGULAR' || crit2X === 'IRREGULAR') ? 0.85 : 1
  const ipY = (crit1 === 'IRREGULAR' || crit2Y === 'IRREGULAR') ? 0.85 : 1

  return { pctAberturas, crit1, netaX, pctNetaX, crit2X, netaY, pctNetaY, crit2Y, ipX, ipY }
}

// 4. Sistemas No Paralelos — logica dual: angulo + cortante
// elementos = [{nombre, vx, vy, npX, npY}], angulo = {thetaX, thetaY}
export function calcularNoParalelos(activo, elementos, angulo) {
  const empty = { rows: [], ipX: 1, ipY: 1, irregularX: false, irregularY: false,
    vPisoX: 0, vPisoY: 0, vNoparX: 0, vNoparY: 0, pctX: 0, pctY: 0,
    angXCumple: false, angYCumple: false, cortXCumple: false, cortYCumple: false,
    resultadoX: 'REG', resultadoY: 'REG' }
  if (!activo) return empty

  const rows = elementos
    .filter(el => el.nombre || el.vx || el.vy)
    .map(el => {
      const vx = typeof el.vx === 'number' ? el.vx : (parseFloat(el.vx) || 0)
      const vy = typeof el.vy === 'number' ? el.vy : (parseFloat(el.vy) || 0)
      return { nombre: el.nombre, vx, vy, npX: !!el.npX, npY: !!el.npY }
    })

  const vPisoX = rows.reduce((s, r) => s + r.vx, 0)
  const vPisoY = rows.reduce((s, r) => s + r.vy, 0)
  const vNoparX = rows.filter(r => r.npX).reduce((s, r) => s + r.vx, 0)
  const vNoparY = rows.filter(r => r.npY).reduce((s, r) => s + r.vy, 0)
  const pctX = vPisoX > 0 ? (vNoparX / vPisoX) * 100 : 0
  const pctY = vPisoY > 0 ? (vNoparY / vPisoY) * 100 : 0

  // Logica dual: angulo >= 30 Y cortante >= 10% → IRREG
  const angXCumple = angulo?.thetaX != null && angulo.thetaX >= 30
  const angYCumple = angulo?.thetaY != null && angulo.thetaY >= 30
  const cortXCumple = pctX >= 10
  const cortYCumple = pctY >= 10

  const classify = (a, c) => (a && c) ? 'IRREG' : (a || c) ? 'REG (excepcion)' : 'REG'
  const resultadoX = classify(angXCumple, cortXCumple)
  const resultadoY = classify(angYCumple, cortYCumple)

  return {
    rows, vPisoX, vPisoY, vNoparX, vNoparY, pctX, pctY,
    angXCumple, angYCumple, cortXCumple, cortYCumple,
    resultadoX, resultadoY,
    irregularX: resultadoX === 'IRREG', irregularY: resultadoY === 'IRREG',
    ipX: resultadoX === 'IRREG' ? 0.9 : 1, ipY: resultadoY === 'IRREG' ? 0.9 : 1,
  }
}

// Angulo global del sistema no paralelo + angulos por eje
export function calcularAnguloGlobal(dx, dy) {
  if ((!dx && !dy) || (dx === 0 && dy === 0)) return { theta: null, thetaX: null, thetaY: null, cos: null, sin: null }
  const rad = Math.atan2(dy, dx)
  const deg = rad * 180 / Math.PI
  return { theta: deg, thetaX: deg, thetaY: Math.abs(90 - deg), cos: Math.cos(rad), sin: Math.sin(rad) }
}

// Summary Ip
export function calcularIpFinal(ipTorsionX, ipTorsionY, ipEsquinasX, ipEsquinasY, ipDiafragmaX, ipDiafragmaY, ipSistemasX, ipSistemasY) {
  const ipX = Math.min(ipTorsionX, ipEsquinasX, ipDiafragmaX, ipSistemasX)
  const ipY = Math.min(ipTorsionY, ipEsquinasY, ipDiafragmaY, ipSistemasY)
  return { ipX, ipY }
}

// ─── IRREGULARIDAD EN ALTURA ──────────────────────────────────────

// 1. Rigidez - Piso Blando (Ia = 0.75)
// Ki = Vi / CMi
// Condition: Ki < 0.70*K(i+1) OR Ki < 0.80*avg(3 upper floors)
// For floor index 1 (top), no K(i+1) comparison ("---")
// For floors <= 3, no avg comparison ("---")
/**
 * @param {Array} pisos - [{Vi, CMi}] top to bottom
 * @param {number} nPisos
 * @returns {object} {rows, ia}
 */
export function calcularRigidez(pisos, nPisos) {
  // Calculate Ki for each floor
  const Ki = []
  for (let i = 0; i < nPisos; i++) {
    const p = pisos[i] || {}
    if (p.Vi != null && p.CMi != null && p.CMi !== 0 && p.Vi !== '' && p.CMi !== '') {
      Ki.push(p.Vi / p.CMi)
    } else {
      Ki.push(null)
    }
  }

  const rows = []
  for (let i = 0; i < nPisos; i++) {
    const floorNum = i + 1 // 1-based index from top
    const ki = Ki[i]

    // 0.70*K(i+1) — the floor above (i-1 in array since top=0)
    // For the topmost floor (i=0, floorNum=1), it's "---"
    let limit70 = '---'
    if (floorNum > 1 && Ki[i - 1] != null) {
      limit70 = 0.7 * Ki[i - 1]
    }

    // 0.80*avg(3 floors above) — for floors 1,2,3 it's "---"
    let limit80avg = '---'
    if (floorNum > 3) {
      const above3 = [Ki[i-1], Ki[i-2], Ki[i-3]].filter(k => k != null)
      if (above3.length === 3) {
        limit80avg = 0.8 * (above3[0] + above3[1] + above3[2]) / 3
      }
    }

    let cond = ''
    if (ki != null) {
      if (limit70 === '---' && limit80avg === '---') {
        cond = 'OK'
      } else if (limit80avg === '---') {
        cond = ki < limit70 ? 'IRREG' : 'OK'
      } else {
        cond = (ki < limit70 || ki < limit80avg) ? 'IRREG' : 'OK'
      }
    }

    rows.push({
      piso: i === nPisos - 1 ? 'Azotea' : (nPisos - i),
      Vi: pisos[i]?.Vi ?? '',
      CMi: pisos[i]?.CMi ?? '',
      Ki: ki,
      limit70,
      limit80avg,
      cond,
    })
  }

  const ia = rows.some(r => r.cond === 'IRREG') ? 0.75 : 1
  return { rows, Ki, ia }
}

// 2. Rigidez Extrema (Ia = 0.50)
// Same data as rigidez but thresholds: 0.60*K(i+1) and 0.70*avg(3)
export function calcularRigidezExtrema(Ki, nPisos) {
  const rows = []
  for (let i = 0; i < nPisos; i++) {
    const floorNum = i + 1
    const ki = Ki[i]

    let limit60 = '---'
    if (floorNum > 1 && Ki[i - 1] != null) {
      limit60 = 0.6 * Ki[i - 1]
    }

    let limit70avg = '---'
    if (floorNum > 3) {
      const above3 = [Ki[i-1], Ki[i-2], Ki[i-3]].filter(k => k != null)
      if (above3.length === 3) {
        limit70avg = 0.7 * (above3[0] + above3[1] + above3[2]) / 3
      }
    }

    let cond = ''
    if (ki != null) {
      if (limit60 === '---' && limit70avg === '---') {
        cond = 'OK'
      } else if (limit70avg === '---') {
        cond = ki < limit60 ? 'IRREG' : 'OK'
      } else {
        cond = (ki < limit60 || ki < limit70avg) ? 'IRREG' : 'OK'
      }
    }

    rows.push({
      piso: i === nPisos - 1 ? 'Azotea' : (nPisos - i),
      Ki: ki,
      limit60,
      limit70avg,
      cond,
    })
  }

  const ia = rows.some(r => r.cond === 'IRREG') ? 0.5 : 1
  return { rows, ia }
}

// 3. Resistencia - Piso Débil (Ia = 0.75)
// Vi < 0.80*V(i+1)
export function calcularResistencia(pisos, nPisos) {
  const rows = []
  for (let i = 0; i < nPisos; i++) {
    const floorNum = i + 1
    const vi = pisos[i]?.Vi

    let limit80 = '---'
    if (floorNum > 1 && pisos[i - 1]?.Vi != null && pisos[i - 1].Vi !== '') {
      limit80 = 0.8 * pisos[i - 1].Vi
    }

    let cond = ''
    if (vi != null && vi !== '') {
      if (limit80 === '---') cond = 'OK'
      else cond = vi < limit80 ? 'IRREG' : 'OK'
    }

    rows.push({
      piso: i === nPisos - 1 ? 'Azotea' : (nPisos - i),
      Vi: vi ?? '',
      limit80,
      cond,
    })
  }

  const ia = rows.some(r => r.cond === 'IRREG') ? 0.75 : 1
  return { rows, ia }
}

// 4. Resistencia Extrema (Ia = 0.50)
// Vi < 0.65*V(i+1)
export function calcularResistenciaExtrema(pisos, nPisos) {
  const rows = []
  for (let i = 0; i < nPisos; i++) {
    const floorNum = i + 1
    const vi = pisos[i]?.Vi

    let limit65 = '---'
    if (floorNum > 1 && pisos[i - 1]?.Vi != null && pisos[i - 1].Vi !== '') {
      limit65 = 0.65 * pisos[i - 1].Vi
    }

    let cond = ''
    if (vi != null && vi !== '') {
      if (limit65 === '---') cond = 'OK'
      else cond = vi < limit65 ? 'IRREG' : 'OK'
    }

    rows.push({
      piso: i === nPisos - 1 ? 'Azotea' : (nPisos - i),
      Vi: vi ?? '',
      limit65,
      cond,
    })
  }

  const ia = rows.some(r => r.cond === 'IRREG') ? 0.5 : 1
  return { rows, ia }
}

// 5. Masa o Peso (Ia = 0.90)
// mi > 1.50*m(i+1) OR mi > 1.50*m(i-1)
export function calcularMasa(pisos, nPisos) {
  // pisos[i] = {masa} — from top (i=0) to bottom
  const rows = []
  for (let i = 0; i < nPisos; i++) {
    const floorNum = i + 1
    const mi = pisos[i]?.masa

    // 1.50*m(i+1) = floor above = i-1
    let limit_above = '---'
    if (floorNum > 1 && pisos[i - 1]?.masa != null && pisos[i - 1].masa !== '') {
      limit_above = 1.5 * pisos[i - 1].masa
    }

    // 1.50*m(i-1) = floor below = i+1
    let limit_below = '---'
    if (floorNum < nPisos && pisos[i + 1]?.masa != null && pisos[i + 1].masa !== '') {
      limit_below = 1.5 * pisos[i + 1].masa
    }

    let cond = ''
    if (mi != null && mi !== '') {
      if (limit_above === '---' && limit_below === '---') {
        cond = 'OK'
      } else {
        const excAbove = typeof limit_above === 'number' && mi > limit_above
        const excBelow = typeof limit_below === 'number' && mi > limit_below
        cond = (excAbove || excBelow) ? 'IRREG' : 'OK'
      }
    }

    rows.push({
      piso: i === nPisos - 1 ? 'Azotea' : (nPisos - i),
      masa: mi ?? '',
      limit_above,
      limit_below,
      cond,
    })
  }

  const ia = rows.some(r => r.cond === 'IRREG') ? 0.9 : 1
  return { rows, ia }
}

// 6. Geometría Vertical (Ia = 0.90)
// a > 1.30*a(i+1)
export function calcularGeometria(pisos, nPisos) {
  // pisos[i] = {dim} — dimension in plan
  const rows = []
  for (let i = 0; i < nPisos; i++) {
    const floorNum = i + 1
    const ai = pisos[i]?.dim

    let limit130 = '---'
    if (floorNum > 1 && pisos[i - 1]?.dim != null && pisos[i - 1].dim !== '') {
      limit130 = 1.3 * pisos[i - 1].dim
    }

    let cond = ''
    if (ai != null && ai !== '') {
      if (limit130 === '---') cond = 'OK'
      else cond = ai > limit130 ? 'IRREG' : 'OK'
    }

    rows.push({
      piso: i === nPisos - 1 ? 'Azotea' : (nPisos - i),
      dim: ai ?? '',
      limit130,
      cond,
    })
  }

  const ia = rows.some(r => r.cond === 'IRREG') ? 0.9 : 1
  return { rows, ia }
}

// Discontinuidad en los Sistemas Resistentes (Ia = 0.80 / 0.60)
// elementos = [{ nombre, vx, vy, cambioOrientacion, desplEje, dimElem }]
export function calcularDiscontinuidad(activo, elementos, vTotalX, vTotalY) {
  const empty = {
    rows: [], vDiscontX: 0, vDiscontY: 0, pctDiscontX: 0, pctDiscontY: 0,
    nDiscontX: 0, nDiscontY: 0, resultadoX: 'REG', resultadoY: 'REG', iaX: 1, iaY: 1,
  }
  if (!activo) return empty

  const vX = Number(vTotalX) || 0
  const vY = Number(vTotalY) || 0

  const rows = elementos
    .filter(el => el.nombre || el.vx || el.vy || el.cambioOrientacion || el.desplEje || el.dimElem)
    .map(el => {
      const vx = typeof el.vx === 'number' ? el.vx : (parseFloat(el.vx) || 0)
      const vy = typeof el.vy === 'number' ? el.vy : (parseFloat(el.vy) || 0)
      const desplEje = typeof el.desplEje === 'number' ? el.desplEje : (parseFloat(el.desplEje) || 0)
      const dimElem = typeof el.dimElem === 'number' ? el.dimElem : (parseFloat(el.dimElem) || 0)
      const cambioOrientacion = !!el.cambioOrientacion

      const pctVx = vX > 0 ? (vx / vX) * 100 : 0
      const pctVy = vY > 0 ? (vy / vY) * 100 : 0
      const pctDespl = dimElem > 0 ? (desplEje / dimElem) * 100 : 0

      const tieneDesalineamiento = cambioOrientacion || pctDespl > 25
      const discontinuoX = pctVx > 10 && tieneDesalineamiento
      const discontinuoY = pctVy > 10 && tieneDesalineamiento

      return {
        nombre: el.nombre || '', vx, vy, cambioOrientacion, desplEje, dimElem,
        pctVx, pctVy, pctDespl, tieneDesalineamiento, discontinuoX, discontinuoY,
      }
    })

  const vDiscontX = rows.filter(r => r.discontinuoX).reduce((s, r) => s + r.vx, 0)
  const vDiscontY = rows.filter(r => r.discontinuoY).reduce((s, r) => s + r.vy, 0)
  const pctDiscontX = vX > 0 ? (vDiscontX / vX) * 100 : 0
  const pctDiscontY = vY > 0 ? (vDiscontY / vY) * 100 : 0
  const nDiscontX = rows.filter(r => r.discontinuoX).length
  const nDiscontY = rows.filter(r => r.discontinuoY).length

  const classify = (pctDiscont, nDiscont) => {
    if (pctDiscont > 25) return { resultado: 'IRREG EXTREMA', ia: 0.60 }
    if (nDiscont > 0) return { resultado: 'IRREG', ia: 0.80 }
    return { resultado: 'REG', ia: 1.00 }
  }
  const resX = classify(pctDiscontX, nDiscontX)
  const resY = classify(pctDiscontY, nDiscontY)

  return {
    rows, vDiscontX, vDiscontY, pctDiscontX, pctDiscontY, nDiscontX, nDiscontY,
    resultadoX: resX.resultado, resultadoY: resY.resultado, iaX: resX.ia, iaY: resY.ia,
  }
}

// Summary Ia
export function calcularIaFinal(iaRigX, iaRigY, iaRigExtX, iaRigExtY, iaResX, iaResY, iaResExtX, iaResExtY, iaMasa, iaGeomX, iaGeomY, iaDiscontX = 1, iaDiscontY = 1) {
  const iaX = Math.min(iaRigX, iaRigExtX, iaResX, iaResExtX, iaMasa, iaGeomX, iaDiscontX)
  const iaY = Math.min(iaRigY, iaRigExtY, iaResY, iaResExtY, iaMasa, iaGeomY, iaDiscontY)
  return { iaX, iaY }
}

// ─── R FINAL ──────────────────────────────────────────────────────

export function calcularR(RoX, RoY, iaX, iaY, ipX, ipY) {
  return {
    Rx: RoX * iaX * ipX,
    Ry: RoY * iaY * ipY,
  }
}
