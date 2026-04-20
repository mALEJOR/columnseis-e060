// =====================================================================
// Albanileria Confinada E.070 -- Motor de Calculo (funciones puras)
// =====================================================================

// ─── TABLA 9: Resistencias Caracteristicas de la Albanileria ─────────
// Tabla 9 E.070: Resistencias caracteristicas segun tipo de unidad
// fm: resistencia a compresion de pilas f'm (kg/cm2)
// vm: resistencia a corte de muretes v'm (kg/cm2)
export const TABLA_9 = [
  { clase: 'I',   tipo: 'KK Artesanal',              fm: 35,  vm: 5.1  },
  { clase: 'II',  tipo: 'KK Artesanal (mejorado)',    fm: 50,  vm: 6.1  },
  { clase: 'III', tipo: 'KK Industrial',              fm: 65,  vm: 7.3  },
  { clase: 'IV',  tipo: 'KK Industrial (alta calidad)', fm: 90, vm: 8.6 },
  { clase: 'V',   tipo: 'KK Industrial (superior)',   fm: 130, vm: 10.2 },
  { clase: 'P',   tipo: 'Bloque de concreto (portante)', fm: 70, vm: 8.1 },
  { clase: 'NP',  tipo: 'Bloque de concreto (no portante)', fm: 35, vm: 5.1 },
  { clase: 'LC',  tipo: 'Ladrillo de concreto',       fm: 135, vm: 10.7 },
  { clase: 'SC',  tipo: 'Silico calcareo',             fm: 130, vm: 10.2 },
]

// ─── TABLA 1: Clase de unidad de albanileria ─────────────────────────
// Limitaciones de uso segun zona sismica
export const TABLA_1 = [
  { clase: 'I',   fbMin: null, fbMax: 55,   zonas: [1]            },
  { clase: 'II',  fbMin: 55,   fbMax: 80,   zonas: [1, 2]         },
  { clase: 'III', fbMin: 80,   fbMax: 145,  zonas: [1, 2, 3]      },
  { clase: 'IV',  fbMin: 145,  fbMax: 210,  zonas: [1, 2, 3, 4]   },
  { clase: 'V',   fbMin: 210,  fbMax: null,  zonas: [1, 2, 3, 4]  },
]

// ─── TABLA 10: Factores de correccion por esbeltez de prismas ────────
export const TABLA_10 = [
  { esbeltez: 2.0, factor: 0.73 },
  { esbeltez: 2.5, factor: 0.80 },
  { esbeltez: 3.0, factor: 0.91 },
  { esbeltez: 3.5, factor: 0.95 },
  { esbeltez: 4.0, factor: 0.98 },
  { esbeltez: 4.5, factor: 1.00 },
  { esbeltez: 5.0, factor: 1.05 },
]

// ─── TABLA 12: Coeficientes de momento "m" para muros ────────────────
// Condiciones de borde segun Art. 29, E.070
// caso1: Muro con 4 bordes arriostrados
// caso2: Muro con 3 bordes arriostrados (1 borde vertical libre)
// caso3: Muro con borde superior libre y 3 bordes arriostrados
// caso4: Muro arriostrado solo en bordes horizontales (superior e inferior)
export const TABLA_12 = {
  caso1: [
    { ba: 0.50, m: 0.0600 },
    { ba: 0.60, m: 0.0740 },
    { ba: 0.70, m: 0.0870 },
    { ba: 0.80, m: 0.0970 },
    { ba: 0.90, m: 0.1060 },
    { ba: 1.00, m: 0.1120 },
    { ba: 1.25, m: 0.1220 },
    { ba: 1.50, m: 0.1280 },
    { ba: 2.00, m: 0.1320 },
    { ba: Infinity, m: 0.1330 },
  ],
  caso2: [
    { ba: 0.50, m: 0.0600 },
    { ba: 0.60, m: 0.0740 },
    { ba: 0.70, m: 0.0870 },
    { ba: 0.80, m: 0.0970 },
    { ba: 0.90, m: 0.1060 },
    { ba: 1.00, m: 0.1120 },
    { ba: 1.25, m: 0.1220 },
    { ba: 1.50, m: 0.1280 },
    { ba: 2.00, m: 0.1320 },
    { ba: Infinity, m: 0.1330 },
  ],
  caso3: [
    { ba: 0.50, m: 0.0600 },
    { ba: 0.60, m: 0.0740 },
    { ba: 0.70, m: 0.0870 },
    { ba: 0.80, m: 0.0970 },
    { ba: 0.90, m: 0.1060 },
    { ba: 1.00, m: 0.1120 },
    { ba: 1.25, m: 0.1220 },
    { ba: 1.50, m: 0.1280 },
    { ba: 2.00, m: 0.1320 },
    { ba: Infinity, m: 0.1330 },
  ],
  caso4: [
    { ba: 0.50, m: 0.0600 },
    { ba: 0.60, m: 0.0740 },
    { ba: 0.70, m: 0.0870 },
    { ba: 0.80, m: 0.0970 },
    { ba: 0.90, m: 0.1060 },
    { ba: 1.00, m: 0.1120 },
    { ba: 1.25, m: 0.1220 },
    { ba: 1.50, m: 0.1280 },
    { ba: 2.00, m: 0.1320 },
    { ba: Infinity, m: 0.1330 },
  ],
}

