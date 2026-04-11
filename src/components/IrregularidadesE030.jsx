import { useState, useReducer, useMemo, useCallback } from 'react'
import * as E030 from '../utils/irregularidadesE030'

const MAX_PISOS = 20

// ── Helpers ──
const parseNum = v => { const n = parseFloat(v); return isNaN(n) ? '' : n }
const fmt = (v, d = 5) => (v === '' || v == null || isNaN(v)) ? '\u2014' : Number(v).toFixed(d)
const fmtPct = v => (v === '' || v == null || isNaN(v)) ? '\u2014' : (Number(v) * 100).toFixed(1) + '%'
const fmtPctRaw = v => (v === '' || v == null || isNaN(v)) ? '\u2014' : Number(v).toFixed(1) + '%'
const pisoLabel = (idx, nPisos) => idx === nPisos - 1 ? 'Azotea' : (nPisos - idx)

const SISTEMAS = E030.SISTEMAS_ESTRUCTURALES.map(s => s.nombre)
const MATERIALES = E030.MATERIALES

// ── Styles ──
const S = {
  inputCell: { background: '#1a2744', border: '1px solid rgba(68,114,196,0.3)' },
  compCell: { background: '#1a3328', border: '1px solid rgba(46,125,50,0.3)' },
  headerCell: { background: '#2e75b6', color: '#fff', fontWeight: 700, fontSize: 9, textTransform: 'uppercase', letterSpacing: '.5px', padding: '6px 8px', textAlign: 'center', whiteSpace: 'nowrap', fontFamily: 'var(--cond)' },
  cell: { padding: '4px 6px', fontSize: 10, fontFamily: 'var(--mono)', textAlign: 'center', borderBottom: '1px solid var(--border)' },
  tableInput: { width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text0)', fontFamily: 'var(--mono)', fontSize: 10, textAlign: 'center', padding: '2px 0' },
  sectionHeader: { padding: '10px 14px', background: '#2e75b6', color: '#fff', fontFamily: 'var(--cond)', fontSize: 12, fontWeight: 700, cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 'var(--r2)', marginBottom: 8, letterSpacing: '.5px' },
  sectionHeaderDark: { padding: '10px 14px', background: '#1f4e79', color: '#fff', fontFamily: 'var(--cond)', fontSize: 12, fontWeight: 700, cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 'var(--r2)', marginBottom: 8, letterSpacing: '.5px' },
  badge: (bg, color) => ({ display: 'inline-block', padding: '4px 12px', borderRadius: 'var(--r)', fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)', background: bg, color: color, letterSpacing: '.5px' }),
}

const condColor = cond => {
  if (cond === 'CUMPLE' || cond === 'OK' || cond === 'REG' || cond === 'REGULAR') return '#2e7d32'
  if (cond === 'NO CUMPLE' || cond === 'IRREG' || cond === 'IRREGULAR') return '#c62828'
  if (cond === 'EXTR') return '#c62828'
  if (cond === 'TORS') return '#d97706'
  return 'var(--text2)'
}

// ══════════════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════════════
function initState() {
  const emptyFloors = () => Array.from({ length: MAX_PISOS }, () => ({}))
  return {
    nPisos: 6,
    esIrregular: true,
    sistemaX: 'Muros C.A.',
    sistemaY: 'Muros C.A.',
    materialX: 'Concreto Armado',
    materialY: 'Concreto Armado',
    derivasX: Array.from({ length: MAX_PISOS }, () => ({ hi: 280, delta: '' })),
    derivasY: Array.from({ length: MAX_PISOS }, () => ({ hi: 280, delta: '' })),
    torsionX: emptyFloors(),
    torsionY: emptyFloors(),
    esquinas: { aEntrante: 0, aTotal: 30, bEntrante: 0, bTotal: 15 },
    diafragma: { areaBruta: '', areaAberturas: '', dimLx: '', sumaHuecosX: '', dimLy: '', sumaHuecosY: '' },
    noParalelos: { activo: false, elementos: Array.from({ length: 5 }, () => ({ nombre: '', angulo: '', vElem: '', vPiso: '' })) },
    rigidezX: emptyFloors(),
    rigidezY: emptyFloors(),
    resistenciaX: emptyFloors(),
    resistenciaY: emptyFloors(),
    masas: emptyFloors(),
    geometriaX: emptyFloors(),
    geometriaY: emptyFloors(),
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD': return { ...state, [action.field]: action.value }
    case 'SET_FLOOR_DATA': {
      const arr = [...state[action.arrayName]]
      arr[action.index] = { ...arr[action.index], [action.field]: action.value }
      return { ...state, [action.arrayName]: arr }
    }
    case 'SET_ESQUINAS': return { ...state, esquinas: { ...state.esquinas, [action.field]: action.value } }
    case 'SET_DIAFRAGMA': return { ...state, diafragma: { ...state.diafragma, [action.field]: action.value } }
    case 'SET_NO_PARALELOS_ACTIVO': return { ...state, noParalelos: { ...state.noParalelos, activo: action.value } }
    case 'SET_NO_PARALELOS_ELEM': {
      const elems = [...state.noParalelos.elementos]
      elems[action.index] = { ...elems[action.index], [action.field]: action.value }
      return { ...state, noParalelos: { ...state.noParalelos, elementos: elems } }
    }
    case 'RESET': return initState()
    default: return state
  }
}

// ══════════════════════════════════════════════════════════════
//  Sub-component: Collapsible Section
// ══════════════════════════════════════════════════════════════
function Section({ title, dark, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={dark ? S.sectionHeaderDark : S.sectionHeader} onClick={() => setOpen(!open)}>
        <span style={{ fontSize: 10, transition: 'transform .2s', transform: open ? 'rotate(90deg)' : 'rotate(0)', display: 'inline-block' }}>{'\u25B6'}</span>
        <span style={{ flex: 1 }}>{title}</span>
      </div>
      {open && <div style={{ padding: '0 4px' }}>{children}</div>}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  Sub-component: Parameters Bar
// ══════════════════════════════════════════════════════════════
function ParamsBar({ state, dispatch, RoX, RoY, factor, Rx, Ry }) {
  return (
    <div className="e030-params">
      <div className="e030-param-group">
        <label>N. Pisos</label>
        <input type="number" min={1} max={20} value={state.nPisos}
          onChange={e => dispatch({ type: 'SET_FIELD', field: 'nPisos', value: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)) })} />
      </div>
      <div className="e030-param-group">
        <label>Irregular</label>
        <select value={state.esIrregular ? 'SI' : 'NO'}
          onChange={e => dispatch({ type: 'SET_FIELD', field: 'esIrregular', value: e.target.value === 'SI' })}>
          <option value="SI">SI</option>
          <option value="NO">NO</option>
        </select>
      </div>
      <div className="e030-param-group">
        <label>Sistema X</label>
        <select value={state.sistemaX}
          onChange={e => dispatch({ type: 'SET_FIELD', field: 'sistemaX', value: e.target.value })}>
          {SISTEMAS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="e030-param-group">
        <label>Sistema Y</label>
        <select value={state.sistemaY}
          onChange={e => dispatch({ type: 'SET_FIELD', field: 'sistemaY', value: e.target.value })}>
          {SISTEMAS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="e030-param-group">
        <label>Material X</label>
        <select value={state.materialX}
          onChange={e => dispatch({ type: 'SET_FIELD', field: 'materialX', value: e.target.value })}>
          {MATERIALES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div className="e030-param-group">
        <label>Material Y</label>
        <select value={state.materialY}
          onChange={e => dispatch({ type: 'SET_FIELD', field: 'materialY', value: e.target.value })}>
          {MATERIALES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div className="e030-param-group e030-param-ro">
        <label>Ro X</label>
        <span className="e030-ro-val">{RoX}</span>
      </div>
      <div className="e030-param-group e030-param-ro">
        <label>Ro Y</label>
        <span className="e030-ro-val">{RoY}</span>
      </div>
      <div className="e030-param-group e030-param-ro">
        <label>Factor</label>
        <span className="e030-ro-val">{factor}</span>
      </div>
      <div className="e030-param-group e030-param-badge">
        <label>R(X)</label>
        <span style={S.badge('#3a1c00', '#ffc107')}>{fmt(Rx, 2)}</span>
      </div>
      <div className="e030-param-group e030-param-badge">
        <label>R(Y)</label>
        <span style={S.badge('#3a1c00', '#ffc107')}>{fmt(Ry, 2)}</span>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  TAB 1: DERIVAS
// ══════════════════════════════════════════════════════════════
function TabDerivas({ state, dispatch, factor, Rx, Ry, derivaPermX, derivaPermY }) {
  const { nPisos } = state

  const resultsX = useMemo(() => {
    const pisos = state.derivasX.slice(0, nPisos).map(d => ({ hi: parseNum(d.hi), deltaElastico: parseNum(d.delta) }))
    return E030.calcularDerivas(pisos, nPisos, factor, Rx, derivaPermX)
  }, [state.derivasX, nPisos, factor, Rx, derivaPermX])

  const resultsY = useMemo(() => {
    const pisos = state.derivasY.slice(0, nPisos).map(d => ({ hi: parseNum(d.hi), deltaElastico: parseNum(d.delta) }))
    return E030.calcularDerivas(pisos, nPisos, factor, Ry, derivaPermY)
  }, [state.derivasY, nPisos, factor, Ry, derivaPermY])

  const resX = useMemo(() => E030.resumenDerivas(resultsX), [resultsX])
  const resY = useMemo(() => E030.resumenDerivas(resultsY), [resultsY])

  const renderTable = (dir, results, arrayName) => (
    <div style={{ marginBottom: 16 }}>
      <h4 style={{ fontFamily: 'var(--cond)', fontSize: 11, color: '#2e7d32', marginBottom: 6, letterSpacing: 1 }}>DIR. {dir}</h4>
      <div style={{ overflowX: 'auto' }}>
        <table className="e030-table">
          <thead>
            <tr>
              <th style={S.headerCell}>Piso</th>
              <th style={{ ...S.headerCell, ...S.inputCell }}>hi (cm)</th>
              <th style={{ ...S.headerCell, ...S.inputCell }}>di elast.</th>
              <th style={{ ...S.headerCell, ...S.compCell }}>Di=f*R*di</th>
              <th style={{ ...S.headerCell, ...S.compCell }}>Dperm</th>
              <th style={{ ...S.headerCell, ...S.compCell }}>Di/Dperm</th>
              <th style={S.headerCell}>Verif.</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i}>
                <td style={S.cell}>{r.piso}</td>
                <td style={{ ...S.cell, ...S.inputCell }}>
                  <input type="number" style={S.tableInput}
                    value={state[arrayName][i]?.hi ?? ''}
                    onChange={e => dispatch({ type: 'SET_FLOOR_DATA', arrayName, index: i, field: 'hi', value: parseNum(e.target.value) })} />
                </td>
                <td style={{ ...S.cell, ...S.inputCell }}>
                  <input type="number" step="0.000001" style={S.tableInput}
                    value={state[arrayName][i]?.delta ?? ''}
                    onChange={e => dispatch({ type: 'SET_FLOOR_DATA', arrayName, index: i, field: 'delta', value: parseNum(e.target.value) })} />
                </td>
                <td style={{ ...S.cell, ...S.compCell }}>{fmt(r.deltaInelastico)}</td>
                <td style={{ ...S.cell, ...S.compCell }}>{fmt(r.derivaPermitida)}</td>
                <td style={{ ...S.cell, ...S.compCell }}>{fmtPct(r.ratio)}</td>
                <td style={{ ...S.cell, color: condColor(r.cumple), fontWeight: 700 }}>{r.cumple || '\u2014'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div>
      <Section title="VERIFICACION DIRECCION X-X" defaultOpen={true}>
        {renderTable('X-X', resultsX, 'derivasX')}
        <div className="e030-summary-row">
          <span>Deriva Max. Calc. X: <b>{fmt(resX.maxCalc)}</b></span>
          <span>Deriva Permitida X: <b>{fmt(resX.maxPerm)}</b></span>
          <span style={{ color: condColor(resX.cumple), fontWeight: 700, fontSize: 13 }}>
            VERIFICACION X-X: {resX.cumple || '\u2014'}
          </span>
        </div>
      </Section>
      <Section title="VERIFICACION DIRECCION Y-Y" defaultOpen={true}>
        {renderTable('Y-Y', resultsY, 'derivasY')}
        <div className="e030-summary-row">
          <span>Deriva Max. Calc. Y: <b>{fmt(resY.maxCalc)}</b></span>
          <span>Deriva Permitida Y: <b>{fmt(resY.maxPerm)}</b></span>
          <span style={{ color: condColor(resY.cumple), fontWeight: 700, fontSize: 13 }}>
            VERIFICACION Y-Y: {resY.cumple || '\u2014'}
          </span>
        </div>
      </Section>
      <Section title="RESUMEN DE VERIFICACION DE DERIVAS" defaultOpen={true}>
        <table className="e030-table" style={{ maxWidth: 600 }}>
          <thead>
            <tr>
              <th style={{ ...S.headerCell, background: '#2e7d32' }}>Direccion</th>
              <th style={{ ...S.headerCell, background: '#2e7d32' }}>D Max. Calc.</th>
              <th style={{ ...S.headerCell, background: '#2e7d32' }}>D Permitida</th>
              <th style={{ ...S.headerCell, background: '#2e7d32' }}>Ratio</th>
              <th style={{ ...S.headerCell, background: '#2e7d32' }}>Verificacion</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={S.cell}>X-X</td>
              <td style={S.cell}>{fmt(resX.maxCalc)}</td>
              <td style={S.cell}>{fmt(resX.maxPerm)}</td>
              <td style={S.cell}>{fmtPct(resX.ratio)}</td>
              <td style={{ ...S.cell, color: condColor(resX.cumple), fontWeight: 700 }}>{resX.cumple || '\u2014'}</td>
            </tr>
            <tr>
              <td style={S.cell}>Y-Y</td>
              <td style={S.cell}>{fmt(resY.maxCalc)}</td>
              <td style={S.cell}>{fmt(resY.maxPerm)}</td>
              <td style={S.cell}>{fmtPct(resY.ratio)}</td>
              <td style={{ ...S.cell, color: condColor(resY.cumple), fontWeight: 700 }}>{resY.cumple || '\u2014'}</td>
            </tr>
          </tbody>
        </table>
      </Section>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  TAB 2: IRREG. PLANTA
// ══════════════════════════════════════════════════════════════
function TabPlanta({ state, dispatch, factor, Rx, Ry, derivaPermX, derivaPermY, RoX, RoY }) {
  const { nPisos } = state

  // Compute inelastic drifts for torsion check
  const derivasInelX = useMemo(() => {
    return state.derivasX.slice(0, nPisos).map(d => {
      const delta = parseNum(d.delta)
      return delta !== '' ? factor * Rx * delta : ''
    })
  }, [state.derivasX, nPisos, factor, Rx])

  const derivasInelY = useMemo(() => {
    return state.derivasY.slice(0, nPisos).map(d => {
      const delta = parseNum(d.delta)
      return delta !== '' ? factor * Ry * delta : ''
    })
  }, [state.derivasY, nPisos, factor, Ry])

  // Torsion
  const torsionXRes = useMemo(() => {
    const pisos = state.torsionX.slice(0, nPisos).map(t => ({
      deltaMax: parseNum(t.deltaMax),
      deltaProm: parseNum(t.deltaProm),
    }))
    return E030.calcularTorsion(pisos, derivasInelX, derivaPermX, nPisos)
  }, [state.torsionX, derivasInelX, derivaPermX, nPisos])

  const torsionYRes = useMemo(() => {
    const pisos = state.torsionY.slice(0, nPisos).map(t => ({
      deltaMax: parseNum(t.deltaMax),
      deltaProm: parseNum(t.deltaProm),
    }))
    return E030.calcularTorsion(pisos, derivasInelY, derivaPermY, nPisos)
  }, [state.torsionY, derivasInelY, derivaPermY, nPisos])

  // Esquinas
  const esquinasRes = useMemo(() => {
    const e = state.esquinas
    return E030.calcularEsquinasEntrantes(parseNum(e.aEntrante), parseNum(e.aTotal), parseNum(e.bEntrante), parseNum(e.bTotal))
  }, [state.esquinas])

  // Diafragma
  const diafRes = useMemo(() => {
    const d = state.diafragma
    return E030.calcularDiafragma(parseNum(d.areaBruta), parseNum(d.areaAberturas), parseNum(d.dimLx), parseNum(d.sumaHuecosX), parseNum(d.dimLy), parseNum(d.sumaHuecosY))
  }, [state.diafragma])

  // No Paralelos
  const npRes = useMemo(() => {
    const elems = state.noParalelos.elementos.map(e => ({
      nombre: e.nombre,
      angulo: parseNum(e.angulo),
      vElem: parseNum(e.vElem),
      vPiso: parseNum(e.vPiso),
    }))
    return E030.calcularNoParalelos(state.noParalelos.activo, elems)
  }, [state.noParalelos])

  const ipFinal = useMemo(() => {
    return E030.calcularIpFinal(torsionXRes.ipTorsion, torsionYRes.ipTorsion, esquinasRes.ip, diafRes.ipX, diafRes.ipY, npRes.ip)
  }, [torsionXRes, torsionYRes, esquinasRes, diafRes, npRes])

  const renderTorsionTable = (dir, res, arrayName) => (
    <div style={{ marginBottom: 12 }}>
      <h4 style={{ fontFamily: 'var(--cond)', fontSize: 11, color: '#1f4e79', marginBottom: 6, letterSpacing: 1 }}>DIR. {dir}</h4>
      <div style={{ overflowX: 'auto' }}>
        <table className="e030-table">
          <thead>
            <tr>
              <th style={S.headerCell}>Piso</th>
              <th style={{ ...S.headerCell, ...S.inputCell }}>dmax</th>
              <th style={{ ...S.headerCell, ...S.inputCell }}>dprom</th>
              <th style={{ ...S.headerCell, ...S.compCell }}>Ratio</th>
              <th style={{ ...S.headerCell, ...S.compCell }}>Di</th>
              <th style={{ ...S.headerCell, ...S.compCell }}>Dperm</th>
              <th style={{ ...S.headerCell, ...S.compCell }}>D&gt;0.5Dp</th>
              <th style={S.headerCell}>Cond</th>
            </tr>
          </thead>
          <tbody>
            {res.rows.map((r, i) => (
              <tr key={i}>
                <td style={S.cell}>{r.piso}</td>
                <td style={{ ...S.cell, ...S.inputCell }}>
                  <input type="number" step="0.000001" style={S.tableInput}
                    value={state[arrayName][i]?.deltaMax ?? ''}
                    onChange={e => dispatch({ type: 'SET_FLOOR_DATA', arrayName, index: i, field: 'deltaMax', value: parseNum(e.target.value) })} />
                </td>
                <td style={{ ...S.cell, ...S.inputCell }}>
                  <input type="number" step="0.000001" style={S.tableInput}
                    value={state[arrayName][i]?.deltaProm ?? ''}
                    onChange={e => dispatch({ type: 'SET_FLOOR_DATA', arrayName, index: i, field: 'deltaProm', value: parseNum(e.target.value) })} />
                </td>
                <td style={{ ...S.cell, ...S.compCell }}>{fmt(r.ratio, 3)}</td>
                <td style={{ ...S.cell, ...S.compCell }}>{fmt(r.deltaI)}</td>
                <td style={{ ...S.cell, ...S.compCell }}>{fmt(r.derivaPerm, 3)}</td>
                <td style={{ ...S.cell, ...S.compCell }}>{r.excede05 || '\u2014'}</td>
                <td style={{ ...S.cell, color: condColor(r.cond), fontWeight: 700 }}>{r.cond || '\u2014'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="e030-summary-row" style={{ marginTop: 6 }}>
        <span>Ip Torsion {dir}: <b style={{ color: '#ffc107', fontSize: 13 }}>{res.ipTorsion}</b></span>
      </div>
    </div>
  )

  return (
    <div>
      <Section title="1. IRREGULARIDAD TORSIONAL (Ip = 0.75) / EXTREMA (Ip = 0.60)">
        <p className="e030-hint">Criterio: dmax/dprom &gt; 1.3 con D&gt;0.5Dperm = TORSIONAL (0.75) | dmax/dprom &gt; 1.5 = EXTREMA (0.60)</p>
        {renderTorsionTable('X-X', torsionXRes, 'torsionX')}
        {renderTorsionTable('Y-Y', torsionYRes, 'torsionY')}
      </Section>

      <Section title="2. IRREGULARIDAD POR ESQUINAS ENTRANTES (Ip = 0.90)">
        <p className="e030-hint">Criterio: a &gt; 0.20*A (en X) o b &gt; 0.20*B (en Y)</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 600 }}>
          <div>
            <h4 style={{ fontFamily: 'var(--cond)', fontSize: 11, color: '#1f4e79', marginBottom: 6 }}>DIR. X-X</h4>
            <div className="e030-field-row">
              <label>Dim. entrante (a):</label>
              <input type="number" className="e030-field-input" value={state.esquinas.aEntrante}
                onChange={e => dispatch({ type: 'SET_ESQUINAS', field: 'aEntrante', value: parseNum(e.target.value) })} />
              <span className="e030-unit">m</span>
            </div>
            <div className="e030-field-row">
              <label>Dim. total (A):</label>
              <input type="number" className="e030-field-input" value={state.esquinas.aTotal}
                onChange={e => dispatch({ type: 'SET_ESQUINAS', field: 'aTotal', value: parseNum(e.target.value) })} />
              <span className="e030-unit">m</span>
            </div>
            <div className="e030-field-row">
              <label>20% de A:</label>
              <span className="e030-comp-val">{fmt(esquinasRes.limA, 2)}</span>
            </div>
            <div className="e030-field-row">
              <label>Condicion X:</label>
              <span style={{ color: condColor(esquinasRes.irregX ? 'IRREG' : 'OK'), fontWeight: 700 }}>
                {esquinasRes.irregX ? 'IRREG' : 'OK'}
              </span>
            </div>
          </div>
          <div>
            <h4 style={{ fontFamily: 'var(--cond)', fontSize: 11, color: '#1f4e79', marginBottom: 6 }}>DIR. Y-Y</h4>
            <div className="e030-field-row">
              <label>Dim. entrante (b):</label>
              <input type="number" className="e030-field-input" value={state.esquinas.bEntrante}
                onChange={e => dispatch({ type: 'SET_ESQUINAS', field: 'bEntrante', value: parseNum(e.target.value) })} />
              <span className="e030-unit">m</span>
            </div>
            <div className="e030-field-row">
              <label>Dim. total (B):</label>
              <input type="number" className="e030-field-input" value={state.esquinas.bTotal}
                onChange={e => dispatch({ type: 'SET_ESQUINAS', field: 'bTotal', value: parseNum(e.target.value) })} />
              <span className="e030-unit">m</span>
            </div>
            <div className="e030-field-row">
              <label>20% de B:</label>
              <span className="e030-comp-val">{fmt(esquinasRes.limB, 2)}</span>
            </div>
            <div className="e030-field-row">
              <label>Condicion Y:</label>
              <span style={{ color: condColor(esquinasRes.irregY ? 'IRREG' : 'OK'), fontWeight: 700 }}>
                {esquinasRes.irregY ? 'IRREG' : 'OK'}
              </span>
            </div>
          </div>
        </div>
        <div className="e030-summary-row" style={{ marginTop: 8 }}>
          <span>Ip Esquinas: <b style={{ color: '#ffc107', fontSize: 13 }}>{esquinasRes.ip}</b></span>
        </div>
      </Section>

      <Section title="3. IRREGULARIDAD POR DISCONTINUIDAD DEL DIAFRAGMA (Ip = 0.85)" dark>
        <p className="e030-hint">Criterio 1: Aberturas &gt; 50% area bruta | Criterio 2: Seccion transversal neta &lt; 50%</p>
        <h4 style={{ fontFamily: 'var(--cond)', fontSize: 11, color: '#2e75b6', marginBottom: 6, marginTop: 12 }}>CRITERIO 1: ABERTURAS &gt; 50% DEL AREA BRUTA</h4>
        <div style={{ maxWidth: 400 }}>
          <div className="e030-field-row">
            <label>Area bruta diafragma:</label>
            <input type="number" className="e030-field-input" value={state.diafragma.areaBruta}
              onChange={e => dispatch({ type: 'SET_DIAFRAGMA', field: 'areaBruta', value: parseNum(e.target.value) })} />
            <span className="e030-unit">m2</span>
          </div>
          <div className="e030-field-row">
            <label>Area de aberturas:</label>
            <input type="number" className="e030-field-input" value={state.diafragma.areaAberturas}
              onChange={e => dispatch({ type: 'SET_DIAFRAGMA', field: 'areaAberturas', value: parseNum(e.target.value) })} />
            <span className="e030-unit">m2</span>
          </div>
          <div className="e030-field-row">
            <label>% Aberturas:</label>
            <span className="e030-comp-val">{fmtPctRaw(diafRes.pctAberturas)}</span>
          </div>
          <div className="e030-field-row">
            <label>Resultado Criterio 1:</label>
            <span style={{ color: condColor(diafRes.crit1), fontWeight: 700 }}>{diafRes.crit1 || '\u2014'}</span>
          </div>
        </div>

        <h4 style={{ fontFamily: 'var(--cond)', fontSize: 11, color: '#2e75b6', marginBottom: 6, marginTop: 16 }}>CRITERIO 2: SECCION TRANSVERSAL NETA &lt; 50%</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 600 }}>
          <div>
            <h5 style={{ fontFamily: 'var(--cond)', fontSize: 10, color: '#2e75b6', marginBottom: 4 }}>DIR. X-X</h5>
            <div className="e030-field-row">
              <label>Dimension total Lx:</label>
              <input type="number" className="e030-field-input" value={state.diafragma.dimLx}
                onChange={e => dispatch({ type: 'SET_DIAFRAGMA', field: 'dimLx', value: parseNum(e.target.value) })} />
              <span className="e030-unit">m</span>
            </div>
            <div className="e030-field-row">
              <label>Sum ancho huecos X:</label>
              <input type="number" className="e030-field-input" value={state.diafragma.sumaHuecosX}
                onChange={e => dispatch({ type: 'SET_DIAFRAGMA', field: 'sumaHuecosX', value: parseNum(e.target.value) })} />
              <span className="e030-unit">m</span>
            </div>
            <div className="e030-field-row">
              <label>Long. neta X:</label>
              <span className="e030-comp-val">{fmt(diafRes.netaX, 2)}</span>
            </div>
            <div className="e030-field-row">
              <label>% Seccion neta X:</label>
              <span className="e030-comp-val">{fmtPctRaw(diafRes.pctNetaX)}</span>
            </div>
            <div className="e030-field-row">
              <label>Resultado X:</label>
              <span style={{ color: condColor(diafRes.crit2X), fontWeight: 700 }}>{diafRes.crit2X || '\u2014'}</span>
            </div>
          </div>
          <div>
            <h5 style={{ fontFamily: 'var(--cond)', fontSize: 10, color: '#2e75b6', marginBottom: 4 }}>DIR. Y-Y</h5>
            <div className="e030-field-row">
              <label>Dimension total Ly:</label>
              <input type="number" className="e030-field-input" value={state.diafragma.dimLy}
                onChange={e => dispatch({ type: 'SET_DIAFRAGMA', field: 'dimLy', value: parseNum(e.target.value) })} />
              <span className="e030-unit">m</span>
            </div>
            <div className="e030-field-row">
              <label>Sum ancho huecos Y:</label>
              <input type="number" className="e030-field-input" value={state.diafragma.sumaHuecosY}
                onChange={e => dispatch({ type: 'SET_DIAFRAGMA', field: 'sumaHuecosY', value: parseNum(e.target.value) })} />
              <span className="e030-unit">m</span>
            </div>
            <div className="e030-field-row">
              <label>Long. neta Y:</label>
              <span className="e030-comp-val">{fmt(diafRes.netaY, 2)}</span>
            </div>
            <div className="e030-field-row">
              <label>% Seccion neta Y:</label>
              <span className="e030-comp-val">{fmtPctRaw(diafRes.pctNetaY)}</span>
            </div>
            <div className="e030-field-row">
              <label>Resultado Y:</label>
              <span style={{ color: condColor(diafRes.crit2Y), fontWeight: 700 }}>{diafRes.crit2Y || '\u2014'}</span>
            </div>
          </div>
        </div>
        <div className="e030-summary-row" style={{ marginTop: 8 }}>
          <span>Ip Diafragma X: <b style={{ color: '#ffc107', fontSize: 13 }}>{diafRes.ipX}</b></span>
          <span>Ip Diafragma Y: <b style={{ color: '#ffc107', fontSize: 13 }}>{diafRes.ipY}</b></span>
        </div>
        <p className="e030-hint" style={{ marginTop: 4, fontSize: 9 }}>Crit.1 aplica a ambas dir. | Crit.2 aplica por direccion</p>
      </Section>

      <Section title="4. IRREGULARIDAD POR SISTEMAS NO PARALELOS (Ip = 0.90)" dark>
        <p className="e030-hint">Elementos NO paralelos a ejes X-Y | Excepciones: angulo &lt; 30 o resisten &lt; 10% cortante piso</p>
        <div className="e030-field-row" style={{ marginBottom: 12 }}>
          <label>Calcular Sistemas No Paralelos?</label>
          <select className="e030-field-input" style={{ width: 80 }}
            value={state.noParalelos.activo ? 'SI' : 'NO'}
            onChange={e => dispatch({ type: 'SET_NO_PARALELOS_ACTIVO', value: e.target.value === 'SI' })}>
            <option value="NO">NO</option>
            <option value="SI">SI</option>
          </select>
        </div>
        {state.noParalelos.activo && (
          <div style={{ overflowX: 'auto' }}>
            <table className="e030-table" style={{ maxWidth: 600 }}>
              <thead>
                <tr>
                  <th style={{ ...S.headerCell, background: '#d9d9d9', color: '#000' }}>Elemento</th>
                  <th style={{ ...S.headerCell, background: '#d9d9d9', color: '#000' }}>Angulo</th>
                  <th style={{ ...S.headerCell, background: '#d9d9d9', color: '#000' }}>V elem</th>
                  <th style={{ ...S.headerCell, background: '#d9d9d9', color: '#000' }}>V piso</th>
                  <th style={{ ...S.headerCell, ...S.compCell }}>% Cort.</th>
                  <th style={S.headerCell}>Verif.</th>
                </tr>
              </thead>
              <tbody>
                {state.noParalelos.elementos.map((el, i) => (
                  <tr key={i}>
                    <td style={{ ...S.cell, ...S.inputCell }}>
                      <input type="text" style={{ ...S.tableInput, textAlign: 'left' }}
                        value={el.nombre}
                        onChange={e => dispatch({ type: 'SET_NO_PARALELOS_ELEM', index: i, field: 'nombre', value: e.target.value })} />
                    </td>
                    <td style={{ ...S.cell, ...S.inputCell }}>
                      <input type="number" style={S.tableInput}
                        value={el.angulo}
                        onChange={e => dispatch({ type: 'SET_NO_PARALELOS_ELEM', index: i, field: 'angulo', value: parseNum(e.target.value) })} />
                    </td>
                    <td style={{ ...S.cell, ...S.inputCell }}>
                      <input type="number" style={S.tableInput}
                        value={el.vElem}
                        onChange={e => dispatch({ type: 'SET_NO_PARALELOS_ELEM', index: i, field: 'vElem', value: parseNum(e.target.value) })} />
                    </td>
                    <td style={{ ...S.cell, ...S.inputCell }}>
                      <input type="number" style={S.tableInput}
                        value={el.vPiso}
                        onChange={e => dispatch({ type: 'SET_NO_PARALELOS_ELEM', index: i, field: 'vPiso', value: parseNum(e.target.value) })} />
                    </td>
                    <td style={{ ...S.cell, ...S.compCell }}>{npRes.rows[i] ? fmtPctRaw(npRes.rows[i].pctCort) : '\u2014'}</td>
                    <td style={{ ...S.cell, color: condColor(npRes.rows[i]?.verif), fontWeight: 700 }}>
                      {npRes.rows[i]?.verif || '\u2014'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="e030-hint" style={{ marginTop: 4 }}>IRREG = angulo &ge; 30 Y V &ge; 10% | REG = angulo &lt; 30 o V &lt; 10%</p>
          </div>
        )}
        <div className="e030-summary-row" style={{ marginTop: 8 }}>
          <span>Existe irregularidad: <b style={{ color: condColor(npRes.irregular ? 'IRREG' : 'OK') }}>
            {npRes.irregular ? 'IRREGULAR' : 'REGULAR'}
          </b></span>
          <span>Ip Sistemas: <b style={{ color: '#ffc107', fontSize: 13 }}>{npRes.ip}</b></span>
        </div>
      </Section>

      <Section title="RESUMEN - FACTOR Ip FINAL">
        <table className="e030-table" style={{ maxWidth: 500 }}>
          <thead>
            <tr>
              <th style={S.headerCell}>Irregularidad</th>
              <th style={S.headerCell}>X-X</th>
              <th style={S.headerCell}>Y-Y</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={S.cell}>1. Torsion (0.75/0.60)</td>
              <td style={S.cell}>{torsionXRes.ipTorsion}</td>
              <td style={S.cell}>{torsionYRes.ipTorsion}</td>
            </tr>
            <tr>
              <td style={S.cell}>2. Esquinas (0.90)</td>
              <td style={S.cell}>{esquinasRes.ip}</td>
              <td style={S.cell}>{esquinasRes.ip}</td>
            </tr>
            <tr>
              <td style={S.cell}>3. Diafragma (0.85)</td>
              <td style={S.cell}>{diafRes.ipX}</td>
              <td style={S.cell}>{diafRes.ipY}</td>
            </tr>
            <tr>
              <td style={S.cell}>4. No Paralelos (0.90)</td>
              <td style={S.cell}>{npRes.ip}</td>
              <td style={S.cell}>{npRes.ip}</td>
            </tr>
            <tr style={{ background: 'rgba(255,193,7,0.15)' }}>
              <td style={{ ...S.cell, fontWeight: 700, fontSize: 12 }}>Ip FINAL</td>
              <td style={{ ...S.cell, fontWeight: 700, fontSize: 13, color: '#ffc107' }}>{ipFinal.ipX}</td>
              <td style={{ ...S.cell, fontWeight: 700, fontSize: 13, color: '#ffc107' }}>{ipFinal.ipY}</td>
            </tr>
          </tbody>
        </table>
      </Section>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  TAB 3: IRREG. ALTURA
// ══════════════════════════════════════════════════════════════
function TabAltura({ state, dispatch }) {
  const { nPisos } = state

  // Rigidez X and Y
  const rigXRes = useMemo(() => {
    const pisos = state.rigidezX.slice(0, nPisos).map(r => ({ Vi: parseNum(r.Vi), CMi: parseNum(r.CMi) }))
    return E030.calcularRigidez(pisos, nPisos)
  }, [state.rigidezX, nPisos])

  const rigYRes = useMemo(() => {
    const pisos = state.rigidezY.slice(0, nPisos).map(r => ({ Vi: parseNum(r.Vi), CMi: parseNum(r.CMi) }))
    return E030.calcularRigidez(pisos, nPisos)
  }, [state.rigidezY, nPisos])

  // Rigidez Extrema
  const rigExtXRes = useMemo(() => E030.calcularRigidezExtrema(rigXRes.Ki, nPisos), [rigXRes.Ki, nPisos])
  const rigExtYRes = useMemo(() => E030.calcularRigidezExtrema(rigYRes.Ki, nPisos), [rigYRes.Ki, nPisos])

  // Resistencia X and Y
  const resXRes = useMemo(() => {
    const pisos = state.resistenciaX.slice(0, nPisos).map(r => ({ Vi: parseNum(r.Vi) }))
    return E030.calcularResistencia(pisos, nPisos)
  }, [state.resistenciaX, nPisos])

  const resYRes = useMemo(() => {
    const pisos = state.resistenciaY.slice(0, nPisos).map(r => ({ Vi: parseNum(r.Vi) }))
    return E030.calcularResistencia(pisos, nPisos)
  }, [state.resistenciaY, nPisos])

  // Resistencia Extrema
  const resExtXRes = useMemo(() => {
    const pisos = state.resistenciaX.slice(0, nPisos).map(r => ({ Vi: parseNum(r.Vi) }))
    return E030.calcularResistenciaExtrema(pisos, nPisos)
  }, [state.resistenciaX, nPisos])

  const resExtYRes = useMemo(() => {
    const pisos = state.resistenciaY.slice(0, nPisos).map(r => ({ Vi: parseNum(r.Vi) }))
    return E030.calcularResistenciaExtrema(pisos, nPisos)
  }, [state.resistenciaY, nPisos])

  // Masa
  const masaRes = useMemo(() => {
    const pisos = state.masas.slice(0, nPisos).map(m => ({ masa: parseNum(m.masa) }))
    return E030.calcularMasa(pisos, nPisos)
  }, [state.masas, nPisos])

  // Geometria X and Y
  const geomXRes = useMemo(() => {
    const pisos = state.geometriaX.slice(0, nPisos).map(g => ({ dim: parseNum(g.dim) }))
    return E030.calcularGeometria(pisos, nPisos)
  }, [state.geometriaX, nPisos])

  const geomYRes = useMemo(() => {
    const pisos = state.geometriaY.slice(0, nPisos).map(g => ({ dim: parseNum(g.dim) }))
    return E030.calcularGeometria(pisos, nPisos)
  }, [state.geometriaY, nPisos])

  const iaFinal = useMemo(() => {
    return E030.calcularIaFinal(rigXRes.ia, rigYRes.ia, rigExtXRes.ia, rigExtYRes.ia, resXRes.ia, resYRes.ia, resExtXRes.ia, resExtYRes.ia, masaRes.ia, geomXRes.ia, geomYRes.ia)
  }, [rigXRes, rigYRes, rigExtXRes, rigExtYRes, resXRes, resYRes, resExtXRes, resExtYRes, masaRes, geomXRes, geomYRes])

  const fmtK = (v) => (v === '' || v == null || v === '---' || isNaN(v)) ? (v === '---' ? '---' : '\u2014') : Number(v).toFixed(1)

  // ── Rigidez Table ──
  const renderRigidezTable = (dir, res, arrayName) => (
    <div style={{ marginBottom: 12 }}>
      <h4 style={{ fontFamily: 'var(--cond)', fontSize: 11, color: '#1f4e79', marginBottom: 6, letterSpacing: 1 }}>DIR. {dir}</h4>
      <div style={{ overflowX: 'auto' }}>
        <table className="e030-table">
          <thead>
            <tr>
              <th style={S.headerCell}>Piso</th>
              <th style={{ ...S.headerCell, ...S.inputCell }}>Vi</th>
              <th style={{ ...S.headerCell, ...S.inputCell }}>CMi</th>
              <th style={{ ...S.headerCell, ...S.compCell }}>Ki</th>
              <th style={{ ...S.headerCell, ...S.compCell }}>0.70K+1</th>
              <th style={{ ...S.headerCell, ...S.compCell }}>0.80Pm3</th>
              <th style={S.headerCell}>Cond</th>
            </tr>
          </thead>
          <tbody>
            {res.rows.map((r, i) => (
              <tr key={i}>
                <td style={S.cell}>{r.piso}</td>
                <td style={{ ...S.cell, ...S.inputCell }}>
                  <input type="number" style={S.tableInput}
                    value={state[arrayName][i]?.Vi ?? ''}
                    onChange={e => dispatch({ type: 'SET_FLOOR_DATA', arrayName, index: i, field: 'Vi', value: parseNum(e.target.value) })} />
                </td>
                <td style={{ ...S.cell, ...S.inputCell }}>
                  <input type="number" step="0.0001" style={S.tableInput}
                    value={state[arrayName][i]?.CMi ?? ''}
                    onChange={e => dispatch({ type: 'SET_FLOOR_DATA', arrayName, index: i, field: 'CMi', value: parseNum(e.target.value) })} />
                </td>
                <td style={{ ...S.cell, ...S.compCell }}>{fmtK(r.Ki)}</td>
                <td style={{ ...S.cell, ...S.compCell }}>{fmtK(r.limit70)}</td>
                <td style={{ ...S.cell, ...S.compCell }}>{fmtK(r.limit80avg)}</td>
                <td style={{ ...S.cell, color: condColor(r.cond), fontWeight: 700 }}>{r.cond || '\u2014'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  // ── Rigidez Extrema Table ──
  const renderRigidezExtremaTable = (dir, res) => (
    <div style={{ marginBottom: 12 }}>
      <h4 style={{ fontFamily: 'var(--cond)', fontSize: 11, color: '#1f4e79', marginBottom: 6, letterSpacing: 1 }}>DIR. {dir}</h4>
      <div style={{ overflowX: 'auto' }}>
        <table className="e030-table">
          <thead>
            <tr>
              <th style={S.headerCell}>Piso</th>
              <th style={{ ...S.headerCell, ...S.compCell }}>Ki</th>
              <th style={{ ...S.headerCell, ...S.compCell }}>0.60K+1</th>
              <th style={{ ...S.headerCell, ...S.compCell }}>0.70Pm3</th>
              <th style={S.headerCell}>Cond</th>
            </tr>
          </thead>
          <tbody>
            {res.rows.map((r, i) => (
              <tr key={i}>
                <td style={S.cell}>{r.piso}</td>
                <td style={{ ...S.cell, ...S.compCell }}>{fmtK(r.Ki)}</td>
                <td style={{ ...S.cell, ...S.compCell }}>{fmtK(r.limit60)}</td>
                <td style={{ ...S.cell, ...S.compCell }}>{fmtK(r.limit70avg)}</td>
                <td style={{ ...S.cell, color: condColor(r.cond), fontWeight: 700 }}>{r.cond || '\u2014'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  // ── Resistencia Table ──
  const renderResistenciaTable = (dir, res, arrayName, factorLabel, limitKey) => (
    <div style={{ marginBottom: 12 }}>
      <h4 style={{ fontFamily: 'var(--cond)', fontSize: 11, color: '#1f4e79', marginBottom: 6, letterSpacing: 1 }}>DIR. {dir}</h4>
      <div style={{ overflowX: 'auto' }}>
        <table className="e030-table">
          <thead>
            <tr>
              <th style={S.headerCell}>Piso</th>
              <th style={{ ...S.headerCell, ...S.inputCell }}>Vi (Tn)</th>
              <th style={{ ...S.headerCell, ...S.compCell }}>{factorLabel}</th>
              <th style={S.headerCell}>Cond</th>
            </tr>
          </thead>
          <tbody>
            {res.rows.map((r, i) => (
              <tr key={i}>
                <td style={S.cell}>{r.piso}</td>
                <td style={{ ...S.cell, ...S.inputCell }}>
                  <input type="number" style={S.tableInput}
                    value={state[arrayName][i]?.Vi ?? ''}
                    onChange={e => dispatch({ type: 'SET_FLOOR_DATA', arrayName, index: i, field: 'Vi', value: parseNum(e.target.value) })} />
                </td>
                <td style={{ ...S.cell, ...S.compCell }}>{fmtK(r[limitKey])}</td>
                <td style={{ ...S.cell, color: condColor(r.cond), fontWeight: 700 }}>{r.cond || '\u2014'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  // ── Resistencia Extrema Table (read-only Vi, linked from resistencia) ──
  const renderResistenciaExtremaTable = (dir, res) => (
    <div style={{ marginBottom: 12 }}>
      <h4 style={{ fontFamily: 'var(--cond)', fontSize: 11, color: '#1f4e79', marginBottom: 6, letterSpacing: 1 }}>DIR. {dir}</h4>
      <div style={{ overflowX: 'auto' }}>
        <table className="e030-table">
          <thead>
            <tr>
              <th style={S.headerCell}>Piso</th>
              <th style={{ ...S.headerCell, ...S.compCell }}>Vi</th>
              <th style={{ ...S.headerCell, ...S.compCell }}>0.65V+1</th>
              <th style={S.headerCell}>Cond</th>
            </tr>
          </thead>
          <tbody>
            {res.rows.map((r, i) => (
              <tr key={i}>
                <td style={S.cell}>{r.piso}</td>
                <td style={{ ...S.cell, ...S.compCell }}>{fmtK(r.Vi)}</td>
                <td style={{ ...S.cell, ...S.compCell }}>{fmtK(r.limit65)}</td>
                <td style={{ ...S.cell, color: condColor(r.cond), fontWeight: 700 }}>{r.cond || '\u2014'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div>
      <Section title="1. IRREGULARIDAD DE RIGIDEZ - PISO BLANDO (Ia = 0.75)">
        <p className="e030-hint">Criterio: Ki &lt; 0.70*K(i+1) o Ki &lt; 0.80*Prom(3 pisos sup.) | Ki = Vi/CMi</p>
        {renderRigidezTable('X-X', rigXRes, 'rigidezX')}
        {renderRigidezTable('Y-Y', rigYRes, 'rigidezY')}
        <div className="e030-summary-row">
          <span>Ia Rigidez X: <b style={{ color: '#ffc107', fontSize: 13 }}>{rigXRes.ia}</b></span>
          <span>Ia Rigidez Y: <b style={{ color: '#ffc107', fontSize: 13 }}>{rigYRes.ia}</b></span>
        </div>
      </Section>

      <Section title="2. IRREGULARIDAD EXTREMA DE RIGIDEZ (Ia = 0.50)" defaultOpen={false}>
        <p className="e030-hint">Criterio: Ki &lt; 0.60*K(i+1) o Ki &lt; 0.70*Prom(3 pisos sup.) | Datos vinculados de seccion 1</p>
        {renderRigidezExtremaTable('X-X', rigExtXRes)}
        {renderRigidezExtremaTable('Y-Y', rigExtYRes)}
        <div className="e030-summary-row">
          <span>Ia Extrema X: <b style={{ color: '#ffc107', fontSize: 13 }}>{rigExtXRes.ia}</b></span>
          <span>Ia Extrema Y: <b style={{ color: '#ffc107', fontSize: 13 }}>{rigExtYRes.ia}</b></span>
        </div>
      </Section>

      <Section title="3. IRREGULARIDAD DE RESISTENCIA - PISO DEBIL (Ia = 0.75)">
        <p className="e030-hint">Criterio: Vi &lt; 0.80*V(i+1) | Vi = RESISTENCIA al corte</p>
        {renderResistenciaTable('X-X', resXRes, 'resistenciaX', '0.80V+1', 'limit80')}
        {renderResistenciaTable('Y-Y', resYRes, 'resistenciaY', '0.80V+1', 'limit80')}
        <div className="e030-summary-row">
          <span>Ia Resist X: <b style={{ color: '#ffc107', fontSize: 13 }}>{resXRes.ia}</b></span>
          <span>Ia Resist Y: <b style={{ color: '#ffc107', fontSize: 13 }}>{resYRes.ia}</b></span>
        </div>
      </Section>

      <Section title="4. IRREGULARIDAD EXTREMA DE RESISTENCIA (Ia = 0.50)" defaultOpen={false}>
        <p className="e030-hint">Criterio: Vi &lt; 0.65*V(i+1) | Datos vinculados de seccion 3</p>
        {renderResistenciaExtremaTable('X-X', resExtXRes)}
        {renderResistenciaExtremaTable('Y-Y', resExtYRes)}
        <div className="e030-summary-row">
          <span>Ia Res.Ext X: <b style={{ color: '#ffc107', fontSize: 13 }}>{resExtXRes.ia}</b></span>
          <span>Ia Res.Ext Y: <b style={{ color: '#ffc107', fontSize: 13 }}>{resExtYRes.ia}</b></span>
        </div>
      </Section>

      <Section title="5. IRREGULARIDAD DE MASA O PESO (Ia = 0.90)">
        <p className="e030-hint">Criterio: mi &gt; 1.50*m(i+1) o mi &gt; 1.50*m(i-1)</p>
        <div style={{ overflowX: 'auto' }}>
          <table className="e030-table" style={{ maxWidth: 500 }}>
            <thead>
              <tr>
                <th style={S.headerCell}>Piso</th>
                <th style={{ ...S.headerCell, ...S.inputCell }}>Masa (Tn)</th>
                <th style={{ ...S.headerCell, ...S.compCell }}>1.50*m+1</th>
                <th style={{ ...S.headerCell, ...S.compCell }}>1.50*m-1</th>
                <th style={S.headerCell}>Cond</th>
              </tr>
            </thead>
            <tbody>
              {masaRes.rows.map((r, i) => (
                <tr key={i}>
                  <td style={S.cell}>{r.piso}</td>
                  <td style={{ ...S.cell, ...S.inputCell }}>
                    <input type="number" style={S.tableInput}
                      value={state.masas[i]?.masa ?? ''}
                      onChange={e => dispatch({ type: 'SET_FLOOR_DATA', arrayName: 'masas', index: i, field: 'masa', value: parseNum(e.target.value) })} />
                  </td>
                  <td style={{ ...S.cell, ...S.compCell }}>{fmtK(r.limit_above)}</td>
                  <td style={{ ...S.cell, ...S.compCell }}>{fmtK(r.limit_below)}</td>
                  <td style={{ ...S.cell, color: condColor(r.cond), fontWeight: 700 }}>{r.cond || '\u2014'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="e030-summary-row">
          <span>Ia Masa: <b style={{ color: '#ffc107', fontSize: 13 }}>{masaRes.ia}</b></span>
        </div>
      </Section>

      <Section title="6. IRREGULARIDAD DE GEOMETRIA VERTICAL (Ia = 0.90)">
        <p className="e030-hint">Criterio: a &gt; 1.30*a(i+1) | a = dimension en planta del elemento resistente</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <h4 style={{ fontFamily: 'var(--cond)', fontSize: 11, color: '#1f4e79', marginBottom: 6, letterSpacing: 1 }}>DIR. X-X</h4>
            <div style={{ overflowX: 'auto' }}>
              <table className="e030-table">
                <thead>
                  <tr>
                    <th style={S.headerCell}>Piso</th>
                    <th style={{ ...S.headerCell, ...S.inputCell }}>a (m)</th>
                    <th style={{ ...S.headerCell, ...S.compCell }}>1.30*a+1</th>
                    <th style={S.headerCell}>Cond</th>
                  </tr>
                </thead>
                <tbody>
                  {geomXRes.rows.map((r, i) => (
                    <tr key={i}>
                      <td style={S.cell}>{r.piso}</td>
                      <td style={{ ...S.cell, ...S.inputCell }}>
                        <input type="number" step="0.1" style={S.tableInput}
                          value={state.geometriaX[i]?.dim ?? ''}
                          onChange={e => dispatch({ type: 'SET_FLOOR_DATA', arrayName: 'geometriaX', index: i, field: 'dim', value: parseNum(e.target.value) })} />
                      </td>
                      <td style={{ ...S.cell, ...S.compCell }}>{fmtK(r.limit130)}</td>
                      <td style={{ ...S.cell, color: condColor(r.cond), fontWeight: 700 }}>{r.cond || '\u2014'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h4 style={{ fontFamily: 'var(--cond)', fontSize: 11, color: '#1f4e79', marginBottom: 6, letterSpacing: 1 }}>DIR. Y-Y</h4>
            <div style={{ overflowX: 'auto' }}>
              <table className="e030-table">
                <thead>
                  <tr>
                    <th style={S.headerCell}>Piso</th>
                    <th style={{ ...S.headerCell, ...S.inputCell }}>a (m)</th>
                    <th style={{ ...S.headerCell, ...S.compCell }}>1.30*a+1</th>
                    <th style={S.headerCell}>Cond</th>
                  </tr>
                </thead>
                <tbody>
                  {geomYRes.rows.map((r, i) => (
                    <tr key={i}>
                      <td style={S.cell}>{r.piso}</td>
                      <td style={{ ...S.cell, ...S.inputCell }}>
                        <input type="number" step="0.1" style={S.tableInput}
                          value={state.geometriaY[i]?.dim ?? ''}
                          onChange={e => dispatch({ type: 'SET_FLOOR_DATA', arrayName: 'geometriaY', index: i, field: 'dim', value: parseNum(e.target.value) })} />
                      </td>
                      <td style={{ ...S.cell, ...S.compCell }}>{fmtK(r.limit130)}</td>
                      <td style={{ ...S.cell, color: condColor(r.cond), fontWeight: 700 }}>{r.cond || '\u2014'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="e030-summary-row">
          <span>Ia Geom X: <b style={{ color: '#ffc107', fontSize: 13 }}>{geomXRes.ia}</b></span>
          <span>Ia Geom Y: <b style={{ color: '#ffc107', fontSize: 13 }}>{geomYRes.ia}</b></span>
        </div>
      </Section>

      <Section title="RESUMEN - FACTOR Ia FINAL">
        <table className="e030-table" style={{ maxWidth: 500 }}>
          <thead>
            <tr>
              <th style={S.headerCell}>Irregularidad</th>
              <th style={S.headerCell}>X-X</th>
              <th style={S.headerCell}>Y-Y</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={S.cell}>1. Rigidez (0.75)</td><td style={S.cell}>{rigXRes.ia}</td><td style={S.cell}>{rigYRes.ia}</td></tr>
            <tr><td style={S.cell}>2. Rigidez Extrema (0.50)</td><td style={S.cell}>{rigExtXRes.ia}</td><td style={S.cell}>{rigExtYRes.ia}</td></tr>
            <tr><td style={S.cell}>3. Resistencia (0.75)</td><td style={S.cell}>{resXRes.ia}</td><td style={S.cell}>{resYRes.ia}</td></tr>
            <tr><td style={S.cell}>4. Resist. Extrema (0.50)</td><td style={S.cell}>{resExtXRes.ia}</td><td style={S.cell}>{resExtYRes.ia}</td></tr>
            <tr><td style={S.cell}>5. Masa (0.90)</td><td style={S.cell}>{masaRes.ia}</td><td style={S.cell}>{masaRes.ia}</td></tr>
            <tr><td style={S.cell}>6. Geometria (0.90)</td><td style={S.cell}>{geomXRes.ia}</td><td style={S.cell}>{geomYRes.ia}</td></tr>
            <tr style={{ background: 'rgba(255,193,7,0.15)' }}>
              <td style={{ ...S.cell, fontWeight: 700, fontSize: 12 }}>Ia FINAL</td>
              <td style={{ ...S.cell, fontWeight: 700, fontSize: 13, color: '#c00' }}>{iaFinal.iaX}</td>
              <td style={{ ...S.cell, fontWeight: 700, fontSize: 13, color: '#c00' }}>{iaFinal.iaY}</td>
            </tr>
          </tbody>
        </table>
      </Section>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  TAB 4: RESUMEN
// ══════════════════════════════════════════════════════════════
function TabResumen({ state, RoX, RoY, factor, Rx, Ry, iaX, iaY, ipX, ipY, iaDetails, ipDetails, derivaResX, derivaResY }) {
  return (
    <div>
      <Section title="IRREGULARIDADES EN ALTURA (Ia) - Tabla N.8">
        <table className="e030-table" style={{ maxWidth: 600 }}>
          <thead>
            <tr>
              <th style={S.headerCell}>Verificacion</th>
              <th style={S.headerCell}>X-X</th>
              <th style={S.headerCell}>Y-Y</th>
              <th style={S.headerCell}>Adoptado</th>
            </tr>
          </thead>
          <tbody>
            {iaDetails.map((d, i) => (
              <tr key={i}>
                <td style={{ ...S.cell, textAlign: 'left' }}>{d.nombre}</td>
                <td style={S.cell}>{d.x}</td>
                <td style={S.cell}>{d.y}</td>
                <td style={S.cell}>{Math.min(d.x, d.y)}</td>
              </tr>
            ))}
            <tr style={{ background: 'rgba(255,193,7,0.15)' }}>
              <td style={{ ...S.cell, fontWeight: 700, fontSize: 12 }}>FACTOR Ia FINAL</td>
              <td style={{ ...S.cell, fontWeight: 700, color: '#ffc107' }}>{iaX}</td>
              <td style={{ ...S.cell, fontWeight: 700, color: '#ffc107' }}>{iaY}</td>
              <td style={{ ...S.cell, fontWeight: 700, fontSize: 14, color: '#ffc107' }}>{Math.min(iaX, iaY)}</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="IRREGULARIDADES EN PLANTA (Ip) - Tabla N.9">
        <table className="e030-table" style={{ maxWidth: 600 }}>
          <thead>
            <tr>
              <th style={S.headerCell}>Verificacion</th>
              <th style={S.headerCell}>X-X</th>
              <th style={S.headerCell}>Y-Y</th>
              <th style={S.headerCell}>Adoptado</th>
            </tr>
          </thead>
          <tbody>
            {ipDetails.map((d, i) => (
              <tr key={i}>
                <td style={{ ...S.cell, textAlign: 'left' }}>{d.nombre}</td>
                <td style={S.cell}>{d.x}</td>
                <td style={S.cell}>{d.y}</td>
                <td style={S.cell}>{Math.min(d.x, d.y)}</td>
              </tr>
            ))}
            <tr style={{ background: 'rgba(255,193,7,0.15)' }}>
              <td style={{ ...S.cell, fontWeight: 700, fontSize: 12 }}>FACTOR Ip FINAL</td>
              <td style={{ ...S.cell, fontWeight: 700, color: '#ffc107' }}>{ipX}</td>
              <td style={{ ...S.cell, fontWeight: 700, color: '#ffc107' }}>{ipY}</td>
              <td style={{ ...S.cell, fontWeight: 700, fontSize: 14, color: '#ffc107' }}>{Math.min(ipX, ipY)}</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="CALCULO DEL COEFICIENTE R">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 500, marginBottom: 16 }}>
          <div>
            <div className="e030-field-row"><label>Ro (X-X):</label><span className="e030-comp-val">{RoX}</span></div>
            <div className="e030-field-row"><label>Ia (X-X):</label><span className="e030-comp-val">{iaX}</span></div>
            <div className="e030-field-row"><label>Ip (X-X):</label><span className="e030-comp-val">{ipX}</span></div>
          </div>
          <div>
            <div className="e030-field-row"><label>Ro (Y-Y):</label><span className="e030-comp-val">{RoY}</span></div>
            <div className="e030-field-row"><label>Ia (Y-Y):</label><span className="e030-comp-val">{iaY}</span></div>
            <div className="e030-field-row"><label>Ip (Y-Y):</label><span className="e030-comp-val">{ipY}</span></div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginBottom: 16 }}>
          <div className="e030-r-badge">
            <div className="e030-r-badge-label">R (X-X) = Ro * Ia * Ip</div>
            <div className="e030-r-badge-value">{fmt(Rx, 2)}</div>
          </div>
          <div className="e030-r-badge">
            <div className="e030-r-badge-label">R (Y-Y) = Ro * Ia * Ip</div>
            <div className="e030-r-badge-value">{fmt(Ry, 2)}</div>
          </div>
        </div>
        <p className="e030-hint">Usar estos valores de R en ETABS: Define &gt; Functions &gt; Response Spectrum</p>
      </Section>

      <Section title="VERIFICACION DE DERIVAS MAXIMAS - Art. 32">
        <table className="e030-table" style={{ maxWidth: 600 }}>
          <thead>
            <tr>
              <th style={{ ...S.headerCell, background: '#2e7d32' }}>Direccion</th>
              <th style={{ ...S.headerCell, background: '#2e7d32' }}>D Maxima</th>
              <th style={{ ...S.headerCell, background: '#2e7d32' }}>D Permitida</th>
              <th style={{ ...S.headerCell, background: '#2e7d32' }}>Verificacion</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={S.cell}>X-X</td>
              <td style={S.cell}>{fmt(derivaResX.maxCalc)}</td>
              <td style={S.cell}>{fmt(derivaResX.maxPerm)}</td>
              <td style={{ ...S.cell, color: condColor(derivaResX.cumple), fontWeight: 700 }}>{derivaResX.cumple || '\u2014'}</td>
            </tr>
            <tr>
              <td style={S.cell}>Y-Y</td>
              <td style={S.cell}>{fmt(derivaResY.maxCalc)}</td>
              <td style={S.cell}>{fmt(derivaResY.maxPerm)}</td>
              <td style={{ ...S.cell, color: condColor(derivaResY.cumple), fontWeight: 700 }}>{derivaResY.cumple || '\u2014'}</td>
            </tr>
          </tbody>
        </table>
        <p className="e030-hint" style={{ marginTop: 8 }}>Si NO CUMPLE: rigidizar estructura, aumentar secciones o agregar muros de corte</p>
      </Section>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function IrregularidadesE030({ onBack }) {
  const [state, dispatch] = useReducer(reducer, null, initState)
  const [tab, setTab] = useState('DERIVAS')

  // Derived values
  const RoX = useMemo(() => E030.getRo(state.sistemaX), [state.sistemaX])
  const RoY = useMemo(() => E030.getRo(state.sistemaY), [state.sistemaY])
  const factor = useMemo(() => E030.getFactorDerivas(state.esIrregular), [state.esIrregular])
  const derivaPermX = useMemo(() => E030.DERIVAS_PERMITIDAS[state.materialX] ?? 0.007, [state.materialX])
  const derivaPermY = useMemo(() => E030.DERIVAS_PERMITIDAS[state.materialY] ?? 0.007, [state.materialY])
  const { nPisos } = state

  // ── Compute all Ia factors ──
  const rigXRes = useMemo(() => {
    const pisos = state.rigidezX.slice(0, nPisos).map(r => ({ Vi: parseNum(r.Vi), CMi: parseNum(r.CMi) }))
    return E030.calcularRigidez(pisos, nPisos)
  }, [state.rigidezX, nPisos])

  const rigYRes = useMemo(() => {
    const pisos = state.rigidezY.slice(0, nPisos).map(r => ({ Vi: parseNum(r.Vi), CMi: parseNum(r.CMi) }))
    return E030.calcularRigidez(pisos, nPisos)
  }, [state.rigidezY, nPisos])

  const rigExtXRes = useMemo(() => E030.calcularRigidezExtrema(rigXRes.Ki, nPisos), [rigXRes.Ki, nPisos])
  const rigExtYRes = useMemo(() => E030.calcularRigidezExtrema(rigYRes.Ki, nPisos), [rigYRes.Ki, nPisos])

  const resXRes = useMemo(() => {
    const pisos = state.resistenciaX.slice(0, nPisos).map(r => ({ Vi: parseNum(r.Vi) }))
    return E030.calcularResistencia(pisos, nPisos)
  }, [state.resistenciaX, nPisos])

  const resYRes = useMemo(() => {
    const pisos = state.resistenciaY.slice(0, nPisos).map(r => ({ Vi: parseNum(r.Vi) }))
    return E030.calcularResistencia(pisos, nPisos)
  }, [state.resistenciaY, nPisos])

  const resExtXRes = useMemo(() => {
    const pisos = state.resistenciaX.slice(0, nPisos).map(r => ({ Vi: parseNum(r.Vi) }))
    return E030.calcularResistenciaExtrema(pisos, nPisos)
  }, [state.resistenciaX, nPisos])

  const resExtYRes = useMemo(() => {
    const pisos = state.resistenciaY.slice(0, nPisos).map(r => ({ Vi: parseNum(r.Vi) }))
    return E030.calcularResistenciaExtrema(pisos, nPisos)
  }, [state.resistenciaY, nPisos])

  const masaRes = useMemo(() => {
    const pisos = state.masas.slice(0, nPisos).map(m => ({ masa: parseNum(m.masa) }))
    return E030.calcularMasa(pisos, nPisos)
  }, [state.masas, nPisos])

  const geomXRes = useMemo(() => {
    const pisos = state.geometriaX.slice(0, nPisos).map(g => ({ dim: parseNum(g.dim) }))
    return E030.calcularGeometria(pisos, nPisos)
  }, [state.geometriaX, nPisos])

  const geomYRes = useMemo(() => {
    const pisos = state.geometriaY.slice(0, nPisos).map(g => ({ dim: parseNum(g.dim) }))
    return E030.calcularGeometria(pisos, nPisos)
  }, [state.geometriaY, nPisos])

  const iaFinal = useMemo(() => {
    return E030.calcularIaFinal(rigXRes.ia, rigYRes.ia, rigExtXRes.ia, rigExtYRes.ia, resXRes.ia, resYRes.ia, resExtXRes.ia, resExtYRes.ia, masaRes.ia, geomXRes.ia, geomYRes.ia)
  }, [rigXRes, rigYRes, rigExtXRes, rigExtYRes, resXRes, resYRes, resExtXRes, resExtYRes, masaRes, geomXRes, geomYRes])

  // ── Compute all Ip factors ──
  const derivasInelX = useMemo(() => {
    return state.derivasX.slice(0, nPisos).map(d => {
      const delta = parseNum(d.delta)
      // Note: We need R which depends on Ia/Ip. For torsion check we use Rx
      // But Rx depends on Ia which depends on rigidez etc.
      // This creates a circular dependency. The Excel approach uses R from RESUMEN.
      // We'll compute Rx iteratively (the user would enter final R from RESUMEN)
      // For now use RoX * iaFinal.iaX * ipFinalVal.ipX - but ipFinal depends on torsion...
      // The Excel resolves this by having R pre-computed. In practice, first pass uses Ro.
      // Let's use the current Rx (which uses iaFinal and ipFinal already computed)
      return delta !== '' ? factor * RoX * delta : '' // Use Ro for simplicity in torsion check
    })
  }, [state.derivasX, nPisos, factor, RoX])

  const derivasInelY = useMemo(() => {
    return state.derivasY.slice(0, nPisos).map(d => {
      const delta = parseNum(d.delta)
      return delta !== '' ? factor * RoY * delta : ''
    })
  }, [state.derivasY, nPisos, factor, RoY])

  const torsionXRes = useMemo(() => {
    const pisos = state.torsionX.slice(0, nPisos).map(t => ({
      deltaMax: parseNum(t.deltaMax), deltaProm: parseNum(t.deltaProm),
    }))
    return E030.calcularTorsion(pisos, derivasInelX, derivaPermX, nPisos)
  }, [state.torsionX, derivasInelX, derivaPermX, nPisos])

  const torsionYRes = useMemo(() => {
    const pisos = state.torsionY.slice(0, nPisos).map(t => ({
      deltaMax: parseNum(t.deltaMax), deltaProm: parseNum(t.deltaProm),
    }))
    return E030.calcularTorsion(pisos, derivasInelY, derivaPermY, nPisos)
  }, [state.torsionY, derivasInelY, derivaPermY, nPisos])

  const esquinasRes = useMemo(() => {
    const e = state.esquinas
    return E030.calcularEsquinasEntrantes(parseNum(e.aEntrante), parseNum(e.aTotal), parseNum(e.bEntrante), parseNum(e.bTotal))
  }, [state.esquinas])

  const diafRes = useMemo(() => {
    const d = state.diafragma
    return E030.calcularDiafragma(parseNum(d.areaBruta), parseNum(d.areaAberturas), parseNum(d.dimLx), parseNum(d.sumaHuecosX), parseNum(d.dimLy), parseNum(d.sumaHuecosY))
  }, [state.diafragma])

  const npRes = useMemo(() => {
    const elems = state.noParalelos.elementos.map(e => ({
      nombre: e.nombre, angulo: parseNum(e.angulo), vElem: parseNum(e.vElem), vPiso: parseNum(e.vPiso),
    }))
    return E030.calcularNoParalelos(state.noParalelos.activo, elems)
  }, [state.noParalelos])

  const ipFinal = useMemo(() => {
    return E030.calcularIpFinal(torsionXRes.ipTorsion, torsionYRes.ipTorsion, esquinasRes.ip, diafRes.ipX, diafRes.ipY, npRes.ip)
  }, [torsionXRes, torsionYRes, esquinasRes, diafRes, npRes])

  // ── R calculation ──
  const Rvals = useMemo(() => {
    return E030.calcularR(RoX, RoY, iaFinal.iaX, iaFinal.iaY, ipFinal.ipX, ipFinal.ipY)
  }, [RoX, RoY, iaFinal, ipFinal])

  const Rx = Rvals.Rx
  const Ry = Rvals.Ry

  // ── Drift results with final R ──
  const derivaResultsX = useMemo(() => {
    const pisos = state.derivasX.slice(0, nPisos).map(d => ({ hi: parseNum(d.hi), deltaElastico: parseNum(d.delta) }))
    return E030.calcularDerivas(pisos, nPisos, factor, Rx, derivaPermX)
  }, [state.derivasX, nPisos, factor, Rx, derivaPermX])

  const derivaResultsY = useMemo(() => {
    const pisos = state.derivasY.slice(0, nPisos).map(d => ({ hi: parseNum(d.hi), deltaElastico: parseNum(d.delta) }))
    return E030.calcularDerivas(pisos, nPisos, factor, Ry, derivaPermY)
  }, [state.derivasY, nPisos, factor, Ry, derivaPermY])

  const derivaResX = useMemo(() => E030.resumenDerivas(derivaResultsX), [derivaResultsX])
  const derivaResY = useMemo(() => E030.resumenDerivas(derivaResultsY), [derivaResultsY])

  // ── Summary details for RESUMEN tab ──
  const iaDetails = useMemo(() => [
    { nombre: '1. Rigidez - Piso Blando (0.75)', x: rigXRes.ia, y: rigYRes.ia },
    { nombre: '2. Rigidez Extrema (0.50)', x: rigExtXRes.ia, y: rigExtYRes.ia },
    { nombre: '3. Resistencia - Piso Debil (0.75)', x: resXRes.ia, y: resYRes.ia },
    { nombre: '4. Resistencia Extrema (0.50)', x: resExtXRes.ia, y: resExtYRes.ia },
    { nombre: '5. Masa o Peso (0.90)', x: masaRes.ia, y: masaRes.ia },
    { nombre: '6. Geometria Vertical (0.90)', x: geomXRes.ia, y: geomYRes.ia },
  ], [rigXRes, rigYRes, rigExtXRes, rigExtYRes, resXRes, resYRes, resExtXRes, resExtYRes, masaRes, geomXRes, geomYRes])

  const ipDetails = useMemo(() => [
    { nombre: '1. Torsion (0.75/0.60)', x: torsionXRes.ipTorsion, y: torsionYRes.ipTorsion },
    { nombre: '2. Esquinas Entrantes (0.90)', x: esquinasRes.ip, y: esquinasRes.ip },
    { nombre: '3. Discontinuidad Diafragma (0.85)', x: diafRes.ipX, y: diafRes.ipY },
    { nombre: '4. Sistemas No Paralelos (0.90)', x: npRes.ip, y: npRes.ip },
  ], [torsionXRes, torsionYRes, esquinasRes, diafRes, npRes])

  return (
    <div className="app e030-app">
      <style>{`
        .e030-app { background: var(--bg); color: var(--text0); font-family: var(--sans); }
        .e030-params {
          display: flex; flex-wrap: wrap; align-items: flex-end; gap: 8px;
          padding: 10px 16px; background: var(--surface); border-bottom: 1px solid var(--border);
        }
        .e030-param-group {
          display: flex; flex-direction: column; gap: 2px;
        }
        .e030-param-group label {
          font-size: 8px; color: var(--text3); text-transform: uppercase; letter-spacing: .6px;
          font-weight: 500; font-family: var(--cond);
        }
        .e030-param-group input, .e030-param-group select {
          background: var(--surface3); border: 1px solid rgba(255,255,255,0.1); border-radius: var(--r);
          padding: 4px 6px; color: var(--text0); font-family: var(--mono); font-size: 10px;
          outline: none; min-width: 60px; appearance: none; -webkit-appearance: none;
        }
        .e030-param-group select { min-width: 120px; cursor: pointer; }
        .e030-param-group input:focus, .e030-param-group select:focus {
          border-color: var(--purple); box-shadow: 0 0 0 2px rgba(155,89,182,0.15);
        }
        .e030-param-group input[type=number] { width: 50px; }
        .e030-param-ro .e030-ro-val {
          font-family: var(--mono); font-size: 11px; font-weight: 600; color: var(--text1);
          padding: 4px 8px; background: var(--surface3); border-radius: var(--r);
          border: 1px solid var(--border);
        }
        .e030-param-badge { align-items: center !important; }
        .e030-body {
          flex: 1; overflow-y: auto; padding: 16px 20px;
        }
        .e030-body::-webkit-scrollbar { width: 4px; }
        .e030-body::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }
        .e030-table {
          width: 100%; border-collapse: collapse; border: 1px solid var(--border);
          border-radius: var(--r); overflow: hidden; font-size: 10px;
        }
        .e030-table th, .e030-table td { border: 1px solid var(--border); }
        .e030-table tbody tr:hover { background: rgba(255,255,255,0.02); }
        .e030-summary-row {
          display: flex; flex-wrap: wrap; gap: 16px; align-items: center;
          padding: 8px 12px; background: var(--surface); border-radius: var(--r);
          border: 1px solid var(--border); font-size: 11px; margin-top: 8px;
        }
        .e030-hint {
          font-size: 9px; color: var(--text3); font-style: italic;
          padding: 4px 8px; background: rgba(217,119,6,0.08); border-radius: var(--r);
          border: 1px solid rgba(217,119,6,0.15); margin-bottom: 10px;
        }
        .e030-field-row {
          display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 10px;
        }
        .e030-field-row label {
          min-width: 140px; color: var(--text1); font-size: 10px;
        }
        .e030-field-input {
          background: var(--surface3); border: 1px solid rgba(255,255,255,0.1); border-radius: var(--r);
          padding: 4px 8px; color: var(--text0); font-family: var(--mono); font-size: 10px;
          outline: none; width: 80px; appearance: none; -webkit-appearance: none;
        }
        .e030-field-input:focus {
          border-color: var(--purple); box-shadow: 0 0 0 2px rgba(155,89,182,0.15);
        }
        .e030-unit { font-size: 9px; color: var(--text3); font-family: var(--mono); }
        .e030-comp-val {
          font-family: var(--mono); font-size: 10px; color: var(--teal); font-weight: 500;
        }
        .e030-r-badge {
          text-align: center; padding: 16px 24px; background: rgba(255,193,7,0.1);
          border: 2px solid rgba(255,193,7,0.4); border-radius: var(--r3);
          min-width: 180px;
        }
        .e030-r-badge-label {
          font-size: 10px; color: var(--text2); font-family: var(--cond);
          text-transform: uppercase; letter-spacing: .8px; margin-bottom: 8px;
        }
        .e030-r-badge-value {
          font-size: 28px; font-weight: 700; color: #ffc107; font-family: var(--mono);
        }
      `}</style>

      <header className="topbar">
        <div className="topbar-logo">
          <button className="btn-back" onClick={onBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polygon points="12,2 22,8 22,16 12,22 2,16 2,8" /><line x1="12" y1="2" x2="12" y2="22" /><line x1="2" y1="8" x2="22" y2="16" /><line x1="2" y1="16" x2="22" y2="8" />
          </svg>
          <span className="topbar-title">Column<span>Seis</span></span>
        </div>
        <div className="topbar-nav">
          {['DERIVAS', 'IRREG. PLANTA', 'IRREG. ALTURA', 'RESUMEN'].map(t => (
            <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
        <div className="topbar-badges">
          <span className="badge norm">NTE E.030</span>
          <span className="badge accent">v1.0</span>
        </div>
      </header>

      <ParamsBar state={state} dispatch={dispatch} RoX={RoX} RoY={RoY} factor={factor} Rx={Rx} Ry={Ry} />

      <div className="e030-body">
        {tab === 'DERIVAS' && (
          <TabDerivas state={state} dispatch={dispatch} factor={factor} Rx={Rx} Ry={Ry}
            derivaPermX={derivaPermX} derivaPermY={derivaPermY} />
        )}
        {tab === 'IRREG. PLANTA' && (
          <TabPlanta state={state} dispatch={dispatch} factor={factor} Rx={Rx} Ry={Ry}
            derivaPermX={derivaPermX} derivaPermY={derivaPermY} RoX={RoX} RoY={RoY} />
        )}
        {tab === 'IRREG. ALTURA' && (
          <TabAltura state={state} dispatch={dispatch} />
        )}
        {tab === 'RESUMEN' && (
          <TabResumen state={state} RoX={RoX} RoY={RoY} factor={factor} Rx={Rx} Ry={Ry}
            iaX={iaFinal.iaX} iaY={iaFinal.iaY} ipX={ipFinal.ipX} ipY={ipFinal.ipY}
            iaDetails={iaDetails} ipDetails={ipDetails}
            derivaResX={derivaResX} derivaResY={derivaResY} />
        )}
      </div>
    </div>
  )
}
