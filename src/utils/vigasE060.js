// ══════════════════════════════════════════════════════════════════
//  Vigas E.060 — Motor de calculo para diseno de vigas
//  NTP E.060 / ACI 318 — Flexion, Corte, Estribos, Predimensionamiento
//  Unidades internas: kg, cm, kg-cm
// ══════════════════════════════════════════════════════════════════

import { beta1 } from './engine'
import { VARILLAS_LONGITUDINALES } from './varillas'

// ── Constantes utiles ─────────────────────────────────────────────
export const FC_OPTIONS = [175, 210, 280, 350]
export const FY_OPTIONS = [4200]

// ── 1. Diseno a Flexion (E.060 Cap. 10) ──────────────────────────
//    Mu en ton-m, b y h en cm, rec en cm, fc y fy en kg/cm2
export function disenoFlexion({ Mu_tonm, b, h, rec, fc, fy }) {
  const Mu = Mu_tonm * 100000              // ton-m -> kg-cm
  const d = h - rec                         // peralte efectivo (cm)
  const b1 = beta1(fc)
  const phi = 0.90                          // E.060 9.3.2.1 - tension controlada

  // Resistencia nominal requerida
  const Rn = Mu / (phi * b * d * d)

  // Acero requerido por flexion
  const discriminante = 1 - (2 * Rn) / (0.85 * fc)
  // Si el discriminante es negativo, la seccion no tiene capacidad suficiente
  const discriminanteOk = discriminante >= 0
  const As_req = discriminanteOk
    ? (0.85 * fc * b * d / fy) * (1 - Math.sqrt(discriminante))
    : Infinity

  // Cuantias
  const rho = discriminanteOk ? As_req / (b * d) : Infinity

  // Cuantia minima — E.060 10.5.1
  const rho_min_a = 0.7 * Math.sqrt(fc) / fy
  const rho_min_b = 14 / fy
  const rho_min = Math.max(rho_min_a, rho_min_b)

  // Cuantia balanceada — E.060 10.3.2
  const rho_bal = 0.85 * b1 * fc / fy * (6000 / (6000 + fy))

  // Cuantia maxima — E.060 10.3.5 (0.75 rho_bal para ductilidad)
  const rho_max = 0.75 * rho_bal

  // Areas de acero limite
  const As_min = rho_min * b * d
  const As_max = rho_max * b * d

  // Acero final: no menor que As_min
  const As_final = Math.max(As_req, As_min)

  // Profundidad del bloque de compresion con As_final
  const a = As_final * fy / (0.85 * fc * b)

  // Momento resistente de diseno
  const phi_Mn = phi * As_final * fy * (d - a / 2) // kg-cm
  const phi_Mn_tonm = phi_Mn / 100000              // ton-m

  // Verificaciones
  const ok = phi_Mn_tonm >= Mu_tonm && discriminanteOk
  const cuantia_ok = rho >= rho_min && rho <= rho_max

  return {
    d:            +d.toFixed(2),
    As_req:       discriminanteOk ? +As_req.toFixed(3) : Infinity,
    As_final:     +As_final.toFixed(3),
    As_min:       +As_min.toFixed(3),
    As_max:       +As_max.toFixed(3),
    a:            +a.toFixed(3),
    rho:          discriminanteOk ? +rho.toFixed(6) : Infinity,
    rho_min:      +rho_min.toFixed(6),
    rho_bal:      +rho_bal.toFixed(6),
    rho_max:      +rho_max.toFixed(6),
    phi_Mn_tonm:  +phi_Mn_tonm.toFixed(3),
    Mu_tonm:      +Mu_tonm,
    ok,
    cuantia_ok,
    discriminanteOk,
  }
}

