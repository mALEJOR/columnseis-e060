// ═══════════════════════════════════════════════════════════════════
// Espectro de Pseudo-Aceleraciones E.030-2025 — Motor de Calculo
// ═══════════════════════════════════════════════════════════════════

// ── Constantes Normativas ──

export const ZONA_Z = {
  'Zona 1': 0.10,
  'Zona 2': 0.25,
  'Zona 3': 0.35,
  'Zona 4': 0.45,
}

// Factor de suelo S, indexado por [zona][suelo]
export const SUELO_S = {
  'Zona 4': { S0: 0.80, S1: 1.00, S2: 1.10, S3: 1.20, S4: null },
  'Zona 3': { S0: 0.80, S1: 1.00, S2: 1.15, S3: 1.20, S4: 1.50 },
  'Zona 2': { S0: 0.80, S1: 1.00, S2: 1.30, S3: 1.40, S4: 2.00 },
  'Zona 1': { S0: 0.80, S1: 1.00, S2: 1.30, S3: 1.50, S4: 2.00 },
}

export const SUELO_TP = { S0: 0.3, S1: 0.4, S2: 0.6, S3: 0.9, S4: 1.0 }
export const SUELO_TL = { S0: 3.0, S1: 3.0, S2: 3.0, S3: 2.5, S4: 2.0 }

export const CATEGORIAS_LIST = [
  'A1 - Salud',
  'A2 - Esenciales',
  'B - Importantes',
  'C - Comunes',
  'D - Temporales',
]

// Legacy lookup (for fixed-U categories only)
export const CATEGORIA_U = {
  'A1 - Salud': 1.50,
  'A2 - Esenciales': 1.50,
  'B - Importantes': 1.30,
  'C - Comunes': 1.00,
  'D - Temporales': 1.00,
}

/**
 * Calcula el factor U segun Tabla N7 + Nota 1 + Nota 2
 * @param {string} categoria - Key de CATEGORIAS_LIST
 * @param {number} zonaNum - 1,2,3,4
 * @param {boolean|null} usaAislamiento - solo para A1 en zona 1/2
 * @param {number|null} uManualD - valor manual para cat D
 */
export function calcularFactorU(categoria, zonaNum, usaAislamiento, uManualD) {
  const cat = categoria.substring(0, 2).toUpperCase() // 'A1','A2','B ','C ','D '

  if (cat === 'A1') {
    if (zonaNum >= 3) {
      return { U: 1.0, nota: 'Nota 1: Aislamiento sismico obligatorio en Zona ' + zonaNum, obligatorio: true }
    }
    // Zona 1 o 2: opcional
    if (usaAislamiento) {
      return { U: 1.0, nota: 'Nota 1: Con aislamiento sismico', obligatorio: false }
    }
    return { U: 1.5, nota: 'Nota 1: Sin aislamiento sismico, U >= 1.5', obligatorio: false }
  }

  if (cat === 'A2') return { U: 1.5, nota: null, obligatorio: false }
  if (cat.startsWith('B'))  return { U: 1.3, nota: null, obligatorio: false }
  if (cat.startsWith('C'))  return { U: 1.0, nota: null, obligatorio: false }

  if (cat.startsWith('D')) {
    const val = (uManualD != null && uManualD >= 0.5 && uManualD <= 1.5) ? uManualD : 1.0
    return { U: val, nota: 'Nota 2: Factor U a criterio del proyectista', obligatorio: false, editable: true }
  }

  return { U: 1.0, nota: null, obligatorio: false }
}

export const SISTEMA_RO = {
  'Porticos C.A.': 8,
  'Dual C.A.': 7,
  'Muros C.A.': 6,
  'EMDL': 3.5,
  'Albanileria': 3,
  'Acero SMF': 8,
  'Acero SCBF': 7,
}

export const IA_OPTIONS = [
  { label: 'Regular (1.00)', value: 1.00 },
  { label: 'Irreg. (0.90)', value: 0.90 },
  { label: 'Piso blando (0.75)', value: 0.75 },
  { label: 'Masa (0.75)', value: 0.75 },
  { label: 'Geometrica (0.90)', value: 0.90 },
  { label: 'Discontinuidad (0.80)', value: 0.80 },
  { label: 'Extrema (0.50)', value: 0.50 },
]

export const IP_OPTIONS = [
  { label: 'Regular (1.00)', value: 1.00 },
  { label: 'Torsional (0.75)', value: 0.75 },
  { label: 'Esquinas (0.90)', value: 0.90 },
  { label: 'Diafragma (0.85)', value: 0.85 },
  { label: 'No paralelos (0.90)', value: 0.90 },
  { label: 'Torsion ext. (0.60)', value: 0.60 },
]

export const PERFILES_SUELO = ['S0', 'S1', 'S2', 'S3', 'S4']

export const G = 9.81

// ── Funciones Puras ──

/**
 * Extrae la clave del perfil de suelo (S0, S1, ...) desde el dropdown
 */
