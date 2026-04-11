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

export const CATEGORIA_U = {
  'A1 (Esencial)': 1.50,
  'A2 (Importante)': 1.50,
  'B (Comun)': 1.30,
  'C (Temporal)': 1.00,
  'D (Menor)': 1.00,
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
 * Genera string para exportar a ETABS
 * @param {Array} espectro - Array de {T, SaG}
 * @param {'completo'|'reducido'} modo - Completo (201 pts) o Reducido (41 pts)
 * @returns {string} Contenido del archivo .txt
 */
export function exportarETABS(espectro, modo = 'completo') {
  const paso = modo === 'reducido' ? 5 : 1 // cada 5 = Dt=0.10, cada 1 = Dt=0.02
  const lineas = []

  for (let i = 0; i < espectro.length; i += paso) {
    const pt = espectro[i]
    lineas.push(pt.T.toFixed(2) + '\t' + pt.SaG.toFixed(5))
  }

  return lineas.join('\n')
}