// ── 2. Diseno a Corte (E.060 Cap. 11) ───────────────────────────
//    Vu en toneladas, b y d en cm, fc y fy en kg/cm2
export function disenoCorte({ Vu_ton, b, d, fc }) {
  const Vu = Vu_ton * 1000                   // ton -> kg
  const phi = 0.85                            // E.060 9.3.2.3

  // Resistencia al corte del concreto — E.060 11.3.1.1
  const Vc = 0.53 * Math.sqrt(fc) * b * d    // kg

  const phi_Vc = phi * Vc
  const phi_Vc_ton = phi_Vc / 1000

  // Cortante que debe resistir el refuerzo transversal
  const necesitaEstribos = Vu > phi_Vc
  const Vs_req = necesitaEstribos ? (Vu / phi - Vc) : 0  // kg

  // Cortante maximo del refuerzo — E.060 11.5.6.8
  const Vs_max = 2.1 * Math.sqrt(fc) * b * d             // kg

  // Verificar que la seccion sea suficiente — E.060 11.5.6.9
  const Vs_lim = Vc + Vs_max
  const seccionSuficiente = (Vu / phi) <= Vs_lim

  // Umbral para estribos minimos — E.060 11.5.5.1 (0.5*phi*Vc)
  const umbral_Avmin = 0.5 * phi_Vc
  const necesitaAvMin = Vu > umbral_Avmin

  return {
    Vc:                +Vc.toFixed(1),
    Vc_ton:            +(Vc / 1000).toFixed(3),
    phi_Vc:            +phi_Vc.toFixed(1),
    phi_Vc_ton:        +phi_Vc_ton.toFixed(3),
    Vs_req:            +Vs_req.toFixed(1),
    Vs_req_ton:        +(Vs_req / 1000).toFixed(3),
    Vs_max:            +Vs_max.toFixed(1),
    Vs_max_ton:        +(Vs_max / 1000).toFixed(3),
    Vu_kg:             +Vu.toFixed(1),
    Vu_ton:            +Vu_ton,
    necesitaEstribos,
    necesitaAvMin,
    seccionSuficiente,
  }
}

// ── 3. Calculo de Espaciamiento de Estribos (E.060 Cap. 11 y 21) ─
//    Vs_req en kg, Av en cm2 (area total de ramas), d en cm
//    db_long: diametro barra longitudinal (cm)
//    db_estribo: diametro barra estribo (cm)
//    h: peralte total de la viga (cm) — para zona de confinamiento
export function calcularEspaciamiento({ Vs_req, Av, fy, d, b, fc, h, sismo = false, db_long = 2.54, db_estribo = 0.953 }) {
  // Espaciamiento por resistencia — E.060 11.5.6.2
  const s_strength = Vs_req > 0 ? Av * fy * d / Vs_req : Infinity

  // Espaciamiento minimo por Av,min — E.060 11.5.5.3
  const s_Avmin_a = Av * fy / (0.2 * Math.sqrt(fc) * b)
  const s_Avmin_b = Av * fy / (3.5 * b)
  const s_Avmin = Math.min(s_Avmin_a, s_Avmin_b)

  // Espaciamiento maximo por geometria — E.060 11.5.4.1
  // Si Vs > 1.1*sqrt(fc)*b*d -> s_max = d/4 o 30cm
  const Vs_umbral = 1.1 * Math.sqrt(fc) * b * d
  let s_max
  if (Vs_req > Vs_umbral) {
    s_max = Math.min(d / 4, 30)
  } else {
    s_max = Math.min(d / 2, 60)
  }

  // Espaciamiento sismico — E.060 21.4.4 (vigas)
  let s_sismo = Infinity
  if (sismo) {
    s_sismo = Math.min(d / 4, 8 * db_long, 24 * db_estribo, 30)
  }

  // Espaciamiento final: el menor de todos
  const s_calc = Math.min(s_strength, s_Avmin, s_max, s_sismo)

  // Redondear a 0.5 cm hacia abajo
  const s_final = Math.floor(s_calc * 2) / 2

  // Zona de confinamiento — E.060 21.4.4.4
  const zona_confinamiento = h ? 2 * h : 0

  // Espaciamiento fuera de zona de confinamiento
  const s_fuera = Math.min(d / 2, 30)
  const s_fuera_final = Math.floor(s_fuera * 2) / 2

  return {
    s_strength:          s_strength === Infinity ? Infinity : +s_strength.toFixed(2),
    s_Avmin:             +s_Avmin.toFixed(2),
    s_Avmin_a:           +s_Avmin_a.toFixed(2),
    s_Avmin_b:           +s_Avmin_b.toFixed(2),
    s_max:               +s_max.toFixed(2),
    s_sismo:             s_sismo === Infinity ? Infinity : +s_sismo.toFixed(2),
    s_calc:              +s_calc.toFixed(2),
    s_final:             +s_final.toFixed(1),
    zona_confinamiento:  h ? +zona_confinamiento.toFixed(1) : null,
    s_fuera:             +s_fuera.toFixed(2),
    s_fuera_final:       +s_fuera_final.toFixed(1),
    Vs_umbral:           +Vs_umbral.toFixed(1),
  }
}

