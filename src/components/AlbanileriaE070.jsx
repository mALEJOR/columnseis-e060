import { useState, useReducer, useMemo, useCallback, useRef } from 'react'
import {
  TABLA_9, TABLA_10, TABLA_12, TABLA_12_LOOKUP,
  calcularVm, calcularEsfuerzoAxial, calcularDensidadMuros,
  calcularColumnasConfinamiento, calcularVigaSolera, calcularCargasOrtogonales,
} from '../utils/albanileriaE070'

// ── Helpers ───────────────────────────────────────────────────────────────────
const pf  = (v, d = 2)  => (v === '' || v == null || isNaN(Number(v))) ? '—' : Number(v).toFixed(d)
const pf4 = v => pf(v, 4)

function smartParse(str) {
  if (!str || str === '' || str === '-' || str === '—') return ''
  let c = str.replace(/\s/g, '')
  if (c.includes(',') && c.includes('.')) {
    if (c.lastIndexOf(',') > c.lastIndexOf('.')) c = c.replace(/\./g, '').replace(',', '.')
    else c = c.replace(/,/g, '')
  } else if (c.includes(',')) {
    const parts = c.split(',')
    c = parts[parts.length - 1].length <= 2 ? c.replace(',', '.') : c.replace(/,/g, '')
  }
  const n = parseFloat(c)
  return isNaN(n) ? '' : n
}

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
  paramLabel:    { fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--sans)', display: 'block', marginBottom: 4 },
  paramInput:    { width: '100%', background: '#1a2744', border: '1px solid rgba(68,114,196,0.35)', borderRadius: 'var(--r)', color: 'var(--text0)', fontFamily: 'var(--mono)', fontSize: 12, padding: '6px 8px', outline: 'none', boxSizing: 'border-box' },
  paramSelect:   { width: '100%', background: '#161922', border: '1px solid rgba(68,114,196,0.35)', borderRadius: 'var(--r)', color: 'var(--text0)', fontFamily: 'var(--mono)', fontSize: 12, padding: '6px 8px', outline: 'none', boxSizing: 'border-box' },
  resultBox:     { background: '#0f1c2e', border: '1px solid rgba(68,114,196,0.25)', borderRadius: 'var(--r2)', padding: '10px 14px', marginTop: 8 },
}

// ── Design system (amigable, igual que VigasE060) ─────────────────────────────
const D = {
  verifOK:      { background: 'rgba(46,125,50,0.15)',  border: '1px solid rgba(46,125,50,0.4)',  borderRadius: 12, padding: '16px 20px' },
  verifFail:    { background: 'rgba(198,40,40,0.15)',  border: '1px solid rgba(198,40,40,0.4)',  borderRadius: 12, padding: '16px 20px' },
  verifNeutral: { background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',        borderRadius: 12, padding: '16px 20px' },
  verifTitle: (ok) => ({
    fontSize: 16, fontWeight: 700, fontFamily: 'var(--cond)',
    color: ok === true ? '#69f0ae' : ok === false ? '#ff5252' : 'var(--text2)',
    letterSpacing: '.5px', marginBottom: 6,
  }),
  verifDetail: { fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text1)', lineHeight: 1.7 },
  formulaBox: {
    background: 'rgba(79,195,247,0.04)',
    border: '1px solid rgba(79,195,247,0.12)',
    borderRadius: 8, padding: '10px 14px',
    fontFamily: 'var(--mono)', fontSize: 11,
    color: 'var(--text2)', lineHeight: 1.85,
    marginBottom: 12,
  },
  formulaTitle: {
    fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--cond)',
    textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 5,
  },
  summaryCard: {
    background: 'rgba(79,195,247,0.07)',
    border: '1px solid rgba(79,195,247,0.18)',
    borderRadius: 12, padding: '14px 18px',
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  bigValue:      { fontSize: 28, fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--text0)', lineHeight: 1 },
  bigValueGreen: { fontSize: 28, fontFamily: 'var(--mono)', fontWeight: 700, color: '#69f0ae', lineHeight: 1 },
  bigValueAmber: { fontSize: 28, fontFamily: 'var(--mono)', fontWeight: 700, color: '#fbbf24', lineHeight: 1 },
  bigUnit:       { fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--sans)', marginLeft: 5, fontWeight: 400 },
  cardLabel:     { fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--sans)', marginTop: 4 },
}

// ── Presentational sub-components ─────────────────────────────────────────────

function FormulaBox({ title, lines }) {
  return (
    <div style={D.formulaBox}>
      {title && <div style={D.formulaTitle}>{title}</div>}
      {lines.map((l, i) => <div key={i}>{l}</div>)}
    </div>
  )
}

function VerifCard({ ok, mainText, detail }) {
  const cardStyle = ok === true ? D.verifOK : ok === false ? D.verifFail : D.verifNeutral
  const symbol    = ok === true ? '✓' : ok === false ? '✗' : '—'
  const label     = ok === true ? 'CUMPLE' : ok === false ? 'NO CUMPLE' : 'SIN DATOS'
  return (
    <div style={cardStyle}>
      <div style={D.verifTitle(ok)}>{symbol} {mainText || label}</div>
      {detail && <div style={D.verifDetail}>{detail}</div>}
    </div>
  )
}

function SummaryCard({ value, unit, label, note, green }) {
  return (
    <div style={D.summaryCard}>
      <div>
        <span style={green ? D.bigValueGreen : D.bigValue}>{value}</span>
        {unit && <span style={D.bigUnit}>{unit}</span>}
      </div>
      <div style={D.cardLabel}>{label}</div>
      {note && <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--sans)', marginTop: 2 }}>{note}</div>}
    </div>
  )
}

const condBg  = c => c === 'CUMPLE' || c === 'OK' || c === 'NO SE FISURA' ? 'rgba(46,125,50,0.25)' : c === 'NO CUMPLE' || c === 'MURO FISURADO' ? 'rgba(198,40,40,0.25)' : 'transparent'
const condClr = c => c === 'CUMPLE' || c === 'OK' || c === 'NO SE FISURA' ? '#69f0ae' : c === 'NO CUMPLE' || c === 'MURO FISURADO' ? '#ff5252' : 'var(--text2)'

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_MUROS    = 15
const ETABS_FIELDS = ['story', 'pier', 'outputCase', 'caseType', 'stepType', 'location', 'p', 'v2', 'v3', 't', 'm2', 'm3']
const ETABS_LABELS = ['Story', 'Pier', 'Output Case', 'Case Type', 'Step Type', 'Location', 'P (kgf)', 'V2 (kgf)', 'V3 (kgf)', 'T (kgf·m)', 'M2 (kgf·m)', 'M3 (kgf·m)']

function emptyMuroRows()  { return Array.from({ length: MAX_MUROS }, () => ({ story: '', pier: '', outputCase: '', caseType: '', stepType: '', location: '', p: '', v2: '', v3: '', t: '', m2: '', m3: '' })) }
function emptyMuroProps() { return Array.from({ length: MAX_MUROS }, () => ({ pier: '', t: 0.13, L: '', vm: 8.1 })) }
function emptyDensMuros() { return Array.from({ length: MAX_MUROS }, () => ({ nombre: '', L: '', t: '', esPlacaCA: false, Ec: '', Em: '' })) }

function initState() {
  return {
    murosX: { sismo: emptyMuroRows(), grav: emptyMuroRows(), props: emptyMuroProps(), fm: 65, h: 2.6 },
    murosY: { sismo: emptyMuroRows(), grav: emptyMuroRows(), props: emptyMuroProps(), fm: 65, h: 2.6 },
    densidad: { N: 3, Ap: 160, Z: 0.45, U: 1, S: 1, murosX: emptyDensMuros(), murosY: emptyDensMuros() },
    columnas: {
      Mu1: 0, Vm1: 0, h: 2.6, L: 3.5, Lm: 1.75, Nc: 2, Pg: 0,
      fc: 175, fy: 4200, phi_c: 0.70, phi_f: 0.85, mu_f: 0.80,
      bc: 0.13, dc: 0.30, db_estribo: 8, recubrimiento: 4,
    },
    vigas: { Vm1: 0, Lm: 0, L: 0, phi: 0.85, fc: 175, fy: 4200, Acs: 150 },
    ortogonales: { Z: 0.45, U: 1, C1: 2, gamma: 1.8, e: 0.15, caso: 'caso4', ba: 1, m: '', a: 2.6, tEff: 0.13, ft: 1.5 },
  }
}

// ── Reducer ───────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'SET_ETABS_ROW': {
      const rows = [...state[action.dir][action.tbl]]
      rows[action.idx] = { ...rows[action.idx], [action.field]: action.value }
      return { ...state, [action.dir]: { ...state[action.dir], [action.tbl]: rows } }
    }
    case 'SET_ETABS_BULK': {
      const rows = [...state[action.dir][action.tbl]]
      action.cells.forEach(({ idx, field, value }) => {
        if (idx < MAX_MUROS) rows[idx] = { ...rows[idx], [field]: value }
      })
      return { ...state, [action.dir]: { ...state[action.dir], [action.tbl]: rows } }
    }
    case 'SET_PROPS_ROW': {
      const props = [...state[action.dir].props]
      props[action.idx] = { ...props[action.idx], [action.field]: action.value }
      return { ...state, [action.dir]: { ...state[action.dir], props } }
    }
    case 'SET_MUR_PARAM':
      return { ...state, [action.dir]: { ...state[action.dir], [action.field]: action.value } }
    case 'SET_DENSIDAD':
      return { ...state, densidad: { ...state.densidad, [action.field]: action.value } }
    case 'SET_DENS_MURO': {
      const arr = [...state.densidad[action.dir]]
      arr[action.idx] = { ...arr[action.idx], [action.field]: action.value }
      return { ...state, densidad: { ...state.densidad, [action.dir]: arr } }
    }
    case 'SET_COL':
      return { ...state, columnas: { ...state.columnas, [action.field]: action.value } }
    case 'SET_VIGA':
      return { ...state, vigas: { ...state.vigas, [action.field]: action.value } }
    case 'SET_ORT':
      return { ...state, ortogonales: { ...state.ortogonales, [action.field]: action.value } }
    case 'LOAD_EXAMPLE': {
      const exGrav = (pier, p) => ({ story: 'Story1', pier, outputCase: 'Pg', caseType: 'Combination', stepType: '', location: 'Bottom', p, v2: 0, v3: 0, t: 0, m2: 0, m3: 0 })

      const mxSismo = emptyMuroRows()
      mxSismo[0] = { story:'Story1', pier:'X1', outputCase:'EQXDESP', caseType:'LinRespSpec', stepType:'Max', location:'Bottom', p:2500,  v2:8500,  v3:100, t:50, m2:30, m3:12000 }
      mxSismo[1] = { story:'Story1', pier:'X2', outputCase:'EQXDESP', caseType:'LinRespSpec', stepType:'Max', location:'Bottom', p:1800,  v2:6200,  v3:80,  t:35, m2:25, m3:9500  }
      mxSismo[2] = { story:'Story1', pier:'X3', outputCase:'EQXDESP', caseType:'LinRespSpec', stepType:'Max', location:'Bottom', p:3200,  v2:11000, v3:150, t:70, m2:40, m3:16000 }
      mxSismo[3] = { story:'Story1', pier:'X4', outputCase:'EQXDESP', caseType:'LinRespSpec', stepType:'Max', location:'Bottom', p:2100,  v2:7800,  v3:90,  t:45, m2:28, m3:11500 }

      const mxGrav = emptyMuroRows()
      mxGrav[0] = exGrav('X1', 15000)
      mxGrav[1] = exGrav('X2', 12000)
      mxGrav[2] = exGrav('X3', 18000)
      mxGrav[3] = exGrav('X4', 14000)

      const mxProps = emptyMuroProps()
      mxProps[0] = { pier:'X1', t:0.13, L:3.5, vm:8.1 }
      mxProps[1] = { pier:'X2', t:0.13, L:2.8, vm:8.1 }
      mxProps[2] = { pier:'X3', t:0.23, L:4.2, vm:8.1 }
      mxProps[3] = { pier:'X4', t:0.13, L:3.0, vm:8.1 }

      const mySismo = emptyMuroRows()
      mySismo[0] = { story:'Story1', pier:'Y1', outputCase:'EQYDESP', caseType:'LinRespSpec', stepType:'Max', location:'Bottom', p:2200,  v2:7500,  v3:90,  t:45, m2:25, m3:10500 }
      mySismo[1] = { story:'Story1', pier:'Y2', outputCase:'EQYDESP', caseType:'LinRespSpec', stepType:'Max', location:'Bottom', p:2900,  v2:9800,  v3:120, t:60, m2:35, m3:14000 }
      mySismo[2] = { story:'Story1', pier:'Y3', outputCase:'EQYDESP', caseType:'LinRespSpec', stepType:'Max', location:'Bottom', p:1600,  v2:5500,  v3:70,  t:30, m2:20, m3:8000  }

      const myGrav = emptyMuroRows()
      myGrav[0] = exGrav('Y1', 13000)
      myGrav[1] = exGrav('Y2', 17000)
      myGrav[2] = exGrav('Y3', 10500)

      const myProps = emptyMuroProps()
      myProps[0] = { pier:'Y1', t:0.13, L:3.2, vm:8.1 }
      myProps[1] = { pier:'Y2', t:0.23, L:3.8, vm:8.1 }
      myProps[2] = { pier:'Y3', t:0.13, L:2.5, vm:8.1 }

      const densMurosX = emptyDensMuros()
      densMurosX[0] = { nombre:'X1', L:'3.5', t:'0.13', esPlacaCA: false, Ec:'', Em:'' }
      densMurosX[1] = { nombre:'X2', L:'2.8', t:'0.13', esPlacaCA: false, Ec:'', Em:'' }
      densMurosX[2] = { nombre:'X3', L:'4.2', t:'0.23', esPlacaCA: false, Ec:'', Em:'' }
      densMurosX[3] = { nombre:'X4', L:'3.0', t:'0.13', esPlacaCA: false, Ec:'', Em:'' }

      const densMurosY = emptyDensMuros()
      densMurosY[0] = { nombre:'Y1', L:'3.2', t:'0.13', esPlacaCA: false, Ec:'', Em:'' }
      densMurosY[1] = { nombre:'Y2', L:'3.8', t:'0.23', esPlacaCA: false, Ec:'', Em:'' }
      densMurosY[2] = { nombre:'Y3', L:'2.5', t:'0.13', esPlacaCA: false, Ec:'', Em:'' }

      return {
        murosX: { sismo: mxSismo, grav: mxGrav, props: mxProps, fm: 65, h: 2.6 },
        murosY: { sismo: mySismo, grav: myGrav, props: myProps, fm: 65, h: 2.6 },
        densidad: {
          N: 3, Ap: 160, Z: 0.45, U: 1, S: 1,
          murosX: densMurosX,
          murosY: densMurosY,
        },
        columnas: {
          Vm1: 12, Mu1: 8, h: 2.6, L: 3.5, Lm: 1.75, Nc: 2, Pg: 0,
          fc: 175, fy: 4200, phi_c: 0.70, phi_f: 0.85, mu_f: 0.80,
          bc: 0.13, dc: 0.30, db_estribo: 8, recubrimiento: 4,
        },
        vigas: { Vm1: 12, Lm: 1.75, L: 3.5, phi: 0.85, fc: 175, fy: 4200, Acs: 150 },
        ortogonales: { Z: 0.45, U: 1, C1: 2, gamma: 1.8, e: 0.15, caso: 'caso4', ba: 1, m: '', a: 2.6, tEff: 0.13, ft: 1.5 },
      }
    }
    default: return state
  }
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

