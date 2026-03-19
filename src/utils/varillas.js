// ══════════════════════════════════════════════════════════════════
//  Varillas de acero — Norma peruana ASTM A615 (pulgadas)
//  Fuente única para toda la aplicación
// ══════════════════════════════════════════════════════════════════

export const VARILLAS_PERU = [
  { numero: 2,  d: 0.635, area: 0.32,  label: 'N\u00b02 (1/4\u2033)'   },
  { numero: 3,  d: 0.953, area: 0.71,  label: 'N\u00b03 (3/8\u2033)'   },
  { numero: 4,  d: 1.270, area: 1.27,  label: 'N\u00b04 (1/2\u2033)'   },
  { numero: 5,  d: 1.588, area: 1.98,  label: 'N\u00b05 (5/8\u2033)'   },
  { numero: 6,  d: 1.905, area: 2.85,  label: 'N\u00b06 (3/4\u2033)'   },
  { numero: 7,  d: 2.222, area: 3.88,  label: 'N\u00b07 (7/8\u2033)'   },
  { numero: 8,  d: 2.540, area: 5.07,  label: 'N\u00b08 (1\u2033)'     },
  { numero: 9,  d: 2.857, area: 6.41,  label: 'N\u00b09 (1-1/8\u2033)' },
  { numero: 10, d: 3.225, area: 8.17,  label: 'N\u00b010 (1-1/4\u2033)'},
  { numero: 11, d: 3.581, area: 10.07, label: 'N\u00b011 (1-3/8\u2033)'},
  { numero: 12, d: 3.810, area: 11.40, label: 'N\u00b012 (1-1/2\u2033)'},
]

// Subconjuntos útiles
export const VARILLAS_LONGITUDINALES = VARILLAS_PERU.filter(v => v.numero >= 4)
export const VARILLAS_ESTRIBOS = VARILLAS_PERU.filter(v => v.numero >= 2 && v.numero <= 5)

// Buscar varilla por diámetro
export function buscarVarilla(d) {
  return VARILLAS_PERU.find(v => Math.abs(v.d - d) < 0.01) || null
}

// Obtener label de una varilla por diámetro
export function labelVarilla(d) {
  const v = buscarVarilla(d)
  return v ? v.label : `∅${d}`
}
