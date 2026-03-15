// ══════════════════════════════════════════════════════════════════
//  ColumnSeis E.060 — Motor de cálculo estructural en JavaScript
//  Compatibilidad de deformaciones + Bloque de Whitney
//  NTP E.060 / ACI 318
// ══════════════════════════════════════════════════════════════════

const EPSILON_U = 0.003   // Deformación última del concreto E.060 10.2.3
const Es = 2_000_000      // Módulo de elasticidad del acero kg/cm²

// ── Factor β₁ del bloque de Whitney (E.060 Sec. 10.2.7.3) ─────────────────
export function beta1(fc) {
  const fc_mpa = fc / 10.197
  if (fc_mpa <= 28) return 0.85
  return Math.max(0.65, 0.85 - 0.05 * (fc_mpa - 28) / 7)
}

// ── Factor φ de reducción (E.060 Sec. 9.3.2) ──────────────────────────────
export function phiFactor(epsilonNeto, sistema = 'SMF') {
  const phi_c = sistema === 'SMF' ? 0.65 : 0.70
  const phi_t = 0.90
  const eps_ty = 0.002
  const eps_tt = 0.005
  if (epsilonNeto <= eps_ty) return phi_c
  if (epsilonNeto >= eps_tt) return phi_t
  return phi_c + (epsilonNeto - eps_ty) / (eps_tt - eps_ty) * (phi_t - phi_c)
}

// ── Cálculo de fuerzas internas para un estado de deformación ─────────────
export function calcularFuerzasInternas(input, angulo, c) {
  const { fc, fy } = input.material
  const { b, h } = input.geometria
  const barras = input.refuerzo.barras
  const b1 = beta1(fc)
  const a = b1 * c

  // Grilla para integración numérica del bloque de compresión
  const NX = 50, NY = 50
  const dx = b / NX, dy = h / NY
  const dA = dx * dy
  const cosA = Math.cos(angulo), sinA = Math.sin(angulo)

  // Distancia máxima desde centroide en dirección del eje neutro
  const distMax = (b / 2) * Math.abs(cosA) + (h / 2) * Math.abs(sinA)

  let Fc = 0, Mx_c = 0, My_c = 0

  for (let ix = 0; ix < NX; ix++) {
    const x = -b / 2 + (ix + 0.5) * dx
    for (let iy = 0; iy < NY; iy++) {
      const y = -h / 2 + (iy + 0.5) * dy
      const dist = x * cosA + y * sinA
      const dRel = distMax - dist
      if (dRel <= a) {
        Fc    += 0.85 * fc * dA
        Mx_c  += 0.85 * fc * dA * y
        My_c  += 0.85 * fc * dA * x
      }
    }
  }

  let Fs = 0, Mx_s = 0, My_s = 0
  let epsilonMin = Infinity

  for (const barra of barras) {
    const { x, y, diametro } = barra
    const As = barra.area || Math.PI * diametro ** 2 / 4
    const distBarra = x * cosA + y * sinA
    const dBarraRel = distMax - distBarra
    const epsBarra = EPSILON_U * (c - dBarraRel) / c
    epsilonMin = Math.min(epsilonMin, epsBarra)

    let fs = Es * epsBarra
    fs = Math.max(-fy, Math.min(fy, fs))
    if (dBarraRel <= a) fs -= 0.85 * fc  // descuento del concreto

    const Fsi = fs * As
    Fs   += Fsi
    Mx_s += Fsi * y
    My_s += Fsi * x
  }

  const P  = Fc + Fs
  const Mx = Mx_c + Mx_s
  const My = My_c + My_s
  const epsilonNeto = epsilonMin < 0 ? -epsilonMin : 0

  return { P, Mx, My, epsilonNeto }
}

