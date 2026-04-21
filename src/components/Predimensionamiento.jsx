import { useState, useReducer, useMemo } from 'react'
import { predimensionar } from '../utils/vigasE060'

// ── Helpers ───────────────────────────────────────────────────────────────────
const pf  = (v, d = 2) => (v === '' || v == null || isNaN(Number(v))) ? '—' : Number(v).toFixed(d)
const num = v => parseFloat(v) || 0

// ── Estilos base (copiados de VigasE060 S/D) ─────────────────────────────────
const S = {
  paramLabel:  { fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--sans)', display: 'block', marginBottom: 5 },
  paramInput:  { width: '100%', background: '#1a2744', border: '1px solid rgba(68,114,196,0.35)', borderRadius: 6, color: 'var(--text0)', fontFamily: 'var(--mono)', fontSize: 12, padding: '7px 10px', outline: 'none', boxSizing: 'border-box' },
  paramSelect: { width: '100%', background: '#161922', border: '1px solid rgba(68,114,196,0.35)', borderRadius: 6, color: 'var(--text0)', fontFamily: 'var(--mono)', fontSize: 12, padding: '7px 10px', outline: 'none', boxSizing: 'border-box' },
  headerCell:  { background: '#2e75b6', color: '#fff', fontWeight: 700, fontSize: 9, textTransform: 'uppercase', letterSpacing: '.5px', padding: '6px 8px', textAlign: 'center', whiteSpace: 'nowrap', fontFamily: 'var(--cond)' },
  cell:        { padding: '6px 10px', fontSize: 10, fontFamily: 'var(--mono)', textAlign: 'center', borderBottom: '1px solid var(--border)' },
}