/**
 * Busca/interpola el coeficiente de momento m de la Tabla 12
 * @param {string} caso - "caso1", "caso2", "caso3" o "caso4"
 * @param {number} ba - relacion b/a
 * @returns {number} coeficiente m interpolado
 */
export function TABLA_12_LOOKUP(caso, ba) {
  const data = TABLA_12[caso]
  if (!data || data.length === 0) return 0

  if (ba <= data[0].ba) return data[0].m

  for (let i = 1; i < data.length; i++) {
    if (ba <= data[i].ba) {
      if (data[i].ba === Infinity) return data[i].m
      const x0 = data[i - 1].ba
      const x1 = data[i].ba
      const y0 = data[i - 1].m
      const y1 = data[i].m
      return y0 + (y1 - y0) * (ba - x0) / (x1 - x0)
    }
  }

  return data[data.length - 1].m
}


// =====================================================================
// 1. RESISTENCIA AL AGRIETAMIENTO DIAGONAL (Art. 26)
// =====================================================================

/**
 * Calcula la resistencia al agrietamiento diagonal Vm de cada muro
 * y verifica si Ve <= 0.55*Vm
 *
 * @param {Array} muros - Array de objetos con:
 *   {string} nombre    - identificador del muro
 *   {number} v2        - cortante V2 (ton) del analisis sismico con R=3
 *   {number} m3        - momento M3 (ton.m) del analisis sismico con R=3
 *   {number} pg        - carga gravitacional Pg (ton)
 *   {number} t         - espesor del muro (m)
 *   {number} L         - longitud del muro (m)
 *   {number} vm_prima  - resistencia caracteristica a corte v'm (kg/cm2)
 * @returns {object} { resultados: Array, sumVm: number, sumVe: number }
 */