// ── Generación de la superficie de interacción P-Mx-My ─────────────────────
export function generarSuperficie(input, onProgress) {
  const { fc, fy } = input.material
  const { b, h } = input.geometria
  const barras = input.refuerzo.barras
  const nAngulos = input.angulos_neutro || 36
  const nPasos   = input.pasos_profundidad || 50
  const sistema  = input.sistema_estructural || 'SMF'

  const Ag = b * h
  const As = barras.reduce((s, bar) => s + (bar.area || Math.PI * bar.diametro ** 2 / 4), 0)
  const rho = As / Ag

  // Capacidades límite
  const P0 = 0.85 * fc * (Ag - As) + fy * As
  const phi_c = sistema === 'SMF' ? 0.65 : 0.70
  const P0_max = 0.80 * phi_c * P0
  const Pt = -fy * As

  const diag = Math.sqrt(b ** 2 + h ** 2)
  const cVals = []
  const n1 = Math.floor(nPasos / 2), n2 = nPasos - n1
  for (let i = 0; i < n1; i++) cVals.push(0.01 + i * (diag * 0.5 - 0.01) / (n1 - 1))
  for (let i = 0; i < n2; i++) cVals.push(diag * 0.5 + i * (diag * 2.5) / (n2 - 1))

  const puntos = []
  const total = nAngulos * nPasos

  for (let ia = 0; ia < nAngulos; ia++) {
    const angulo = (2 * Math.PI * ia) / nAngulos
    for (let ic = 0; ic < cVals.length; ic++) {
      try {
        const { P, Mx, My, epsilonNeto } = calcularFuerzasInternas(input, angulo, cVals[ic])
        const phi = phiFactor(epsilonNeto, sistema)
        let Pp = phi * P
        if (Pp > P0_max) Pp = P0_max
        puntos.push({
          P:  Math.round(Pp),
          Mx: Math.round(phi * Mx),
          My: Math.round(phi * My),
          phi: +phi.toFixed(4),
          angulo_neutro: +(angulo * 180 / Math.PI).toFixed(2),
          profundidad_c: +cVals[ic].toFixed(4),
        })
      } catch { /* ignorar */ }
    }
    if (onProgress) onProgress(Math.round((ia / nAngulos) * 100))
  }

  // Puntos límite
  puntos.push({ P: Math.round(P0_max), Mx: 0, My: 0, phi: phi_c, angulo_neutro: 0, profundidad_c: 999 })
  puntos.push({ P: Math.round(0.9 * Pt), Mx: 0, My: 0, phi: 0.9, angulo_neutro: 0, profundidad_c: 0 })

  // Curvas P-Mx y P-My
  const curva_PMx = extraerCurvaPlana(puntos, 'Mx')
  const curva_PMy = extraerCurvaPlana(puntos, 'My')

  return {
    puntos,
    P_max: Math.round(P0_max),
    P_min: Math.round(0.9 * Pt),
    puntos_curva_PMx: curva_PMx,
    puntos_curva_PMy: curva_PMy,
    cuantia_acero: +(rho * 100).toFixed(3),
    area_acero: +As.toFixed(3),
    area_concreto: +Ag.toFixed(1),
  }
}

function extraerCurvaPlana(puntos, plano) {
  const filtrados = puntos.filter(p => {
    if (plano === 'Mx') {
      return (Math.abs(p.angulo_neutro - 90) < 15 || Math.abs(p.angulo_neutro - 270) < 15 ||
        (Math.abs(p.Mx) > 1 && Math.abs(p.My) < 0.1 * Math.abs(p.Mx)))
    } else {
      return (Math.abs(p.angulo_neutro) < 15 || Math.abs(p.angulo_neutro - 180) < 15 ||
        (Math.abs(p.My) > 1 && Math.abs(p.Mx) < 0.1 * Math.abs(p.My)))
    }
  })
  filtrados.sort((a, b) => b.P - a.P)
  return filtrados.map(p => ({ P: p.P, M: plano === 'Mx' ? p.Mx : p.My }))
}

// ── Verificación de solicitación (DCR) ─────────────────────────────────────
export function verificarPunto(superficie, Pu, Mux, Muy) {
  const { puntos } = superficie
  const mag = Math.sqrt(Pu ** 2 + Mux ** 2 + Muy ** 2)
  if (mag < 1e-6) return { dentro: true, dcr: 0, mensaje: 'Sin solicitación' }

  const dP = Pu / mag, dMx = Mux / mag, dMy = Muy / mag
  let maxProj = 0, puntoCap = null

  for (const p of puntos) {
    const proj = p.P * dP + p.Mx * dMx + p.My * dMy
    if (proj > maxProj) { maxProj = proj; puntoCap = p }
  }

  if (!puntoCap || maxProj < 1e-6)
    return { dentro: false, dcr: 999, mensaje: 'Sin capacidad en esa dirección' }

  const dcr = mag / maxProj
  return {
    dentro: dcr <= 1.0,
    dcr: +dcr.toFixed(4),
    mensaje: dcr <= 1.0 ? '✓ CONFORME' : '✗ NO CONFORME',
    puntoCap,
  }
}