function PF({ label, hint, children, onChange, value, type = 'number', step, min }) {
  return (
    <div>
      <label style={S.paramLabel}>
        {label}
        {hint && <span style={{ color: 'var(--text3)', fontSize: 10, marginLeft: 4 }}>{hint}</span>}
      </label>
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

// ── ETABS Paste handler ───────────────────────────────────────────────────────
function makeEtabsPasteHandler(dispatch, dir, tbl) {
  return e => {
    const text = (e.clipboardData || window.clipboardData)?.getData('text/plain')
    if (!text?.trim()) return
    const active = document.activeElement
    const field  = active?.dataset?.field
    const startIdx = parseInt(active?.dataset?.idx)
    if (!field || isNaN(startIdx)) return
    const lines = text.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    const hasTab = lines.some(l => l.includes('\t'))
    e.preventDefault()
    const startCol = ETABS_FIELDS.indexOf(field)
    const cells = []
    if (hasTab && startCol !== -1) {
      lines.forEach((line, r) => {
        const idx = startIdx + r
        if (idx >= MAX_MUROS) return
        line.split('\t').forEach((val, c) => {
          const col = startCol + c
          if (col < ETABS_FIELDS.length) {
            const parsed = smartParse(val)
            cells.push({ idx, field: ETABS_FIELDS[col], value: parsed !== '' ? parsed : val })
          }
        })
      })
    } else {
      lines.forEach((val, r) => {
        const idx = startIdx + r
        if (idx < MAX_MUROS) {
          const parsed = smartParse(val)
          cells.push({ idx, field, value: parsed !== '' ? parsed : val })
        }
      })
    }
    if (cells.length) dispatch({ type: 'SET_ETABS_BULK', dir, tbl, cells })
  }
}

// ── ETABS Table ───────────────────────────────────────────────────────────────
function EtabsTable({ rows, dispatch, dir, tbl, title }) {
  const onPaste = useMemo(() => makeEtabsPasteHandler(dispatch, dir, tbl), [dispatch, dir, tbl])
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, color: 'var(--text2)', fontFamily: 'var(--cond)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>
        {title} &mdash; <span style={{ color: 'var(--text3)', fontWeight: 400, textTransform: 'none' }}>Pegar desde ETABS (Ctrl+V en celda)</span>
      </div>
      <div style={{ overflowX: 'auto', resize: 'both', minHeight: 70, border: '1px solid var(--border)', borderRadius: 'var(--r2)' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <ResizableTh style={{ ...S.headerCell, width: 28, fontSize: 8 }}>#</ResizableTh>
              {ETABS_FIELDS.map((f, i) => (
                <ResizableTh key={f} style={{ ...S.headerCell, width: i < 6 ? 80 : 72 }}>{ETABS_LABELS[i]}</ResizableTh>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                <td style={{ ...S.cell, color: 'var(--text3)', fontSize: 9 }}>{idx + 1}</td>
                {ETABS_FIELDS.map(f => (
                  <td key={f} style={{ ...S.cell, ...S.inputCell, padding: 0 }}>
                    <input style={S.tableInput} value={row[f] ?? ''}
                      data-field={f} data-idx={idx}
                      onChange={e => dispatch({ type: 'SET_ETABS_ROW', dir, tbl, idx, field: f, value: e.target.value })}
                      onPaste={onPaste} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Vm Table ──────────────────────────────────────────────────────────────────
function VmTable({ simoRows, gravRows, props, dispatch, dir, vmEi, setVmEi }) {
  const vmResult = useMemo(() => {
    const muros = props.map((p, i) => {
      const sRow = simoRows[i] || {}
      const gRow = gravRows[i] || {}
      return {
        nombre:   sRow.pier || p.pier || String(i + 1),
        v2:       parseFloat(sRow.v2) / 1000 || 0,    // kgf → ton
        m3:       parseFloat(sRow.m3) / 1000 || 0,
        pg:       (parseFloat(gRow.p) || 0) / 1000,   // kgf → ton
        t:        parseFloat(p.t)  || 0,
        L:        parseFloat(p.L)  || 0,
        vm_prima: parseFloat(p.vm) || 0,
      }
    }).filter(m => m.t > 0 && m.L > 0 && m.vm_prima > 0)
    return calcularVm(muros)
  }, [simoRows, gravRows, props])

  const verifArt = useMemo(() => {
    const VE = parseFloat(vmEi) || 0
    if (!vmResult.sumVm || !VE) return null
    return vmResult.sumVm >= VE
  }, [vmResult, vmEi])

  const noFisuran = vmResult.resultados.filter(r => r.verificacion === 'NO SE FISURA').length
  const totalMuros = vmResult.resultados.length

  const hdrs = ['Pier', 'Espesor t (m)', 'Longitud L (m)', "v'm (kg/cm²)", 'Ve (ton)', 'Me (ton·m)', 'Pg (ton)', 'α calc', 'α adopt', 'Vm (ton)', '0.55·Vm', 'Verificación']

  return (
    <div style={{ marginBottom: 16 }}>

      {/* ── Fórmula Vm ─────────────────────────────────────────────────────── */}
      <FormulaBox
        title="Resistencia al agrietamiento diagonal (Art. 26.2)"
        lines={[
          'Vm = 0.5·v\'m·α·t·L + 0.23·Pg',
          'donde:  α = Ve·L / (Me)  →  α adoptado = min(α_calc, 1)',
          'Verificación por muro:  Ve ≤ 0.55·Vm  →  NO SE FISURA',
        ]}
      />

      {/* ── Resumen visual ─────────────────────────────────────────────────── */}
      {totalMuros > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
          <SummaryCard
            value={pf4(vmResult.sumVm)}
            unit="ton"
            label="ΣVm — Resistencia total de muros"
            green={vmResult.sumVm > 0}
          />
          <SummaryCard
            value={totalMuros}
            label="Muros analizados"
          />
          <SummaryCard
            value={`${noFisuran} / ${totalMuros}`}
            label="Muros que NO SE FISURAN"
            green={noFisuran === totalMuros}
          />
        </div>
      )}

      {/* ── Props editable inputs above table ──────────────────────────────── */}
      <div style={{ overflowX: 'auto', marginBottom: 8, border: '1px solid rgba(68,114,196,0.2)', borderRadius: 'var(--r)', padding: 8, background: 'rgba(26,39,68,0.3)' }}>
        <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--cond)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>
          Propiedades de muros (editables) — Pier / Espesor t / Longitud L / Resistencia v'm
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%' }}>
            <thead>
              <tr>
                <ResizableTh style={{ ...S.headerCell, width: 28, fontSize: 8 }}>#</ResizableTh>
                <ResizableTh style={{ ...S.headerCell, width: 80 }}>Pier</ResizableTh>
                <ResizableTh style={{ ...S.headerCell, width: 90 }}>Espesor t (m)</ResizableTh>
                <ResizableTh style={{ ...S.headerCell, width: 90 }}>Longitud L (m)</ResizableTh>
                <ResizableTh style={{ ...S.headerCell, width: 100 }}>v'm (kg/cm²)</ResizableTh>
              </tr>
            </thead>
            <tbody>
              {props.map((p, idx) => (
                <tr key={idx} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  <td style={{ ...S.cell, color: 'var(--text3)', fontSize: 9 }}>{idx + 1}</td>
                  {['pier', 't', 'L', 'vm'].map(f => (
                    <td key={f} style={{ ...S.cell, ...S.inputCell, padding: 0 }}>
                      <input style={S.tableInput} value={p[f] ?? ''}
                        onChange={e => dispatch({ type: 'SET_PROPS_ROW', dir, idx, field: f, value: e.target.value })} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Vm results table ───────────────────────────────────────────────── */}
      <div style={{ overflowX: 'auto', resize: 'both', minHeight: 70, border: '1px solid var(--border)', borderRadius: 'var(--r2)' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <ResizableTh style={{ ...S.headerCell, width: 28, fontSize: 8 }}>#</ResizableTh>
              {hdrs.map((h, i) => (
                <ResizableTh key={i} style={{ ...S.headerCell, width: i < 4 ? 76 : 76 }}>{h}</ResizableTh>
              ))}
            </tr>
          </thead>
          <tbody>
            {vmResult.resultados.map((row, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                <td style={{ ...S.cell, color: 'var(--text3)', fontSize: 9 }}>{idx + 1}</td>
                <td style={{ ...S.cell, ...S.compCell }}>{row.nombre}</td>
                <td style={{ ...S.cell, ...S.compCell }}>{pf(row.t, 2)}</td>
                <td style={{ ...S.cell, ...S.compCell }}>{pf(row.L, 2)}</td>
                <td style={{ ...S.cell, ...S.compCell }}>{pf(row.vm_prima, 1)}</td>
                <td style={{ ...S.cell, ...S.compCell }}>{pf4(row.Ve)}</td>
                <td style={{ ...S.cell, ...S.compCell }}>{pf4(row.Me)}</td>
                <td style={{ ...S.cell, ...S.compCell }}>{pf(row.pg, 4)}</td>
                <td style={{ ...S.cell, ...S.compCell }}>{pf4(row.alfa_calc)}</td>
                <td style={{ ...S.cell, ...S.compCell }}>{pf4(row.alfa)}</td>
                <td style={{ ...S.cell, ...S.compCell, fontWeight: 700 }}>{pf4(row.Vm)}</td>
                <td style={{ ...S.cell, ...S.compCell }}>{pf4(row.Vm055)}</td>
                <td style={{ ...S.cell, background: condBg(row.verificacion), color: condClr(row.verificacion), fontSize: 9, fontFamily: 'var(--mono)', fontWeight: 700 }}>{row.verificacion}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#1f4e79' }}>
              <td colSpan={10} style={{ ...S.cell, color: '#cce0ff', fontFamily: 'var(--cond)', fontWeight: 700, textAlign: 'right', fontSize: 9 }}>
                ΣVmi (ton) →
              </td>
              <td style={{ ...S.cell, ...S.compCell, fontWeight: 700 }}>{pf4(vmResult.sumVm)}</td>
              <td colSpan={2}></td>
            </tr>
            <tr style={{ background: 'rgba(30,50,80,0.5)' }}>
              <td colSpan={10} style={{ ...S.cell, color: '#cce0ff', fontFamily: 'var(--cond)', fontWeight: 700, textAlign: 'right', fontSize: 9 }}>
                ΣVEi — Cortante sísmico total (ton) →
              </td>
              <td colSpan={2} style={{ ...S.cell, ...S.inputCell, padding: 0 }}>
                <input style={S.tableInput} value={vmEi} onChange={e => setVmEi(e.target.value)} placeholder="ingresar" />
              </td>
              <td style={{ ...S.cell, background: condBg(verifArt === true ? 'CUMPLE' : verifArt === false ? 'NO CUMPLE' : '—'), color: condClr(verifArt === true ? 'CUMPLE' : verifArt === false ? 'NO CUMPLE' : '—'), fontSize: 9, fontFamily: 'var(--mono)', fontWeight: 700 }}>
                {verifArt === true ? 'CUMPLE' : verifArt === false ? 'NO CUMPLE' : '—'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Verificación grande ΣVmi ≥ ΣVEi ───────────────────────────────── */}
      {verifArt !== null && (
        <div style={{ marginTop: 14 }}>
          <VerifCard
            ok={verifArt}
            mainText={verifArt ? 'ΣVmi ≥ ΣVEi — Resistencia global suficiente' : 'ΣVmi < ΣVEi — Resistencia global insuficiente'}
            detail={`ΣVm = ${pf4(vmResult.sumVm)} ton  |  ΣVEi = ${pf(parseFloat(vmEi), 4)} ton  (Art. 26.4)`}
          />
        </div>
      )}

      {/* ── Semáforo por muro ─────────────────────────────────────────────── */}
      {vmResult.resultados.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {vmResult.resultados.map((r, i) => (
            <span key={i} style={{
              padding: '3px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700,
              background: r.verificacion === 'NO SE FISURA' ? 'rgba(46,125,50,0.2)' : 'rgba(198,40,40,0.2)',
              color: r.verificacion === 'NO SE FISURA' ? '#69f0ae' : '#ff5252',
              border: '1px solid ' + (r.verificacion === 'NO SE FISURA' ? 'rgba(46,125,50,0.4)' : 'rgba(198,40,40,0.4)'),
              fontFamily: 'var(--mono)',
            }}>
              {r.nombre}: {r.verificacion} ({((r.Ve / (r.Vm055 || 1)) * 100).toFixed(0)}%)
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Esfuerzo Axial Table ──────────────────────────────────────────────────────
function EsfAxialTable({ simoRows, gravRows, props, fm, h, dispatch, dir }) {
  const result = useMemo(() => {
    const muros = props.map((p, i) => {
      const gRow = gravRows[i] || {}
      const sRow = simoRows[i] || {}
      const Pm   = ((parseFloat(gRow.p) || 0) + (parseFloat(sRow.p) || 0) * 0.25) / 1000  // kgf → ton
      return {
        nombre: p.pier || sRow.pier || String(i + 1),
        Pm,
        L: parseFloat(p.L) || 0,
        t: parseFloat(p.t) || 0,
      }
    }).filter(m => m.L > 0 && m.t > 0)
    return calcularEsfuerzoAxial(muros, parseFloat(fm) || 65, parseFloat(h) || 2.6)
  }, [simoRows, gravRows, props, fm, h])

  const todoCumple = result.resultados.length > 0 && result.resultados.every(r => r.cumpleFa)

  const hdrs = ['Pier', 'L (m)', 't (m)', 'Pm (ton)', 'σm (kg/cm²)', 'Fa (kg/cm²)', '0.15·f\'m', '0.05·f\'m', 'Verificación']

  return (
    <div style={{ marginBottom: 16 }}>

      {/* ── Fórmulas ─────────────────────────────────────────────────────── */}
      <FormulaBox
        title="Esfuerzo axial máximo (Art. 19.1b)"
        lines={[
          'σm = Pm / (L · t)   [kg/cm²]   donde Pm = Pgrav + 0.25·Psismo',
          'Fa = 0.2·f\'m · [1 − (h / 35t)²]',
          'Verificación:  σm ≤ Fa  →  MURO CORRECTO',
          'Límites:  σm ≤ 0.15·f\'m  y  σm ≤ 0.05·f\'m  (según zona)',
        ]}
      />

      <ParamGrid cols={2}>
        <PF label="Resistencia de la albañilería f'm (kg/cm²)" value={fm} onChange={v => dispatch({ type: 'SET_MUR_PARAM', dir, field: 'fm', value: v })} />
        <PF label="Altura libre de entrepiso h (m)" value={h}  onChange={v => dispatch({ type: 'SET_MUR_PARAM', dir, field: 'h',  value: v })} />
      </ParamGrid>

      <div style={{ overflowX: 'auto', resize: 'both', minHeight: 60, border: '1px solid var(--border)', borderRadius: 'var(--r2)', marginBottom: 12 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <ResizableTh style={{ ...S.headerCell, width: 28, fontSize: 8 }}>#</ResizableTh>
              {hdrs.map((h2, i) => <ResizableTh key={i} style={{ ...S.headerCell, width: 80 }}>{h2}</ResizableTh>)}
            </tr>
          </thead>
          <tbody>
            {result.resultados.map((row, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                <td style={{ ...S.cell, color: 'var(--text3)', fontSize: 9 }}>{idx + 1}</td>
                <td style={{ ...S.cell, ...S.compCell }}>{row.nombre}</td>
                <td style={{ ...S.cell, ...S.compCell }}>{pf(row.L, 2)}</td>
                <td style={{ ...S.cell, ...S.compCell }}>{pf(row.t, 2)}</td>
                <td style={{ ...S.cell, ...S.compCell }}>{pf(row.Pm, 4)}</td>
                <td style={{ ...S.cell, ...S.compCell }}>{pf(row.sigma_m, 4)}</td>
                <td style={{ ...S.cell, ...S.compCell }}>{pf(row.Fa, 4)}</td>
                <td style={{ ...S.cell, ...S.compCell }}>{pf(row.fm015, 3)}</td>
                <td style={{ ...S.cell, ...S.compCell }}>{pf(row.fm005, 3)}</td>
                <td style={{ ...S.cell, background: condBg(row.cumpleFa ? 'CUMPLE' : 'NO CUMPLE'), color: condClr(row.cumpleFa ? 'CUMPLE' : 'NO CUMPLE'), fontSize: 8, fontFamily: 'var(--mono)', fontWeight: 700 }}>{row.verificacion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Verificación grande ───────────────────────────────────────────── */}
      {result.resultados.length > 0 && (
        <VerifCard
          ok={todoCumple}
          mainText={todoCumple ? 'σm ≤ Fa — Todos los muros dentro del límite axial' : 'Hay muros que exceden el esfuerzo axial admisible Fa'}
          detail={`${result.resultados.filter(r => r.cumpleFa).length} de ${result.resultados.length} muros cumplen σm ≤ Fa  (Art. 19.1b)`}
        />
      )}
    </div>
  )
}

// ── Densidad Dir Table ────────────────────────────────────────────────────────
function DensidadDir({ muros, dispatch, dirKey, label }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: 'var(--text1)', fontFamily: 'var(--cond)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>
        Muros Dir {label}
      </div>
      <div style={{ overflowX: 'auto', resize: 'both', minHeight: 60, border: '1px solid var(--border)', borderRadius: 'var(--r2)' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <ResizableTh style={{ ...S.headerCell, width: 28, fontSize: 8 }}>#</ResizableTh>
              <ResizableTh style={{ ...S.headerCell, width: 70 }}>Muro</ResizableTh>
              <ResizableTh style={{ ...S.headerCell, width: 64 }}>L (m)</ResizableTh>
              <ResizableTh style={{ ...S.headerCell, width: 64 }}>t (m)</ResizableTh>
              <ResizableTh style={{ ...S.headerCell, width: 72 }}>L×t (m²)</ResizableTh>
              <ResizableTh style={{ ...S.headerCell, width: 88 }}>Tipo</ResizableTh>
              <ResizableTh style={{ ...S.headerCell, width: 72 }}>Ec (kg/cm²)</ResizableTh>
              <ResizableTh style={{ ...S.headerCell, width: 72 }}>Em (kg/cm²)</ResizableTh>
              <ResizableTh style={{ ...S.headerCell, width: 88 }}>L×t equiv</ResizableTh>
            </tr>
          </thead>
          <tbody>
            {muros.map((m, idx) => {
              const L  = parseFloat(m.L) || 0
              const t  = parseFloat(m.t) || 0
              const Lt = L * t
              const Ec = parseFloat(m.Ec) || 0
              const Em = parseFloat(m.Em) || 0
              const ke = m.esPlacaCA && Ec && Em > 0 ? Ec / Em : 1
              return (
                <tr key={idx} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  <td style={{ ...S.cell, color: 'var(--text3)', fontSize: 9 }}>{idx + 1}</td>
                  {['nombre', 'L', 't'].map(f => (
                    <td key={f} style={{ ...S.cell, ...S.inputCell, padding: 0 }}>
                      <input style={S.tableInput} value={m[f]}
                        onChange={e => dispatch({ type: 'SET_DENS_MURO', dir: dirKey, idx, field: f, value: e.target.value })} />
                    </td>
                  ))}
                  <td style={{ ...S.cell, ...S.compCell }}>{Lt > 0 ? pf(Lt, 4) : '—'}</td>
                  <td style={{ ...S.cell, ...S.inputCell, padding: '2px 4px' }}>
                    <select style={{ ...S.paramSelect, fontSize: 9, padding: '2px 4px' }}
                      value={m.esPlacaCA ? 'placa' : 'alba'}
                      onChange={e => dispatch({ type: 'SET_DENS_MURO', dir: dirKey, idx, field: 'esPlacaCA', value: e.target.value === 'placa' })}>
                      <option value="alba">Albañilería</option>
                      <option value="placa">Placa CA</option>
                    </select>
                  </td>
                  {['Ec', 'Em'].map(f => (
                    <td key={f} style={{ ...S.cell, ...(m.esPlacaCA ? S.inputCell : {}), padding: m.esPlacaCA ? 0 : undefined }}>
                      {m.esPlacaCA
                        ? <input style={S.tableInput} value={m[f]}
                            onChange={e => dispatch({ type: 'SET_DENS_MURO', dir: dirKey, idx, field: f, value: e.target.value })} />
                        : <span style={{ color: 'var(--text3)', fontSize: 9 }}>—</span>
                      }
                    </td>
                  ))}
                  <td style={{ ...S.cell, ...S.compCell, fontWeight: 700 }}>
                    {Lt > 0 ? pf(Lt * ke, 4) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function AlbanileriaE070({ onBack }) {
  const [state, dispatch] = useReducer(reducer, null, initState)
  const [vmEiX, setVmEiX] = useState('')
  const [vmEiY, setVmEiY] = useState('')
  const [tab, setTab] = useState('MUROS X')
  const [copiado, setCopiado] = useState(false)
  const { murosX, murosY, densidad, columnas, vigas, ortogonales } = state

  // ── Densidad calc ─────────────────────────────────────────────────────────
  const densCalc = useMemo(() => {
    const mX = densidad.murosX.filter(m => parseFloat(m.L) > 0 && parseFloat(m.t) > 0).map(m => ({
      nombre: m.nombre, L: parseFloat(m.L), t: parseFloat(m.t),
      esPlacaCA: m.esPlacaCA, Ec: parseFloat(m.Ec) || 0, Em: parseFloat(m.Em) || 0,
    }))
    const mY = densidad.murosY.filter(m => parseFloat(m.L) > 0 && parseFloat(m.t) > 0).map(m => ({
      nombre: m.nombre, L: parseFloat(m.L), t: parseFloat(m.t),
      esPlacaCA: m.esPlacaCA, Ec: parseFloat(m.Ec) || 0, Em: parseFloat(m.Em) || 0,
    }))
    return calcularDensidadMuros(
      mX, mY,
      parseFloat(densidad.N)  || 3,
      parseFloat(densidad.Ap) || 160,
      parseFloat(densidad.Z)  || 0.45,
      parseFloat(densidad.U)  || 1,
      parseFloat(densidad.S)  || 1,
    )
  }, [densidad])

  // ── Columnas calc ─────────────────────────────────────────────────────────
  const colCalc = useMemo(() => {
    const c = columnas
    return calcularColumnasConfinamiento({
      Mu1: parseFloat(c.Mu1) || 0,
      Vm1: parseFloat(c.Vm1) || 0,
      h:   parseFloat(c.h)   || 2.6,
      L:   parseFloat(c.L)   || 3.5,
      Lm:  parseFloat(c.Lm)  || 1.75,
      Nc:  parseFloat(c.Nc)  || 2,
      Pg:  parseFloat(c.Pg)  || 0,
      fc:  parseFloat(c.fc)  || 175,
      fy:  parseFloat(c.fy)  || 4200,
      phi_c: parseFloat(c.phi_c) || 0.70,
      phi_f: parseFloat(c.phi_f) || 0.85,
      mu_f:  parseFloat(c.mu_f)  || 0.80,
      bc:    parseFloat(c.bc)    || 0.13,
      dc:    parseFloat(c.dc)    || 0.30,
      db_estribo:    parseFloat(c.db_estribo)    || 8,
      recubrimiento: parseFloat(c.recubrimiento) || 4,
    })
  }, [columnas])

  // ── Vigas calc ────────────────────────────────────────────────────────────
  const vigaCalc = useMemo(() => {
    const v = vigas
    return calcularVigaSolera(
      parseFloat(v.Vm1) || 0,
      parseFloat(v.Lm)  || 0,
      parseFloat(v.L)   || 1,
      parseFloat(v.phi) || 0.85,
      parseFloat(v.fc)  || 175,
      parseFloat(v.fy)  || 4200,
      parseFloat(v.Acs) || 150,
    )
  }, [vigas])

  // ── Cargas ortogonales calc ───────────────────────────────────────────────
  const ortCalc = useMemo(() => {
    const o = ortogonales
    const mVal = parseFloat(o.m) || undefined
    return calcularCargasOrtogonales(
      parseFloat(o.Z)     || 0.45,
      parseFloat(o.U)     || 1,
      parseFloat(o.C1)    || 2,
      parseFloat(o.gamma) || 1.8,
      parseFloat(o.e)     || 0.15,
      o.caso   || 'caso4',
      parseFloat(o.ba)    || 1,
      mVal,
      parseFloat(o.a)     || 2.6,
      parseFloat(o.tEff)  || 0.13,
      parseFloat(o.ft)    || 1.5,
    )
  }, [ortogonales])

  // ── Cargar Ejemplo ────────────────────────────────────────────────────────
  const handleCargarEjemplo = () => {
    dispatch({ type: 'LOAD_EXAMPLE' })
    setVmEiX('35.5')
    setVmEiY('28.8')
  }

  // ── Copiar Resultados ─────────────────────────────────────────────────────
  const handleCopiarResultados = () => {
    const p = (v, d = 2) => (v === '' || v == null || isNaN(Number(v))) ? '—' : Number(v).toFixed(d)

    // Vm Dir X
    const vmResX = (() => {
      const muros = murosX.props.map((pr, i) => {
        const sRow = murosX.sismo[i] || {}
        const gRow = murosX.grav[i] || {}
        return {
          nombre: sRow.pier || pr.pier || String(i + 1),
          v2: parseFloat(sRow.v2) / 1000 || 0,
          m3: parseFloat(sRow.m3) / 1000 || 0,
          pg: (parseFloat(gRow.p) || 0) / 1000,
          t: parseFloat(pr.t) || 0,
          L: parseFloat(pr.L) || 0,
          vm_prima: parseFloat(pr.vm) || 0,
        }
      }).filter(m => m.t > 0 && m.L > 0 && m.vm_prima > 0)
      return calcularVm(muros)
    })()

    // Vm Dir Y
    const vmResY = (() => {
      const muros = murosY.props.map((pr, i) => {
        const sRow = murosY.sismo[i] || {}
        const gRow = murosY.grav[i] || {}
        return {
          nombre: sRow.pier || pr.pier || String(i + 1),
          v2: parseFloat(sRow.v2) / 1000 || 0,
          m3: parseFloat(sRow.m3) / 1000 || 0,
          pg: (parseFloat(gRow.p) || 0) / 1000,
          t: parseFloat(pr.t) || 0,
          L: parseFloat(pr.L) || 0,
          vm_prima: parseFloat(pr.vm) || 0,
        }
      }).filter(m => m.t > 0 && m.L > 0 && m.vm_prima > 0)
      return calcularVm(muros)
    })()

    const densCalcLocal = (() => {
      const mX = densidad.murosX.filter(m => parseFloat(m.L) > 0 && parseFloat(m.t) > 0).map(m => ({
        nombre: m.nombre, L: parseFloat(m.L), t: parseFloat(m.t),
        esPlacaCA: m.esPlacaCA, Ec: parseFloat(m.Ec) || 0, Em: parseFloat(m.Em) || 0,
      }))
      const mY = densidad.murosY.filter(m => parseFloat(m.L) > 0 && parseFloat(m.t) > 0).map(m => ({
        nombre: m.nombre, L: parseFloat(m.L), t: parseFloat(m.t),
        esPlacaCA: m.esPlacaCA, Ec: parseFloat(m.Ec) || 0, Em: parseFloat(m.Em) || 0,
      }))
      return calcularDensidadMuros(mX, mY,
        parseFloat(densidad.N) || 3, parseFloat(densidad.Ap) || 160,
        parseFloat(densidad.Z) || 0.45, parseFloat(densidad.U) || 1, parseFloat(densidad.S) || 1)
    })()

    const colCalcLocal = calcularColumnasConfinamiento({
      Mu1: parseFloat(columnas.Mu1) || 0, Vm1: parseFloat(columnas.Vm1) || 0,
      h: parseFloat(columnas.h) || 2.6, L: parseFloat(columnas.L) || 3.5,
      Lm: parseFloat(columnas.Lm) || 1.75, Nc: parseFloat(columnas.Nc) || 2,
      Pg: parseFloat(columnas.Pg) || 0, fc: parseFloat(columnas.fc) || 175,
      fy: parseFloat(columnas.fy) || 4200, phi_c: parseFloat(columnas.phi_c) || 0.70,
      phi_f: parseFloat(columnas.phi_f) || 0.85, mu_f: parseFloat(columnas.mu_f) || 0.80,
      bc: parseFloat(columnas.bc) || 0.13, dc: parseFloat(columnas.dc) || 0.30,
      db_estribo: parseFloat(columnas.db_estribo) || 8,
      recubrimiento: parseFloat(columnas.recubrimiento) || 4,
    })

    const lineas = [
      'ALBAÑILERÍA CONFINADA — NTP E.070',
      '==================================',
      '',
      'RESISTENCIA AL AGRIETAMIENTO — Dir X-X',
      `  ΣVm = ${p(vmResX.sumVm, 4)} ton | muros analizados: ${vmResX.resultados.length}`,
      ...vmResX.resultados.map(r => `  ${r.nombre}: Vm = ${p(r.Vm, 4)} ton (${r.verificacion})`),
      '',
      'RESISTENCIA AL AGRIETAMIENTO — Dir Y-Y',
      `  ΣVm = ${p(vmResY.sumVm, 4)} ton | muros analizados: ${vmResY.resultados.length}`,
      ...vmResY.resultados.map(r => `  ${r.nombre}: Vm = ${p(r.Vm, 4)} ton (${r.verificacion})`),
      '',
      'DENSIDAD MÍNIMA DE MUROS',
      `  Densidad requerida = ${p(densCalcLocal.densidadReq, 6)}`,
      `  Dir X-X: densidad = ${p(densCalcLocal.resultadoX?.densidad, 6)} → ${densCalcLocal.resultadoX?.cumple ? 'CUMPLE' : 'NO CUMPLE'}`,
      `  Dir Y-Y: densidad = ${p(densCalcLocal.resultadoY?.densidad, 6)} → ${densCalcLocal.resultadoY?.cumple ? 'CUMPLE' : 'NO CUMPLE'}`,
      '',
      'COLUMNAS DE CONFINAMIENTO',
      `  Ac = ${p(colCalcLocal.Ac)} cm² | An ext = ${p(colCalcLocal.An_ext, 3)} cm² → ${colCalcLocal.Ac != null ? (colCalcLocal.Ac >= colCalcLocal.An_ext ? 'CUMPLE' : 'NO CUMPLE') : '—'}`,
      `  As tracción = ${p(colCalcLocal.As_traccion, 3)} cm² | As req = ${p(colCalcLocal.As, 3)} cm²`,
      `  s conf. adoptado = ${p(colCalcLocal.s_conf_adoptado, 1)} cm | s central = ${p(colCalcLocal.s_central_adoptado, 1)} cm`,
    ]

    navigator.clipboard.writeText(lineas.join('\n')).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }

  // ═══════════════════════════════════════════════════════════════════════════
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
            E.070 — Albañilería Confinada
          </div>
          <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--sans)', marginTop: 1 }}>
            Verificación de muros, densidad, columnas y vigas de confinamiento
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={handleCargarEjemplo} style={{
          padding: '5px 12px', fontSize: 10, fontFamily: 'var(--cond)',
          fontWeight: 600, borderRadius: 'var(--r)',
          border: '1px solid rgba(255,193,7,0.4)',
          background: 'rgba(255,193,7,0.12)', color: '#ffc107',
          cursor: 'pointer', letterSpacing: '.3px',
        }}>
          Cargar Ejemplo
        </button>
        <button onClick={handleCopiarResultados} style={{
          padding: '5px 12px', fontSize: 10, fontFamily: 'var(--cond)',
          fontWeight: 600, borderRadius: 'var(--r)',
          border: '1px solid rgba(79,195,247,0.4)',
          background: 'rgba(79,195,247,0.12)', color: '#64b5f6',
          cursor: 'pointer', letterSpacing: '.3px',
        }}>
          {copiado ? 'Copiado!' : 'Copiar Resultados'}
        </button>
        <span style={S.badge('#1f4e79', '#90caf9')}>RNE E.070</span>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, padding: '6px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', overflowX: 'auto', flexShrink: 0 }}>
        {['MUROS X', 'MUROS Y', 'DENSIDAD', 'COLUMNAS', 'SOLERAS', 'CARGAS ORT.', 'TABLAS'].map(t => (
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

        {/* ══ 1. Muros Dir X-X ══════════════════════════════════════════════ */}
        {tab === 'MUROS X' && <>
          <EtabsTable rows={murosX.sismo} dispatch={dispatch} dir="murosX" tbl="sismo"
            title="A. Fuerzas por Sismo (EQXDESP) — R=3" />
          <EtabsTable rows={murosX.grav} dispatch={dispatch} dir="murosX" tbl="grav"
            title="B. Cargas Gravitacionales" />
          <VmTable
            simoRows={murosX.sismo} gravRows={murosX.grav}
            props={murosX.props} dispatch={dispatch} dir="murosX"
            vmEi={vmEiX} setVmEi={setVmEiX}
          />
          <EsfAxialTable
            simoRows={murosX.sismo} gravRows={murosX.grav}
            props={murosX.props} fm={murosX.fm} h={murosX.h}
            dispatch={dispatch} dir="murosX"
          />
        </>}

        {/* ══ 2. Muros Dir Y-Y ══════════════════════════════════════════════ */}
        {tab === 'MUROS Y' && <>
          <EtabsTable rows={murosY.sismo} dispatch={dispatch} dir="murosY" tbl="sismo"
            title="A. Fuerzas por Sismo (EQYDESP) — R=3" />
          <EtabsTable rows={murosY.grav} dispatch={dispatch} dir="murosY" tbl="grav"
            title="B. Cargas Gravitacionales" />
          <VmTable
            simoRows={murosY.sismo} gravRows={murosY.grav}
            props={murosY.props} dispatch={dispatch} dir="murosY"
            vmEi={vmEiY} setVmEi={setVmEiY}
          />
          <EsfAxialTable
            simoRows={murosY.sismo} gravRows={murosY.grav}
            props={murosY.props} fm={murosY.fm} h={murosY.h}
            dispatch={dispatch} dir="murosY"
          />
        </>}

        {/* ══ 3. Densidad Mínima ════════════════════════════════════════════ */}
        {tab === 'DENSIDAD' && <>

          <FormulaBox
            title="Densidad mínima de muros portantes (Art. 19.2)"
            lines={[
              'Densidad requerida:  Σ(L·t) / Ap  ≥  Z·U·S·N / 56',
              'Σ(L·t) = suma de áreas de sección transversal de muros en la dirección',
              'Para muros de CA mezclados:  L·t equiv = L·t·(Ec / Em)',
              'Ap = área de planta techada (m²)',
            ]}
          />

          <ParamGrid cols={5}>
            <PF label="Número de pisos N" value={densidad.N}  onChange={v => dispatch({ type: 'SET_DENSIDAD', field: 'N',  value: v })} min={1} />
            <PF label="Área de planta Ap (m²)"  value={densidad.Ap} onChange={v => dispatch({ type: 'SET_DENSIDAD', field: 'Ap', value: v })} />
            <PF label="Factor de zona Z"        value={densidad.Z}  onChange={v => dispatch({ type: 'SET_DENSIDAD', field: 'Z',  value: v })} step="0.05" />
            <PF label="Factor de uso U"        value={densidad.U}  onChange={v => dispatch({ type: 'SET_DENSIDAD', field: 'U',  value: v })} step="0.05" />
            <PF label="Factor de suelo S"        value={densidad.S}  onChange={v => dispatch({ type: 'SET_DENSIDAD', field: 'S',  value: v })} step="0.05" />
          </ParamGrid>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <DensidadDir muros={densidad.murosX} dispatch={dispatch} dirKey="murosX" label="X-X" />
            <DensidadDir muros={densidad.murosY} dispatch={dispatch} dirKey="murosY" label="Y-Y" />
          </div>

          {/* Resultados con verificaciones grandes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
            {[
              { label: 'Dirección X-X', res: densCalc.resultadoX },
              { label: 'Dirección Y-Y', res: densCalc.resultadoY },
            ].map(({ label, res }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={S.resultBox}>
                  <div style={{ fontSize: 10, color: '#90caf9', fontFamily: 'var(--cond)', fontWeight: 700, marginBottom: 8 }}>{label}</div>
                  <ResultRow label="Σ(L·t) equiv" value={pf(res?.sumaLt, 4)} unit="m²" />
                  <ResultRow label="Densidad existente  Σ(L·t)/Ap" value={pf(res?.densidad, 6)} />
                  <ResultRow label="Densidad requerida  Z·U·S·N/56" value={pf(densCalc.densidadReq, 6)} />
                </div>
                <VerifCard
                  ok={res?.densidad != null ? res.cumple : undefined}
                  mainText={res?.densidad != null
                    ? (res.cumple ? `${label} — Densidad suficiente` : `${label} — Densidad insuficiente`)
                    : `${label} — Sin datos`}
                  detail={res?.densidad != null
                    ? `Existente = ${pf(res.densidad, 6)}  ≥  Requerida = ${pf(densCalc.densidadReq, 6)}  ?  →  ${res.cumple ? 'SÍ' : 'NO'}`
                    : undefined}
                />
              </div>
            ))}
          </div>
        </>}

        {/* ══ 4. Columnas de Confinamiento ══════════════════════════════════ */}
        {tab === 'COLUMNAS' && <>

          <FormulaBox
            title="Columnas de confinamiento — Tabla 11 (Art. 27)"
            lines={[
              'Vc  = 1.5·Vm1·Lm / (L·Nc)          [Cortante en cada columna]',
              'M   = Mu1 − 0.5·Vm1·h               [Momento intermedio]',
              'T   = |M / L|                        [Tracción col. extrema e interior]',
              'C   = |M / L|  (ext)  /  Pg  (int)  [Compresión]',
              'An  = C / (φc·0.85·f\'c)             [Área neta requerida por compresión]',
              'Acf = T / (φf·μf·f\'c·bc)            [Sección CA por corte-fricción]',
              'As  = max(T/φfy,  Avf)              [Acero vertical requerido]',
            ]}
          />

          <ParamGrid cols={4}>
            <PF label="Momento del muro Mu1 (ton·m)" value={columnas.Mu1} onChange={v => dispatch({ type: 'SET_COL', field: 'Mu1', value: v })} />
            <PF label="Cortante del muro Vm1 (ton)"  value={columnas.Vm1} onChange={v => dispatch({ type: 'SET_COL', field: 'Vm1', value: v })} />
            <PF label="Altura de entrepiso h (m)"   value={columnas.h}   onChange={v => dispatch({ type: 'SET_COL', field: 'h',   value: v })} />
            <PF label="Longitud total del muro L (m)"      value={columnas.L}   onChange={v => dispatch({ type: 'SET_COL', field: 'L',   value: v })} />
            <PF label="Longitud del paño Lm (m)"     value={columnas.Lm}  onChange={v => dispatch({ type: 'SET_COL', field: 'Lm',  value: v })} />
            <PF label="Número de columnas Nc"            value={columnas.Nc}  onChange={v => dispatch({ type: 'SET_COL', field: 'Nc',  value: v })} min={1} />
            <PF label="Carga gravitacional columna Pg (ton)"  value={columnas.Pg}  onChange={v => dispatch({ type: 'SET_COL', field: 'Pg',  value: v })} />
            <PF label="Resistencia del concreto f'c (kg/cm²)"               value={columnas.fc}  onChange={v => dispatch({ type: 'SET_COL', field: 'fc',  value: v })} />
          </ParamGrid>
          <ParamGrid cols={4}>
            <PF label="Resistencia del acero fy (kg/cm²)"                 value={columnas.fy}    onChange={v => dispatch({ type: 'SET_COL', field: 'fy',    value: v })} />
            <PF label="Factor de reducción compresión φc"      value={columnas.phi_c} onChange={v => dispatch({ type: 'SET_COL', field: 'phi_c', value: v })} step="0.05" />
            <PF label="Factor de reducción fricción φf"        value={columnas.phi_f} onChange={v => dispatch({ type: 'SET_COL', field: 'phi_f', value: v })} step="0.05" />
            <PF label="Coef. de fricción μf"         value={columnas.mu_f}  onChange={v => dispatch({ type: 'SET_COL', field: 'mu_f',  value: v })} step="0.05" />
            <PF label="Ancho de columna bc (m)"         value={columnas.bc}    onChange={v => dispatch({ type: 'SET_COL', field: 'bc',    value: v })} />
            <PF label="Peralte de columna dc (m)"       value={columnas.dc}    onChange={v => dispatch({ type: 'SET_COL', field: 'dc',    value: v })} />
            <PF label="Diámetro de estribo db (mm)"             value={columnas.db_estribo}    onChange={v => dispatch({ type: 'SET_COL', field: 'db_estribo',    value: v })} />
            <PF label="Recubrimiento (cm)"          value={columnas.recubrimiento} onChange={v => dispatch({ type: 'SET_COL', field: 'recubrimiento', value: v })} />
          </ParamGrid>

          {/* Tabla 11: Fuerzas internas */}
          <div style={{ fontSize: 10, color: 'var(--text2)', fontFamily: 'var(--cond)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6, marginTop: 4 }}>
            Tabla 11 — Fuerzas internas en columnas de confinamiento
          </div>
          <div style={{ overflowX: 'auto', resize: 'both', minHeight: 60, border: '1px solid var(--border)', borderRadius: 'var(--r2)', marginBottom: 14 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <ResizableTh style={{ ...S.headerCell, width: 200 }}>Fuerza interna</ResizableTh>
                  <ResizableTh style={{ ...S.headerCell, width: 130 }}>Col. Extrema</ResizableTh>
                  <ResizableTh style={{ ...S.headerCell, width: 130 }}>Col. Interior</ResizableTh>
                  <ResizableTh style={{ ...S.headerCell, width: 200 }}>Expresión</ResizableTh>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Vc — Cortante (ton)',     ext: pf(colCalc.Vc_ext, 4),  int: pf(colCalc.Vc_int, 4),  formula: '1.5·Vm1·Lm / (L·Nc)' },
                  { label: 'T — Tracción (ton)',      ext: pf(colCalc.T_ext, 4),   int: pf(colCalc.T_int, 4),   formula: '|M / L|' },
                  { label: 'C — Compresión (ton)',    ext: pf(colCalc.C_ext, 4),   int: pf(colCalc.C_int, 4),   formula: 'Ext: |M/L|  /  Int: Pg' },
                  { label: 'M — Momento intermedio', ext: pf(colCalc.M, 4),        int: '—',                    formula: 'Mu1 − 0.5·Vm1·h' },
                ].map((r, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                    <td style={{ ...S.cell, textAlign: 'left', color: 'var(--text1)', fontFamily: 'var(--cond)' }}>{r.label}</td>
                    <td style={{ ...S.cell, ...S.compCell, fontWeight: 700 }}>{r.ext}</td>
                    <td style={{ ...S.cell, ...S.compCell, fontWeight: 700 }}>{r.int}</td>
                    <td style={{ ...S.cell, color: 'var(--text3)', fontSize: 9, fontFamily: 'var(--mono)', textAlign: 'left' }}>{r.formula}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Resultados de diseño */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div style={S.resultBox}>
              <div style={{ fontSize: 10, color: '#90caf9', fontFamily: 'var(--cond)', fontWeight: 700, marginBottom: 6 }}>Área por compresión</div>
              <ResultRow label="Ac = bc × dc" value={pf(colCalc.Ac, 2)} unit="cm²" />
              <ResultRow label="An ext = Pc/(φc·0.85·f'c)" value={pf(colCalc.An_ext, 3)} unit="cm²"
                ok={colCalc.Ac != null && colCalc.An_ext != null ? colCalc.Ac >= colCalc.An_ext : undefined} />
              <ResultRow label="An int" value={pf(colCalc.An_int, 3)} unit="cm²"
                ok={colCalc.Ac != null && colCalc.An_int != null ? colCalc.Ac >= colCalc.An_int : undefined} />
            </div>
            <div style={S.resultBox}>
              <div style={{ fontSize: 10, color: '#90caf9', fontFamily: 'var(--cond)', fontWeight: 700, marginBottom: 6 }}>Acero vertical</div>
              <ResultRow label="As tracción = T / (φ·fy)" value={pf(colCalc.As_traccion, 3)} unit="cm²" />
              <ResultRow label="Avf ext (corte-fricción)" value={pf(colCalc.Avf_ext, 3)} unit="cm²" />
              <ResultRow label="As requerido = max(As_t, Avf)" value={pf(colCalc.As, 3)} unit="cm²" />
              <ResultRow label="Acf ext (sección CA)" value={pf(colCalc.Acf_ext, 2)} unit="cm²" />
            </div>
            <div style={S.resultBox}>
              <div style={{ fontSize: 10, color: '#90caf9', fontFamily: 'var(--cond)', fontWeight: 700, marginBottom: 6 }}>Estribos (separación)</div>
              <ResultRow label="s1 — confinamiento" value={pf(colCalc.s1, 2)} unit="cm" />
              <ResultRow label="s2 — cortante" value={pf(colCalc.s2, 2)} unit="cm" />
              <ResultRow label="s3 — d/4 ó 10 cm" value={pf(colCalc.s3, 2)} unit="cm" />
              <ResultRow label="s4 — zona central" value={pf(colCalc.s4, 2)} unit="cm" />
              <ResultRow label="s adoptado (zona conf.)" value={pf(colCalc.s_conf_adoptado, 1)} unit="cm" />
              <ResultRow label="s adoptado (zona central)" value={pf(colCalc.s_central_adoptado, 1)} unit="cm" />
            </div>
          </div>

          {/* Verificación grande Ac ≥ An */}
          {colCalc.Ac != null && colCalc.An_ext != null && (
            <div style={{ marginTop: 14 }}>
              <VerifCard
                ok={colCalc.Ac >= colCalc.An_ext}
                mainText={colCalc.Ac >= colCalc.An_ext
                  ? 'Ac ≥ An — Sección de columna suficiente'
                  : 'Ac < An — Aumentar sección de columna'}
                detail={`Ac = ${pf(colCalc.Ac, 2)} cm²  |  An ext = ${pf(colCalc.An_ext, 3)} cm²  (Art. 27.2)`}
              />
            </div>
          )}

          {/* ── Sección sugerida ─────────────────────────────────────────────── */}
          {colCalc.Ac != null && (() => {
            const Ac = colCalc.Ac || 195
            const dim = Ac <= 195 ? '15 × 13' : Ac <= 300 ? '15 × 20' : Ac <= 400 ? '20 × 20' : '25 × 20'
            return (
              <div style={{ marginTop: 14 }}>
                <SummaryCard value={dim} unit="cm" label="Sección sugerida de columna" note={`Ac mín requerida = ${pf(colCalc.Ac, 1)} cm²`} />
              </div>
            )
          })()}

          {/* ── Tabla de barras sugeridas para refuerzo vertical ─────────────── */}
          {colCalc.As != null && (() => {
            const AsReq = colCalc.As || 0
            const opciones = [
              { label: '4φ8mm',  barras: '4×0.50', As: 4 * 0.50 },
              { label: '4φ3/8"', barras: '4×0.71', As: 4 * 0.71 },
              { label: '4φ1/2"', barras: '4×1.27', As: 4 * 1.27 },
              { label: '4φ5/8"', barras: '4×1.98', As: 4 * 1.98 },
            ]
            const primerOk = opciones.findIndex(o => o.As >= AsReq && o.As >= 2.01)
            return (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 10, color: 'var(--text2)', fontFamily: 'var(--cond)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>
                  Opciones de refuerzo vertical — As req = {pf(AsReq, 3)} cm²
                </div>
                <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--r2)', maxWidth: 520 }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
                    <thead>
                      <tr>
                        <ResizableTh style={{ ...S.headerCell, width: 90 }}>Opción</ResizableTh>
                        <ResizableTh style={{ ...S.headerCell, width: 90 }}>Barras</ResizableTh>
                        <ResizableTh style={{ ...S.headerCell, width: 110 }}>As total (cm²)</ResizableTh>
                        <ResizableTh style={{ ...S.headerCell, width: 70 }}>Cumple</ResizableTh>
                      </tr>
                    </thead>
                    <tbody>
                      {opciones.map((op, i) => {
                        const cumple = op.As >= AsReq && op.As >= 2.01
                        const isFirst = i === primerOk
                        return (
                          <tr key={i} style={{
                            background: isFirst ? 'rgba(46,125,50,0.15)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                            border: isFirst ? '1px solid rgba(46,125,50,0.4)' : undefined,
                          }}>
                            <td style={{ ...S.cell, fontFamily: 'var(--mono)', fontWeight: isFirst ? 700 : 400, color: isFirst ? '#69f0ae' : 'var(--text1)' }}>{op.label}</td>
                            <td style={{ ...S.cell, ...S.compCell }}>{op.barras}</td>
                            <td style={{ ...S.cell, ...S.compCell, fontWeight: 700 }}>{op.As.toFixed(2)}</td>
                            <td style={{ ...S.cell, color: cumple ? '#69f0ae' : '#ff5252', fontWeight: 700, fontSize: 12 }}>{cumple ? '✓' : '✗'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })()}

          {/* ── Distribución de estribos ─────────────────────────────────────── */}
          {colCalc.s_conf_adoptado != null && colCalc.s_central_adoptado != null && (() => {
            const dc = parseFloat(columnas.dc) || 0.30
            const zonaConf = Math.max(45, Math.round(1.5 * dc * 100))
            const sConf = colCalc.s_conf_adoptado
            const sCentral = colCalc.s_central_adoptado
            const db = parseFloat(columnas.db_estribo) || 8
            const nConf = sConf > 0 ? Math.round(zonaConf / sConf) : 0
            return (
              <div style={{ background: 'rgba(124,77,255,0.1)', border: '1px solid rgba(124,77,255,0.3)', borderRadius: 12, padding: 16, marginTop: 12 }}>
                <div style={{ fontSize: 11, color: '#b388ff', fontWeight: 700, marginBottom: 6, fontFamily: 'var(--cond)', letterSpacing: '.5px', textTransform: 'uppercase' }}>
                  Distribución de estribos
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 14, color: '#e1bee7', fontWeight: 700 }}>
                  &#9634;{db}mm: 1@5, {nConf}@{pf(sConf, 1)}, r@{pf(sCentral, 1)} cm
                </div>
                <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 6 }}>
                  Zona confinada: {zonaConf} cm desde cada extremo | Zona central: resto
                </div>
              </div>
            )
          })()}
        </>}

        {/* ══ 5. Vigas Soleras ══════════════════════════════════════════════ */}
        {tab === 'SOLERAS' && <>

          <FormulaBox
            title="Viga solera — diseño a tracción pura (Art. 28)"
            lines={[
              'Ts = Vm1 · Lm / (2 · L)            [Tracción en la solera, ton]',
              'As = Ts · 1000 / (φ · fy)          [Acero requerido, cm²]',
              'As_mín = 0.1 · f\'c · Acs / fy      [Acero mínimo por sección]',
              'As adoptado = max(As, As_mín)',
            ]}
          />

          <ParamGrid cols={4}>
            <PF label="Cortante del muro Vm1 (ton)" value={vigas.Vm1} onChange={v => dispatch({ type: 'SET_VIGA', field: 'Vm1', value: v })} />
            <PF label="Longitud del paño Lm (m)"       value={vigas.Lm}  onChange={v => dispatch({ type: 'SET_VIGA', field: 'Lm',  value: v })} />
            <PF label="Longitud total del muro L (m)"     value={vigas.L}   onChange={v => dispatch({ type: 'SET_VIGA', field: 'L',   value: v })} />
            <PF label="Factor de reducción φ"      value={vigas.phi} onChange={v => dispatch({ type: 'SET_VIGA', field: 'phi', value: v })} step="0.05" />
            <PF label="Resistencia del concreto f'c (kg/cm²)"              value={vigas.fc}  onChange={v => dispatch({ type: 'SET_VIGA', field: 'fc',  value: v })} />
            <PF label="Resistencia del acero fy (kg/cm²)"               value={vigas.fy}  onChange={v => dispatch({ type: 'SET_VIGA', field: 'fy',  value: v })} />
            <PF label="Área de sección de solera Acs (cm²)"  value={vigas.Acs} onChange={v => dispatch({ type: 'SET_VIGA', field: 'Acs', value: v })} />
          </ParamGrid>

          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>
            <div style={S.resultBox}>
              <div style={{ fontSize: 10, color: '#90caf9', fontFamily: 'var(--cond)', fontWeight: 700, marginBottom: 8 }}>Resultados</div>
              <ResultRow label="Ts = Vm1·Lm / (2·L)" value={pf(vigaCalc.Ts, 4)} unit="ton" />
              <ResultRow label="As req = Ts·1000 / (φ·fy)" value={pf(vigaCalc.As, 4)} unit="cm²" />
              <ResultRow label="As mín = 0.1·f'c·Acs / fy" value={pf(vigaCalc.As_min, 4)} unit="cm²" />
              <ResultRow label="As adoptado = max(As, As mín)"
                value={pf(vigaCalc.As_adoptado, 4)} unit="cm²"
                ok={vigaCalc.As_adoptado != null && vigaCalc.As != null ? vigaCalc.As_adoptado >= vigaCalc.As : undefined} />
            </div>
            {vigaCalc.As_adoptado != null && (
              <VerifCard
                ok={vigaCalc.As_adoptado >= vigaCalc.As}
                mainText={vigaCalc.As_adoptado >= vigaCalc.As
                  ? 'As adoptado ≥ As req — Solera correcta'
                  : 'As adoptado < As req — Revisar sección'}
                detail={`As adoptado = ${pf(vigaCalc.As_adoptado, 4)} cm²  |  As req = ${pf(vigaCalc.As, 4)} cm²  |  Ts = ${pf(vigaCalc.Ts, 4)} ton`}
              />
            )}
          </div>

          {/* ── Tabla de barras sugeridas para solera ────────────────────────── */}
          {vigaCalc.As_adoptado != null && (() => {
            const AsReq = vigaCalc.As_adoptado || 0
            const opciones = [
              { label: '4φ8mm',  barras: '4×0.50', As: 4 * 0.50 },
              { label: '4φ3/8"', barras: '4×0.71', As: 4 * 0.71 },
              { label: '4φ1/2"', barras: '4×1.27', As: 4 * 1.27 },
            ]
            const primerOk = opciones.findIndex(o => o.As >= AsReq)
            return (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 10, color: 'var(--text2)', fontFamily: 'var(--cond)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>
                  Opciones de refuerzo longitudinal — As adoptado = {pf(AsReq, 4)} cm²
                </div>
                <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--r2)', maxWidth: 420 }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
                    <thead>
                      <tr>
                        <ResizableTh style={{ ...S.headerCell, width: 90 }}>Opción</ResizableTh>
                        <ResizableTh style={{ ...S.headerCell, width: 100 }}>As total (cm²)</ResizableTh>
                        <ResizableTh style={{ ...S.headerCell, width: 70 }}>Cumple</ResizableTh>
                      </tr>
                    </thead>
                    <tbody>
                      {opciones.map((op, i) => {
                        const cumple = op.As >= AsReq
                        const isFirst = i === primerOk
                        return (
                          <tr key={i} style={{
                            background: isFirst ? 'rgba(46,125,50,0.15)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                          }}>
                            <td style={{ ...S.cell, fontFamily: 'var(--mono)', fontWeight: isFirst ? 700 : 400, color: isFirst ? '#69f0ae' : 'var(--text1)' }}>{op.label}</td>
                            <td style={{ ...S.cell, ...S.compCell, fontWeight: 700 }}>{op.As.toFixed(2)}</td>
                            <td style={{ ...S.cell, color: cumple ? '#69f0ae' : '#ff5252', fontWeight: 700, fontSize: 12 }}>{cumple ? '✓' : '✗'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })()}
        </>}

        {/* ══ 6. Cargas Ortogonales ═════════════════════════════════════════ */}
        {tab === 'CARGAS ORT.' && <>

          <FormulaBox
            title="Cargas ortogonales al plano del muro (Art. 29)"
            lines={[
              'Presión sísmica:  w = 0.8·Z·U·C1·γ·e          [ton/m²]',
              'Momento de diseño:  Ms = m·w·a²               [ton·m/m]',
              '   m = coeficiente de momento de Tabla 12 (interpolado por b/a y caso de borde)',
              'Esfuerzo de flexión:  fm = 6·Ms / t²           [kg/cm²]',
              'Verificación:  fm ≤ f\'t  →  muro sin refuerzo horizontal CUMPLE',
            ]}
          />

          <ParamGrid cols={4}>
            <PF label="Factor de zona Z" value={ortogonales.Z} onChange={v => dispatch({ type: 'SET_ORT', field: 'Z', value: v })} step="0.05" />
            <PF label="Factor de uso U" value={ortogonales.U} onChange={v => dispatch({ type: 'SET_ORT', field: 'U', value: v })} step="0.05" />
            <PF label="Coef. sísmico C1" value={ortogonales.C1} onChange={v => dispatch({ type: 'SET_ORT', field: 'C1', value: v })} />
            <PF label="Peso unitario albañilería γ (ton/m³)" value={ortogonales.gamma} onChange={v => dispatch({ type: 'SET_ORT', field: 'gamma', value: v })} />
            <PF label="Espesor del muro e (m)" value={ortogonales.e} onChange={v => dispatch({ type: 'SET_ORT', field: 'e', value: v })} />
            <PF label="Relación de aspecto b/a" value={ortogonales.ba} onChange={v => dispatch({ type: 'SET_ORT', field: 'ba', value: v })} step="0.1" />
            <PF label="Coef. m (Tabla 12, vacío = automático)" value={ortogonales.m} onChange={v => dispatch({ type: 'SET_ORT', field: 'm', value: v })} />
            <PF label="Dimensión menor del panel a (m)" value={ortogonales.a} onChange={v => dispatch({ type: 'SET_ORT', field: 'a', value: v })} />
            <PF label="Espesor efectivo del muro t_eff (m)" value={ortogonales.tEff} onChange={v => dispatch({ type: 'SET_ORT', field: 'tEff', value: v })} />
            <PF label="Resistencia a tracción f't (kg/cm²)" value={ortogonales.ft} onChange={v => dispatch({ type: 'SET_ORT', field: 'ft', value: v })} />
            <div>
              <label style={S.paramLabel}>Caso de borde (condición de apoyo)</label>
              <select style={S.paramSelect}
                value={ortogonales.caso}
                onChange={e => dispatch({ type: 'SET_ORT', field: 'caso', value: e.target.value })}>
                <option value="caso1">Caso 1 — 4 bordes arriostrados</option>
                <option value="caso2">Caso 2 — 3 bordes arriostrados</option>
                <option value="caso3">Caso 3 — borde superior libre</option>
                <option value="caso4">Caso 4 — solo bordes horizontales</option>
              </select>
              {/* Mini SVGs de casos de apoyo */}
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {[
                  { key: 'caso1', label: '1', top: true,  right: true,  bottom: true,  left: true,  topDash: false, rightDash: false, bottomDash: false, leftDash: false },
                  { key: 'caso2', label: '2', top: true,  right: true,  bottom: true,  left: false, topDash: false, rightDash: false, bottomDash: false, leftDash: true  },
                  { key: 'caso3', label: '3', top: false, right: false, bottom: true,  left: false, topDash: true,  rightDash: false, bottomDash: false, leftDash: false },
                  { key: 'caso4', label: '4', top: true,  right: false, bottom: true,  left: false, topDash: false, rightDash: false, bottomDash: false, leftDash: false },
                ].map(({ key, label, top, right, bottom, left, topDash, rightDash, bottomDash, leftDash }) => {
                  const active = ortogonales.caso === key
                  const sw = 2.5
                  const dashed = '4,3'
                  return (
                    <div key={key} onClick={() => dispatch({ type: 'SET_ORT', field: 'caso', value: key })}
                      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <svg width={60} height={50} style={{ border: active ? '1.5px solid #7c4dff' : '1.5px solid rgba(255,255,255,0.08)', borderRadius: 6, background: active ? 'rgba(124,77,255,0.08)' : 'transparent', display: 'block' }}>
                        {/* Top */}
                        <line x1="8" y1="8" x2="52" y2="8" stroke={top ? (active ? '#b388ff' : '#90caf9') : 'rgba(255,255,255,0.2)'} strokeWidth={sw} strokeDasharray={topDash ? dashed : undefined} />
                        {/* Right */}
                        <line x1="52" y1="8" x2="52" y2="42" stroke={right ? (active ? '#b388ff' : '#90caf9') : 'rgba(255,255,255,0.2)'} strokeWidth={sw} strokeDasharray={rightDash ? dashed : undefined} />
                        {/* Bottom */}
                        <line x1="8" y1="42" x2="52" y2="42" stroke={bottom ? (active ? '#b388ff' : '#90caf9') : 'rgba(255,255,255,0.2)'} strokeWidth={sw} strokeDasharray={bottomDash ? dashed : undefined} />
                        {/* Left */}
                        <line x1="8" y1="8" x2="8" y2="42" stroke={left ? (active ? '#b388ff' : '#90caf9') : 'rgba(255,255,255,0.2)'} strokeWidth={sw} strokeDasharray={leftDash ? dashed : undefined} />
                        {/* Arrow for caso4 voladizo */}
                        {key === 'caso4' && <polygon points="30,18 25,30 35,30" fill={active ? '#b388ff' : '#90caf9'} opacity={0.7} />}
                      </svg>
                      <span style={{ fontSize: 9, fontFamily: 'var(--cond)', color: active ? '#b388ff' : 'var(--text3)', fontWeight: active ? 700 : 400 }}>C{label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </ParamGrid>

          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, alignItems: 'start' }}>
            <div style={S.resultBox}>
              <div style={{ fontSize: 10, color: '#90caf9', fontFamily: 'var(--cond)', fontWeight: 700, marginBottom: 8 }}>Resultados de cálculo</div>
              <ResultRow label="m (Tabla 12 interpolado)" value={pf4(ortCalc.coef_m)} />
              <ResultRow label="w = 0.8·Z·U·C1·γ·e" value={pf(ortCalc.w, 6)} unit="ton/m²" />
              <ResultRow label="Ms = m·w·a²" value={pf(ortCalc.Ms, 6)} unit="ton·m/m" />
              <ResultRow label="fm = 6·Ms / t²" value={pf(ortCalc.fm, 4)} unit="kg/cm²" />
              <ResultRow label="f't resistencia a tracción" value={pf(ortCalc.ft, 2)} unit="kg/cm²" />
            </div>
            {ortCalc.fm != null && (
              <VerifCard
                ok={ortCalc.cumple}
                mainText={ortCalc.cumple
                  ? 'fm ≤ f\'t — Muro sin refuerzo horizontal'
                  : 'fm > f\'t — Requiere refuerzo horizontal'}
                detail={`fm = ${pf(ortCalc.fm, 4)} kg/cm²  |  f't = ${pf(ortCalc.ft, 2)} kg/cm²  (Art. 29)${!ortCalc.cumple ? '\n→ Considerar refuerzo horizontal o reducir panel libre' : ''}`}
              />
            )}
          </div>
        </>}

        {/* ══ 7. Tablas de Referencia ═══════════════════════════════════════ */}
        {tab === 'TABLAS' && <>

          {/* TABLA_9 — Resistencias características */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: 'var(--text1)', fontFamily: 'var(--cond)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>
              Tabla 9 — Resistencias características de la albañilería (kg/cm²)
            </div>
            <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--r2)', maxWidth: 600 }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    {['Clase', 'Tipo de unidad', "f'm (kg/cm²)", "v'm (kg/cm²)"].map(h2 => (
                      <th key={h2} style={S.headerCell}>{h2}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TABLA_9.map((r, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <td style={{ ...S.cell, fontWeight: 700, color: 'var(--text0)' }}>{r.clase}</td>
                      <td style={{ ...S.cell, textAlign: 'left', color: 'var(--text1)' }}>{r.tipo}</td>
                      <td style={{ ...S.cell, color: '#90caf9' }}>{r.fm}</td>
                      <td style={{ ...S.cell, color: '#80cbc4' }}>{r.vm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABLA_10 — Corrección por esbeltez */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: 'var(--text1)', fontFamily: 'var(--cond)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>
              Tabla 10 — Factores de corrección por esbeltez de prismas
            </div>
            <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--r2)', maxWidth: 360 }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    {['Esbeltez (h/t)', 'Factor de corrección'].map(h2 => (
                      <th key={h2} style={S.headerCell}>{h2}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TABLA_10.map((r, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <td style={{ ...S.cell, fontWeight: 700, color: 'var(--text1)' }}>{r.esbeltez.toFixed(1)}</td>
                      <td style={{ ...S.cell, color: '#90caf9', fontFamily: 'var(--mono)' }}>{r.factor.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABLA_12 — Coeficientes m */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: 'var(--text1)', fontFamily: 'var(--cond)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>
              Tabla 12 — Coeficientes de momento m para muros (Art. 29)
            </div>
            <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--r2)' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <ResizableTh style={{ ...S.headerCell, width: 64 }}>b/a</ResizableTh>
                    {['Caso 1 (4 bordes)', 'Caso 2 (3 bordes)', 'Caso 3 (sup libre)', 'Caso 4 (horiz)'].map(h2 => (
                      <ResizableTh key={h2} style={{ ...S.headerCell, width: 120 }}>{h2}</ResizableTh>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TABLA_12.caso1.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <td style={{ ...S.cell, fontWeight: 700, color: 'var(--text1)' }}>{row.ba === Infinity ? '∞' : row.ba.toFixed(2)}</td>
                      {['caso1', 'caso2', 'caso3', 'caso4'].map(c => (
                        <td key={c} style={{ ...S.cell, color: '#90caf9', fontFamily: 'var(--mono)' }}>
                          {TABLA_12[c][i]?.m.toFixed(4)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </>}

      </div>{/* end scroll body */}
    </div>
  )
}