export function calcularVm(muros) {
  if (!muros || muros.length === 0) {
    return { resultados: [], sumVm: 0, sumVe: 0 }
  }

  let sumVm = 0
  let sumVe = 0

  const resultados = muros.map((muro) => {
    const { nombre, v2, m3, pg, t, L, vm_prima } = muro

    // Fuerzas del sismo moderado: dividir entre 2 (de R=3 a R=6)
    const Ve = (v2 || 0) / 2
    const Me = (m3 || 0) / 2

    // Factor alfa: alfa = Ve*L / Me
    let alfa_calc = 0
    if (Ve !== 0 && Me !== 0) {
      alfa_calc = (Ve * L) / Me
    }
    // Clamp alfa entre 1/3 y 1
    const alfa = Math.max(1 / 3, Math.min(1, alfa_calc))

    // Vm = (0.5 * v'm * alfa * t * L * 10000 + 0.23 * Pg * 1000) / 1000
    // t(m) * L(m) * 10000 = t(cm) * L(cm)
    // Pg(ton) * 1000 = Pg(kg)
    // Resultado: dividir entre 1000 => ton
    const Vm = (0.5 * vm_prima * alfa * t * L * 10000 + 0.23 * pg * 1000) / 1000

    const Vm055 = 0.55 * Vm

    const verificacion = Ve <= Vm055 ? 'NO SE FISURA' : 'MURO FISURADO'

    sumVm += Vm
    sumVe += Ve

    return {
      nombre,
      Ve:     parseFloat(Ve.toFixed(4)),
      Me:     parseFloat(Me.toFixed(4)),
      pg,
      t,
      L,
      vm_prima,
      alfa_calc: parseFloat(alfa_calc.toFixed(4)),
      alfa:      parseFloat(alfa.toFixed(4)),
      Vm:        parseFloat(Vm.toFixed(4)),
      Vm055:     parseFloat(Vm055.toFixed(4)),
      verificacion,
    }
  })

  return {
    resultados,
    sumVm: parseFloat(sumVm.toFixed(4)),
    sumVe: parseFloat(sumVe.toFixed(4)),
  }
}


// =====================================================================
// 2. ESFUERZO AXIAL MAXIMO (Art. 19.1b)
// =====================================================================

/**
 * Verifica el esfuerzo axial maximo en muros de albanileria
 *
 * @param {Array} muros - Array de objetos con:
 *   {string} nombre - identificador del muro
 *   {number} Pm     - carga axial de servicio (ton)
 *   {number} L      - longitud del muro (m)
 *   {number} t      - espesor del muro (m)
 * @param {number} fm - resistencia a compresion de la albanileria f'm (kg/cm2)
 * @param {number} h  - altura libre del muro (m)
 * @returns {object} { resultados: Array }
 */
export function calcularEsfuerzoAxial(muros, fm, h) {
  if (!muros || muros.length === 0) {
    return { resultados: [] }
  }

  const resultados = muros.map((muro) => {
    const { nombre, Pm, L, t } = muro

    // Area neta en cm2
    const Lcm = L * 100
    const tcm = t * 100

    // sigma_m = Pm(ton)*1000 / (Lcm * tcm)  => kg/cm2
    const sigma_m = (Pm * 1000) / (Lcm * tcm)

    // Fa = 0.2 * f'm * [1 - (h / (35*t))^2]
    const esbeltez = h / (35 * t)
    const Fa = 0.2 * fm * (1 - esbeltez * esbeltez)

    // Limites de referencia
    const fm015 = 0.15 * fm
    const fm005 = 0.05 * fm

    // Verificaciones
    const cumpleFa = sigma_m <= Fa
    const cumple015 = sigma_m <= fm015

    let verificacion = ''
    if (sigma_m <= fm005) {
      verificacion = 'CUMPLE (sigma <= 0.05 f\'m)'
    } else if (sigma_m <= fm015) {
      verificacion = 'CUMPLE (sigma <= 0.15 f\'m)'
    } else if (sigma_m <= Fa) {
      verificacion = 'CUMPLE (sigma <= Fa)'
    } else {
      verificacion = 'NO CUMPLE (sigma > Fa)'
    }

    return {
      nombre,
      Pm,
      L,
      t,
      sigma_m:  parseFloat(sigma_m.toFixed(4)),
      Fa:       parseFloat(Fa.toFixed(4)),
      fm015:    parseFloat(fm015.toFixed(4)),
      fm005:    parseFloat(fm005.toFixed(4)),
      cumpleFa,
      cumple015,
      verificacion,
    }
  })

  return { resultados }
}


// =====================================================================
// 3. DENSIDAD DE MUROS (Art. 19.2b)
// =====================================================================

