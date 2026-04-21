import { useState, useReducer, useMemo, useCallback, useRef } from 'react'
import { VARILLAS_LONGITUDINALES, VARILLAS_ESTRIBOS } from '../utils/varillas'

// ── Helpers ───────────────────────────────────────────────────────────────────
const pf  = (v, d = 2)  => (v === '' || v == null || isNaN(Number(v))) ? '—' : Number(v).toFixed(d)
const pf4 = v => pf(v, 4)
const num = v => parseFloat(v) || 0

// ── Styles base ───────────────────────────────────────────────────────────────
const S = {
  // Mantenidos para TablaBarras y ResizableTh
  inputCell:     { background: '#1a2744', border: '1px solid rgba(68,114,196,0.3)' },
  compCell:      { background: '#1a3328', border: '1px solid rgba(46,125,50,0.3)' },
  headerCell:    { background: '#2e75b6', color: '#fff', fontWeight: 700, fontSize: 9, textTransform: 'uppercase', letterSpacing: '.5px', padding: '6px 8px', textAlign: 'center', whiteSpace: 'nowrap', fontFamily: 'var(--cond)' },
  cell:          { padding: '5px 8px', fontSize: 10, fontFamily: 'var(--mono)', textAlign: 'center', borderBottom: '1px solid var(--border)' },
  tableInput:    { width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text0)', fontFamily: 'var(--mono)', fontSize: 10, textAlign: 'center', padding: '2px 0' },
  paramLabel:    { fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--sans)', display: 'block', marginBottom: 5 },
  paramInput:    { width: '100%', background: '#1a2744', border: '1px solid rgba(68,114,196,0.35)', borderRadius: 6, color: 'var(--text0)', fontFamily: 'var(--mono)', fontSize: 12, padding: '7px 10px', outline: 'none', boxSizing: 'border-box' },
  paramSelect:   { width: '100%', background: '#161922', border: '1px solid rgba(68,114,196,0.35)', borderRadius: 6, color: 'var(--text0)', fontFamily: 'var(--mono)', fontSize: 12, padding: '7px 10px', outline: 'none', boxSizing: 'border-box' },
  badge:         (bg, color) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, fontFamily: 'var(--mono)', background: bg, color, letterSpacing: '.5px' }),
}

// ── Estilos reutilizables para el nuevo diseño ────────────────────────────────
const D = {
  // Layout
  twoCol:    { display: 'grid', gridTemplateColumns: '40% 60%', gap: 20, alignItems: 'start' },
  // Panel de inputs
  inputPanel: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '18px 20px',
  },
  inputPanelTitle: {
    fontFamily: 'var(--cond)',
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text3)',
    textTransform: 'uppercase',
    letterSpacing: '.8px',
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  // Panel de resultados
  resultsPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  // Card de resultado individual
  resultCard: {
    background: 'rgba(79,195,247,0.07)',
    border: '1px solid rgba(79,195,247,0.18)',
    borderRadius: 12,
    padding: '14px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  resultCardGreen: {
    background: 'rgba(46,125,50,0.12)',
    border: '1px solid rgba(46,125,50,0.3)',
    borderRadius: 12,
    padding: '14px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  resultCardAmber: {
    background: 'rgba(217,119,6,0.1)',
    border: '1px solid rgba(217,119,6,0.3)',
    borderRadius: 12,
    padding: '14px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  resultCardPurple: {
    background: 'rgba(124,77,255,0.1)',
    border: '1px solid rgba(124,77,255,0.28)',
    borderRadius: 12,
    padding: '14px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  // Valor principal grande
  bigValue: {
    fontSize: 26,
    fontFamily: 'var(--mono)',
    fontWeight: 700,
    color: 'var(--text0)',
    lineHeight: 1,
  },
  bigValueGreen: {
    fontSize: 26,
    fontFamily: 'var(--mono)',
    fontWeight: 700,
    color: '#69f0ae',
    lineHeight: 1,
  },
  bigValueAmber: {
    fontSize: 26,
    fontFamily: 'var(--mono)',
    fontWeight: 700,
    color: '#fbbf24',
    lineHeight: 1,
  },
  bigValuePurple: {
    fontSize: 26,
    fontFamily: 'var(--mono)',
    fontWeight: 700,
    color: '#ce93d8',
    lineHeight: 1,
  },
  bigUnit: {
    fontSize: 13,
    color: 'var(--text3)',
    fontFamily: 'var(--sans)',
    marginLeft: 5,
    fontWeight: 400,
  },
  cardLabel: {
    fontSize: 11,
    color: 'var(--text2)',
    fontFamily: 'var(--sans)',
    marginTop: 4,
  },
  // Card de verificación grande
  verifOK: {
    background: 'rgba(46,125,50,0.15)',
    border: '1px solid rgba(46,125,50,0.4)',
    borderRadius: 14,
    padding: '18px 22px',
  },
  verifFail: {
    background: 'rgba(198,40,40,0.15)',
    border: '1px solid rgba(198,40,40,0.4)',
    borderRadius: 14,
    padding: '18px 22px',
  },
  verifNeutral: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: '18px 22px',
  },
  verifTitle: (ok) => ({
    fontSize: 18,
    fontWeight: 700,
    fontFamily: 'var(--cond)',
    color: ok === true ? '#69f0ae' : ok === false ? '#ff5252' : 'var(--text2)',
    letterSpacing: '.5px',
    marginBottom: 8,
  }),
  verifDetail: {
    fontSize: 13,
    fontFamily: 'var(--mono)',
    color: 'var(--text1)',
    lineHeight: 1.6,
  },
  // Fórmulas
  formulaBox: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: '10px 14px',
    fontFamily: 'var(--mono)',
    fontSize: 11,
    color: 'var(--text3)',
    lineHeight: 1.8,
    marginTop: 12,
  },
  formulaTitle: {
    fontSize: 9,
    color: 'var(--text3)',
    fontFamily: 'var(--cond)',
    textTransform: 'uppercase',
    letterSpacing: '.6px',
    marginBottom: 5,
  },
  // Grid de sub-resultados dentro de un card
  subResultGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px 14px',
    marginTop: 6,
  },
  subResultItem: {
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: 8,
  },
  subResultLabel: {
    fontSize: 10,
    color: 'var(--text3)',
    fontFamily: 'var(--cond)',
    textTransform: 'uppercase',
    letterSpacing: '.4px',
    display: 'block',
  },
  subResultValue: {
    fontSize: 13,
    fontFamily: 'var(--mono)',
    fontWeight: 700,
    color: 'var(--text0)',
    display: 'block',
    marginTop: 2,
  },
  // Separador de sección
  sectionDivider: {
    fontSize: 10,
    color: 'var(--text3)',
    fontFamily: 'var(--cond)',
    textTransform: 'uppercase',
    letterSpacing: '.7px',
    marginBottom: 10,
    marginTop: 4,
    paddingBottom: 6,
    borderBottom: '1px solid var(--border)',
  },
  // Readonly field
  readonlyInput: {
    width: '100%',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 6,
    color: 'var(--text3)',
    fontFamily: 'var(--mono)',
    fontSize: 12,
    padding: '7px 10px',
    outline: 'none',
    boxSizing: 'border-box',
    cursor: 'not-allowed',
  },
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ResizableTh({ style, children, ...props }) {
  const ref = useRef(null)
  const onMouseDown = useCallback(e => {
    e.preventDefault()
    const th = ref.current
    const startX = e.clientX
    const startW = th.offsetWidth
    const onMove = ev => { th.style.width = Math.max(40, startW + ev.clientX - startX) + 'px' }
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])
  return (
    <th ref={ref} style={{ ...style, position: 'relative', minWidth: 40 }} {...props}>
      {children}
      <div onMouseDown={onMouseDown}
        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 5, cursor: 'col-resize' }}
        onMouseEnter={e => { e.target.style.background = 'rgba(79,195,247,0.3)' }}
        onMouseLeave={e => { e.target.style.background = 'transparent' }} />
    </th>
  )
}

// Campo de input con label descriptivo
function Field({ label, hint, children, value, onChange, type = 'number', step, min }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <label style={S.paramLabel}>
        {label}
        {hint && <span style={{ color: 'var(--text3)', fontSize: 10, marginLeft: 4 }}>{hint}</span>}
      </label>
      {children || (
        <input
          type={type}
          value={value}
          step={step}
          min={min}
          style={S.paramInput}
          onChange={e => onChange(e.target.value)}
        />
      )}
    </div>
  )
}

// Card de resultado con valor grande
function BigResultCard({ icon, label, value, unit, style, valueStyle, note }) {
  return (
    <div style={{ ...D.resultCard, ...style }}>
      {icon && <div style={{ fontSize: 18, marginBottom: 2 }}>{icon}</div>}
      <div>
        <span style={{ ...D.bigValue, ...valueStyle }}>{value}</span>
        {unit && <span style={D.bigUnit}>{unit}</span>}
      </div>
      <div style={D.cardLabel}>{label}</div>
      {note && <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--sans)', marginTop: 2 }}>{note}</div>}
    </div>
  )
}

