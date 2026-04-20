import { useState, useReducer, useMemo, useCallback, useRef } from 'react'
import { VARILLAS_LONGITUDINALES, VARILLAS_ESTRIBOS } from '../utils/varillas'

// ── Helpers ───────────────────────────────────────────────────────────────────
const pf  = (v, d = 2)  => (v === '' || v == null || isNaN(Number(v))) ? '—' : Number(v).toFixed(d)
const pf4 = v => pf(v, 4)
const num = v => parseFloat(v) || 0

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  inputCell:     { background: '#1a2744', border: '1px solid rgba(68,114,196,0.3)' },
  compCell:      { background: '#1a3328', border: '1px solid rgba(46,125,50,0.3)' },
  headerCell:    { background: '#2e75b6', color: '#fff', fontWeight: 700, fontSize: 9, textTransform: 'uppercase', letterSpacing: '.5px', padding: '6px 8px', textAlign: 'center', whiteSpace: 'nowrap', fontFamily: 'var(--cond)' },
  cell:          { padding: '4px 6px', fontSize: 10, fontFamily: 'var(--mono)', textAlign: 'center', borderBottom: '1px solid var(--border)' },
  tableInput:    { width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text0)', fontFamily: 'var(--mono)', fontSize: 10, textAlign: 'center', padding: '2px 0' },
  sectionHeader: { padding: '10px 14px', background: '#2e75b6', color: '#fff', fontFamily: 'var(--cond)', fontSize: 12, fontWeight: 700, cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 'var(--r2)', marginBottom: 8, letterSpacing: '.5px' },
  sectionHeaderDark: { padding: '10px 14px', background: '#1f4e79', color: '#fff', fontFamily: 'var(--cond)', fontSize: 12, fontWeight: 700, cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 'var(--r2)', marginBottom: 8, letterSpacing: '.5px' },
  badge:         (bg, color) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 'var(--r)', fontSize: 10, fontWeight: 700, fontFamily: 'var(--mono)', background: bg, color, letterSpacing: '.5px' }),
  paramLabel:    { fontSize: 10, color: 'var(--text2)', fontFamily: 'var(--cond)', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 3 },
  paramInput:    { width: '100%', background: '#1a2744', border: '1px solid rgba(68,114,196,0.35)', borderRadius: 'var(--r)', color: 'var(--text0)', fontFamily: 'var(--mono)', fontSize: 11, padding: '4px 7px', outline: 'none' },
  paramSelect:   { width: '100%', background: '#161922', border: '1px solid rgba(68,114,196,0.35)', borderRadius: 'var(--r)', color: 'var(--text0)', fontFamily: 'var(--mono)', fontSize: 11, padding: '4px 7px', outline: 'none' },
  resultBox:     { background: '#0f1c2e', border: '1px solid rgba(68,114,196,0.25)', borderRadius: 'var(--r2)', padding: '10px 14px', marginTop: 8 },
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, dark = false, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={dark ? S.sectionHeaderDark : S.sectionHeader} onClick={() => setOpen(o => !o)}>
        <span style={{ fontSize: 10, transition: 'transform .2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>&#9658;</span>
        <span style={{ flex: 1 }}>{title}</span>
      </div>
      {open && <div style={{ padding: '0 4px' }}>{children}</div>}
    </div>
  )
}

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

function ParamGrid({ children, cols = 4 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '8px 12px', marginBottom: 10 }}>
      {children}
    </div>
  )
}

function PF({ label, children, onChange, value, type = 'number', step, min }) {
  return (
    <div>
      <label style={S.paramLabel}>{label}</label>
      {children || (
        <input type={type} value={value} step={step} min={min} style={S.paramInput}
          onChange={e => onChange(e.target.value)} />
      )}
    </div>
  )
}

function ResultRow({ label, value, unit = '', ok }) {
  const clr = ok === true ? '#69f0ae' : ok === false ? '#ff5252' : 'var(--text0)'
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 10, color: 'var(--text2)', fontFamily: 'var(--cond)' }}>{label}</span>
      <span style={{ fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700, color: clr }}>
        {value}{unit && <span style={{ color: 'var(--text3)', fontWeight: 400, marginLeft: 3 }}>{unit}</span>}
      </span>
    </div>
  )
}