// ── 4. Predimensionamiento (Criterios practicos NTP E.060) ───────
//    luz_m: luz libre en metros
//    carga: 'gravedad' | 'sismo'
//    fc: resistencia del concreto en kg/cm2 (para columnas)
export function predimensionar(tipo, luz_m, carga = 'gravedad', nPisos = 1, areaTrib = 0, fc = 210) {
  const L = luz_m * 100 // metros -> cm

  switch (tipo) {
    case 'viga': {
      let h_min, h_max
      if (carga === 'sismo') {
        h_min = L / 10
        h_max = L / 8
      } else {
        h_min = L / 12
        h_max = L / 10
      }
      const h_sugerido = Math.ceil((h_min + h_max) / 2 / 5) * 5  // redondear a 5cm
      const b_min = h_sugerido / 2
      const b_max = 2 * h_sugerido / 3
      const b_sugerido = Math.ceil((b_min + b_max) / 2 / 5) * 5  // redondear a 5cm
      // E.060 21.4.1 — ancho minimo 25cm para vigas sismicas
      const b_final = carga === 'sismo' ? Math.max(b_sugerido, 25) : b_sugerido
      return {
        tipo: 'viga',
        h_min:      +h_min.toFixed(1),
        h_max:      +h_max.toFixed(1),
        h_sugerido,
        b_min:      +b_min.toFixed(1),
        b_max:      +b_max.toFixed(1),
        b_sugerido: b_final,
        luz_cm:     L,
      }
    }

    case 'columna': {
      // P estimado en kg
      const P = areaTrib * nPisos * 1000  // areaTrib en m2, carga aprox 1 ton/m2/piso
      const Ag = P / (0.45 * fc)
      const lado = Math.ceil(Math.sqrt(Ag) / 5) * 5  // redondear a 5cm
      // E.060 21.6.1 — dimension minima 30cm para columnas sismicas
      const lado_final = Math.max(lado, 30)
      return {
        tipo: 'columna',
        P_estimado_kg:  +P.toFixed(0),
        Ag_requerida:   +Ag.toFixed(1),
        lado_sugerido:  lado_final,
        nPisos,
        areaTrib,
      }
    }

    case 'losa_aligerada': {
      const h_calc = L / 25
      const h_sugerido = Math.ceil(h_calc / 5) * 5
      // Peraltes tipicos aligerados: 17, 20, 25, 30
      const tipicos = [17, 20, 25, 30]
      const h_tipico = tipicos.find(t => t >= h_sugerido) || tipicos[tipicos.length - 1]
      return {
        tipo: 'losa_aligerada',
        h_calc:     +h_calc.toFixed(1),
        h_sugerido: h_tipico,
        luz_cm:     L,
      }
    }

    case 'losa_maciza': {
      const h_calc = L / 33
      const h_sugerido = Math.ceil(h_calc / 1) * 1  // redondear a 1cm
      return {
        tipo: 'losa_maciza',
        h_calc:     +h_calc.toFixed(1),
        h_sugerido: Math.max(h_sugerido, 12), // minimo 12cm
        luz_cm:     L,
      }
    }

    default:
      throw new Error(`Tipo de elemento no reconocido: ${tipo}`)
  }
}

// ── 5. Seleccion de Barras para un As requerido (E.060 7.6) ──────
//    As_req en cm2, b en cm, rec en cm, db_estribo en cm
export function seleccionarBarras(As_req, b, rec, db_estribo = 0.953) {
  const espacio_disponible = b - 2 * rec - 2 * db_estribo
  const opciones = []

  for (const varilla of VARILLAS_LONGITUDINALES) {
    const { numero, d: db, area, label } = varilla
    const n = Math.ceil(As_req / area)

    if (n < 2) continue  // minimo 2 barras

    const As_total = n * area

    // Espaciamiento libre entre barras — E.060 7.6.1
    // spacing_libre = (espacio_disponible - n*db) / (n - 1)
    const spacing_libre = n > 1 ? (espacio_disponible - n * db) / (n - 1) : Infinity

    // Separacion minima — E.060 7.6.1: max(db, 2.5cm)
    const spacing_min = Math.max(db, 2.5)
    const cabe = spacing_libre >= spacing_min

    opciones.push({
      numero,
      db:           +db.toFixed(3),
      label,
      n,
      area_unitaria: +area.toFixed(2),
      As_total:     +As_total.toFixed(2),
      cabe,
      spacing:      spacing_libre === Infinity ? Infinity : +spacing_libre.toFixed(2),
      spacing_min:  +spacing_min.toFixed(2),
    })
  }

  // Ordenar: primero las que caben, luego por menor exceso de acero
  opciones.sort((a, b_opt) => {
    if (a.cabe && !b_opt.cabe) return -1
    if (!a.cabe && b_opt.cabe) return 1
    return a.As_total - b_opt.As_total
  })

  return opciones
}