const D = {
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
  resultCard: {
    background: 'rgba(79,195,247,0.07)',
    border: '1px solid rgba(79,195,247,0.18)',
    borderRadius: 12,
    padding: '14px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
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
}

// ── Estado inicial y reducer ──────────────────────────────────────────────────
const initialState = {
  tipo: 'Viga',
  luz: 6,
  tipoCarga: 'Gravedad',
  At: 25,
  Npisos: 5,
  fcCol: 210,
  luzLosa: 4,
}

function reducer(state, action) {
  if (action.type === 'SET') return { ...state, [action.field]: action.value }
  return state
}

// ── Lógica de cálculo (delega a predimensionar de vigasE060) ─────────────────
function calcPredim(p) {
  const luz  = num(p.luz)
  const At   = num(p.At)
  const N    = num(p.Npisos)
  const fc   = num(p.fcCol)
  const luzL = num(p.luzLosa)

  let vigaRes = null
  if (p.tipo === 'Viga' && luz > 0) {
    const carga = p.tipoCarga === 'Sismo' ? 'sismo' : 'gravedad'
    const r = predimensionar('viga', luz, carga)
    const factor = carga === 'sismo' ? 10 : 12
    const h_raw = (luz * 100 / factor).toFixed(0)
    const formula = `h = L / ${factor}  →  ${luz} m × 100 / ${factor} = ${h_raw} cm  →  adoptar ${r.h_sugerido} cm`
    const formulaB = `b = h / 2 = ${(r.h_sugerido / 2).toFixed(0)} cm  →  máx(b, 25 cm)  →  ${r.b_sugerido} cm`
    vigaRes = { h: r.h_sugerido, b: r.b_sugerido, formula, formulaB }
  }

  let colRes = null
  if (p.tipo === 'Columna' && At > 0 && N > 0 && fc > 0) {
    const r = predimensionar('columna', 0, 'gravedad', N, At, fc)
    const P_est  = At * N * 1.25
    const Ag_req = r.Ag_requerida
    const lado   = r.lado_sugerido
    const formulaP  = `P = ${At} m² × ${N} pisos × 1.25 t/m² = ${P_est.toFixed(1)} ton`
    const formulaAg = `Ag = P × 1000 / (0.45 × f'c) = ${P_est.toFixed(1)} × 1000 / (0.45 × ${fc}) = ${Ag_req.toFixed(0)} cm²`
    const formulaL  = `lado = ceil(√${Ag_req.toFixed(0)} / 5) × 5 = ${lado} cm  (mín. 30 cm)`
    colRes = { P_est, Ag_req, lado, formulaP, formulaAg, formulaL }
  }

  let losaRes = null
  if (p.tipo === 'Losa aligerada' && luzL > 0) {
    const r = predimensionar('losa_aligerada', luzL)
    const divisor = 25
    const formula = `h = L / ${divisor}  →  ${luzL} / ${divisor} = ${r.h_calc} cm  →  adoptar ${r.h_sugerido} cm`
    losaRes = { h: r.h_sugerido, formula, divisor }
  }
  if (p.tipo === 'Losa maciza' && luzL > 0) {
    const r = predimensionar('losa_maciza', luzL)
    const divisor = 33
    const formula = `h = L / ${divisor}  →  ${luzL} / ${divisor} = ${r.h_calc} cm  →  adoptar ${r.h_sugerido} cm`
    losaRes = { h: r.h_sugerido, formula, divisor }
  }

  return { vigaRes, colRes, losaRes }
}

// ── Sub-componentes ────────────────────────────────────────────────────────────
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

function FormulaBox({ title, lines }) {
  return (
    <div style={D.formulaBox}>
      {title && <div style={D.formulaTitle}>{title}</div>}
      {lines.map((l, i) => (
        <div key={i} style={{ marginBottom: i < lines.length - 1 ? 2 : 0 }}>{l}</div>
      ))}
    </div>
  )
}

// Íconos SVG compactos para los type-cards
const ICONS = {
  Viga: (
    <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
      <rect x="0" y="6" width="32" height="8" rx="2" fill="currentColor" opacity=".7"/>
      <rect x="0" y="6" width="32" height="2" rx="1" fill="currentColor"/>
      <rect x="0" y="12" width="32" height="2" rx="1" fill="currentColor"/>
    </svg>
  ),
  Columna: (
    <svg width="20" height="32" viewBox="0 0 20 32" fill="none">
      <rect x="6" y="0" width="8" height="32" rx="2" fill="currentColor" opacity=".7"/>
      <rect x="6" y="0" width="2" height="32" rx="1" fill="currentColor"/>
      <rect x="12" y="0" width="2" height="32" rx="1" fill="currentColor"/>
    </svg>
  ),
  'Losa aligerada': (
    <svg width="36" height="20" viewBox="0 0 36 20" fill="none">
      <rect x="0" y="2" width="36" height="4" rx="1" fill="currentColor"/>
      <rect x="0" y="14" width="36" height="4" rx="1" fill="currentColor"/>
      <rect x="4"  y="6" width="4" height="8" rx="1" fill="currentColor" opacity=".5"/>
      <rect x="14" y="6" width="4" height="8" rx="1" fill="currentColor" opacity=".5"/>
      <rect x="24" y="6" width="4" height="8" rx="1" fill="currentColor" opacity=".5"/>
    </svg>
  ),
  'Losa maciza': (
    <svg width="36" height="20" viewBox="0 0 36 20" fill="none">
      <rect x="0" y="3" width="36" height="14" rx="2" fill="currentColor" opacity=".6"/>
      <rect x="0" y="3" width="36" height="3"  rx="1" fill="currentColor"/>
      <rect x="0" y="14" width="36" height="3" rx="1" fill="currentColor"/>
    </svg>
  ),
}

// Card de dimensión grande (valor + unidad + etiqueta)
function DimCard({ value, unit, label, color, bg, border }) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 16, padding: '28px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 64, fontFamily: 'var(--mono)', fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 17, color: 'var(--text3)', fontFamily: 'var(--sans)', marginTop: 5 }}>{unit}</div>
      <div style={{ fontSize: 13, color: 'var(--text2)', fontFamily: 'var(--sans)', marginTop: 12, fontWeight: 600 }}>{label}</div>
    </div>
  )
}