/**
 * Verifica la densidad minima de muros en cada direccion
 *
 * @param {Array} murosX - muros en direccion X, cada uno con:
 *   {string}  nombre
 *   {number}  L         - longitud (m)
 *   {number}  t         - espesor (m)
 *   {boolean} esPlacaCA - true si es placa de concreto armado
 *   {number}  Ec        - modulo elasticidad concreto (kg/cm2), solo si esPlacaCA
 *   {number}  Em        - modulo elasticidad albanileria (kg/cm2), solo si esPlacaCA
 * @param {Array} murosY - muros en direccion Y (misma estructura)
 * @param {number} N     - numero de pisos
 * @param {number} Ap    - area de planta tipica (m2)
 * @param {number} Z     - factor de zona sismica
 * @param {number} U     - factor de uso/importancia
 * @param {number} S     - factor de suelo
 * @returns {object} { densidadReq, resultadoX, resultadoY }
 */
export function calcularDensidadMuros(murosX, murosY, N, Ap, Z, U, S) {
  // Densidad requerida: Z*U*S*N / 56
  const densidadReq = (Z * U * S * N) / 56

  function calcularDireccion(muros) {
    if (!muros || muros.length === 0) {
      return { muros: [], sumaLt: 0, densidad: 0, cumple: false }
    }

    let sumaLt = 0
    const detalle = muros.map((muro) => {
      const { nombre, L, t, esPlacaCA, Ec, Em } = muro

      // Para placas CA: se usa L*t*(Ec/Em) como longitud equivalente
      let LtEquiv
      if (esPlacaCA && Ec && Em && Em > 0) {
        LtEquiv = L * t * (Ec / Em)
      } else {
        LtEquiv = L * t
      }

      sumaLt += LtEquiv
      return {
        nombre,
        L,
        t,
        esPlacaCA: !!esPlacaCA,
        LtEquiv: parseFloat(LtEquiv.toFixed(6)),
      }
    })

    const densidad = Ap > 0 ? sumaLt / Ap : 0

    return {
      muros: detalle,
      sumaLt:   parseFloat(sumaLt.toFixed(6)),
      densidad: parseFloat(densidad.toFixed(6)),
      cumple:   densidad >= densidadReq,
    }
  }

  return {
    densidadReq: parseFloat(densidadReq.toFixed(6)),
    resultadoX:  calcularDireccion(murosX),
    resultadoY:  calcularDireccion(murosY),
  }
}


// =====================================================================
// 4. COLUMNAS DE CONFINAMIENTO (Art. 27.3)
// =====================================================================

/**
 * Calcula el diseno de columnas de confinamiento para un muro
 *
 * Fuerzas internas segun Tabla 11 de la E.070:
 *   Columna extrema:
 *     Vc  = 1.5 * Vm1 * Lm / (L * Nc)
 *     T   = (Mu1 - 0.5*Vm1*h) / L
 *     C   = |T|  (compresion por sismo, valor absoluto)
 *
 *   Columna interior:
 *     Vc  = 1.5 * Vm1 * Lm / (L * Nc)
 *     T   = 0
 *     C   = Pg (solo carga gravitacional)
 *
 * @param {object} datos:
 *   {number} Mu1          - momento ultimo del muro (ton.m)
 *   {number} Vm1          - cortante Vm del muro (ton)
 *   {number} h            - altura del entrepiso (m)
 *   {number} L            - longitud del muro (m)
 *   {number} Lm           - longitud del pano de albanileria (m)
 *   {number} Nc           - numero de columnas de confinamiento
 *   {number} Pg           - carga gravitacional por columna (ton)
 *   {number} fc           - resistencia del concreto f'c (kg/cm2)
 *   {number} fy           - esfuerzo de fluencia del acero (kg/cm2)
 *   {number} phi_c        - factor de reduccion compresion (default 0.70)
 *   {number} phi_f        - factor de reduccion friccion (default 0.85)
 *   {number} mu_f         - coeficiente de friccion (default 0.80)
 *   {number} bc           - ancho de la columna en m (= espesor del muro)
 *   {number} dc           - peralte de la columna en m
 *   {number} db_estribo   - diametro del estribo en mm (default 8)
 *   {number} recubrimiento - recubrimiento en cm (default 4)
 * @returns {object} resultados del diseno
 */