// Card de verificación grande
function VerifCard({ ok, mainText, detail }) {
  const cardStyle = ok === true ? D.verifOK : ok === false ? D.verifFail : D.verifNeutral
  const symbol = ok === true ? '✓' : ok === false ? '✗' : '—'
  const label  = ok === true ? 'CUMPLE' : ok === false ? 'NO CUMPLE' : 'SIN DATOS'
  return (
    <div style={cardStyle}>
      <div style={D.verifTitle(ok)}>
        {symbol} {mainText || label}
      </div>
      {detail && <div style={D.verifDetail}>{detail}</div>}
    </div>
  )
}

// Fila de sub-resultado compacto dentro de un card
function SubResult({ label, value, unit }) {
  return (
    <div style={D.subResultItem}>
      <span style={D.subResultLabel}>{label}</span>
      <span style={D.subResultValue}>
        {value}
        {unit && <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 11, marginLeft: 4 }}>{unit}</span>}
      </span>
    </div>
  )
}

// Box de fórmulas
function FormulaBox({ title, formulas }) {
  return (
    <div style={D.formulaBox}>
      {title && <div style={D.formulaTitle}>{title}</div>}
      {formulas.map((f, i) => (
        <div key={i} style={{ marginBottom: i < formulas.length - 1 ? 2 : 0 }}>{f}</div>
      ))}
    </div>
  )
}

// ── State ─────────────────────────────────────────────────────────────────────
function initState() {
  return {
    flex: {
      Mu: 15,
      b: 30,
      h: 60,
      rec: 6,
      fc: 210,
      fy: 4200,
    },
    corte: {
      Vu: 10,
      zonasismica: true,
      estribo: VARILLAS_ESTRIBOS[1].d,
      nramas: 2,
      dblong: 1.905,
    },
    predim: {
      tipo: 'Viga',
      luz: 6,
      tipoCarga: 'Gravedad',
      At: 25,
      Npisos: 5,
      fcCol: 210,
      luzLosa: 4,
      tipoLosa: 'Losa aligerada',
    },
    defl: {
      L: 500,
      As_prov: 8,
      w_D: 2.0,
      w_L: 1.0,
      tipoApoyo: '5/384',
      xi_tiempo: '2.0',
      rho_prima: 0,
      limite: 'L/240',
    },
    nudo: {
      tipoNudo: 'Interior',
      b_col: 40,
      h_col: 50,
      b_viga: 30,
      h_viga: 60,
      fc_nudo: 210,
      As_sup: 10,
      As_inf: 5,
      fy_nudo: 4200,
      Vu_col: 15,
      N_col: 50,
    },
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FLEX':
      return { ...state, flex: { ...state.flex, [action.field]: action.value } }
    case 'SET_CORTE':
      return { ...state, corte: { ...state.corte, [action.field]: action.value } }
    case 'SET_PREDIM':
      return { ...state, predim: { ...state.predim, [action.field]: action.value } }
    case 'SET_DEFL':
      return { ...state, defl: { ...state.defl, [action.field]: action.value } }
    case 'SET_NUDO':
      return { ...state, nudo: { ...state.nudo, [action.field]: action.value } }
    default: return state
  }
}

// ── Cálculo de flexión ────────────────────────────────────────────────────────
function calcFlex(f) {
  const Mu  = num(f.Mu)
  const b   = num(f.b)
  const h   = num(f.h)
  const rec = num(f.rec)
  const fc  = num(f.fc)
  const fy  = num(f.fy)

  if (!b || !h || !fc || !fy) return null

  const d = h - rec
  const phi = 0.9
  const beta1 = fc <= 280 ? 0.85 : fc <= 560 ? 0.85 - 0.05 * (fc - 280) / 70 : 0.65
  const Es = 2e6
  const eu = 0.003

  const rho_bal = (0.85 * beta1 * fc / fy) * (eu * Es / (eu * Es + fy))
  const rho_max = 0.75 * rho_bal
  const rho_min = Math.max(0.25 * Math.sqrt(fc) / fy, 14 / fy)

  const As_min = rho_min * b * d
  const As_max = rho_max * b * d

  const Mu_kgcm = Mu * 1e5
  const A_coef = phi * fy * fy / (2 * 0.85 * fc * b)
  const B_coef = -phi * fy * d
  const C_coef = Mu_kgcm
  const disc = B_coef * B_coef - 4 * A_coef * C_coef
  let As_req = null
  if (disc >= 0) {
    const r1 = (-B_coef - Math.sqrt(disc)) / (2 * A_coef)
    const r2 = (-B_coef + Math.sqrt(disc)) / (2 * A_coef)
    const candidates = [r1, r2].filter(r => r > 0)
    As_req = candidates.length ? Math.min(...candidates) : null
  }

  let a = null, phiMn = null
  if (As_req !== null) {
    a = As_req * fy / (0.85 * fc * b)
    phiMn = phi * As_req * fy * (d - a / 2) / 1e5
  }

  const rho = As_req !== null ? As_req / (b * d) : null

  return { d, rho, rho_min, rho_max, rho_bal, beta1, As_req, As_min, As_max, a, phiMn, phi }
}