// ── Disposición automática de barras ──────────────────────────────────────
export function generarDisposicion(b, h, recub, nBarras, diametro, tipo = 'rectangular') {
  const cover = recub + diametro / 2
  const xMin = -b / 2 + cover, xMax = b / 2 - cover
  const yMin = -h / 2 + cover, yMax = h / 2 - cover
  const area = Math.PI * diametro ** 2 / 4
  const bars = []

  if (tipo === 'circular') {
    const r = Math.min(b, h) / 2 - cover
    for (let i = 0; i < nBarras; i++) {
      const theta = 2 * Math.PI * i / nBarras
      bars.push({ x: +(r * Math.cos(theta)).toFixed(3), y: +(r * Math.sin(theta)).toFixed(3), diametro, area })
    }
    return bars
  }

  // Distribución perimetral rectangular correcta
  // Calcula cuántas barras van en cada lado incluyendo las esquinas
  const n = Math.max(4, nBarras)
  const lB = xMax - xMin  // longitud lado horizontal
  const lH = yMax - yMin  // longitud lado vertical
  const perim = 2 * (lB + lH)

  // Distribuir n barras uniformemente en el perímetro empezando por esquina inf-izq
  const corners = [
    [xMin, yMin], [xMax, yMin],
    [xMax, yMax], [xMin, yMax],
  ]

  // Generar n puntos uniformes en el perímetro
  const step = perim / n
  for (let i = 0; i < n; i++) {
    let dist = i * step
    let x, y
    // Lado inferior: yMin, de xMin a xMax
    if (dist <= lB) {
      x = xMin + dist; y = yMin
    }
    // Lado derecho: xMax, de yMin a yMax
    else if (dist <= lB + lH) {
      x = xMax; y = yMin + (dist - lB)
    }
    // Lado superior: yMax, de xMax a xMin
    else if (dist <= 2 * lB + lH) {
      x = xMax - (dist - lB - lH); y = yMax
    }
    // Lado izquierdo: xMin, de yMax a yMin
    else {
      x = xMin; y = yMax - (dist - 2 * lB - lH)
    }
    bars.push({ x: +x.toFixed(3), y: +y.toFixed(3), diametro, area })
  }
  return bars
}

// ── Diseño de estribos (E.060 Cap. 21) ────────────────────────────────────
export function disenarEstribos(geo, mat, refuerzo, dEstribo, nRamas, dLong, ln) {
  const { b, h, recubrimiento: rec } = geo
  const { fc, fy } = mat
  const Ag = b * h
  const bMin = Math.min(b, h)
  const bc_b = b - 2 * rec, bc_h = h - 2 * rec
  const Ach = bc_b * bc_h

  const lo = Math.max(Math.max(b, h), ln / 6, 45)

  const so_b4  = bMin / 4
  const so_6db = 6 * dLong
  const so_lim = dLong <= 1.905 ? 10 : 15
  const so = Math.min(so_b4, so_6db, so_lim)
  const s_fuera = Math.min(bMin / 2, 30)

  const Ash_b = Math.max(
    0.3 * so * bc_b * (Ag / Ach - 1) * fc / fy,
    0.09 * so * bc_b * fc / fy
  )
  const Ash_h = Math.max(
    0.3 * so * bc_h * (Ag / Ach - 1) * fc / fy,
    0.09 * so * bc_h * fc / fy
  )

  const aEstribo = Math.PI * dEstribo ** 2 / 4
  const Ash_prov = nRamas * aEstribo

  const rho_s_min = 0.12 * fc / fy
  const rho_s = (2 * nRamas * aEstribo * (bc_b + bc_h)) / (bc_b * bc_h * so)

  const d_min = dLong > 3.581 ? 1.270 : 0.953

  return {
    lo: +lo.toFixed(1), so: +so.toFixed(1), s_fuera: +s_fuera.toFixed(1),
    Ash_b: +Ash_b.toFixed(3), Ash_h: +Ash_h.toFixed(3), Ash_prov: +Ash_prov.toFixed(3),
    ok_Ash_b: Ash_prov >= Ash_b, ok_Ash_h: Ash_prov >= Ash_h,
    rho_s_min: +(rho_s_min * 100).toFixed(3), rho_s: +(rho_s * 100).toFixed(3),
    ok_rho: rho_s >= rho_s_min,
    ok_diam: dEstribo >= d_min, d_min,
    bc_b: +bc_b.toFixed(1), bc_h: +bc_h.toFixed(1),
    so_b4: +so_b4.toFixed(1), so_6db: +so_6db.toFixed(1), so_lim,
  }
}