export function getSueloKey(perfil) {
  // perfil puede ser 'S0', 'S1', etc. directamente
  const match = perfil.match(/S[0-4]/)
  return match ? match[0] : 'S1'
}

/**
 * Verifica si la combinacion Zona + Suelo es valida
 * Z4 + S4 requiere EMS (no permitido)
 */
export function esCombinacionValida(zona, sueloKey) {
  return SUELO_S[zona]?.[sueloKey] != null
}

/**
 * Factor de amplificacion sismica C(T) — Art. 18, Tabla N6
 * @param {number} T - Periodo estructural (s)
 * @param {number} Tp - Periodo de la plataforma
 * @param {number} TL - Periodo largo
 * @returns {number} C(T)
 */
export function calcularC(T, Tp, TL) {
  if (T < 0.2 * Tp) {
    return 1 + 7.5 * (T / Tp)
  } else if (T <= Tp) {
    return 2.5
  } else if (T < TL) {
    return 2.5 * (Tp / T)
  } else {
    return 2.5 * (Tp * TL / (T * T))
  }
}

/**
 * Genera el espectro completo de pseudo-aceleraciones
 * @param {number} Z - Factor de zona
 * @param {number} U - Factor de uso
 * @param {number} S - Factor de suelo
 * @param {number} Ro - Coeficiente de reduccion basico
 * @param {number} Ia - Factor de irregularidad en altura
 * @param {number} Ip - Factor de irregularidad en planta
 * @param {number} Tp - Periodo de plataforma
 * @param {number} TL - Periodo largo
 * @returns {Array<{T: number, C: number, Sa: number, SaG: number}>}
 */
export function generarEspectro(Z, U, S, Ro, Ia, Ip, Tp, TL) {
  const R = Ro * Ia * Ip
  const puntos = []

  for (let i = 0; i <= 200; i++) {
    const T = +(i * 0.02).toFixed(2)
    const C = calcularC(T, Tp, TL)
    const SaG = (Z * U * C * S) / R    // adimensional (Sa/g)
    const Sa = SaG * G                   // m/s^2

    puntos.push({ T, C, Sa, SaG })
  }

  return puntos
}

/**
 * Genera string para exportar a ETABS con headers $ (comentarios ETABS)
 * Compatible con: ETABS > Define > Functions > Response Spectrum > From File
 * Header Lines to Skip: 0 (las lineas con $ se saltan automaticamente)
 */
export function exportarETABS(espectro, params, direccion, deltaT = 0.02) {
  const fecha = new Date().toISOString().split('T')[0]
  const { zona, Z, suelo, S, categoria, U, sistema, Ro, Ia, Ip, R, Tp, TL } = params
  const sagMax = espectro.length > 0 ? Math.max(...espectro.map(p => p.SaG)) : 0
  const saMax = sagMax * G

  const lines = []
  lines.push('$ ================================================================')
  lines.push('$ ESPECTRO DE RESPUESTA - NTE E.030-2025')
  lines.push('$ Generado por ColumnSeis - columnseis-e060.vercel.app')
  lines.push('$ Fecha: ' + fecha)
  lines.push('$ ================================================================')
  lines.push('$ Zona: ' + zona + ' (Z=' + Z.toFixed(2) + ')')
  lines.push('$ Suelo: ' + suelo + ' (S=' + S.toFixed(2) + ')')
  lines.push('$ Categoria: ' + categoria + ' (U=' + U.toFixed(2) + ')')
  lines.push('$ Sistema: ' + sistema + ' (Ro=' + Ro + ')')
  lines.push('$ Ia = ' + Ia.toFixed(2) + ' | Ip = ' + Ip.toFixed(2))
  lines.push('$ R = Ro*Ia*Ip = ' + R.toFixed(2))
  lines.push('$ Tp = ' + Tp.toFixed(2) + ' s | TL = ' + TL.toFixed(2) + ' s')
  lines.push('$ Sa max = ' + saMax.toFixed(4) + ' m/s2 | Sa/g max = ' + sagMax.toFixed(5))
  lines.push('$ Direccion: ' + direccion)
  lines.push('$ ================================================================')
  lines.push('$ Formato: Periodo(s) [TAB] Sa/g')
  lines.push('$ En ETABS: Define > Functions > Response Spectrum > From File')
  lines.push('$ Header Lines to Skip: 0 (lineas con $ se saltan automaticamente)')
  lines.push('$ Seleccionar: Period vs Value')
  lines.push('$ ================================================================')

  // Filtrar puntos segun deltaT
  const paso = Math.max(1, Math.round(deltaT / 0.02))
  for (let i = 0; i < espectro.length; i += paso) {
    const pt = espectro[i]
    lines.push(pt.T.toFixed(2) + '\t' + pt.SaG.toFixed(5))
  }

  return lines.join('\r\n')
}

/**
 * Genera nombre de archivo sugerido
 */
export function generarNombreArchivo(direccion, params) {
  const dir = direccion.replace('-', '')
  const zn = params.zona.replace('Zona ', 'Z')
  return `Espectro_E030_${dir}_${zn}_${params.suelo}_R${params.R.toFixed(2)}.txt`
}