export function calcularColumnasConfinamiento(datos) {
  const {
    Mu1, Vm1, h, L, Lm, Nc,
    Pg, fc, fy,
    phi_c = 0.70,
    phi_f = 0.85,
    mu_f  = 0.80,
    bc, dc,
    db_estribo = 8,
    recubrimiento = 4,
  } = datos

  // ── Momento y fuerza ──
  // M = Mu1 - 0.5 * Vm1 * h
  const M = Mu1 - 0.5 * Vm1 * h

  // F = M / L (traccion/compresion en columna extrema)
  const F = L > 0 ? M / L : 0

  // ── Fuerzas internas - Columna Extrema (Tabla 11) ──
  const Vc_ext = Nc > 0 ? (1.5 * Vm1 * Lm) / (L * Nc) : 0
  const T_ext  = Math.abs(F)
  const C_ext  = Math.abs(F)

  // ── Fuerzas internas - Columna Interior (Tabla 11) ──
  const Vc_int = Vc_ext
  const T_int  = 0
  const C_int  = Pg

  // ── Seccion de la columna ──
  const bc_cm = bc * 100
  const dc_cm = dc * 100
  const Ac = bc_cm * dc_cm  // cm2

  // ── Area requerida por compresion (An) ──
  // Columna extrema: carga mas desfavorable = C_ext + Pg/Nc
  const Pc_ext = (C_ext + Pg / Nc) * 1000  // ton -> kg
  const An_ext = Pc_ext / (phi_c * 0.85 * fc)

  // Columna interior
  const Pc_int = C_int * 1000
  const An_int = Pc_int / (phi_c * 0.85 * fc)

  // ── Area requerida por corte-friccion ──
  // Acf = Vc * 1000 / (0.2 * f'c)  (seccion de concreto)
  const Acf_ext = (Vc_ext * 1000) / (0.2 * fc)
  const Acf_int = (Vc_int * 1000) / (0.2 * fc)

  // Avf = Vc * 1000 / (phi_f * fy * mu_f)  (acero por corte-friccion)
  const Avf_ext = (Vc_ext * 1000) / (phi_f * fy * mu_f)
  const Avf_int = (Vc_int * 1000) / (phi_f * fy * mu_f)

  // ── Refuerzo vertical As ──
  // Por traccion: As = T * 1000 / (phi_f * fy)
  const As_traccion = (T_ext * 1000) / (phi_f * fy)

  // Por corte-friccion
  const As_friccion = Avf_ext

  // As adoptado: el mayor
  const As = Math.max(As_traccion, As_friccion)

  // ── Estribos (Art. 27.3) ──
  const dn = dc_cm - 2 * recubrimiento + db_estribo / 10  // peralte nucleo
  const bn = bc_cm - 2 * recubrimiento + db_estribo / 10  // ancho nucleo
  const An_nucleo = dn * bn

  // Av del estribo (2 ramas)
  const Av_estribo = 2 * (Math.PI / 4) * (db_estribo / 10) * (db_estribo / 10)

  // s1: por confinamiento
  const ratio_Ac_An = An_nucleo > 0 ? Ac / An_nucleo : 1
  const s1_denom = 0.3 * bn * fc * (ratio_Ac_An - 1)
  const s1 = s1_denom > 0 ? (Av_estribo * fy) / s1_denom : 999

  // s2: por cortante => s = Av * fy * d / Vc
  const d_eff = dc_cm - recubrimiento - db_estribo / 20
  const s2 = Vc_ext > 0 ? (Av_estribo * fy * d_eff) / (Vc_ext * 1000) : 999

  // s3: d/4 o 10 cm (el menor)
  const s3 = Math.min(dc_cm / 4, 10)

  // s4: zona central => d/2 o 25 cm (el menor)
  const s4 = Math.min(dc_cm / 2, 25)

  // Espaciamiento adoptado (zona confinada)
  const s_conf = Math.min(s1, s2, s3)
  // Espaciamiento adoptado (zona central)
  const s_central = Math.min(s4, 25)

  // Redondear a 0.5 cm hacia abajo
  const s_conf_adoptado    = Math.floor(s_conf * 2) / 2
  const s_central_adoptado = Math.floor(s_central * 2) / 2

  return {
    // Momento y fuerza
    M:      parseFloat(M.toFixed(4)),
    F:      parseFloat(F.toFixed(4)),

    // Columna extrema
    Vc_ext:  parseFloat(Vc_ext.toFixed(4)),
    T_ext:   parseFloat(T_ext.toFixed(4)),
    C_ext:   parseFloat(C_ext.toFixed(4)),

    // Columna interior
    Vc_int:  parseFloat(Vc_int.toFixed(4)),
    T_int,
    C_int:   parseFloat(C_int.toFixed(4)),

    // Secciones
    Ac,
    An_ext:  parseFloat(An_ext.toFixed(4)),
    An_int:  parseFloat(An_int.toFixed(4)),
    Acf_ext: parseFloat(Acf_ext.toFixed(4)),
    Acf_int: parseFloat(Acf_int.toFixed(4)),

    // Refuerzo vertical
    As_traccion: parseFloat(As_traccion.toFixed(4)),
    As_friccion: parseFloat(As_friccion.toFixed(4)),
    As:          parseFloat(As.toFixed(4)),
    Avf_ext:     parseFloat(Avf_ext.toFixed(4)),
    Avf_int:     parseFloat(Avf_int.toFixed(4)),

    // Estribos
    Av_estribo:         parseFloat(Av_estribo.toFixed(4)),
    s1:                 parseFloat(s1.toFixed(2)),
    s2:                 parseFloat(s2.toFixed(2)),
    s3:                 parseFloat(s3.toFixed(2)),
    s4:                 parseFloat(s4.toFixed(2)),
    s_conf_adoptado:    parseFloat(s_conf_adoptado.toFixed(1)),
    s_central_adoptado: parseFloat(s_central_adoptado.toFixed(1)),
  }
}


