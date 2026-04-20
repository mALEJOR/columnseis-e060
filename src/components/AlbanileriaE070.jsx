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
  paramLabel:    { fontSize: 10, color: 'var(--text2)', fontFamily: 'var(--cond)', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 3 },
  paramInput:    { width: '100%', background: '#1a2744', border: '1px solid rgba(68,114,196,0.35)', borderRadius: 'var(--r)', color: 'var(--text0)', fontFamily: 'var(--mono)', fontSize: 11, padding: '4px 7px', outline: 'none' },
  paramSelect:   { width: '100%', background: '#161922', border: '1px solid rgba(68,114,196,0.35)', borderRadius: 'var(--r)', color: 'var(--text0)', fontFamily: 'var(--mono)', fontSize: 11, padding: '4px 7px', outline: 'none' },
  resultBox:     { background: '#0f1c2e', border: '1px solid rgba(68,114,196,0.25)', borderRadius: 'var(--r2)', padding: '10px 14px', marginTop: 8 },
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
    if (!vmResult.sumVm || !VE) return '—'
    return vmResult.sumVm >= VE ? 'CUMPLE' : 'NO CUMPLE'
  }, [vmResult, vmEi])

  const hdrs = ['Pier', 't (m)', 'L (m)', "v'm (kg/cm²)", 'Ve (ton)', 'Me (ton·m)', 'Pg (ton)', 'α calc', 'α adopt', 'Vm (ton)', '0.55·Vm', 'Verificación']

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 10, color: 'var(--text2)', fontFamily: 'var(--cond)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>
          C. Resistencia al agrietamiento diagonal Vm
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 120px)', gap: '6px 10px', marginBottom: 8 }}>
          {props.map((p, idx) => idx < 5 ? null : null) /* props editados en tabla */}
        </div>
      </div>

      {/* Props editable inputs above table */}
      <div style={{ overflowX: 'auto', marginBottom: 8, border: '1px solid rgba(68,114,196,0.2)', borderRadius: 'var(--r)', padding: 8, background: 'rgba(26,39,68,0.3)' }}>
        <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--cond)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>
          Propiedades de muros (editables)
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%' }}>
            <thead>
              <tr>
                <ResizableTh style={{ ...S.headerCell, width: 28, fontSize: 8 }}>#</ResizableTh>
                <ResizableTh style={{ ...S.headerCell, width: 80 }}>Pier</ResizableTh>
                <ResizableTh style={{ ...S.headerCell, width: 72 }}>t (m)</ResizableTh>
                <ResizableTh style={{ ...S.headerCell, width: 72 }}>L (m)</ResizableTh>
                <ResizableTh style={{ ...S.headerCell, width: 88 }}>v'm (kg/cm²)</ResizableTh>
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

      {/* Vm results table */}
      <div style={{ overflowX: 'auto', resize: 'both', minHeight: 70, border: '1px solid var(--border)', borderRadius: 'var(--r2)' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <ResizableTh style={{ ...S.headerCell, width: 28, fontSize: 8 }}>#</ResizableTh>
              {hdrs.map((h, i) => (
                <ResizableTh key={i} style={{ ...S.headerCell, width: i < 4 ? 70 : 76 }}>{h}</ResizableTh>
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
              <td style={{ ...S.cell, background: condBg(verifArt), color: condClr(verifArt), fontSize: 9, fontFamily: 'var(--mono)', fontWeight: 700 }}>
                {verifArt}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 4, fontStyle: 'italic', fontFamily: 'var(--sans)' }}>
        Art. 26.4: ΣVmi ≥ ΣVEi · La verificación Ve ≤ 0.55·Vm indica si el muro se fisura.
      </div>
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

  const hdrs = ['Pier', 'L (m)', 't (m)', 'Pm (ton)', 'σm (kg/cm²)', 'Fa (kg/cm²)', '0.15·f\'m', '0.05·f\'m', 'Verificación']

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, color: 'var(--text2)', fontFamily: 'var(--cond)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>
        D. Esfuerzo Axial Máximo (Art. 19.1b)
      </div>
      <ParamGrid cols={2}>
        <PF label="f'm (kg/cm²)" value={fm} onChange={v => dispatch({ type: 'SET_MUR_PARAM', dir, field: 'fm', value: v })} />
        <PF label="h libre (m)" value={h}  onChange={v => dispatch({ type: 'SET_MUR_PARAM', dir, field: 'h',  value: v })} />
      </ParamGrid>
      <div style={{ overflowX: 'auto', resize: 'both', minHeight: 60, border: '1px solid var(--border)', borderRadius: 'var(--r2)' }}>
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
          <ParamGrid cols={5}>
            <PF label="N° pisos" value={densidad.N}  onChange={v => dispatch({ type: 'SET_DENSIDAD', field: 'N',  value: v })} min={1} />
            <PF label="Ap (m²)"  value={densidad.Ap} onChange={v => dispatch({ type: 'SET_DENSIDAD', field: 'Ap', value: v })} />
            <PF label="Z"        value={densidad.Z}  onChange={v => dispatch({ type: 'SET_DENSIDAD', field: 'Z',  value: v })} step="0.05" />
            <PF label="U"        value={densidad.U}  onChange={v => dispatch({ type: 'SET_DENSIDAD', field: 'U',  value: v })} step="0.05" />
            <PF label="S"        value={densidad.S}  onChange={v => dispatch({ type: 'SET_DENSIDAD', field: 'S',  value: v })} step="0.05" />
          </ParamGrid>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <DensidadDir muros={densidad.murosX} dispatch={dispatch} dirKey="murosX" label="X-X" />
            <DensidadDir muros={densidad.murosY} dispatch={dispatch} dirKey="murosY" label="Y-Y" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
            {[
              { label: 'Dir X-X', res: densCalc.resultadoX },
              { label: 'Dir Y-Y', res: densCalc.resultadoY },
            ].map(({ label, res }) => (
              <div key={label} style={S.resultBox}>
                <div style={{ fontSize: 10, color: '#90caf9', fontFamily: 'var(--cond)', fontWeight: 700, marginBottom: 8 }}>{label}</div>
                <ResultRow label="Σ(L·t) equiv" value={pf(res?.sumaLt, 4)} unit="m²" />
                <ResultRow label="Densidad existente" value={pf(res?.densidad, 6)} />
                <ResultRow label="Densidad requerida (Z·U·S·N/56)" value={pf(densCalc.densidadReq, 6)} />
                <ResultRow label="Verificación"
                  value={res?.cumple ? 'CUMPLE' : res?.densidad != null ? 'NO CUMPLE' : '—'}
                  ok={res?.densidad != null ? res.cumple : undefined} />
              </div>
            ))}
          </div>
        </>}

        {/* ══ 4. Columnas de Confinamiento ══════════════════════════════════ */}
        {tab === 'COLUMNAS' && <>
          <ParamGrid cols={4}>
            <PF label="Mu1 — momento muro (ton·m)" value={columnas.Mu1} onChange={v => dispatch({ type: 'SET_COL', field: 'Mu1', value: v })} />
            <PF label="Vm1 — cortante muro (ton)"  value={columnas.Vm1} onChange={v => dispatch({ type: 'SET_COL', field: 'Vm1', value: v })} />
            <PF label="h — altura entrepiso (m)"   value={columnas.h}   onChange={v => dispatch({ type: 'SET_COL', field: 'h',   value: v })} />
            <PF label="L — longitud muro (m)"      value={columnas.L}   onChange={v => dispatch({ type: 'SET_COL', field: 'L',   value: v })} />
            <PF label="Lm — longitud paño (m)"     value={columnas.Lm}  onChange={v => dispatch({ type: 'SET_COL', field: 'Lm',  value: v })} />
            <PF label="Nc — N° columnas"            value={columnas.Nc}  onChange={v => dispatch({ type: 'SET_COL', field: 'Nc',  value: v })} min={1} />
            <PF label="Pg — carga grav. col (ton)"  value={columnas.Pg}  onChange={v => dispatch({ type: 'SET_COL', field: 'Pg',  value: v })} />
            <PF label="f'c (kg/cm²)"               value={columnas.fc}  onChange={v => dispatch({ type: 'SET_COL', field: 'fc',  value: v })} />
          </ParamGrid>
          <ParamGrid cols={4}>
            <PF label="fy (kg/cm²)"                 value={columnas.fy}    onChange={v => dispatch({ type: 'SET_COL', field: 'fy',    value: v })} />
            <PF label="φc — factor compresión"      value={columnas.phi_c} onChange={v => dispatch({ type: 'SET_COL', field: 'phi_c', value: v })} step="0.05" />
            <PF label="φf — factor fricción"        value={columnas.phi_f} onChange={v => dispatch({ type: 'SET_COL', field: 'phi_f', value: v })} step="0.05" />
            <PF label="μf — coef. fricción"         value={columnas.mu_f}  onChange={v => dispatch({ type: 'SET_COL', field: 'mu_f',  value: v })} step="0.05" />
            <PF label="bc — ancho col. (m)"         value={columnas.bc}    onChange={v => dispatch({ type: 'SET_COL', field: 'bc',    value: v })} />
            <PF label="dc — peralte col. (m)"       value={columnas.dc}    onChange={v => dispatch({ type: 'SET_COL', field: 'dc',    value: v })} />
            <PF label="db estribo (mm)"             value={columnas.db_estribo}    onChange={v => dispatch({ type: 'SET_COL', field: 'db_estribo',    value: v })} />
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
                  <ResizableTh style={{ ...S.headerCell, width: 180 }}>Fuerza</ResizableTh>
                  <ResizableTh style={{ ...S.headerCell, width: 130 }}>Col. Extrema</ResizableTh>
                  <ResizableTh style={{ ...S.headerCell, width: 130 }}>Col. Interior</ResizableTh>
                  <ResizableTh style={{ ...S.headerCell, width: 180 }}>Fórmula</ResizableTh>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Vc — Cortante (ton)',     ext: pf(colCalc.Vc_ext, 4),  int: pf(colCalc.Vc_int, 4),  formula: '1.5·Vm1·Lm / (L·Nc)' },
                  { label: 'T — Tracción (ton)',      ext: pf(colCalc.T_ext, 4),   int: pf(colCalc.T_int, 4),   formula: '|M / L|' },
                  { label: 'C — Compresión (ton)',    ext: pf(colCalc.C_ext, 4),   int: pf(colCalc.C_int, 4),   formula: 'Ext: |M/L|  Int: Pg' },
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
              <ResultRow label="Verif. (Ac ≥ An ext)"
                value={colCalc.Ac != null ? (colCalc.Ac >= colCalc.An_ext ? 'CUMPLE' : 'NO CUMPLE') : '—'}
                ok={colCalc.Ac != null ? colCalc.Ac >= colCalc.An_ext : undefined} />
            </div>
            <div style={S.resultBox}>
              <div style={{ fontSize: 10, color: '#90caf9', fontFamily: 'var(--cond)', fontWeight: 700, marginBottom: 6 }}>Acero vertical</div>
              <ResultRow label="As tracción" value={pf(colCalc.As_traccion, 3)} unit="cm²" />
              <ResultRow label="Avf ext (corte-fricción)" value={pf(colCalc.Avf_ext, 3)} unit="cm²" />
              <ResultRow label="As requerido" value={pf(colCalc.As, 3)} unit="cm²" />
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
        </>}

        {/* ══ 5. Vigas Soleras ══════════════════════════════════════════════ */}
        {tab === 'SOLERAS' && <>
          <ParamGrid cols={4}>
            <PF label="Vm1 — cortante muro (ton)" value={vigas.Vm1} onChange={v => dispatch({ type: 'SET_VIGA', field: 'Vm1', value: v })} />
            <PF label="Lm — long. paño (m)"       value={vigas.Lm}  onChange={v => dispatch({ type: 'SET_VIGA', field: 'Lm',  value: v })} />
            <PF label="L — longitud muro (m)"     value={vigas.L}   onChange={v => dispatch({ type: 'SET_VIGA', field: 'L',   value: v })} />
            <PF label="φ — factor reducción"      value={vigas.phi} onChange={v => dispatch({ type: 'SET_VIGA', field: 'phi', value: v })} step="0.05" />
            <PF label="f'c (kg/cm²)"              value={vigas.fc}  onChange={v => dispatch({ type: 'SET_VIGA', field: 'fc',  value: v })} />
            <PF label="fy (kg/cm²)"               value={vigas.fy}  onChange={v => dispatch({ type: 'SET_VIGA', field: 'fy',  value: v })} />
            <PF label="Acs — área sección (cm²)"  value={vigas.Acs} onChange={v => dispatch({ type: 'SET_VIGA', field: 'Acs', value: v })} />
          </ParamGrid>
          <div style={{ ...S.resultBox, maxWidth: 420 }}>
            <div style={{ fontSize: 10, color: '#90caf9', fontFamily: 'var(--cond)', fontWeight: 700, marginBottom: 8 }}>Resultados</div>
            <ResultRow label="Ts = Vm1·Lm / (2·L)" value={pf(vigaCalc.Ts, 4)} unit="ton" />
            <ResultRow label="As req = Ts·1000 / (φ·fy)" value={pf(vigaCalc.As, 4)} unit="cm²" />
            <ResultRow label="As mín = 0.1·f'c·Acs / fy" value={pf(vigaCalc.As_min, 4)} unit="cm²" />
            <ResultRow label="As adoptado = max(As, As mín)"
              value={pf(vigaCalc.As_adoptado, 4)} unit="cm²"
              ok={vigaCalc.As_adoptado != null && vigaCalc.As != null ? vigaCalc.As_adoptado >= vigaCalc.As : undefined} />
          </div>
          <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 8, fontStyle: 'italic', fontFamily: 'var(--sans)' }}>
            La viga solera se diseña a tracción pura. As adoptado ≥ As req y ≥ As mín.
          </div>
        </>}

        {/* ══ 6. Cargas Ortogonales ═════════════════════════════════════════ */}
        {tab === 'CARGAS ORT.' && <>
          <ParamGrid cols={4}>
            <PF label="Z" value={ortogonales.Z} onChange={v => dispatch({ type: 'SET_ORT', field: 'Z', value: v })} step="0.05" />
            <PF label="U" value={ortogonales.U} onChange={v => dispatch({ type: 'SET_ORT', field: 'U', value: v })} step="0.05" />
            <PF label="C1 — coef. sísmico" value={ortogonales.C1} onChange={v => dispatch({ type: 'SET_ORT', field: 'C1', value: v })} />
            <PF label="γ — peso unit. (ton/m³)" value={ortogonales.gamma} onChange={v => dispatch({ type: 'SET_ORT', field: 'gamma', value: v })} />
            <PF label="e — espesor muro (m)" value={ortogonales.e} onChange={v => dispatch({ type: 'SET_ORT', field: 'e', value: v })} />
            <PF label="b/a" value={ortogonales.ba} onChange={v => dispatch({ type: 'SET_ORT', field: 'ba', value: v })} step="0.1" />
            <PF label="m — coef. momento (Tabla 12, dejar vacío para auto)" value={ortogonales.m} onChange={v => dispatch({ type: 'SET_ORT', field: 'm', value: v })} />
            <PF label="a — dim. menor (m)" value={ortogonales.a} onChange={v => dispatch({ type: 'SET_ORT', field: 'a', value: v })} />
            <PF label="t eff (m)" value={ortogonales.tEff} onChange={v => dispatch({ type: 'SET_ORT', field: 'tEff', value: v })} />
            <PF label="f't — resist. tracción (kg/cm²)" value={ortogonales.ft} onChange={v => dispatch({ type: 'SET_ORT', field: 'ft', value: v })} />
            <div>
              <label style={S.paramLabel}>Caso de borde</label>
              <select style={S.paramSelect}
                value={ortogonales.caso}
                onChange={e => dispatch({ type: 'SET_ORT', field: 'caso', value: e.target.value })}>
                <option value="caso1">Caso 1 — 4 bordes arriostrados</option>
                <option value="caso2">Caso 2 — 3 bordes arriostrados</option>
                <option value="caso3">Caso 3 — borde superior libre</option>
                <option value="caso4">Caso 4 — solo bordes horiz.</option>
              </select>
            </div>
          </ParamGrid>
          <div style={{ ...S.resultBox, maxWidth: 460 }}>
            <div style={{ fontSize: 10, color: '#90caf9', fontFamily: 'var(--cond)', fontWeight: 700, marginBottom: 8 }}>Resultados</div>
            <ResultRow label="m (Tabla 12)" value={pf4(ortCalc.coef_m)} />
            <ResultRow label="w = 0.8·Z·U·C1·γ·e" value={pf(ortCalc.w, 6)} unit="ton/m²" />
            <ResultRow label="Ms = m·w·a²" value={pf(ortCalc.Ms, 6)} unit="ton·m/m" />
            <ResultRow label="fm = 6·Ms / t²" value={pf(ortCalc.fm, 4)} unit="kg/cm²" />
            <ResultRow label="f't" value={pf(ortCalc.ft, 2)} unit="kg/cm²" />
            <ResultRow label="Verificación fm ≤ f't"
              value={ortCalc.cumple ? 'CUMPLE' : 'NO CUMPLE'}
              ok={ortCalc.cumple} />
          </div>
          <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 8, fontStyle: 'italic', fontFamily: 'var(--sans)' }}>
            Si fm &gt; f't, el muro requiere refuerzo horizontal o reducción de panel libre.
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