// ── State ─────────────────────────────────────────────────────────────────────
function initState() {
  return {
    // FLEXIÓN
    flex: {
      Mu: 15,
      b: 30,
      h: 60,
      rec: 6,
      fc: 210,
      fy: 4200,
    },
    // CORTE
    corte: {
      Vu: 10,
      zonasismica: true,
      estribo: VARILLAS_ESTRIBOS[1].d, // No3 (3/8")
      nramas: 2,
      dblong: 1.905, // 3/4" (No6)
    },
    // PREDIMENSIONAMIENTO
    predim: {
      tipo: 'Viga',
      // Viga
      luz: 6,
      tipoCarga: 'Gravedad',
      // Columna
      At: 25,
      Npisos: 5,
      fcCol: 210,
      // Losa
      luzLosa: 4,
      tipoLosa: 'Losa aligerada',
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
    default: return state
  }
}

// ── Cálculo de flexión ────────────────────────────────────────────────────────
function calcFlex(f) {
  const Mu  = num(f.Mu)       // ton·m
  const b   = num(f.b)        // cm
  const h   = num(f.h)        // cm
  const rec = num(f.rec)      // cm
  const fc  = num(f.fc)       // kg/cm²
  const fy  = num(f.fy)       // kg/cm²

  if (!b || !h || !fc || !fy) return null

  const d = h - rec           // cm efectivo
  const phi = 0.9
  const beta1 = fc <= 280 ? 0.85 : fc <= 560 ? 0.85 - 0.05 * (fc - 280) / 70 : 0.65
  const Es = 2e6              // kg/cm²
  const eu = 0.003

  // ρ_bal
  const rho_bal = (0.85 * beta1 * fc / fy) * (eu * Es / (eu * Es + fy))

  // ρ_max = 0.75 * ρ_bal (ACI 318-99 / E.060)
  const rho_max = 0.75 * rho_bal

  // ρ_min = max(0.25√fc/fy , 14/fy)
  const rho_min = Math.max(0.25 * Math.sqrt(fc) / fy, 14 / fy)

  // As_min, As_max
  const As_min = rho_min * b * d
  const As_max = rho_max * b * d

  // Mn requerido → As requerido iterativo
  // Mu en ton·m → kg·cm: * 1e5
  const Mu_kgcm = Mu * 1e5
  // De la ecuación Mu = phi * As * fy * (d - a/2), con a = As*fy/(0.85*fc*b)
  // phi * As * fy * d - phi * As² * fy² / (2 * 0.85 * fc * b) = Mu_kgcm
  // Cuadrática: A·As² + B·As + C = 0
  const A_coef = phi * fy * fy / (2 * 0.85 * fc * b)
  const B_coef = -phi * fy * d
  const C_coef = Mu_kgcm
  const disc = B_coef * B_coef - 4 * A_coef * C_coef
  let As_req = null
  if (disc >= 0) {
    const r1 = (-B_coef - Math.sqrt(disc)) / (2 * A_coef)
    const r2 = (-B_coef + Math.sqrt(disc)) / (2 * A_coef)
    // Tomar la raíz positiva menor (zona subdimensionada)
    const candidates = [r1, r2].filter(r => r > 0)
    As_req = candidates.length ? Math.min(...candidates) : null
  }

  // Verificación con As_req
  let a = null, phiMn = null
  if (As_req !== null) {
    a = As_req * fy / (0.85 * fc * b)
    phiMn = phi * As_req * fy * (d - a / 2) / 1e5  // ton·m
  }

  const rho = As_req !== null ? As_req / (b * d) : null

  return { d, rho, rho_min, rho_max, rho_bal, beta1, As_req, As_min, As_max, a, phiMn, phi }
}

// ── Tabla de selección de barras ──────────────────────────────────────────────
function TablaBarras({ b, rec, As_req }) {
  const bNum = num(b)
  const recNum = num(rec)

  const filas = useMemo(() => {
    if (!As_req || As_req <= 0 || !bNum) return []
    return VARILLAS_LONGITUDINALES.flatMap(v => {
      const maxN = 8
      return Array.from({ length: maxN }, (_, i) => {
        const n = i + 1
        const asTotal = n * v.area
        // Ancho mínimo: 2*rec + n*d + (n-1)*max(25mm, d) en mm → cm
        const sep = Math.max(2.5, v.d / 10)  // cm, min 2.5 cm
        const anchoMin = 2 * recNum + n * (v.d / 10) + (n - 1) * sep
        const cabe = anchoMin <= bNum
        return { varilla: v.label, n, asTotal, cabe, anchoMin }
      }).filter(f => f.asTotal >= As_req * 0.98)  // solo los que cubren
        .slice(0, 1)  // el primero que cumple por nro barras
    }).filter(f => f.asTotal >= As_req * 0.98)
      .slice(0, 8)
  }, [As_req, bNum, recNum])

  if (!filas.length) return <div style={{ color: 'var(--text3)', fontSize: 10, padding: '8px 0' }}>Ingrese datos para calcular</div>

  return (
    <div style={{ overflowX: 'auto', resize: 'both' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Diámetro', 'N° barras', 'As total (cm²)', 'Cabe?', 'Ancho mín. (cm)'].map(h => (
              <ResizableTh key={h} style={S.headerCell}>{h}</ResizableTh>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i} style={{ background: i % 2 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
              <td style={{ ...S.cell, ...S.inputCell }}>{f.varilla}</td>
              <td style={{ ...S.cell, ...S.inputCell }}>{f.n}</td>
              <td style={{ ...S.cell, ...S.compCell }}>{f.asTotal.toFixed(2)}</td>
              <td style={{ ...S.cell, background: f.cabe ? 'rgba(46,125,50,0.18)' : 'rgba(198,40,40,0.18)' }}>
                <span style={S.badge(f.cabe ? 'rgba(46,125,50,0.3)' : 'rgba(198,40,40,0.3)', f.cabe ? '#69f0ae' : '#ff5252')}>
                  {f.cabe ? 'SÍ' : 'NO'}
                </span>
              </td>
              <td style={{ ...S.cell, ...S.compCell }}>{f.anchoMin.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
  const dblon = c.dblong     // cm
  const sismic = c.zonasismica

  const flexRes = calcFlex(flex)
  const d = flexRes ? flexRes.d : num(flex.h) - num(flex.rec)

  if (!b || !d || !fc || !fy || !Vu) return null

  const phi = 0.85
  const varEst = VARILLAS_ESTRIBOS.find(v => v.d === dbstr) || VARILLAS_ESTRIBOS[1]
  const Av = nram * varEst.area  // cm²

  // Vc = 0.53 * √fc * b * d / 1000 → ton
  const Vc = 0.53 * Math.sqrt(fc) * b * d / 1000
  const phiVc = phi * Vc

  // Vs requerido
  const Vs_req = Math.max(0, Vu / phi - Vc)

  // Vs máximo = 2.1 * √fc * b * d / 1000 → ton
  const Vs_max = 2.1 * Math.sqrt(fc) * b * d / 1000

  const seccionOK = Vs_req <= Vs_max

  // Espaciamiento por resistencia
  const s_res = Vs_req > 0 ? (Av * fy * d) / (Vs_req * 1000) : null  // cm

  // Espaciamiento máximo ACI/E.060
  const s_dmax = d / 2                   // d/2
  const s_abs  = 60                      // 60 cm máx

  // Espaciamiento mínimo estribos (por construcción)
  const s_min_const = Math.min(8 * (dblon / 10), 24 * (varEst.d / 10), 30, d / 2)  // cm

  // Zona de confinamiento (sísmica E.060 cl. 21.4.4.2)
  const L_conf = 2 * num(flex.h)  // 2h desde el apoyo

  // Espaciamiento en zona de confinamiento (sísmica)
  // s ≤ min(d/4, 8db_long, 24db_est, 30cm)
  const s_sism = sismic
    ? Math.min(d / 4, 8 * (dblon / 10), 24 * (varEst.d / 10), 30)
    : null

  // s adoptado = mínimo de todos los aplicables
  const candidatos = [s_dmax, s_abs, s_min_const]
  if (s_res !== null)  candidatos.push(s_res)
  if (s_sism !== null) candidatos.push(s_sism)
  const s_adopt = Math.floor(Math.min(...candidatos.filter(v => v > 0)))

  // Distribución sugerida
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

  // VIGA
  let vigaRes = null
  if (p.tipo === 'Viga' && luz > 0) {
    const factor = p.tipoCarga === 'Sismo' ? 10 : 12
    const h = luz / factor
    const b = Math.max(0.25, h / 2)
    vigaRes = { h: (h * 100).toFixed(0), b: (b * 100).toFixed(0) }
  }

  // COLUMNA
  let colRes = null
  if (p.tipo === 'Columna' && At > 0 && N > 0 && fc > 0) {
    const wServicio = 1.25  // ton/m²
    const P_est = At * N * wServicio  // ton
    const Ag_req = P_est * 1000 / (0.45 * fc)  // cm²
    const lado = Math.ceil(Math.sqrt(Ag_req) / 5) * 5
    colRes = { P_est, Ag_req, lado }
  }

  // LOSA
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

  const res = useMemo(() => calcFlex(f), [f])

  const verif    = res && res.phiMn !== null ? res.phiMn >= num(f.Mu) : null
  const verifTxt = verif === true ? 'CUMPLE' : verif === false ? 'NO CUMPLE' : '—'

  return (
    <div>
      <Section title="Datos de entrada — Flexión">
        <ParamGrid cols={3}>
          <PF label="Mu (ton·m)" value={f.Mu} onChange={v => set('Mu', v)} step="0.5" />
          <PF label="b (cm)"     value={f.b}  onChange={v => set('b',  v)} step="5" min="1" />
          <PF label="h (cm)"     value={f.h}  onChange={v => set('h',  v)} step="5" min="1" />
          <PF label="rec (cm)"   value={f.rec} onChange={v => set('rec', v)} step="0.5" min="1" />
          <PF label="f'c (kg/cm²)">
            <select value={f.fc} onChange={e => set('fc', e.target.value)} style={S.paramSelect}>
              {[175, 210, 280, 350].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </PF>
          <PF label="fy (kg/cm²)" value={f.fy} onChange={v => set('fy', v)} step="100" min="1" />
        </ParamGrid>
      </Section>

      <Section title="Resultados — Diseño a Flexión">
        <div style={S.resultBox}>
          <ResultRow label="d efectivo" value={res ? pf(res.d) : '—'} unit="cm" />
          <ResultRow label="As requerido" value={res && res.As_req !== null ? pf(res.As_req) : '—'} unit="cm²" />
          <ResultRow label="As mínimo" value={res ? pf(res.As_min) : '—'} unit="cm²" />
          <ResultRow label="As máximo" value={res ? pf(res.As_max) : '—'} unit="cm²" />
          <div style={{ height: 6 }} />
          <ResultRow label="ρ"     value={res && res.rho    !== null ? pf4(res.rho)     : '—'} />
          <ResultRow label="ρ_min" value={res ? pf4(res.rho_min) : '—'} />
          <ResultRow label="ρ_max" value={res ? pf4(res.rho_max) : '—'} />
          <ResultRow label="ρ_bal" value={res ? pf4(res.rho_bal) : '—'} />
          <div style={{ height: 6 }} />
          <ResultRow label="β₁" value={res ? pf(res.beta1) : '—'} />
          <ResultRow label="a — profundidad bloque" value={res && res.a !== null ? pf(res.a) : '—'} unit="cm" />
          <ResultRow label="φMn" value={res && res.phiMn !== null ? pf(res.phiMn) : '—'} unit="ton·m" />
          <div style={{ paddingTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, color: 'var(--text2)', fontFamily: 'var(--cond)' }}>Verificación φMn ≥ Mu</span>
            <span style={S.badge(
              verif === true  ? 'rgba(46,125,50,0.3)' :
              verif === false ? 'rgba(198,40,40,0.3)' :
              'rgba(255,255,255,0.08)',
              verif === true  ? '#69f0ae' :
              verif === false ? '#ff5252' :
              'var(--text2)'
            )}>{verifTxt}</span>
          </div>
        </div>
      </Section>

      <Section title="Selección de barras longitudinales" defaultOpen={true}>
        <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--cond)', marginBottom: 6 }}>
          Combinaciones que cubren As requerido — separación mínima 25 mm o d_varilla
        </div>
        <TablaBarras b={f.b} rec={f.rec} As_req={res?.As_req} />
      </Section>
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
      <Section title="Datos de entrada — Corte">
        <ParamGrid cols={3}>
          <PF label="Vu (ton)" value={c.Vu} onChange={v => set('Vu', v)} step="0.5" />
          <div>
            <label style={S.paramLabel}>b (cm) <span style={{ color: 'var(--text3)' }}>[de Flexión]</span></label>
            <input type="number" value={f.b} readOnly style={{ ...S.paramInput, opacity: 0.6, cursor: 'not-allowed' }} />
          </div>
          <div>
            <label style={S.paramLabel}>d (cm) <span style={{ color: 'var(--text3)' }}>[auto]</span></label>
            <input type="number" value={res ? res.d.toFixed(1) : ''} readOnly style={{ ...S.paramInput, opacity: 0.6, cursor: 'not-allowed' }} />
          </div>
          <div>
            <label style={S.paramLabel}>f'c (kg/cm²) <span style={{ color: 'var(--text3)' }}>[de Flexión]</span></label>
            <input type="number" value={f.fc} readOnly style={{ ...S.paramInput, opacity: 0.6, cursor: 'not-allowed' }} />
          </div>
          <div>
            <label style={S.paramLabel}>fy (kg/cm²) <span style={{ color: 'var(--text3)' }}>[de Flexión]</span></label>
            <input type="number" value={f.fy} readOnly style={{ ...S.paramInput, opacity: 0.6, cursor: 'not-allowed' }} />
          </div>
          <PF label="Estribo">
            <select value={c.estribo} onChange={e => set('estribo', parseFloat(e.target.value))} style={S.paramSelect}>
              {VARILLAS_ESTRIBOS.map(v => <option key={v.d} value={v.d}>{v.label} — Av={v.area} cm²</option>)}
            </select>
          </PF>
          <PF label="N° ramas">
            <select value={c.nramas} onChange={e => set('nramas', parseInt(e.target.value))} style={S.paramSelect}>
              {[2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </PF>
          <PF label="db longitudinal">
            <select value={c.dblong} onChange={e => set('dblong', parseFloat(e.target.value))} style={S.paramSelect}>
              {VARILLAS_ESTRIBOS.concat([{ d: 1.905, label: 'N°6 (3/4″)' }, { d: 2.222, label: 'N°7 (7/8″)' }, { d: 2.540, label: 'N°8 (1″)' }])
                .filter((v, i, a) => a.findIndex(x => x.d === v.d) === i)
                .sort((a, b) => a.d - b.d)
                .map(v => <option key={v.d} value={v.d}>{v.label}</option>)}
            </select>
          </PF>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 16 }}>
            <input type="checkbox" id="zonasisc"
              checked={c.zonasismica}
              onChange={e => set('zonasismica', e.target.checked)}
              style={{ accentColor: '#7c4dff' }} />
            <label htmlFor="zonasisc" style={{ ...S.paramLabel, marginBottom: 0, cursor: 'pointer' }}>Zona sísmica (E.060 cl. 21)</label>
          </div>
        </ParamGrid>
      </Section>

      <Section title="Resultados — Diseño por Corte">
        <div style={S.resultBox}>
          {res && res.Av !== undefined && (
            <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--mono)', marginBottom: 6 }}>
              {res.varEst?.label} · {c.nramas} ramas · Av = {res.Av.toFixed(2)} cm²
            </div>
          )}
          <ResultRow label="Vc" value={res ? pf(res.Vc) : '—'} unit="ton" />
          <ResultRow label="φVc (φ=0.85)" value={res ? pf(res.phiVc) : '—'} unit="ton" />
          <ResultRow label="Vs requerido" value={res ? pf(res.Vs_req) : '—'} unit="ton" />
          <ResultRow label="Vs máximo" value={res ? pf(res.Vs_max) : '—'} unit="ton" />
          <div style={{ paddingTop: 6, paddingBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, color: 'var(--text2)', fontFamily: 'var(--cond)' }}>Sección suficiente (Vs ≤ Vs_max)</span>
            <span style={S.badge(
              res?.seccionOK === true  ? 'rgba(46,125,50,0.3)' :
              res?.seccionOK === false ? 'rgba(198,40,40,0.3)' :
              'rgba(255,255,255,0.08)',
              res?.seccionOK === true  ? '#69f0ae' :
              res?.seccionOK === false ? '#ff5252' :
              'var(--text2)'
            )}>{res ? (res.seccionOK ? 'OK' : 'AMPLIAR SECCIÓN') : '—'}</span>
          </div>
          <div style={{ height: 6 }} />
          <ResultRow label="s por resistencia"      value={res?.s_res    !== null ? pf(res.s_res)    : 'No req.'} unit={res?.s_res !== null ? 'cm' : ''} />
          <ResultRow label="s mínimo constructivo"  value={res ? pf(res.s_min_const) : '—'} unit="cm" />
          <ResultRow label="s máximo d/2"           value={res ? pf(res.s_dmax)      : '—'} unit="cm" />
          {c.zonasismica && (
            <ResultRow label="s sísmico (zona conf.)" value={res?.s_sism !== null ? pf(res.s_sism) : '—'} unit="cm" />
          )}
          <div style={{ height: 6 }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11, color: 'var(--text1)', fontFamily: 'var(--cond)', fontWeight: 700 }}>s ADOPTADO</span>
            <span style={{ fontSize: 14, fontFamily: 'var(--mono)', fontWeight: 700, color: '#7c4dff' }}>
              {res ? pf(res.s_adopt, 0) : '—'} <span style={{ fontSize: 10, color: 'var(--text3)' }}>cm</span>
            </span>
          </div>
          <ResultRow label="Longitud zona confinamiento" value={res ? pf(res.L_conf, 0) : '—'} unit="cm" />
          <div style={{ paddingTop: 8 }}>
            <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--cond)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.5px' }}>
              Distribución sugerida
            </div>
            <div style={{ background: 'rgba(124,77,255,0.1)', border: '1px solid rgba(124,77,255,0.25)', borderRadius: 'var(--r)', padding: '6px 10px', fontFamily: 'var(--mono)', fontSize: 11, color: '#ce93d8' }}>
              {res?.varEst?.label || '—'}: {res ? res.dist : '—'}
            </div>
          </div>
        </div>
      </Section>
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
      <Section title="Tipo de elemento">
        <ParamGrid cols={4}>
          <PF label="Elemento">
            <select value={p.tipo} onChange={e => set('tipo', e.target.value)} style={S.paramSelect}>
              {['Viga', 'Columna', 'Losa aligerada', 'Losa maciza'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </PF>
        </ParamGrid>
      </Section>

      {p.tipo === 'Viga' && (
        <Section title="Predimensionamiento — Viga">
          <ParamGrid cols={2}>
            <PF label="Luz libre L (m)" value={p.luz} onChange={v => set('luz', v)} step="0.5" min="1" />
            <PF label="Tipo de carga">
              <select value={p.tipoCarga} onChange={e => set('tipoCarga', e.target.value)} style={S.paramSelect}>
                <option value="Gravedad">Gravedad (h ≈ L/12)</option>
                <option value="Sismo">Sísmica (h ≈ L/10)</option>
              </select>
            </PF>
          </ParamGrid>
          {res.vigaRes && (
            <div style={S.resultBox}>
              <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--cond)', marginBottom: 4, textTransform: 'uppercase' }}>
                {p.tipoCarga === 'Sismo' ? 'Criterio: h = L/10, b = h/2' : 'Criterio: h = L/12, b = h/2'}
              </div>
              <ResultRow label="h sugerido" value={res.vigaRes.h} unit="cm" />
              <ResultRow label="b sugerido" value={res.vigaRes.b} unit="cm" />
              <div style={{ marginTop: 6, fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--cond)' }}>
                Verificar b ≥ 25 cm (E.060) y b ≥ h/4. Redondear a múltiplos de 5 cm.
              </div>
            </div>
          )}
        </Section>
      )}

      {p.tipo === 'Columna' && (
        <Section title="Predimensionamiento — Columna">
          <ParamGrid cols={3}>
            <PF label="Área tributaria (m²)" value={p.At}     onChange={v => set('At',     v)} step="1" min="1" />
            <PF label="N° pisos"             value={p.Npisos} onChange={v => set('Npisos', v)} step="1" min="1" />
            <PF label="f'c (kg/cm²)">
              <select value={p.fcCol} onChange={e => set('fcCol', e.target.value)} style={S.paramSelect}>
                {[175, 210, 280, 350].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </PF>
          </ParamGrid>
          {res.colRes && (
            <div style={S.resultBox}>
              <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--cond)', marginBottom: 4, textTransform: 'uppercase' }}>
                P ≈ At × N° pisos × 1.25 t/m² · Ag = P / (0.45 × f'c)
              </div>
              <ResultRow label="P estimado" value={pf(res.colRes.P_est)} unit="ton" />
              <ResultRow label="Ag requerida" value={pf(res.colRes.Ag_req)} unit="cm²" />
              <ResultRow label="Lado mínimo (cuadrado)" value={pf(res.colRes.lado, 0)} unit="cm" />
              <div style={{ marginTop: 6, fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--cond)' }}>
                Redondear a múltiplos de 5 cm. Verificar refuerzo mínimo 1% Ag.
              </div>
            </div>
          )}
        </Section>
      )}

      {(p.tipo === 'Losa aligerada' || p.tipo === 'Losa maciza') && (
        <Section title={`Predimensionamiento — ${p.tipo}`}>
          <ParamGrid cols={2}>
            <PF label="Luz (m)" value={p.luzLosa} onChange={v => set('luzLosa', v)} step="0.5" min="1" />
          </ParamGrid>
          {res.losaRes && (
            <div style={S.resultBox}>
              <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--cond)', marginBottom: 4, textTransform: 'uppercase' }}>
                {p.tipo === 'Losa aligerada' ? 'Criterio: h = L/25' : 'Criterio: h = L/30'}
              </div>
              <ResultRow label="h mínimo" value={res.losaRes.h} unit="cm" />
              <div style={{ marginTop: 6, fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--cond)' }}>
                {p.tipo === 'Losa aligerada'
                  ? 'Espesores estándar: 17, 20, 25, 30 cm. Seleccionar el inmediato superior.'
                  : 'Espesor mínimo E.060: mayor de h=L/30 y 9 cm.'}
              </div>
            </div>
          )}
        </Section>
      )}

      <Section title="Referencia normativa" defaultOpen={false} dark>
        <div style={{ overflowX: 'auto', resize: 'both' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
            <thead>
              <tr>
                {['Elemento', 'Criterio', 'h mín.', 'Fuente'].map(h => (
                  <ResizableTh key={h} style={S.headerCell}>{h}</ResizableTh>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Viga (gravedad)',    'h = L/12',  '—',      'ACI 318 Tabla 9.5a'],
                ['Viga (sísmica)',     'h = L/10',  '—',      'E.060 cl. 21.3.1'],
                ['Columna',           'b ≥ 0.25h',  '25 cm',  'E.060 cl. 21.4.1'],
                ['Losa aligerada',    'h = L/25',  '17 cm',  'E.060 cl. 9.5.3'],
                ['Losa maciza',       'h = L/30',  '9 cm',   'E.060 cl. 9.5.2'],
              ].map((r, i) => (
                <tr key={i} style={{ background: i % 2 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                  {r.map((c, j) => <td key={j} style={S.cell}>{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function VigasE060({ onBack }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState)
  const [tab, setTab] = useState('FLEXIÓN')

  const TABS = ['FLEXIÓN', 'CORTE', 'PREDIMENSIONAMIENTO']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <button onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '5px 12px', color: 'var(--text1)', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--cond)', letterSpacing: '.5px' }}>
          &#8592; Volver
        </button>
        <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
        <div>
          <div style={{ fontFamily: 'var(--cond)', fontSize: 14, fontWeight: 700, color: 'var(--text0)', letterSpacing: '.5px' }}>
            Diseño de Vigas — NTP E.060 / ACI 318
          </div>
          <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--sans)', marginTop: 1 }}>
            Flexión, corte y predimensionamiento de elementos de concreto armado
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <span style={S.badge('#1f4e79', '#90caf9')}>E.060</span>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, padding: '6px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', overflowX: 'auto', flexShrink: 0 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '6px 14px', fontSize: 10, fontFamily: 'var(--cond)', fontWeight: 700,
            letterSpacing: '.5px', border: 'none', borderRadius: 'var(--r)',
            cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background .15s',
            background: tab === t ? '#7c4dff' : 'rgba(255,255,255,0.06)',
            color: tab === t ? '#fff' : 'var(--text2)',
          }}>{t}</button>
        ))}
      </div>

      {/* ── Scrollable body ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>

        {tab === 'FLEXIÓN'            && <TabFlexion  state={state} dispatch={dispatch} />}
        {tab === 'CORTE'              && <TabCorte    state={state} dispatch={dispatch} />}
        {tab === 'PREDIMENSIONAMIENTO' && <TabPredim  state={state} dispatch={dispatch} />}

      </div>
    </div>
  )
}