// Tabla de referencia
const REF_ROWS = [
  ['Viga (gravedad)', 'h = L / 12', '—',     'L=5m → h=42 cm', 'ACI 318 T.9.5a'],
  ['Viga (sísmica)',  'h = L / 10', '—',     'L=5m → h=50 cm', 'E.060 cl.21.3.1'],
  ['Columna',         'Ag = P/(0.45f\'c)', '30 cm', '—',       'E.060 cl.21.4.1'],
  ['Losa aligerada',  'h = L / 25', '17 cm', 'L=5m → h=20 cm', 'E.060 cl.9.5.3'],
  ['Losa maciza',     'h = L / 33', '12 cm', 'L=5m → h=15 cm', 'E.060 cl.9.5.2'],
]

// ══════════════════════════════════════════════════════════════════════════════
// Componente principal
// ══════════════════════════════════════════════════════════════════════════════
export default function Predimensionamiento({ onBack }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [refOpen, setRefOpen] = useState(true)
  const set = (field, value) => dispatch({ type: 'SET', field, value })

  const res = useMemo(() => calcPredim(state), [state])

  const TIPOS = ['Viga', 'Columna', 'Losa aligerada', 'Losa maciza']

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text0)', fontFamily: 'var(--sans)' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        height: 52,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '0 20px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text2)',
            cursor: 'pointer',
            padding: '5px 12px',
            fontSize: 13,
            fontFamily: 'var(--sans)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>&#8592;</span>
          Atrás
        </button>
        <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: 'linear-gradient(135deg, #9b59b6, #6c3483)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
          }}>
            &#9633;
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text0)', fontFamily: 'var(--cond)', letterSpacing: '.3px' }}>
              Predimensionamiento de Elementos Estructurales
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--sans)' }}>
              NTP E.060 / ACI 318 — Criterios prácticos
            </div>
          </div>
        </div>
      </div>

      {/* ── Cuerpo ─────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px 60px' }}>

        {/* ── 1. Selector de tipo ── */}
        <div style={{ ...D.inputPanel, marginBottom: 24 }}>
          <div style={D.inputPanelTitle}>Tipo de elemento a predimensionar</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {TIPOS.map(tipo => {
              const active = state.tipo === tipo
              return (
                <button
                  key={tipo}
                  onClick={() => set('tipo', tipo)}
                  style={{
                    padding: '20px 12px 16px',
                    borderRadius: 12,
                    border: `2px solid ${active ? '#9b59b6' : 'var(--border)'}`,
                    background: active ? 'rgba(155,89,182,0.15)' : 'rgba(255,255,255,0.03)',
                    color: active ? '#ce93d8' : 'var(--text2)',
                    fontFamily: 'var(--cond)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all .15s',
                    letterSpacing: '.3px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                    boxShadow: active ? '0 0 0 3px rgba(155,89,182,0.18)' : 'none',
                  }}
                >
                  <div style={{ color: active ? '#ce93d8' : 'var(--text3)', lineHeight: 0 }}>
                    {ICONS[tipo]}
                  </div>
                  {tipo.toUpperCase()}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── 2 + 3. Inputs y resultados lado a lado ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '38% 62%', gap: 20, alignItems: 'start', marginBottom: 24 }}>

          {/* Inputs */}
          <div style={D.inputPanel}>
            <div style={D.inputPanelTitle}>Parámetros de entrada</div>

            {state.tipo === 'Viga' && (
              <>
                <Field label="Luz libre de la viga L (m)" value={state.luz} onChange={v => set('luz', v)} step="0.5" min="1" />
                <div style={{ height: 14 }} />
                <Field label="Tipo de carga dominante">
                  <select value={state.tipoCarga} onChange={e => set('tipoCarga', e.target.value)} style={S.paramSelect}>
                    <option value="Gravedad">Gravedad — h = L / 12</option>
                    <option value="Sismo">Sísmica — h = L / 10</option>
                  </select>
                </Field>
                <FormulaBox
                  title="Criterio normativo"
                  lines={[
                    state.tipoCarga === 'Sismo' ? 'h = L / 10  (E.060 cl. 21.3.1)' : 'h = L / 12  (ACI 318 Tabla 9.5a)',
                    'b = h / 2,  mín. 25 cm',
                    'Redondear a múltiplos de 5 cm',
                  ]}
                />
              </>
            )}

            {state.tipo === 'Columna' && (
              <>
                <Field label="Área tributaria por piso (m²)" hint="aprox." value={state.At} onChange={v => set('At', v)} step="1" min="1" />
                <div style={{ height: 14 }} />
                <Field label="Número de pisos" value={state.Npisos} onChange={v => set('Npisos', v)} step="1" min="1" />
                <div style={{ height: 14 }} />
                <Field label="Resistencia del concreto f'c (kg/cm²)">
                  <select value={state.fcCol} onChange={e => set('fcCol', e.target.value)} style={S.paramSelect}>
                    {[175, 210, 280, 350].map(v => <option key={v} value={v}>{v} kg/cm²</option>)}
                  </select>
                </Field>
                <FormulaBox
                  title="Criterio"
                  lines={[
                    "P = At × N° pisos × 1.25 t/m²",
                    "Ag = P × 1000 / (0.45 × f'c)",
                    "lado = ceil(√Ag / 5) × 5 cm,  mín. 30 cm",
                  ]}
                />
              </>
            )}

            {(state.tipo === 'Losa aligerada' || state.tipo === 'Losa maciza') && (
              <>
                <Field
                  label={`Luz libre de la losa L (m)`}
                  value={state.luzLosa}
                  onChange={v => set('luzLosa', v)}
                  step="0.5"
                  min="1"
                />
                <FormulaBox
                  title="Criterio"
                  lines={[
                    state.tipo === 'Losa aligerada'
                      ? 'h = L / 25  (E.060 cl. 9.5.3)'
                      : 'h = L / 33  (E.060 cl. 9.5.2)',
                    state.tipo === 'Losa aligerada'
                      ? 'Estándares comerciales: 17, 20, 25, 30 cm'
                      : 'h mínimo absoluto: 12 cm',
                  ]}
                />
              </>
            )}
          </div>

          {/* Resultados */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── VIGA ── */}
            {state.tipo === 'Viga' && res.vigaRes && (
              <>
                <div style={{ ...D.inputPanelTitle, marginBottom: 0 }}>Dimensiones sugeridas</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <DimCard
                    value={res.vigaRes.h}
                    unit="cm"
                    label="Peralte total h"
                    color="#4fc3f7"
                    bg="rgba(79,195,247,0.09)"
                    border="rgba(79,195,247,0.28)"
                  />
                  <DimCard
                    value={res.vigaRes.b}
                    unit="cm"
                    label="Ancho b"
                    color="#ce93d8"
                    bg="rgba(124,77,255,0.1)"
                    border="rgba(124,77,255,0.28)"
                  />
                </div>

                {/* Fórmula aplicada */}
                <div style={{ ...D.resultCard, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--cond)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>
                    Fórmula aplicada
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text1)', lineHeight: 2 }}>
                    {res.vigaRes.formula}
                    <br />
                    {res.vigaRes.formulaB}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--sans)', marginTop: 8, lineHeight: 1.6 }}>
                    Verificar b &#8805; 25 cm (E.060) y b &#8805; h/4.
                    Sección comercial recomendada: {res.vigaRes.b} × {res.vigaRes.h} cm.
                  </div>
                </div>
              </>
            )}

            {/* ── COLUMNA ── */}
            {state.tipo === 'Columna' && res.colRes && (
              <>
                <div style={{ ...D.inputPanelTitle, marginBottom: 0 }}>Resultados de predimensionamiento</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {/* P estimado */}
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, fontFamily: 'var(--mono)', fontWeight: 700, color: '#fbbf24', lineHeight: 1 }}>
                      {pf(res.colRes.P_est, 1)}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>ton</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--sans)', marginTop: 8, fontWeight: 600 }}>Carga axial P estimada</div>
                  </div>
                  {/* Ag */}
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, fontFamily: 'var(--mono)', fontWeight: 700, color: '#69f0ae', lineHeight: 1 }}>
                      {pf(res.colRes.Ag_req, 0)}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>cm²</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--sans)', marginTop: 8, fontWeight: 600 }}>Área bruta requerida Ag</div>
                  </div>
                </div>

                {/* Lado grande */}
                <DimCard
                  value={res.colRes.lado}
                  unit="cm"
                  label="Lado mínimo — columna cuadrada"
                  color="#4fc3f7"
                  bg="rgba(79,195,247,0.09)"
                  border="rgba(79,195,247,0.28)"
                />

                {/* Fórmulas */}
                <div style={{ ...D.resultCard, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--cond)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>
                    Desarrollo del cálculo
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text1)', lineHeight: 2 }}>
                    {res.colRes.formulaP}<br />
                    {res.colRes.formulaAg}<br />
                    {res.colRes.formulaL}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--sans)', marginTop: 8, lineHeight: 1.6 }}>
                    Verificar refuerzo mínimo 1 % Ag y máximo 4 % Ag.
                    Ajustar sección según arquitectura.
                  </div>
                </div>
              </>
            )}

            {/* ── LOSA ── */}
            {(state.tipo === 'Losa aligerada' || state.tipo === 'Losa maciza') && res.losaRes && (
              <>
                <div style={{ ...D.inputPanelTitle, marginBottom: 0 }}>Espesor sugerido</div>

                <DimCard
                  value={res.losaRes.h}
                  unit="cm"
                  label={`Espesor total h — ${state.tipo}`}
                  color="#4fc3f7"
                  bg="rgba(79,195,247,0.09)"
                  border="rgba(79,195,247,0.28)"
                />

                {/* Fórmula */}
                <div style={{ ...D.resultCard, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--cond)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>
                    Fórmula aplicada
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text1)', lineHeight: 1.9 }}>
                    {res.losaRes.formula}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--sans)', marginTop: 8, lineHeight: 1.6 }}>
                    {state.tipo === 'Losa aligerada'
                      ? 'Espesores comerciales disponibles: 17, 20, 25, 30 cm. Se selecciona el valor inmediato superior al calculado.'
                      : 'Espesor mínimo absoluto según E.060: 12 cm. Verificar refuerzo de temperatura (As mín. 0.0018 Ag).'}
                  </div>
                </div>
              </>
            )}

          </div>
        </div>

        {/* ── 4. Tabla de referencia colapsable ── */}
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {/* Header colapsable */}
          <button
            onClick={() => setRefOpen(o => !o)}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              color: 'var(--text2)',
            }}
          >
            <span style={{ fontFamily: 'var(--cond)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text3)' }}>
              Tabla de referencia normativa
            </span>
            <span style={{ fontSize: 14, color: 'var(--text3)', fontFamily: 'var(--mono)', transition: 'transform .2s', display: 'inline-block', transform: refOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
              &#9660;
            </span>
          </button>

          {refOpen && (
            <div style={{ padding: '0 18px 18px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, minWidth: 540 }}>
                <thead>
                  <tr>
                    {['Elemento', 'Regla', 'h mín.', 'Ejemplo L = 5 m', 'Fuente'].map(h => (
                      <th key={h} style={S.headerCell}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {REF_ROWS.map((row, i) => {
                    const highlight = row[0].toLowerCase().startsWith(state.tipo.split(' ')[0].toLowerCase())
                    return (
                      <tr key={i} style={{
                        background: highlight
                          ? 'rgba(124,77,255,0.12)'
                          : i % 2 ? 'rgba(255,255,255,0.02)' : 'transparent',
                      }}>
                        {row.map((c, j) => (
                          <td key={j} style={{
                            ...S.cell,
                            color: highlight ? '#ce93d8' : 'var(--text1)',
                            fontWeight: highlight ? 600 : 400,
                          }}>{c}</td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div style={{ marginTop: 10, fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--sans)', lineHeight: 1.7 }}>
                Los criterios anteriores son de predimensionamiento preliminar.
                Se debe verificar la sección con el diseño definitivo según NTP E.060.
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