// =====================================================================
// 5. VIGA SOLERA (Art. 27.3b)
// =====================================================================

/**
 * Calcula el refuerzo de la viga solera
 *
 * @param {number} Vm1  - cortante Vm del muro (ton)
 * @param {number} Lm   - longitud del pano de albanileria (m)
 * @param {number} L    - longitud total del muro (m)
 * @param {number} phi  - factor de reduccion (tipicamente 0.85)
 * @param {number} fc   - resistencia del concreto f'c (kg/cm2)
 * @param {number} fy   - esfuerzo de fluencia del acero (kg/cm2)
 * @param {number} Acs  - area de la seccion de la viga solera (cm2)
 * @returns {object} { Ts, As, As_min, As_adoptado }
 */
export function calcularVigaSolera(Vm1, Lm, L, phi, fc, fy, Acs) {
  // Ts = Vm1 * Lm / (2 * L)  en ton
  const Ts = L > 0 ? (Vm1 * Lm) / (2 * L) : 0

  // As = Ts * 1000 / (phi * fy)  en cm2
  const As = (Ts * 1000) / (phi * fy)

  // As_min = 0.1 * f'c * Acs / fy  en cm2
  const As_min = (0.1 * fc * Acs) / fy

  // As adoptado = max(As, As_min)
  const As_adoptado = Math.max(As, As_min)

  return {
    Ts:          parseFloat(Ts.toFixed(4)),
    As:          parseFloat(As.toFixed(4)),
    As_min:      parseFloat(As_min.toFixed(4)),
    As_adoptado: parseFloat(As_adoptado.toFixed(4)),
  }
}


// =====================================================================
// 6. CARGAS ORTOGONALES AL PLANO DEL MURO (Art. 29)
// =====================================================================

/**
 * Verifica la resistencia del muro ante cargas perpendiculares a su plano
 *
 * @param {number} Z      - factor de zona sismica
 * @param {number} U      - factor de uso/importancia
 * @param {number} C1     - coeficiente sismico C1 (Art. 29)
 * @param {number} gamma  - peso especifico de la albanileria (ton/m3)
 * @param {number} e      - espesor del muro (m)
 * @param {string} caso   - "caso1".."caso4" (condiciones de borde)
 * @param {number} ba     - relacion b/a para buscar coeficiente m
 * @param {number} m      - coeficiente de momento (si se pasa, ignora caso/ba)
 * @param {number} a      - dimension critica del muro (m), la menor
 * @param {number} tEff   - espesor efectivo del muro (m), normalmente = e
 * @param {number} ft     - resistencia a traccion por flexion (kg/cm2)
 * @returns {object} { w, Ms, fm, ft, coef_m, cumple, verificacion }
 */