// ── Tabla de selección de barras ──────────────────────────────────────────────
function TablaBarras({ b, rec, As_req }) {
  const bNum   = num(b)
  const recNum = num(rec)

  const filas = useMemo(() => {
    if (!As_req || As_req <= 0 || !bNum) return []
    return VARILLAS_LONGITUDINALES.flatMap(v => {
      const maxN = 8
      return Array.from({ length: maxN }, (_, i) => {
        const n = i + 1
        const asTotal  = n * v.area
        const sep      = Math.max(2.5, v.d / 10)
        const anchoMin = 2 * recNum + n * (v.d / 10) + (n - 1) * sep
        const cabe     = anchoMin <= bNum
        return { varilla: v.label, n, asTotal, cabe, anchoMin }
      }).filter(f => f.asTotal >= As_req * 0.98).slice(0, 1)
    }).filter(f => f.asTotal >= As_req * 0.98).slice(0, 8)
  }, [As_req, bNum, recNum])

  if (!filas.length) {
    return (
      <div style={{ color: 'var(--text3)', fontSize: 11, padding: '12px 0', fontFamily: 'var(--sans)' }}>
        Ingrese datos para ver opciones de barras.
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Diámetro', 'N° barras', 'As total (cm²)', 'Cabe?', 'Ancho mín. (cm)'].map(h => (
              <ResizableTh key={h} style={S.headerCell}>{h}</ResizableTh>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => {
            // Colorcode: verde=cabe y cubre, amarillo=no cabe pero cubre, gris imposible
            const rowBg = f.cabe
              ? (i % 2 ? 'rgba(46,125,50,0.12)' : 'rgba(46,125,50,0.06)')
              : (i % 2 ? 'rgba(217,119,6,0.1)' : 'rgba(217,119,6,0.05)')
            return (
              <tr key={i} style={{ background: rowBg }}>
                <td style={{ ...S.cell, fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--text0)' }}>{f.varilla}</td>
                <td style={{ ...S.cell, ...S.inputCell }}>{f.n}</td>
                <td style={{ ...S.cell, ...S.compCell, fontWeight: 700 }}>{f.asTotal.toFixed(2)}</td>
                <td style={{ ...S.cell, background: f.cabe ? 'rgba(46,125,50,0.2)' : 'rgba(217,119,6,0.2)', textAlign: 'center' }}>
                  <span style={S.badge(
                    f.cabe ? 'rgba(46,125,50,0.35)' : 'rgba(217,119,6,0.35)',
                    f.cabe ? '#69f0ae' : '#fbbf24'
                  )}>
                    {f.cabe ? 'SÍ CABE' : 'AJUSTADO'}
                  </span>
                </td>
                <td style={{ ...S.cell, ...S.compCell }}>{f.anchoMin.toFixed(1)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--sans)', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
        Verde = cabe con holgura · Amarillo = revise espaciamiento · Separacion minima: max(25 mm, d_varilla)
      </div>
    </div>
  )
}

// ── Cálculo de corte ──────────────────────────────────────────────────────────
function calcCorte(c, flex) {
  const Vu    = num(c.Vu)
  const b     = num(flex.b)
  const fc    = num(flex.fc)
  const fy    = num(flex.fy)
  const nram  = num(c.nramas)
  const dbstr = c.estribo
  const dblon = c.dblong
  const sismic = c.zonasismica

  const flexRes = calcFlex(flex)
  const d = flexRes ? flexRes.d : num(flex.h) - num(flex.rec)

  if (!b || !d || !fc || !fy || !Vu) return null

  const phi = 0.85
  const varEst = VARILLAS_ESTRIBOS.find(v => v.d === dbstr) || VARILLAS_ESTRIBOS[1]
  const Av = nram * varEst.area

  const Vc    = 0.53 * Math.sqrt(fc) * b * d / 1000
  const phiVc = phi * Vc
  const Vs_req = Math.max(0, Vu / phi - Vc)
  const Vs_max = 2.1 * Math.sqrt(fc) * b * d / 1000
  const seccionOK = Vs_req <= Vs_max

  const s_res = Vs_req > 0 ? (Av * fy * d) / (Vs_req * 1000) : null
  const s_dmax = d / 2
  const s_abs  = 60
  const s_min_const = Math.min(8 * (dblon / 10), 24 * (varEst.d / 10), 30, d / 2)
  const L_conf = 2 * num(flex.h)

  const s_sism = sismic
    ? Math.min(d / 4, 8 * (dblon / 10), 24 * (varEst.d / 10), 30)
    : null

  const candidatos = [s_dmax, s_abs, s_min_const]
  if (s_res !== null)  candidatos.push(s_res)
  if (s_sism !== null) candidatos.push(s_sism)
  const s_adopt = Math.floor(Math.min(...candidatos.filter(v => v > 0)))

  const s_conf_display = s_sism ? Math.floor(s_sism) : Math.floor(s_dmax)
  const N_conf = s_adopt > 0 ? Math.ceil(L_conf / s_adopt) : '—'
  const dist = `1@5, ${N_conf}@${s_adopt}, r@25 cm`

  return { Vc, phiVc, Vs_req, Vs_max, seccionOK, s_res, s_dmax, s_abs, s_min_const, s_sism, s_adopt, L_conf, dist, d, Av, varEst, s_conf_display }
}

// ── Cálculo predimensionamiento ───────────────────────────────────────────────
function calcPredim(p) {
  const luz = num(p.luz)
  const At  = num(p.At)
  const N   = num(p.Npisos)
  const fc  = num(p.fcCol)

  let vigaRes = null
  if (p.tipo === 'Viga' && luz > 0) {
    const factor = p.tipoCarga === 'Sismo' ? 10 : 12
    const h = luz / factor
    const b = Math.max(0.25, h / 2)
    vigaRes = { h: (h * 100).toFixed(0), b: (b * 100).toFixed(0) }
  }

  let colRes = null
  if (p.tipo === 'Columna' && At > 0 && N > 0 && fc > 0) {
    const wServicio = 1.25
    const P_est = At * N * wServicio
    const Ag_req = P_est * 1000 / (0.45 * fc)
    const lado = Math.ceil(Math.sqrt(Ag_req) / 5) * 5
    colRes = { P_est, Ag_req, lado }
  }

  let losaRes = null
  if ((p.tipo === 'Losa aligerada' || p.tipo === 'Losa maciza') && num(p.luzLosa) > 0) {
    const luzL = num(p.luzLosa)
    const h = p.tipo === 'Losa aligerada' ? luzL / 25 : luzL / 30
    losaRes = { h: (h * 100).toFixed(0) }
  }

  return { vigaRes, colRes, losaRes }
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: FLEXIÓN
// ══════════════════════════════════════════════════════════════════════════════
function TabFlexion({ state, dispatch }) {
  const f   = state.flex
  const set = (field, value) => dispatch({ type: 'SET_FLEX', field, value })

  const res   = useMemo(() => calcFlex(f), [f])
  const verif = res && res.phiMn !== null ? res.phiMn >= num(f.Mu) : null

  // Determinar As_final = max(As_req, As_min)
  const As_final = res && res.As_req !== null
    ? Math.max(res.As_req, res.As_min)
    : null

  return (
    <div>
      {/* Layout 2 columnas */}
      <div style={{ ...D.twoCol, marginBottom: 20 }}>

        {/* ─ Columna izquierda: Inputs ─ */}
        <div style={D.inputPanel}>
          <div style={D.inputPanelTitle}>
            Datos de entrada
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 14px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field
                label="Momento último Mu (ton·m)"
                value={f.Mu}
                onChange={v => set('Mu', v)}
                step="0.5"
              />
            </div>
            <Field label="Ancho de viga b (cm)"   value={f.b}   onChange={v => set('b',  v)} step="5"   min="1" />
            <Field label="Altura total h (cm)"     value={f.h}   onChange={v => set('h',  v)} step="5"   min="1" />
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Recubrimiento libre (cm)" value={f.rec} onChange={v => set('rec', v)} step="0.5" min="1" />
            </div>
            <Field label="Resistencia concreto f'c (kg/cm²)">
              <select value={f.fc} onChange={e => set('fc', e.target.value)} style={S.paramSelect}>
                {[175, 210, 280, 350].map(v => <option key={v} value={v}>{v} kg/cm²</option>)}
              </select>
            </Field>
            <Field label="Fluencia del acero fy (kg/cm²)" value={f.fy} onChange={v => set('fy', v)} step="100" min="1" />
          </div>

          <FormulaBox
            title="Fórmulas aplicadas"
            formulas={[
              `d = h − rec = ${res ? pf(res.d) : '?'} cm`,
              `As_req: φ·As·fy·(d − a/2) = Mu`,
              `a = As·fy / (0.85·f'c·b)`,
              `ρ_min = max(0.25√f'c/fy, 14/fy)`,
              `ρ_max = 0.75·ρ_bal`,
            ]}
          />
        </div>

        {/* ─ Columna derecha: Resultados ─ */}
        <div style={D.resultsPanel}>

          {/* Peralte efectivo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <BigResultCard
              label="Peralte efectivo d"
              value={res ? pf(res.d) : '—'}
              unit="cm"
              note="d = h − recubrimiento"
            />
            <BigResultCard
              label="Factor de bloque β₁"
              value={res ? pf(res.beta1) : '—'}
              note={`f'c = ${f.fc} kg/cm²`}
            />
          </div>

          {/* As requerido — el dato más importante */}
          <BigResultCard
            label="Acero longitudinal requerido As"
            value={res && res.As_req !== null ? pf(res.As_req) : '—'}
            unit="cm²"
            style={{
              background: 'rgba(79,195,247,0.1)',
              border: '1px solid rgba(79,195,247,0.3)',
              borderRadius: 14,
              padding: '18px 22px',
            }}
            valueStyle={{ fontSize: 32, color: '#4fc3f7' }}
            note={As_final && res && res.As_req !== null
              ? (res.As_req < res.As_min
                  ? `Controla ρ_min → usar As = ${pf(res.As_min)} cm²`
                  : 'Controla Mu — ok')
              : undefined
            }
          />

          {/* Límites de cuantía */}
          <div style={{ ...D.resultCard }}>
            <div style={D.sectionDivider}>Límites de cuantía de acero</div>
            <div style={D.subResultGrid}>
              <SubResult label="As mínimo" value={res ? pf(res.As_min) : '—'} unit="cm²" />
              <SubResult label="As máximo" value={res ? pf(res.As_max) : '—'} unit="cm²" />
              <SubResult label="ρ calculado" value={res && res.rho !== null ? pf4(res.rho) : '—'} />
              <SubResult label="ρ mínimo" value={res ? pf4(res.rho_min) : '—'} />
              <SubResult label="ρ máximo" value={res ? pf4(res.rho_max) : '—'} />
              <SubResult label="ρ balanceado" value={res ? pf4(res.rho_bal) : '—'} />
            </div>
          </div>

          {/* Capacidad nominal */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <BigResultCard
              label="Prof. bloque de compresión a"
              value={res && res.a !== null ? pf(res.a) : '—'}
              unit="cm"
            />
            <BigResultCard
              label="Resistencia nominal φMn"
              value={res && res.phiMn !== null ? pf(res.phiMn) : '—'}
              unit="ton·m"
              style={verif === true
                ? { ...D.resultCard, background: 'rgba(46,125,50,0.12)', border: '1px solid rgba(46,125,50,0.3)' }
                : verif === false
                  ? { ...D.resultCard, background: 'rgba(198,40,40,0.1)', border: '1px solid rgba(198,40,40,0.3)' }
                  : D.resultCard
              }
              valueStyle={verif === true ? { color: '#69f0ae' } : verif === false ? { color: '#ff5252' } : {}}
            />
          </div>

          {/* Verificación */}
          <VerifCard
            ok={verif}
            mainText={verif === true ? 'CUMPLE — Resistencia OK' : verif === false ? 'NO CUMPLE — Aumentar sección' : '—'}
            detail={
              res && res.phiMn !== null
                ? `φMn = ${pf(res.phiMn)} ton·m  ${verif ? '≥' : '<'}  Mu = ${pf(f.Mu)} ton·m`
                : 'Complete los datos para verificar'
            }
          />

        </div>
      </div>

      {/* Tabla de barras — ancho completo */}
      <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
        <div style={D.inputPanelTitle}>Opciones de barras longitudinales</div>
        <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--sans)', marginBottom: 14 }}>
          Combinaciones que cubren As requerido ({res && res.As_req !== null ? pf(res.As_req) : '—'} cm²).
          Se verifica que las barras quepan en el ancho b = {f.b} cm con separacion minima reglamentaria.
        </div>
        <TablaBarras b={f.b} rec={f.rec} As_req={res?.As_req} />
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: CORTE
// ══════════════════════════════════════════════════════════════════════════════
function TabCorte({ state, dispatch }) {
  const c   = state.corte
  const f   = state.flex
  const set = (field, value) => dispatch({ type: 'SET_CORTE', field, value })

  const res = useMemo(() => calcCorte(c, f), [c, f])

  return (
    <div>
      <div style={{ ...D.twoCol, marginBottom: 20 }}>

        {/* ─ Columna izquierda: Inputs ─ */}
        <div style={D.inputPanel}>
          <div style={D.inputPanelTitle}>Datos de entrada</div>

          <Field label="Fuerza cortante última Vu (ton)" value={c.Vu} onChange={v => set('Vu', v)} step="0.5" />

          <div style={{ height: 10 }} />
          <div style={D.sectionDivider}>Datos de la sección (desde Flexión)</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px', marginBottom: 14 }}>
            <Field label="Ancho b (cm)">
              <input type="number" value={f.b} readOnly style={D.readonlyInput} />
            </Field>
            <Field label="Peralte efectivo d (cm)">
              <input type="number" value={res ? res.d.toFixed(1) : ''} readOnly style={D.readonlyInput} />
            </Field>
            <Field label="f'c (kg/cm²)">
              <input type="number" value={f.fc} readOnly style={D.readonlyInput} />
            </Field>
            <Field label="fy (kg/cm²)">
              <input type="number" value={f.fy} readOnly style={D.readonlyInput} />
            </Field>
          </div>

          <div style={D.sectionDivider}>Estribos</div>

          <Field label="Diámetro de estribo">
            <select value={c.estribo} onChange={e => set('estribo', parseFloat(e.target.value))} style={S.paramSelect}>
              {VARILLAS_ESTRIBOS.map(v => <option key={v.d} value={v.d}>{v.label} — área = {v.area} cm²</option>)}
            </select>
          </Field>

          <div style={{ height: 8 }} />

          <Field label="Número de ramas">
            <select value={c.nramas} onChange={e => set('nramas', parseInt(e.target.value))} style={S.paramSelect}>
              {[2, 3, 4].map(n => <option key={n} value={n}>{n} ramas</option>)}
            </select>
          </Field>

          <div style={{ height: 8 }} />

          <Field label="Barra longitudinal principal (para límites)">
            <select value={c.dblong} onChange={e => set('dblong', parseFloat(e.target.value))} style={S.paramSelect}>
              {VARILLAS_ESTRIBOS.concat([{ d: 1.905, label: 'N°6 (3/4″)' }, { d: 2.222, label: 'N°7 (7/8″)' }, { d: 2.540, label: 'N°8 (1″)' }])
                .filter((v, i, a) => a.findIndex(x => x.d === v.d) === i)
                .sort((a, b) => a.d - b.d)
                .map(v => <option key={v.d} value={v.d}>{v.label}</option>)}
            </select>
          </Field>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, padding: '12px 14px', background: c.zonasismica ? 'rgba(124,77,255,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${c.zonasismica ? 'rgba(124,77,255,0.3)' : 'var(--border)'}`, borderRadius: 8 }}>
            <input
              type="checkbox"
              id="zonasisc"
              checked={c.zonasismica}
              onChange={e => set('zonasismica', e.target.checked)}
              style={{ accentColor: '#7c4dff', width: 16, height: 16, cursor: 'pointer' }}
            />
            <label htmlFor="zonasisc" style={{ fontFamily: 'var(--sans)', fontSize: 12, color: c.zonasismica ? '#ce93d8' : 'var(--text2)', cursor: 'pointer' }}>
              Zona sísmica (aplica cl. 21 de E.060)
            </label>
          </div>

          <FormulaBox
            title="Fórmulas"
            formulas={[
              `Vc = 0.53·√f'c·b·d / 1000`,
              `Vs_req = Vu/φ − Vc`,
              `s = Av·fy·d / (Vs·1000)`,
              `Vs_max = 2.1·√f'c·b·d / 1000`,
            ]}
          />
        </div>

        {/* ─ Columna derecha: Resultados ─ */}
        <div style={D.resultsPanel}>

          {/* Info estribo seleccionado */}
          {res && (
            <div style={{ ...D.resultCardPurple, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 28 }}>&#9632;</div>
              <div>
                <div style={{ ...D.bigValuePurple, fontSize: 16, marginBottom: 2 }}>{res.varEst?.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--sans)' }}>
                  {c.nramas} ramas · Av = {res.Av.toFixed(2)} cm²
                </div>
              </div>
            </div>
          )}

          {/* Vc y φVc */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <BigResultCard
              label="Resistencia del concreto Vc"
              value={res ? pf(res.Vc) : '—'}
              unit="ton"
            />
            <BigResultCard
              label="Resistencia reducida φVc"
              value={res ? pf(res.phiVc) : '—'}
              unit="ton"
              note="φ = 0.85"
            />
          </div>

          {/* Vs requerido y máximo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <BigResultCard
              label="Cortante de acero requerido Vs"
              value={res ? pf(res.Vs_req) : '—'}
              unit="ton"
              style={res && !res.seccionOK
                ? { ...D.resultCard, background: 'rgba(198,40,40,0.1)', border: '1px solid rgba(198,40,40,0.3)' }
                : D.resultCard
              }
            />
            <BigResultCard
              label="Cortante máximo de acero Vs_max"
              value={res ? pf(res.Vs_max) : '—'}
              unit="ton"
              note="E.060 límite sección"
            />
          </div>

          {/* Verificación de sección */}
          <VerifCard
            ok={res ? res.seccionOK : null}
            mainText={res
              ? (res.seccionOK ? 'SECCIÓN ADECUADA' : 'AMPLIAR SECCIÓN')
              : '—'
            }
            detail={res
              ? `Vs = ${pf(res.Vs_req)} ton  ${res.seccionOK ? '≤' : '>'}  Vs_max = ${pf(res.Vs_max)} ton`
              : 'Complete los datos'
            }
          />

          {/* Espaciamientos */}
          <div style={D.resultCard}>
            <div style={D.sectionDivider}>Espaciamientos calculados</div>
            <div style={D.subResultGrid}>
              <SubResult
                label="s por resistencia"
                value={res?.s_res !== null ? pf(res.s_res) : 'No req.'}
                unit={res?.s_res !== null ? 'cm' : ''}
              />
              <SubResult label="s máximo d/2" value={res ? pf(res.s_dmax) : '—'} unit="cm" />
              <SubResult label="s constructivo mín." value={res ? pf(res.s_min_const) : '—'} unit="cm" />
              {c.zonasismica && (
                <SubResult label="s sísmico zona conf." value={res?.s_sism !== null ? pf(res.s_sism) : '—'} unit="cm" />
              )}
            </div>
          </div>

          {/* Espaciamiento adoptado — destacado */}
          <BigResultCard
            label="Espaciamiento adoptado (el menor de todos)"
            value={res ? pf(res.s_adopt, 0) : '—'}
            unit="cm"
            style={{
              background: 'rgba(124,77,255,0.12)',
              border: '1px solid rgba(124,77,255,0.35)',
              borderRadius: 14,
              padding: '18px 22px',
            }}
            valueStyle={{ fontSize: 36, color: '#ce93d8' }}
          />

          {/* Zona de confinamiento */}
          <div style={D.resultCard}>
            <div style={D.sectionDivider}>Zona de confinamiento sísmica</div>
            <SubResult label="Longitud de confinamiento" value={res ? pf(res.L_conf, 0) : '—'} unit="cm" />
            <div style={{ height: 10 }} />
            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--cond)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
              Distribución de estribos sugerida
            </div>
            <div style={{
              background: 'rgba(124,77,255,0.14)',
              border: '1px solid rgba(124,77,255,0.3)',
              borderRadius: 8,
              padding: '12px 16px',
              fontFamily: 'var(--mono)',
              fontSize: 14,
              color: '#ce93d8',
              fontWeight: 700,
              letterSpacing: '.3px',
            }}>
              {res?.varEst?.label || '—'}: {res ? res.dist : '—'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--sans)', marginTop: 8 }}>
              Lectura: 1 estribo a 5 cm, luego el resto a {res ? pf(res.s_adopt, 0) : '—'} cm en zona de confinamiento, resto a 25 cm en zona central.
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: PREDIMENSIONAMIENTO
// ══════════════════════════════════════════════════════════════════════════════
function TabPredim({ state, dispatch }) {
  const p   = state.predim
  const set = (field, value) => dispatch({ type: 'SET_PREDIM', field, value })
  const res = useMemo(() => calcPredim(p), [p])

  return (
    <div>
      {/* Selector de tipo */}
      <div style={{ marginBottom: 20, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
        <div style={D.inputPanelTitle}>Tipo de elemento a predimensionar</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {['Viga', 'Columna', 'Losa aligerada', 'Losa maciza'].map(tipo => (
            <button
              key={tipo}
              onClick={() => set('tipo', tipo)}
              style={{
                padding: '14px 10px',
                borderRadius: 10,
                border: `2px solid ${p.tipo === tipo ? '#7c4dff' : 'var(--border)'}`,
                background: p.tipo === tipo ? 'rgba(124,77,255,0.15)' : 'rgba(255,255,255,0.03)',
                color: p.tipo === tipo ? '#ce93d8' : 'var(--text2)',
                fontFamily: 'var(--cond)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all .15s',
                letterSpacing: '.3px',
              }}
            >
              {tipo === 'Viga' && '— '}
              {tipo === 'Columna' && '|| '}
              {tipo === 'Losa aligerada' && '≡ '}
              {tipo === 'Losa maciza' && '▬ '}
              {tipo}
            </button>
          ))}
        </div>
      </div>

      <div style={D.twoCol}>

        {/* ─ Columna izquierda: Inputs ─ */}
        <div style={D.inputPanel}>
          <div style={D.inputPanelTitle}>Parámetros</div>

          {p.tipo === 'Viga' && (
            <>
              <Field label="Luz libre de la viga L (m)" value={p.luz} onChange={v => set('luz', v)} step="0.5" min="1" />
              <div style={{ height: 12 }} />
              <Field label="Tipo de carga que domina">
                <select value={p.tipoCarga} onChange={e => set('tipoCarga', e.target.value)} style={S.paramSelect}>
                  <option value="Gravedad">Gravedad — se usa h = L/12</option>
                  <option value="Sismo">Sísmica — se usa h = L/10</option>
                </select>
              </Field>
              <FormulaBox
                title="Criterio normativo"
                formulas={[
                  p.tipoCarga === 'Sismo' ? 'h = L / 10  (E.060 cl. 21.3.1)' : 'h = L / 12  (ACI 318 Tabla 9.5a)',
                  'b = max(h/2 , 25 cm)',
                  'Redondear a multiplos de 5 cm',
                ]}
              />
            </>
          )}

          {p.tipo === 'Columna' && (
            <>
              <Field label="Área tributaria por piso (m²)" value={p.At} onChange={v => set('At', v)} step="1" min="1" />
              <div style={{ height: 12 }} />
              <Field label="Número de pisos" value={p.Npisos} onChange={v => set('Npisos', v)} step="1" min="1" />
              <div style={{ height: 12 }} />
              <Field label="Resistencia del concreto f'c (kg/cm²)">
                <select value={p.fcCol} onChange={e => set('fcCol', e.target.value)} style={S.paramSelect}>
                  {[175, 210, 280, 350].map(v => <option key={v} value={v}>{v} kg/cm²</option>)}
                </select>
              </Field>
              <FormulaBox
                title="Criterio"
                formulas={[
                  'P = At × N° pisos × 1.25 t/m²',
                  'Ag = P × 1000 / (0.45 × f\'c)',
                  'lado = ceil(√Ag  /  5) × 5 cm',
                ]}
              />
            </>
          )}

          {(p.tipo === 'Losa aligerada' || p.tipo === 'Losa maciza') && (
            <>
              <Field label="Luz libre de la losa L (m)" value={p.luzLosa} onChange={v => set('luzLosa', v)} step="0.5" min="1" />
              <FormulaBox
                title="Criterio"
                formulas={[
                  p.tipo === 'Losa aligerada'
                    ? 'h = L / 25  (E.060 cl. 9.5.3)'
                    : 'h = L / 30  (E.060 cl. 9.5.2)',
                  p.tipo === 'Losa aligerada'
                    ? 'Estándares: 17, 20, 25, 30 cm'
                    : 'h mín. absoluto: 9 cm',
                ]}
              />
            </>
          )}
        </div>

        {/* ─ Columna derecha: Resultados como cards grandes ─ */}
        <div style={D.resultsPanel}>

          {p.tipo === 'Viga' && res.vigaRes && (
            <>
              <div style={{ ...D.inputPanelTitle, marginBottom: 0 }}>Dimensiones sugeridas</div>

              {/* Cards grandes de h y b */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{
                  background: 'rgba(79,195,247,0.1)',
                  border: '1px solid rgba(79,195,247,0.3)',
                  borderRadius: 16,
                  padding: '24px 20px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 48, fontFamily: 'var(--mono)', fontWeight: 700, color: '#4fc3f7', lineHeight: 1 }}>
                    {res.vigaRes.h}
                  </div>
                  <div style={{ fontSize: 16, color: 'var(--text3)', fontFamily: 'var(--sans)', marginTop: 4 }}>cm</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', fontFamily: 'var(--sans)', marginTop: 10, fontWeight: 600 }}>
                    Peralte total h
                  </div>
                </div>
                <div style={{
                  background: 'rgba(124,77,255,0.1)',
                  border: '1px solid rgba(124,77,255,0.3)',
                  borderRadius: 16,
                  padding: '24px 20px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 48, fontFamily: 'var(--mono)', fontWeight: 700, color: '#ce93d8', lineHeight: 1 }}>
                    {res.vigaRes.b}
                  </div>
                  <div style={{ fontSize: 16, color: 'var(--text3)', fontFamily: 'var(--sans)', marginTop: 4 }}>cm</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', fontFamily: 'var(--sans)', marginTop: 10, fontWeight: 600 }}>
                    Ancho b
                  </div>
                </div>
              </div>

              <div style={{ ...D.resultCard, marginTop: 4 }}>
                <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--sans)', lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--text1)' }}>Criterio aplicado:</strong>{' '}
                  {p.tipoCarga === 'Sismo' ? 'h = L/10 (carga sísmica dominante)' : 'h = L/12 (carga gravitacional)'}
                  <br />
                  Luz L = {p.luz} m → h = {(p.luz / (p.tipoCarga === 'Sismo' ? 10 : 12) * 100).toFixed(0)} cm, b = h/2
                  <br />
                  Verificar b ≥ 25 cm (E.060) y b ≥ h/4. Redondear a multiplos de 5 cm.
                </div>
              </div>
            </>
          )}

          {p.tipo === 'Columna' && res.colRes && (
            <>
              <div style={D.inputPanelTitle}>Resultados de predimensionamiento</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <BigResultCard label="Carga axial estimada P" value={pf(res.colRes.P_est)} unit="ton" />
                <BigResultCard label="Área bruta requerida Ag" value={pf(res.colRes.Ag_req, 0)} unit="cm²" />
              </div>
              <div style={{
                background: 'rgba(79,195,247,0.1)',
                border: '1px solid rgba(79,195,247,0.3)',
                borderRadius: 16,
                padding: '24px 20px',
                textAlign: 'center',
                marginTop: 4,
              }}>
                <div style={{ fontSize: 52, fontFamily: 'var(--mono)', fontWeight: 700, color: '#4fc3f7', lineHeight: 1 }}>
                  {res.colRes.lado}
                </div>
                <div style={{ fontSize: 16, color: 'var(--text3)', fontFamily: 'var(--sans)', marginTop: 4 }}>cm</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', fontFamily: 'var(--sans)', marginTop: 10, fontWeight: 600 }}>
                  Lado mínimo (columna cuadrada)
                </div>
              </div>
              <div style={{ ...D.resultCard, marginTop: 4 }}>
                <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--sans)', lineHeight: 1.6 }}>
                  Redondear a multiplos de 5 cm. Verificar refuerzo minimo 1% Ag y maximo 4% Ag.
                  Seccion rectangular: ajustar segun arquitectura.
                </div>
              </div>
            </>
          )}

          {(p.tipo === 'Losa aligerada' || p.tipo === 'Losa maciza') && res.losaRes && (
            <>
              <div style={D.inputPanelTitle}>Espesor sugerido</div>
              <div style={{
                background: 'rgba(79,195,247,0.1)',
                border: '1px solid rgba(79,195,247,0.3)',
                borderRadius: 16,
                padding: '32px 20px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 64, fontFamily: 'var(--mono)', fontWeight: 700, color: '#4fc3f7', lineHeight: 1 }}>
                  {res.losaRes.h}
                </div>
                <div style={{ fontSize: 18, color: 'var(--text3)', fontFamily: 'var(--sans)', marginTop: 6 }}>cm</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', fontFamily: 'var(--sans)', marginTop: 12, fontWeight: 600 }}>
                  Espesor total h — {p.tipo}
                </div>
              </div>
              <div style={{ ...D.resultCard }}>
                <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--sans)', lineHeight: 1.7 }}>
                  {p.tipo === 'Losa aligerada'
                    ? 'Espesor calculado: h = L/25. Espesores comerciales disponibles: 17, 20, 25, 30 cm. Seleccionar el valor inmediato superior al calculado.'
                    : 'Espesor calculado: h = L/30. Espesor minimo absoluto segun E.060: 9 cm. Seleccionar el valor inmediato superior al calculado.'
                  }
                </div>
              </div>
            </>
          )}

          {/* Tabla de referencia siempre visible */}
          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ ...D.inputPanelTitle, marginBottom: 12 }}>Referencia normativa</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
              <thead>
                <tr>
                  {['Elemento', 'Criterio', 'h mín.', 'Fuente'].map(h => (
                    <ResizableTh key={h} style={S.headerCell}>{h}</ResizableTh>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Viga (gravedad)',  'h = L/12', '—',     'ACI 318 Tabla 9.5a'],
                  ['Viga (sísmica)',   'h = L/10', '—',     'E.060 cl. 21.3.1'],
                  ['Columna',         'b ≥ 0.25h', '25 cm', 'E.060 cl. 21.4.1'],
                  ['Losa aligerada',  'h = L/25',  '17 cm', 'E.060 cl. 9.5.3'],
                  ['Losa maciza',     'h = L/30',  '9 cm',  'E.060 cl. 9.5.2'],
                ].map((r, i) => (
                  <tr key={i} style={{
                    background: r[0].startsWith(p.tipo.split(' ')[0])
                      ? 'rgba(124,77,255,0.12)'
                      : i % 2 ? 'rgba(255,255,255,0.02)' : 'transparent',
                  }}>
                    {r.map((c, j) => (
                      <td key={j} style={{
                        ...S.cell,
                        color: r[0].startsWith(p.tipo.split(' ')[0]) ? '#ce93d8' : 'var(--text1)',
                        fontWeight: r[0].startsWith(p.tipo.split(' ')[0]) ? 600 : 400,
                      }}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: DEFLEXIONES
// ══════════════════════════════════════════════════════════════════════════════
function TabDeflexiones({ state, dispatch }) {
  const dl  = state.defl
  const f   = state.flex
  const set = (field, value) => dispatch({ type: 'SET_DEFL', field, value })

  const b   = num(f.b)
  const h   = num(f.h)
  const rec = num(f.rec)
  const d   = h - rec
  const fc  = num(f.fc)
  const fy  = num(f.fy)

  const res = useMemo(() => {
    const L       = num(dl.L)
    const As_prov = num(dl.As_prov)
    const w_D     = num(dl.w_D)
    const w_L     = num(dl.w_L)
    const coefStr = dl.tipoApoyo
    const xi      = num(dl.xi_tiempo)
    const rho_p   = num(dl.rho_prima)
    const limStr  = dl.limite

    if (!b || !h || !d || !fc || !fy || !L || !As_prov) return null

    const coef = coefStr === '5/384' ? 5 / 384
               : coefStr === '1/384' ? 1 / 384
               : coefStr === '1/185' ? 1 / 185
               : 1 / 8

    const Es = 2000000
    const Ec = 15000 * Math.sqrt(fc)
    const fr = 2 * Math.sqrt(fc)
    const Ig = b * Math.pow(h, 3) / 12
    const yt = h / 2
    const Mcr = fr * Ig / yt
    const n_mod = Es / Ec

    const A_eq = b / 2
    const B_eq = n_mod * As_prov
    const C_eq = -n_mod * As_prov * d
    const disc = B_eq * B_eq - 4 * A_eq * C_eq
    if (disc < 0) return null
    const kd = (-B_eq + Math.sqrt(disc)) / (2 * A_eq)
    const Icr = b * Math.pow(kd, 3) / 3 + n_mod * As_prov * Math.pow(d - kd, 2)

    const coefMom = coefStr === '5/384' ? 1 / 8
                  : coefStr === '1/384' ? 1 / 12
                  : coefStr === '1/185' ? 1 / 14.22
                  : 1 / 2

    const Ma_D  = coefMom * w_D * L * L
    const Ma_DL = coefMom * (w_D + w_L) * L * L

    const calcIe = (Ma) => {
      if (Ma <= 0) return Ig
      if (Ma <= Mcr) return Ig
      const ratio = Mcr / Ma
      const r3 = Math.pow(ratio, 3)
      return r3 * Ig + (1 - r3) * Icr
    }

    const Ie_D  = calcIe(Ma_D)
    const Ie_DL = calcIe(Ma_DL)

    const delta_D  = Ie_D  > 0 ? coef * w_D * Math.pow(L, 4) / (Ec * Ie_D)  : 0
    const delta_DL = Ie_DL > 0 ? coef * (w_D + w_L) * Math.pow(L, 4) / (Ec * Ie_DL) : 0
    const delta_L  = delta_DL - delta_D

    const lambda = xi / (1 + 50 * rho_p)
    const delta_diferida = lambda * delta_D
    const delta_total = delta_DL + delta_diferida

    const limDiv = limStr === 'L/240' ? 240
                 : limStr === 'L/360' ? 360
                 : 480
    const delta_lim = L / limDiv
    const cumple = delta_total <= delta_lim

    return {
      Ec, fr, Ig, Mcr, n: n_mod, kd, Icr,
      Ma_D, Ma_DL, Ie_D, Ie_DL,
      delta_D, delta_DL, delta_L, delta_diferida, delta_total,
      lambda, delta_lim, cumple, limStr, d
    }
  }, [dl, b, h, d, fc, fy])

  const apoyoOpts = [
    { value: '5/384', label: 'Simplemente apoyada (5/384)' },
    { value: '1/384', label: 'Empotrado en ambos extremos (1/384)' },
    { value: '1/185', label: 'Empotrado-simple (1/185)' },
    { value: '1/8',   label: 'Voladizo (1/8)' },
  ]
  const xiOpts = [
    { value: '1.0', label: '3 meses de carga (ξ = 1.0)' },
    { value: '1.2', label: '6 meses de carga (ξ = 1.2)' },
    { value: '1.4', label: '12 meses de carga (ξ = 1.4)' },
    { value: '2.0', label: '5 años o más (ξ = 2.0)' },
  ]
  const limOpts = [
    { value: 'L/240', label: 'L/240 — Pisos y techos generales' },
    { value: 'L/360', label: 'L/360 — Con tabiques frágiles' },
    { value: 'L/480', label: 'L/480 — Con tabiques muy sensibles' },
  ]

  return (
    <div>
      <div style={{ ...D.twoCol, marginBottom: 20 }}>

        {/* ─ Columna izquierda: Inputs ─ */}
        <div style={D.inputPanel}>
          <div style={D.inputPanelTitle}>Datos de entrada</div>

          <Field label="Luz libre de la viga L (cm)" value={dl.L} onChange={v => set('L', v)} step="10" min="1" />

          <div style={{ height: 10 }} />
          <div style={D.sectionDivider}>Sección (desde Flexión)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', marginBottom: 12 }}>
            <Field label="b (cm)">
              <input type="number" value={f.b} readOnly style={D.readonlyInput} />
            </Field>
            <Field label="h (cm)">
              <input type="number" value={f.h} readOnly style={D.readonlyInput} />
            </Field>
            <Field label="d efectivo (cm)">
              <input type="number" value={d > 0 ? d.toFixed(1) : ''} readOnly style={D.readonlyInput} />
            </Field>
            <Field label="f'c (kg/cm²)">
              <input type="number" value={f.fc} readOnly style={D.readonlyInput} />
            </Field>
          </div>

          <div style={D.sectionDivider}>Acero y cargas</div>
          <Field label="Acero longitudinal colocado As (cm²)" value={dl.As_prov} onChange={v => set('As_prov', v)} step="0.5" min="0" />
          <div style={{ height: 10 }} />
          <Field label="Cuantía de acero en compresión ρ' (si aplica)" value={dl.rho_prima} onChange={v => set('rho_prima', v)} step="0.001" min="0" />
          <div style={{ height: 10 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
            <Field label="Carga muerta w_D (kg/cm)" value={dl.w_D} onChange={v => set('w_D', v)} step="0.1" min="0" />
            <Field label="Carga viva w_L (kg/cm)" value={dl.w_L} onChange={v => set('w_L', v)} step="0.1" min="0" />
          </div>

          <div style={{ height: 10 }} />
          <div style={D.sectionDivider}>Condiciones de apoyo y tiempo</div>
          <Field label="Condición de apoyo">
            <select value={dl.tipoApoyo} onChange={e => set('tipoApoyo', e.target.value)} style={S.paramSelect}>
              {apoyoOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <div style={{ height: 10 }} />
          <Field label="Duración de carga sostenida">
            <select value={dl.xi_tiempo} onChange={e => set('xi_tiempo', e.target.value)} style={S.paramSelect}>
              {xiOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <div style={{ height: 10 }} />
          <Field label="Límite de deflexión admisible">
            <select value={dl.limite} onChange={e => set('limite', e.target.value)} style={S.paramSelect}>
              {limOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>

          <FormulaBox
            title="Método: Branson (ACI 318 / E.060)"
            formulas={[
              'Ie = (Mcr/Ma)³·Ig + [1−(Mcr/Ma)³]·Icr',
              'δ = C·w·L⁴ / (Ec·Ie)',
              'δ_dif = λ·δ_D  donde  λ = ξ/(1+50ρ\')',
              'δ_total = δ(D+L) + δ_diferida',
            ]}
          />
        </div>

        {/* ─ Columna derecha: Resultados ─ */}
        <div style={D.resultsPanel}>

          {/* Propiedades sección */}
          <div style={D.resultCard}>
            <div style={D.sectionDivider}>Propiedades de la sección</div>
            <div style={D.subResultGrid}>
              <SubResult label="Módulo Ec" value={res ? pf(res.Ec, 0) : '—'} unit="kg/cm²" />
              <SubResult label="Módulo de rotura fr" value={res ? pf(res.fr) : '—'} unit="kg/cm²" />
              <SubResult label="Inercia bruta Ig" value={res ? pf(res.Ig, 0) : '—'} unit="cm⁴" />
              <SubResult label="Momento de fisuracion Mcr" value={res ? pf(res.Mcr, 0) : '—'} unit="kg·cm" />
              <SubResult label="Relación modular n" value={res ? pf(res.n) : '—'} />
              <SubResult label="Eje neutro fisurado kd" value={res ? pf(res.kd) : '—'} unit="cm" />
              <SubResult label="Inercia fisurada Icr" value={res ? pf(res.Icr, 0) : '—'} unit="cm⁴" />
              <SubResult label="Factor diferido λ" value={res ? pf(res.lambda) : '—'} />
            </div>
          </div>

          {/* Deflexiones inmediatas */}
          <div style={D.resultCard}>
            <div style={D.sectionDivider}>Deflexiones inmediatas</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div style={{ textAlign: 'center', padding: '10px 6px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                <div style={{ fontSize: 18, fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--text0)' }}>
                  {res ? pf(res.delta_D, 3) : '—'}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--cond)', marginTop: 4, textTransform: 'uppercase' }}>
                  δ carga muerta
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>cm</div>
              </div>
              <div style={{ textAlign: 'center', padding: '10px 6px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                <div style={{ fontSize: 18, fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--text0)' }}>
                  {res ? pf(res.delta_DL, 3) : '—'}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--cond)', marginTop: 4, textTransform: 'uppercase' }}>
                  δ carga total D+L
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>cm</div>
              </div>
              <div style={{ textAlign: 'center', padding: '10px 6px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                <div style={{ fontSize: 18, fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--text0)' }}>
                  {res ? pf(res.delta_L, 3) : '—'}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--cond)', marginTop: 4, textTransform: 'uppercase' }}>
                  δ carga viva
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>cm</div>
              </div>
            </div>
          </div>

          {/* Deflexión diferida */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <BigResultCard
              label="Deflexión diferida (λ × δD)"
              value={res ? pf(res.delta_diferida, 3) : '—'}
              unit="cm"
              note={`λ = ${res ? pf(res.lambda) : '—'}`}
            />
            <BigResultCard
              label="Límite admisible"
              value={res ? pf(res.delta_lim, 2) : '—'}
              unit="cm"
              note={dl.limite}
            />
          </div>

          {/* Deflexión total — destacada */}
          <BigResultCard
            label="Deflexión TOTAL (D+L + diferida)"
            value={res ? pf(res.delta_total, 3) : '—'}
            unit="cm"
            style={{
              background: res
                ? (res.cumple
                    ? 'rgba(46,125,50,0.12)'
                    : 'rgba(198,40,40,0.12)')
                : 'rgba(255,255,255,0.04)',
              border: res
                ? (res.cumple
                    ? '1px solid rgba(46,125,50,0.35)'
                    : '1px solid rgba(198,40,40,0.35)')
                : '1px solid var(--border)',
              borderRadius: 14,
              padding: '18px 22px',
            }}
            valueStyle={{
              fontSize: 34,
              color: res
                ? (res.cumple ? '#69f0ae' : '#ff5252')
                : 'var(--text0)',
            }}
          />

          {/* Verificación */}
          <VerifCard
            ok={res ? res.cumple : null}
            mainText={res
              ? (res.cumple ? 'CUMPLE — Deflexión controlada' : 'NO CUMPLE — Aumentar inercia')
              : '—'
            }
            detail={res
              ? `δ_total = ${pf(res.delta_total, 3)} cm  ${res.cumple ? '≤' : '>'}  ${dl.limite} = ${pf(res.delta_lim, 2)} cm`
              : 'Complete los datos para verificar'
            }
          />

        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: NUDOS
// ══════════════════════════════════════════════════════════════════════════════
function TabNudos({ state, dispatch }) {
  const nd  = state.nudo
  const set = (field, value) => dispatch({ type: 'SET_NUDO', field, value })

  const res = useMemo(() => {
    const b_col  = num(nd.b_col)
    const h_col  = num(nd.h_col)
    const b_viga = num(nd.b_viga)
    const fc     = num(nd.fc_nudo)
    const As_sup = num(nd.As_sup)
    const As_inf = num(nd.As_inf)
    const fy     = num(nd.fy_nudo)
    const Vu_col = num(nd.Vu_col)
    const tipo   = nd.tipoNudo

    if (!b_col || !h_col || !b_viga || !fc || !fy) return null

    const ext_col = Math.max(0, (b_col - b_viga) / 2)
    const bj = Math.min(b_col, b_viga + h_col, b_viga + 2 * ext_col)
    const Aj = bj * h_col

    const T = As_sup * fy
    const C = As_inf * fy
    const Vj = T + C - Vu_col * 1000

    const gamma = tipo === 'Interior' ? 5.3
                : tipo === 'Exterior' ? 4.0
                : 3.2
    const Vn   = gamma * Math.sqrt(fc) * Aj
    const phiVn = 0.85 * Vn
    const cumple = Math.abs(Vj) <= phiVn

    return { bj, Aj, T, C, Vj, Vn, phiVn, gamma, cumple, ext_col }
  }, [nd])

  const tipoOpts = [
    { value: 'Interior', label: 'Interior — confinado en 4 caras', gamma: 5.3 },
    { value: 'Exterior', label: 'Exterior — confinado en 3 caras', gamma: 4.0 },
    { value: 'Esquina',  label: 'Esquina — confinado en 2 caras',  gamma: 3.2 },
  ]

  return (
    <div>
      {/* Selector de tipo de nudo visual */}
      <div style={{ marginBottom: 20, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
        <div style={D.inputPanelTitle}>Tipo de nudo viga-columna (E.060 cl. 21.7)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {tipoOpts.map(opt => (
            <button
              key={opt.value}
              onClick={() => set('tipoNudo', opt.value)}
              style={{
                padding: '16px 12px',
                borderRadius: 10,
                border: `2px solid ${nd.tipoNudo === opt.value ? '#7c4dff' : 'var(--border)'}`,
                background: nd.tipoNudo === opt.value ? 'rgba(124,77,255,0.15)' : 'rgba(255,255,255,0.03)',
                color: nd.tipoNudo === opt.value ? '#ce93d8' : 'var(--text2)',
                fontFamily: 'var(--sans)',
                fontSize: 11,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all .15s',
              }}
            >
              <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, marginBottom: 4, color: nd.tipoNudo === opt.value ? '#ce93d8' : 'var(--text1)' }}>
                γ = {opt.gamma}
              </div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>{opt.value}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{opt.label.split('—')[1]?.trim()}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={D.twoCol}>

        {/* ─ Columna izquierda: Inputs ─ */}
        <div style={D.inputPanel}>
          <div style={D.inputPanelTitle}>Geometría del nudo</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px' }}>
            <Field label="Ancho de columna b_col (cm)"  value={nd.b_col}  onChange={v => set('b_col',  v)} step="5" min="1" />
            <Field label="Altura de columna h_col (cm)"  value={nd.h_col}  onChange={v => set('h_col',  v)} step="5" min="1" />
            <Field label="Ancho de viga b_viga (cm)"    value={nd.b_viga} onChange={v => set('b_viga', v)} step="5" min="1" />
            <Field label="Altura de viga h_viga (cm)"   value={nd.h_viga} onChange={v => set('h_viga', v)} step="5" min="1" />
          </div>

          <div style={{ height: 12 }} />
          <div style={D.sectionDivider}>Materiales y fuerzas</div>

          <Field label="Resistencia del concreto f'c (kg/cm²)">
            <select value={nd.fc_nudo} onChange={e => set('fc_nudo', e.target.value)} style={S.paramSelect}>
              {[210, 280, 350].map(v => <option key={v} value={v}>{v} kg/cm²</option>)}
            </select>
          </Field>
          <div style={{ height: 10 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px' }}>
            <Field label="As superior en viga (cm²)" value={nd.As_sup} onChange={v => set('As_sup', v)} step="0.5" min="0" />
            <Field label="As inferior en viga (cm²)" value={nd.As_inf} onChange={v => set('As_inf', v)} step="0.5" min="0" />
          </div>
          <div style={{ height: 10 }} />
          <Field label="Fluencia del acero fy (kg/cm²)" value={nd.fy_nudo} onChange={v => set('fy_nudo', v)} step="100" min="1" />
          <div style={{ height: 10 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px' }}>
            <Field label="Cortante en columna Vu_col (ton)" value={nd.Vu_col} onChange={v => set('Vu_col', v)} step="1" min="0" />
            <Field label="Axial en columna N_col (ton)" value={nd.N_col} onChange={v => set('N_col', v)} step="1" min="0" />
          </div>

          <FormulaBox
            title="Fórmulas E.060 cl. 21.7"
            formulas={[
              `bj = min(b_col, b_viga + h_col, b_viga + 2·e)`,
              `Aj = bj × h_col`,
              `T = As_sup × fy`,
              `Vj = T + C − Vu_col`,
              `φVn = 0.85 × γ × √f'c × Aj`,
            ]}
          />
        </div>

        {/* ─ Columna derecha: Resultados ─ */}
        <div style={D.resultsPanel}>

          {/* Geometría del nudo */}
          <div style={D.resultCard}>
            <div style={D.sectionDivider}>Geometría efectiva del nudo</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ textAlign: 'center', padding: '12px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                <div style={{ fontSize: 24, fontFamily: 'var(--mono)', fontWeight: 700, color: '#4fc3f7' }}>
                  {res ? pf(res.bj) : '—'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--cond)', marginTop: 4, textTransform: 'uppercase' }}>
                  bj — ancho efectivo (cm)
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                <div style={{ fontSize: 24, fontFamily: 'var(--mono)', fontWeight: 700, color: '#4fc3f7' }}>
                  {res ? pf(res.Aj, 0) : '—'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--cond)', marginTop: 4, textTransform: 'uppercase' }}>
                  Aj — área nudo (cm²)
                </div>
              </div>
            </div>
          </div>

          {/* Fuerzas en el nudo */}
          <div style={D.resultCard}>
            <div style={D.sectionDivider}>Fuerzas en el nudo</div>
            <div style={D.subResultGrid}>
              <SubResult label="Tensión T = As_sup × fy" value={res ? pf(res.T / 1000) : '—'} unit="ton" />
              <SubResult label="Compresión C = As_inf × fy" value={res ? pf(res.C / 1000) : '—'} unit="ton" />
              <SubResult label="Cortante en nudo Vj" value={res ? pf(res.Vj / 1000) : '—'} unit="ton" />
              <SubResult label="γ (factor de confinamiento)" value={res ? res.gamma : '—'} />
            </div>
          </div>

          {/* Resistencia nominal */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <BigResultCard
              label="Resistencia nominal Vn"
              value={res ? pf(res.Vn / 1000) : '—'}
              unit="ton"
            />
            <BigResultCard
              label="Resistencia reducida φVn"
              value={res ? pf(res.phiVn / 1000) : '—'}
              unit="ton"
              style={res
                ? (res.cumple
                    ? { ...D.resultCard, background: 'rgba(46,125,50,0.12)', border: '1px solid rgba(46,125,50,0.3)' }
                    : { ...D.resultCard, background: 'rgba(198,40,40,0.1)',  border: '1px solid rgba(198,40,40,0.3)' })
                : D.resultCard
              }
              valueStyle={res
                ? (res.cumple ? { color: '#69f0ae' } : { color: '#ff5252' })
                : {}
              }
              note="φ = 0.85"
            />
          </div>

          {/* Verificación */}
          <VerifCard
            ok={res ? res.cumple : null}
            mainText={res
              ? (res.cumple ? 'NUDO VERIFICADO' : 'NUDO INSUFICIENTE — Revisar')
              : '—'
            }
            detail={res
              ? `|Vj| = ${pf(Math.abs(res.Vj) / 1000)} ton  ${res.cumple ? '≤' : '>'}  φVn = ${pf(res.phiVn / 1000)} ton   (γ = ${res.gamma}, tipo ${nd.tipoNudo})`
              : 'Complete los datos para verificar'
            }
          />

        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function VigasE060({ onBack }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState)
  const [tab, setTab]     = useState('FLEXIÓN')
  const [copiado, setCopiado] = useState(false)

  const handleCopiarResultados = () => {
    const f  = state.flex
    const c  = state.corte
    const resF = calcFlex(f)
    const resC = calcCorte(c, f)

    const verifF = resF && resF.phiMn !== null ? (resF.phiMn >= num(f.Mu) ? 'CUMPLE' : 'NO CUMPLE') : '—'
    const p = (v, d = 2) => (v === '' || v == null || isNaN(Number(v))) ? '—' : Number(v).toFixed(d)

    const texto = [
      'DISEÑO DE VIGAS — NTP E.060',
      '========================',
      'FLEXIÓN:',
      `  Mu = ${p(f.Mu)} ton·m | b = ${p(f.b, 0)} cm | h = ${p(f.h, 0)} cm | d = ${resF ? p(resF.d) : '—'} cm`,
      `  f'c = ${p(f.fc, 0)} kg/cm² | fy = ${p(f.fy, 0)} kg/cm²`,
      `  As req = ${resF && resF.As_req !== null ? p(resF.As_req) : '—'} cm² | As min = ${resF ? p(resF.As_min) : '—'} cm² | As max = ${resF ? p(resF.As_max) : '—'} cm²`,
      `  ρ = ${resF && resF.rho !== null ? p(resF.rho, 4) : '—'} | ρ_min = ${resF ? p(resF.rho_min, 4) : '—'} | ρ_max = ${resF ? p(resF.rho_max, 4) : '—'}`,
      `  φMn = ${resF && resF.phiMn !== null ? p(resF.phiMn) : '—'} ton·m → [${verifF}]`,
      '',
      'CORTE:',
      `  Vu = ${p(c.Vu)} ton | Vc = ${resC ? p(resC.Vc) : '—'} ton | φVc = ${resC ? p(resC.phiVc) : '—'} ton`,
      `  Vs req = ${resC ? p(resC.Vs_req) : '—'} ton`,
      `  s adoptado = ${resC ? p(resC.s_adopt, 0) : '—'} cm`,
      `  Distribución: ${resC ? resC.dist : '—'}`,
    ].join('\n')

    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }

  const TABS = ['FLEXIÓN', 'CORTE', 'PREDIMENSIONAMIENTO', 'DEFLEXIONES', 'NUDOS']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--border)',
            borderRadius: 6, padding: '5px 12px',
            color: 'var(--text1)', cursor: 'pointer',
            fontSize: 11, fontFamily: 'var(--cond)', letterSpacing: '.5px',
          }}
        >
          &#8592; Volver
        </button>
        <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
        <div>
          <div style={{ fontFamily: 'var(--cond)', fontSize: 14, fontWeight: 700, color: 'var(--text0)', letterSpacing: '.5px' }}>
            Diseño de Vigas — NTP E.060 / ACI 318
          </div>
          <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--sans)', marginTop: 1 }}>
            Flexión, corte, predimensionamiento, deflexiones y nudos viga-columna
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleCopiarResultados}
          style={{
            padding: '5px 12px', fontSize: 10,
            fontFamily: 'var(--cond)', fontWeight: 600,
            borderRadius: 6,
            border: '1px solid rgba(79,195,247,0.4)',
            background: 'rgba(79,195,247,0.12)',
            color: '#64b5f6', cursor: 'pointer', letterSpacing: '.3px',
          }}
        >
          {copiado ? 'Copiado!' : 'Copiar Resultados'}
        </button>
        <span style={S.badge('#1f4e79', '#90caf9')}>E.060</span>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 4,
        padding: '6px 16px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        overflowX: 'auto', flexShrink: 0,
      }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '7px 16px',
              fontSize: 10,
              fontFamily: 'var(--cond)',
              fontWeight: 700,
              letterSpacing: '.5px',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background .15s',
              background: tab === t ? '#7c4dff' : 'rgba(255,255,255,0.06)',
              color:      tab === t ? '#fff'    : 'var(--text2)',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Scrollable body ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
        {tab === 'FLEXIÓN'             && <TabFlexion      state={state} dispatch={dispatch} />}
        {tab === 'CORTE'               && <TabCorte        state={state} dispatch={dispatch} />}
        {tab === 'PREDIMENSIONAMIENTO' && <TabPredim       state={state} dispatch={dispatch} />}
        {tab === 'DEFLEXIONES'         && <TabDeflexiones  state={state} dispatch={dispatch} />}
        {tab === 'NUDOS'               && <TabNudos        state={state} dispatch={dispatch} />}
      </div>

    </div>
  )
}