export function calcularCargasOrtogonales(Z, U, C1, gamma, e, caso, ba, m, a, tEff, ft) {
  // Si no se proporciona m directamente, buscarlo en Tabla 12
  let coef_m = m
  if ((coef_m === null || coef_m === undefined || coef_m === 0) && caso && ba) {
    coef_m = TABLA_12_LOOKUP(caso, ba)
  }

  // w = 0.8 * Z * U * C1 * gamma * e  (ton/m2)
  const w = 0.8 * Z * U * C1 * gamma * e

  // Ms = m * w * a^2  (ton.m/m)
  const Ms = coef_m * w * a * a

  // Convertir Ms a kg.cm para obtener fm en kg/cm2
  // Ms(ton.m/m) * 1000(kg/ton) * 100(cm/m) = Ms * 100000  => kg.cm/m
  // tEff en cm
  const tEff_cm = tEff * 100
  const fm_calc = tEff_cm > 0
    ? (6 * Ms * 100000) / (tEff_cm * tEff_cm)
    : 0

  const cumple = fm_calc <= ft

  return {
    w:      parseFloat(w.toFixed(6)),
    Ms:     parseFloat(Ms.toFixed(6)),
    fm:     parseFloat(fm_calc.toFixed(4)),
    ft,
    coef_m: coef_m ? parseFloat(coef_m.toFixed(4)) : 0,
    cumple,
    verificacion: cumple ? 'CUMPLE (fm <= ft)' : 'NO CUMPLE (fm > ft)',
  }
}


// =====================================================================
// UTILIDADES AUXILIARES
// =====================================================================

/**
 * Interpola linealmente en la Tabla 10 (correccion por esbeltez de prismas)
 * @param {number} esbeltez - relacion h/t del prisma
 * @returns {number} factor de correccion
 */
export function interpolarTabla10(esbeltez) {
  if (esbeltez <= TABLA_10[0].esbeltez) return TABLA_10[0].factor
  if (esbeltez >= TABLA_10[TABLA_10.length - 1].esbeltez) return TABLA_10[TABLA_10.length - 1].factor

  for (let i = 1; i < TABLA_10.length; i++) {
    if (esbeltez <= TABLA_10[i].esbeltez) {
      const x0 = TABLA_10[i - 1].esbeltez
      const x1 = TABLA_10[i].esbeltez
      const y0 = TABLA_10[i - 1].factor
      const y1 = TABLA_10[i].factor
      return y0 + (y1 - y0) * (esbeltez - x0) / (x1 - x0)
    }
  }

  return TABLA_10[TABLA_10.length - 1].factor
}

/**
 * Determina la clase de unidad segun su fb (Tabla 1)
 * @param {number} fb - resistencia a compresion de la unidad (kg/cm2)
 * @returns {object|null} { clase, zonas } o null
 */
export function clasificarUnidad(fb) {
  for (const row of TABLA_1) {
    const cumpleMin = row.fbMin === null || fb >= row.fbMin
    const cumpleMax = row.fbMax === null || fb <= row.fbMax
    if (cumpleMin && cumpleMax) {
      return { clase: row.clase, zonas: row.zonas }
    }
  }
  return null
}

/**
 * Verifica si una clase de unidad esta permitida en una zona sismica
 * @param {string} clase - "I", "II", "III", "IV", "V"
 * @param {number} zona  - 1, 2, 3 o 4
 * @returns {boolean}
 */
export function unidadPermitidaEnZona(clase, zona) {
  const row = TABLA_1.find((r) => r.clase === clase)
  if (!row) return false
  return row.zonas.includes(zona)
}
