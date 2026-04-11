import { useState, useReducer, useMemo, useCallback, useRef } from 'react'
import * as E030 from '../utils/irregularidadesE030'
import * as Espectro from '../utils/espectroE030'
import { parseExcelFile, parseClipboardText, isETABSTable } from '../utils/etabsDriftsParser'

const MAX_PISOS = 20

// ── Helpers ──
const parseNum = v => { const n = parseFloat(v); return isNaN(n) ? '' : n }
const fmt = (v, d = 5) => (v === '' || v == null || isNaN(v)) ? '\u2014' : Number(v).toFixed(d)
const fmtPct = v => (v === '' || v == null || isNaN(v)) ? '\u2014' : (Number(v) * 100).toFixed(1) + '%'
const fmtPctRaw = v => (v === '' || v == null || isNaN(v)) ? '\u2014' : Number(v).toFixed(1) + '%'
const pisoLabel = (idx, nPisos) => idx === nPisos - 1 ? 'Azotea' : (nPisos - idx)

/**
 * Descarga texto como .txt — compatible con Brave, Chrome, Edge, Firefox, Safari.
 * Usa iframe oculto con blob URL para evitar que Brave Shields bloquee la descarga.
 */
function descargarTxt(contenido, nombre) {
  const fileName = nombre.endsWith('.txt') ? nombre : nombre + '.txt'
  const blob = new Blob([contenido], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)

  // Crear iframe oculto que ejecuta la descarga
  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  document.body.appendChild(iframe)

  try {
    const iframeDoc = iframe.contentWindow.document
    iframeDoc.open()
    iframeDoc.write('<html><head></head><body></body></html>')
    iframeDoc.close()

    const a = iframeDoc.createElement('a')
    a.href = url
    a.download = fileName
    iframeDoc.body.appendChild(a)
    a.click()
  } catch (e) {
    // Fallback: descarga directa desde el documento principal
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => document.body.removeChild(a), 500)
  }

  setTimeout(() => {
    document.body.removeChild(iframe)
    URL.revokeObjectURL(url)
  }, 2000)
}

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
    noParalelos: { activo: false, dx: '', dy: '', elementos: Array.from({ length: 3 }, () => ({ nombre: '', vx: '', vy: '', npX: false, npY: false })) },
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
    case 'SET_NO_PARALELOS_GLOBAL': return { ...state, noParalelos: { ...state.noParalelos, [action.field]: action.value } }
    case 'SET_NO_PARALELOS_ELEM': {
      const elems = [...state.noParalelos.elementos]
      elems[action.index] = { ...elems[action.index], [action.field]: action.value }
      return { ...state, noParalelos: { ...state.noParalelos, elementos: elems } }
    }
    case 'ADD_NO_PARALELOS_ELEM': {
      return { ...state, noParalelos: { ...state.noParalelos, elementos: [...state.noParalelos.elementos, { nombre: '', vx: '', vy: '', npX: false, npY: false }] } }
    }
    case 'DEL_NO_PARALELOS_ELEM': {
      const elems = state.noParalelos.elementos.filter((_, i) => i !== action.index)
      return { ...state, noParalelos: { ...state.noParalelos, elementos: elems.length > 0 ? elems : [{ nombre: '', angulo: '', vElem: '', vPiso: '' }] } }
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

function applyETABSData(datos, arrayName, dispatch, nPisos) {
  for (let i = 0; i < datos.length && i < nPisos; i++) {
    dispatch({ type: 'SET_FLOOR_DATA', arrayName, index: i, field: 'hi', value: datos[i].hiCm || 280 })
    dispatch({ type: 'SET_FLOOR_DATA', arrayName, index: i, field: 'delta', value: datos[i].drift })
  }
}

function TabDerivas({ state, dispatch, factor, Rx, Ry, derivaPermX, derivaPermY }) {
  const { nPisos } = state
  const fileRef = useRef(null)
  const [importMsg, setImportMsg] = useState(null) // {type:'ok'|'err', text}
  const [pasteMode, setPasteMode] = useState(false)
  const pasteRef = useRef(null)

  // ── Import Excel ──
  const handleFileImport = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportMsg(null)
    try {
      const buf = await file.arrayBuffer()
      const result = parseExcelFile(buf)
      if (result.error) { setImportMsg({ type: 'err', text: result.error }); return }
      // Adjust nPisos
      if (result.numPisos > 0 && result.numPisos <= 20) {
        dispatch({ type: 'SET_FIELD', field: 'nPisos', value: result.numPisos })
      }
      const np = Math.min(result.numPisos, 20)
      if (result.datosX.length > 0) applyETABSData(result.datosX, 'derivasX', dispatch, np)
      if (result.datosY.length > 0) applyETABSData(result.datosY, 'derivasY', dispatch, np)
      const xn = result.datosX.length, yn = result.datosY.length
      setImportMsg({ type: 'ok', text: `Importados ${np} pisos (X: ${xn}, Y: ${yn} filas)` })
    } catch (err) {
      setImportMsg({ type: 'err', text: 'Error leyendo archivo: ' + (err.message || err) })
    }
    if (fileRef.current) fileRef.current.value = ''
  }, [dispatch])

  // ── Paste handler ──
  const handlePaste = useCallback((e) => {
    const text = (e.clipboardData || window.clipboardData)?.getData('text/plain')
    if (!text || !text.trim()) return

    // Check if it's a full ETABS table
    if (isETABSTable(text)) {
      e.preventDefault()
      const result = parseClipboardText(text)
      if (result.error) { setImportMsg({ type: 'err', text: result.error }); return }
      if (result.numPisos > 0 && result.numPisos <= 20) {
        dispatch({ type: 'SET_FIELD', field: 'nPisos', value: result.numPisos })
      }
      const np = Math.min(result.numPisos, 20)
      if (result.datosX.length > 0) applyETABSData(result.datosX, 'derivasX', dispatch, np)
      if (result.datosY.length > 0) applyETABSData(result.datosY, 'derivasY', dispatch, np)
      setImportMsg({ type: 'ok', text: `Pegados ${np} pisos (X: ${result.datosX.length}, Y: ${result.datosY.length})` })
      setPasteMode(false)
      return
    }

    // Simple column paste: numbers separated by newlines
    const lines = text.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    if (lines.length > 1 && lines.every(l => !isNaN(parseFloat(l)))) {
      e.preventDefault()
      // Find which input is focused to determine column
      const active = document.activeElement
      const arrayName = active?.dataset?.array
      const field = active?.dataset?.field
      const startIdx = parseInt(active?.dataset?.idx)
      if (arrayName && field && !isNaN(startIdx)) {
        for (let i = 0; i < lines.length && (startIdx + i) < nPisos; i++) {
          dispatch({ type: 'SET_FLOOR_DATA', arrayName, index: startIdx + i, field, value: parseNum(lines[i]) })
        }
        setImportMsg({ type: 'ok', text: `Pegados ${Math.min(lines.length, nPisos - startIdx)} valores en ${field}` })
      }
    }
  }, [dispatch, nPisos])

  // ── Paste from textarea ──
  const handleTextareaPaste = useCallback((e) => {
    setTimeout(() => {
      const text = pasteRef.current?.value
      if (!text?.trim()) return
      const result = parseClipboardText(text)
      if (result.error) { setImportMsg({ type: 'err', text: result.error }); return }
      if (result.numPisos > 0 && result.numPisos <= 20) {
        dispatch({ type: 'SET_FIELD', field: 'nPisos', value: result.numPisos })
      }
      const np = Math.min(result.numPisos, 20)
      if (result.datosX.length > 0) applyETABSData(result.datosX, 'derivasX', dispatch, np)
      if (result.datosY.length > 0) applyETABSData(result.datosY, 'derivasY', dispatch, np)
      setImportMsg({ type: 'ok', text: `Pegados ${np} pisos (X: ${result.datosX.length}, Y: ${result.datosY.length})` })
      setPasteMode(false)
      if (pasteRef.current) pasteRef.current.value = ''
    }, 50)
  }, [dispatch])

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
    <div style={{ marginBottom: 16 }} onPaste={handlePaste}>
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
                    data-array={arrayName} data-field="hi" data-idx={i}
                    value={state[arrayName][i]?.hi ?? ''}
                    onChange={e => dispatch({ type: 'SET_FLOOR_DATA', arrayName, index: i, field: 'hi', value: parseNum(e.target.value) })} />
                </td>
                <td style={{ ...S.cell, ...S.inputCell }}>
                  <input type="number" step="0.000001" style={S.tableInput}
                    data-array={arrayName} data-field="delta" data-idx={i}
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
      {/* ── Import bar ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12,
        padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--r2)',
      }}>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
          onChange={handleFileImport} />
        <button style={{
          padding: '6px 12px', fontSize: 10, fontFamily: 'var(--cond)', fontWeight: 600,
          borderRadius: 'var(--r)', border: '1px solid rgba(68,114,196,0.4)',
          background: 'rgba(68,114,196,0.15)', color: '#64b5f6', cursor: 'pointer',
          letterSpacing: '.3px',
        }} onClick={() => fileRef.current?.click()}>
          Importar Excel ETABS
        </button>
        <button style={{
          padding: '6px 12px', fontSize: 10, fontFamily: 'var(--cond)', fontWeight: 600,
          borderRadius: 'var(--r)', border: '1px solid rgba(156,39,176,0.4)',
          background: pasteMode ? 'rgba(156,39,176,0.25)' : 'rgba(156,39,176,0.12)',
          color: '#ce93d8', cursor: 'pointer', letterSpacing: '.3px',
        }} onClick={() => setPasteMode(!pasteMode)}>
          {pasteMode ? 'Cerrar zona de pegado' : 'Pegar desde ETABS'}
        </button>
        <span style={{ fontSize: 8, color: 'var(--text3)', fontFamily: 'var(--cond)' }}>
          Tambien: Ctrl+V directo en celdas de la tabla
        </span>
        {importMsg && (
          <span style={{
            fontSize: 9, fontFamily: 'var(--cond)', fontWeight: 600, marginLeft: 'auto',
            padding: '3px 10px', borderRadius: 'var(--r)',
            background: importMsg.type === 'ok' ? 'rgba(46,125,50,0.15)' : 'rgba(198,40,40,0.15)',
            color: importMsg.type === 'ok' ? '#4caf50' : '#ef5350',
            border: `1px solid ${importMsg.type === 'ok' ? 'rgba(46,125,50,0.3)' : 'rgba(198,40,40,0.3)'}`,
          }}>
            {importMsg.text}
          </span>
        )}
      </div>

      {/* ── Paste zone ── */}
      {pasteMode && (
        <div style={{
          marginBottom: 12, padding: '10px 14px', background: 'var(--surface)',
          border: '1px dashed rgba(156,39,176,0.4)', borderRadius: 'var(--r2)',
        }}>
          <div style={{ fontSize: 9, color: 'var(--text2)', marginBottom: 6, fontFamily: 'var(--cond)' }}>
            Copie las filas de Story Drifts en ETABS (Ctrl+C) y pegue aqui (Ctrl+V). Se detecta automaticamente la direccion X/Y.
          </div>
          <textarea ref={pasteRef} onPaste={handleTextareaPaste}
            placeholder="Pegue aqui los datos de ETABS (Ctrl+V)..."
            style={{
              width: '100%', minHeight: 80, maxHeight: 160, resize: 'vertical',
              background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 'var(--r)',
              color: 'var(--text0)', fontFamily: 'var(--mono)', fontSize: 9, padding: 8, outline: 'none',
            }} />
        </div>
      )}

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
      nombre: e.nombre, vx: parseNum(e.vx), vy: parseNum(e.vy), npX: e.npX, npY: e.npY,
    }))
    return E030.calcularNoParalelos(state.noParalelos.activo, elems)
  }, [state.noParalelos])

  const ipFinal = useMemo(() => {
    return E030.calcularIpFinal(torsionXRes.ipTorsion, torsionYRes.ipTorsion, esquinasRes.ipX, esquinasRes.ipY, diafRes.ipX, diafRes.ipY, npRes.ipX, npRes.ipY)
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
          <span>Ip Esquinas X-X: <b style={{ color: '#ffc107', fontSize: 13 }}>{esquinasRes.ipX}</b></span>
          <span>Ip Esquinas Y-Y: <b style={{ color: '#ffc107', fontSize: 13 }}>{esquinasRes.ipY}</b></span>
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
        <p className="e030-hint">Ingresar la direccion del sistema no paralelo (dX, dY), luego los cortantes de TODOS los elementos. Marcar con NP los que son "no paralelos".</p>
        <div className="e030-field-row" style={{ marginBottom: 12 }}>
          <label>Calcular Sistemas No Paralelos?</label>
          <select className="e030-field-input" style={{ width: 80 }}
            value={state.noParalelos.activo ? 'SI' : 'NO'}
            onChange={e => dispatch({ type: 'SET_NO_PARALELOS_ACTIVO', value: e.target.value === 'SI' })}>
            <option value="NO">NO</option>
            <option value="SI">SI</option>
          </select>
        </div>
        {state.noParalelos.activo && (() => {
          const gdx = parseNum(state.noParalelos.dx) || 0
          const gdy = parseNum(state.noParalelos.dy) || 0
          const angG = E030.calcularAnguloGlobal(gdx, gdy)
          const angBg = angG.theta == null ? '' : (angG.theta >= 15 && angG.theta <= 75) ? 'rgba(198,40,40,0.15)' : 'rgba(46,125,50,0.1)'
          return (<>
            {/* SECCION 1: ANGULO GLOBAL */}
            <div style={{ padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', marginBottom: 14 }}>
              <h4 style={{ fontFamily: 'var(--cond)', fontSize: 11, color: '#90caf9', marginBottom: 8, letterSpacing: .5 }}>ANGULO DEL SISTEMA NO PARALELO</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
                <div className="e030-field-row" style={{ margin: 0 }}>
                  <label>dX (m):</label>
                  <input type="number" className="e030-field-input" style={{ width: 70 }}
                    value={state.noParalelos.dx}
                    onChange={e => dispatch({ type: 'SET_NO_PARALELOS_GLOBAL', field: 'dx', value: parseNum(e.target.value) })} />
                </div>
                <div className="e030-field-row" style={{ margin: 0 }}>
                  <label>dY (m):</label>
                  <input type="number" className="e030-field-input" style={{ width: 70 }}
                    value={state.noParalelos.dy}
                    onChange={e => dispatch({ type: 'SET_NO_PARALELOS_GLOBAL', field: 'dy', value: parseNum(e.target.value) })} />
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 'var(--r)', background: angBg, border: '1px solid var(--border)' }}>
                  {angG.theta != null ? <>&theta; = {angG.theta.toFixed(1)}°</> : '\u2014'}
                </div>
                {angG.cos != null && (
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text2)' }}>
                    cos(&theta;) = {angG.cos.toFixed(4)} &nbsp; sen(&theta;) = {angG.sin.toFixed(4)}
                  </div>
                )}
              </div>
              {angG.theta != null && (
                <div style={{ marginTop: 6, fontSize: 8, fontFamily: 'var(--cond)', color: 'var(--text3)' }}>
                  {angG.theta < 15 && 'Sistema aprox. paralelo a X — no generaria irregularidad tipicamente.'}
                  {angG.theta >= 15 && angG.theta <= 75 && 'Sistema NO paralelo a ambos ejes — verificar cortantes.'}
                  {angG.theta > 75 && 'Sistema aprox. paralelo a Y — no generaria irregularidad tipicamente.'}
                </div>
              )}
            </div>

            {/* TABLA: ELEMENTOS + CHECKBOXES */}
            <h4 style={{ fontFamily: 'var(--cond)', fontSize: 11, color: '#2e75b6', marginBottom: 6, letterSpacing: .5 }}>ELEMENTOS RESISTENTES — CORTANTES Y SELECCION</h4>
            <p className="e030-hint">Vx/Vy = cortante (Tn). NP X/Y = marcar si el elemento es "no paralelo" en esa direccion. V_piso = SUM todos. V_nopar = SUM marcados.</p>
            <div style={{ overflowX: 'auto', marginBottom: 14 }}>
              <table className="e030-table">
                <thead>
                  <tr>
                    <th style={{ ...S.headerCell, width: 22 }}>#</th>
                    <th style={{ ...S.headerCell, ...S.inputCell }}>Elemento</th>
                    <th style={{ ...S.headerCell, ...S.inputCell }}>Vx (Tn)</th>
                    <th style={{ ...S.headerCell, width: 34, background: '#1a3a5c', color: '#64b5f6' }}>NP X</th>
                    <th style={{ ...S.headerCell, ...S.inputCell }}>Vy (Tn)</th>
                    <th style={{ ...S.headerCell, width: 34, background: '#3a1a1a', color: '#ef9a9a' }}>NP Y</th>
                    <th style={{ ...S.headerCell, width: 22 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {state.noParalelos.elementos.map((el, i) => (
                    <tr key={i}>
                      <td style={{ ...S.cell, color: 'var(--text3)', fontSize: 9 }}>{i + 1}</td>
                      <td style={{ ...S.cell, ...S.inputCell }}>
                        <input type="text" style={{ ...S.tableInput, textAlign: 'left' }} placeholder="..."
                          value={el.nombre} onChange={e => dispatch({ type: 'SET_NO_PARALELOS_ELEM', index: i, field: 'nombre', value: e.target.value })} />
                      </td>
                      <td style={{ ...S.cell, ...S.inputCell }}>
                        <input type="number" step={0.1} style={S.tableInput}
                          value={el.vx} onChange={e => dispatch({ type: 'SET_NO_PARALELOS_ELEM', index: i, field: 'vx', value: parseNum(e.target.value) })} />
                      </td>
                      <td style={{ ...S.cell, textAlign: 'center' }}>
                        <input type="checkbox" checked={!!el.npX}
                          onChange={e => dispatch({ type: 'SET_NO_PARALELOS_ELEM', index: i, field: 'npX', value: e.target.checked })}
                          style={{ cursor: 'pointer', accentColor: '#64b5f6' }} />
                      </td>
                      <td style={{ ...S.cell, ...S.inputCell }}>
                        <input type="number" step={0.1} style={S.tableInput}
                          value={el.vy} onChange={e => dispatch({ type: 'SET_NO_PARALELOS_ELEM', index: i, field: 'vy', value: parseNum(e.target.value) })} />
                      </td>
                      <td style={{ ...S.cell, textAlign: 'center' }}>
                        <input type="checkbox" checked={!!el.npY}
                          onChange={e => dispatch({ type: 'SET_NO_PARALELOS_ELEM', index: i, field: 'npY', value: e.target.checked })}
                          style={{ cursor: 'pointer', accentColor: '#ef9a9a' }} />
                      </td>
                      <td style={{ ...S.cell, padding: 2 }}>
                        {state.noParalelos.elementos.length > 1 && (
                          <button onClick={() => dispatch({ type: 'DEL_NO_PARALELOS_ELEM', index: i })}
                            style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 12, padding: '0 4px', lineHeight: 1 }}
                            title="Eliminar">&times;</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={() => dispatch({ type: 'ADD_NO_PARALELOS_ELEM' })}
                style={{ marginTop: 6, padding: '4px 12px', fontSize: 9, fontFamily: 'var(--cond)', fontWeight: 600,
                  borderRadius: 'var(--r)', border: '1px solid rgba(68,114,196,0.4)', cursor: 'pointer',
                  background: 'rgba(68,114,196,0.12)', color: '#64b5f6', letterSpacing: '.3px' }}>
                + Agregar elemento
              </button>
            </div>

            {/* VERIFICACION DE CORTANTES */}
            {npRes.rows.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 10 }}>
                {[{ dir: 'X-X', color: '#64b5f6', vP: npRes.vPisoX, vN: npRes.vNoparX, pct: npRes.pctX, irreg: npRes.irregularX },
                  { dir: 'Y-Y', color: '#ef9a9a', vP: npRes.vPisoY, vN: npRes.vNoparY, pct: npRes.pctY, irreg: npRes.irregularY }].map(d => (
                  <div key={d.dir} style={{ padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r2)' }}>
                    <div style={{ fontFamily: 'var(--cond)', fontSize: 10, color: d.color, fontWeight: 700, marginBottom: 8, letterSpacing: '.5px' }}>DIRECCION {d.dir}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontFamily: 'var(--mono)', fontSize: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text2)' }}>V piso (SUM todos)</span>
                        <span style={{ color: 'var(--text0)', fontWeight: 600 }}>{d.vP.toFixed(1)} Tn</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text2)' }}>V no paral. (SUM marcados)</span>
                        <span style={{ color: d.color, fontWeight: 600 }}>{d.vN.toFixed(1)} Tn</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 4 }}>
                        <span style={{ color: 'var(--text2)' }}>% V_nopar / V_piso</span>
                        <span style={{ color: d.pct >= 10 ? '#ef5350' : '#4caf50', fontWeight: 700 }}>{d.pct.toFixed(1)}%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text2)' }}>&ge;10%?</span>
                        <span style={{ color: d.irreg ? '#ef5350' : '#4caf50', fontWeight: 700 }}>{d.irreg ? 'SI → IRREGULAR' : 'NO → REGULAR'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {angG.theta != null && (
              <div style={{ fontSize: 8, fontFamily: 'var(--mono)', color: 'var(--text3)', marginBottom: 6 }}>
                Angulo del sistema: &theta; = {angG.theta.toFixed(1)}° | cos(&theta;) = {angG.cos.toFixed(4)} | sen(&theta;) = {angG.sin.toFixed(4)}
              </div>
            )}
          </>)
        })()}
        <div className="e030-summary-row" style={{ marginTop: 8 }}>
          <span>Ip No Paralelos X-X: <b style={{ color: '#ffc107', fontSize: 13 }}>{npRes.ipX}</b></span>
          <span>Ip No Paralelos Y-Y: <b style={{ color: '#ffc107', fontSize: 13 }}>{npRes.ipY}</b></span>
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
              <td style={S.cell}>{esquinasRes.ipX}</td>
              <td style={S.cell}>{esquinasRes.ipY}</td>
            </tr>
            <tr>
              <td style={S.cell}>3. Diafragma (0.85)</td>
              <td style={S.cell}>{diafRes.ipX}</td>
              <td style={S.cell}>{diafRes.ipY}</td>
            </tr>
            <tr>
              <td style={S.cell}>4. No Paralelos (0.90)</td>
              <td style={S.cell}>{npRes.ipX}</td>
              <td style={S.cell}>{npRes.ipY}</td>
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
//  TAB 5: ESPECTRO DE PSEUDO-ACELERACIONES (X-X / Y-Y)
// ══════════════════════════════════════════════════════════════
const ZONAS = Object.keys(Espectro.ZONA_Z)
const CATEGORIAS = Espectro.CATEGORIAS_LIST
const SISTEMAS_ESP = Object.keys(Espectro.SISTEMA_RO)

function TabEspectro({ iaCalcX, iaCalcY, ipCalcX, ipCalcY, RoXParam, RoYParam, sistemaXName, sistemaYName }) {
  const [zona, setZona] = useState('Zona 2')
  const [suelo, setSuelo] = useState('S1')
  const [categoria, setCategoria] = useState('C - Comunes')
  const [usaAislamiento, setUsaAislamiento] = useState(false)
  const [uManualD, setUManualD] = useState(1.0)
  const [iaMode, setIaMode] = useState('auto')
  const [ipMode, setIpMode] = useState('auto')
  const [iaManIdx, setIaManIdx] = useState(0)
  const [iaManIdxY, setIaManIdxY] = useState(0)
  const [ipManIdxX, setIpManIdxX] = useState(0)
  const [ipManIdxY, setIpManIdxY] = useState(0)
  const [modoSa, setModoSa] = useState('Sa')
  const [tooltipX, setTooltipX] = useState(null)
  const [tooltipY, setTooltipY] = useState(null)
  const [tablaDir, setTablaDir] = useState('X')
  const svgRefX = useRef(null)
  const svgRefY = useRef(null)

  const hasCalcIa = iaCalcX != null && iaCalcY != null
  const hasCalcIp = ipCalcX != null && ipCalcY != null

  const IaX = (iaMode === 'auto' && hasCalcIa) ? iaCalcX : Espectro.IA_OPTIONS[iaManIdx]?.value ?? 1
  const IaY = (iaMode === 'auto' && hasCalcIa) ? iaCalcY : Espectro.IA_OPTIONS[iaManIdxY]?.value ?? 1
  const IpX = (ipMode === 'auto' && hasCalcIp) ? ipCalcX : Espectro.IP_OPTIONS[ipManIdxX]?.value ?? 1
  const IpY = (ipMode === 'auto' && hasCalcIp) ? ipCalcY : Espectro.IP_OPTIONS[ipManIdxY]?.value ?? 1

  const Z = Espectro.ZONA_Z[zona]
  const zonaNum = parseInt(zona.replace(/\D/g, '')) || 2
  const sKey = suelo
  const sVal = Espectro.SUELO_S[zona]?.[sKey]
  const uResult = useMemo(() => Espectro.calcularFactorU(categoria, zonaNum, usaAislamiento, uManualD), [categoria, zonaNum, usaAislamiento, uManualD])
  const U = uResult.U
  const isA1 = categoria.startsWith('A1')
  const isD = categoria.startsWith('D')
  const isA1Optional = isA1 && zonaNum <= 2
  const isA1Obligatorio = isA1 && zonaNum >= 3
  // Ro viene de la barra superior (por direccion)
  const RoX = RoXParam
  const RoY = RoYParam
  const Tp = Espectro.SUELO_TP[sKey]
  const TL = Espectro.SUELO_TL[sKey]
  const Rx = RoX * IaX * IpX
  const Ry = RoY * IaY * IpY
  const esEMS = sVal == null

  const espX = useMemo(() => esEMS ? [] : Espectro.generarEspectro(Z, U, sVal, RoX, IaX, IpX, Tp, TL), [Z, U, sVal, RoX, IaX, IpX, Tp, TL, esEMS])
  const espY = useMemo(() => esEMS ? [] : Espectro.generarEspectro(Z, U, sVal, RoY, IaY, IpY, Tp, TL), [Z, U, sVal, RoY, IaY, IpY, Tp, TL, esEMS])

  const saMaxX = useMemo(() => espX.length > 0 ? Math.max(...espX.map(p => p.Sa)) : 0, [espX])
  const saMaxY = useMemo(() => espY.length > 0 ? Math.max(...espY.map(p => p.Sa)) : 0, [espY])
  const sagMaxX = useMemo(() => espX.length > 0 ? Math.max(...espX.map(p => p.SaG)) : 0, [espX])
  const sagMaxY = useMemo(() => espY.length > 0 ? Math.max(...espY.map(p => p.SaG)) : 0, [espY])

  // Export state
  const [showExport, setShowExport] = useState(false)
  const [expDir, setExpDir] = useState('X')
  const [expRes, setExpRes] = useState('completo') // 'completo'|'reducido'|'custom'
  const [expDT, setExpDT] = useState(0.05)
  const [expName, setExpName] = useState('')
  const [copied, setCopied] = useState(false)

  const mkParams = (dir) => ({
    zona, Z, suelo: sKey, S: sVal, categoria, U, sistema: dir === 'X' ? sistemaXName : sistemaYName,
    Ro: dir === 'X' ? RoX : RoY, Ia: dir === 'X' ? IaX : IaY, Ip: dir === 'X' ? IpX : IpY,
    R: dir === 'X' ? Rx : Ry, Tp, TL,
  })

  const expDeltaT = expRes === 'completo' ? 0.02 : expRes === 'reducido' ? 0.10 : expDT
  const expContent = useMemo(() => {
    if (!showExport || esEMS) return ''
    const esp = expDir === 'X' ? espX : espY
    if (esp.length === 0) return ''
    return Espectro.exportarETABS(esp, mkParams(expDir), expDir + '-' + expDir, expDeltaT)
  }, [showExport, expDir, expDeltaT, espX, espY, esEMS, zona, sKey, sVal, categoria, U, Rx, Ry, IaX, IaY, IpX, IpY])

  const openExport = (dir) => {
    setExpDir(dir || 'X')
    setExpName(Espectro.generarNombreArchivo(dir + '-' + dir, mkParams(dir)))
    setCopied(false)
    setShowExport(true)
  }

  // Content and filenames for downloads (computed, not blob URLs)
  const dlContentX = useMemo(() => {
    if (esEMS || espX.length === 0) return ''
    return Espectro.exportarETABS(espX, mkParams('X'), 'X-X', expDeltaT)
  }, [espX, esEMS, expDeltaT, zona, sKey, sVal, categoria, U, Rx, IaX, IpX])

  const dlContentY = useMemo(() => {
    if (esEMS || espY.length === 0) return ''
    return Espectro.exportarETABS(espY, mkParams('Y'), 'Y-Y', expDeltaT)
  }, [espY, esEMS, expDeltaT, zona, sKey, sVal, categoria, U, Ry, IaY, IpY])

  const dlNameX = expName || Espectro.generarNombreArchivo('X-X', mkParams('X'))
  const dlNameY = Espectro.generarNombreArchivo('Y-Y', mkParams('Y'))

  const handleCopy = () => {
    if (expDir === 'ambos') {
      const txtX = Espectro.exportarETABS(espX, mkParams('X'), 'X-X', expDeltaT)
      const txtY = Espectro.exportarETABS(espY, mkParams('Y'), 'Y-Y', expDeltaT)
      navigator.clipboard.writeText(txtX + '\r\n\r\n' + txtY)
    } else {
      navigator.clipboard.writeText(expContent)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // SVG chart helpers (shared scale for both charts)
  const W = 560, H = 260
  const pad = { top: 22, right: 20, bottom: 34, left: 48 }
  const cw = W - pad.left - pad.right
  const ch = H - pad.top - pad.bottom

  const yMaxShared = useMemo(() => {
    const vals = modoSa === 'Sa' ? [saMaxX, saMaxY] : [sagMaxX, sagMaxY]
    const m = Math.max(...vals)
    return Math.ceil(m * 10) / 10 || 1
  }, [modoSa, saMaxX, saMaxY, sagMaxX, sagMaxY])

  const xScale = (t) => pad.left + (t / 4.0) * cw
  const yScale = (v) => pad.top + ch - (v / yMaxShared) * ch

  const mkPath = (esp) => esp.map((p, i) => {
    const val = modoSa === 'Sa' ? p.Sa : p.SaG
    return `${i === 0 ? 'M' : 'L'}${xScale(p.T).toFixed(1)},${yScale(val).toFixed(1)}`
  }).join(' ')

  const pathX = useMemo(() => espX.length > 0 ? mkPath(espX) : '', [espX, modoSa, yMaxShared])
  const pathY = useMemo(() => espY.length > 0 ? mkPath(espY) : '', [espY, modoSa, yMaxShared])

  const gridLinesXAxis = [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0]
  const gridLinesYAxis = useMemo(() => {
    const lines = []
    const step = yMaxShared <= 1 ? 0.1 : yMaxShared <= 2 ? 0.2 : yMaxShared <= 5 ? 0.5 : 1.0
    for (let v = 0; v <= yMaxShared + 0.001; v += step) lines.push(+(v.toFixed(2)))
    return lines
  }, [yMaxShared])

  const mkHandleSvgMove = (esp, setTT) => (e) => {
    const ref = esp === espX ? svgRefX : svgRefY
    if (esp.length === 0 || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const mx = (e.clientX - rect.left) * (W / rect.width)
    const my = (e.clientY - rect.top) * (H / rect.height)
    const t = ((mx - pad.left) / cw) * 4.0
    if (t < 0 || t > 4) { setTT(null); return }
    const idx = Math.min(Math.round(t / 0.02), 200)
    const pt = esp[idx]
    if (!pt) { setTT(null); return }
    setTT({ x: mx, y: my, ...pt })
  }

  const selSt = {
    background: 'var(--surface3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--r)',
    padding: '4px 6px', color: 'var(--text0)', fontFamily: 'var(--mono)', fontSize: 10,
    outline: 'none', minWidth: 100, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none',
  }

  const toggleSt = (active) => ({
    padding: '2px 8px', fontSize: 8, fontFamily: 'var(--cond)', fontWeight: 600, borderRadius: 'var(--r)',
    border: active ? '1px solid #2e7d32' : '1px solid var(--border)', cursor: 'pointer',
    background: active ? 'rgba(46,125,50,0.25)' : 'var(--surface3)',
    color: active ? '#4caf50' : 'var(--text3)', letterSpacing: '.4px', transition: 'all .15s',
  })

  // Render a single chart SVG
  const renderChart = (esp, path, color, fillColor, label, R, saMaxVal, sagMaxVal, svgR, tt, setTT) => (
    <div className="esp-chart-wrap">
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
        <span style={{fontSize:10,fontFamily:'var(--cond)',fontWeight:700,color,letterSpacing:'.5px'}}>
          {label} &nbsp;<span style={{fontWeight:400,color:'var(--text2)',fontSize:9}}>R={R.toFixed(2)} | Sa max={(modoSa==='Sa'?saMaxVal:sagMaxVal).toFixed(4)} {modoSa==='Sa'?'m/s2':''}</span>
        </span>
      </div>
      <svg ref={svgR} width="100%" viewBox={`0 0 ${W} ${H}`} style={{cursor:'crosshair'}}
        onMouseMove={mkHandleSvgMove(esp, setTT)} onMouseLeave={() => setTT(null)}>
        {gridLinesYAxis.map(v => (
          <g key={`gy-${v}`}>
            <line x1={pad.left} y1={yScale(v)} x2={W-pad.right} y2={yScale(v)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={pad.left-4} y={yScale(v)+3} fill="var(--text3)" fontSize="7" fontFamily="var(--mono)" textAnchor="end">{v.toFixed(v<1?2:1)}</text>
          </g>
        ))}
        {gridLinesXAxis.map(t => (
          <g key={`gx-${t}`}>
            <line x1={xScale(t)} y1={pad.top} x2={xScale(t)} y2={H-pad.bottom} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={xScale(t)} y={H-pad.bottom+11} fill="var(--text3)" fontSize="7" fontFamily="var(--mono)" textAnchor="middle">{t.toFixed(1)}</text>
          </g>
        ))}
        <text x={W/2} y={H-4} fill="var(--text2)" fontSize="8" fontFamily="var(--cond)" textAnchor="middle">T (s)</text>
        <text x={10} y={H/2} fill="var(--text2)" fontSize="8" fontFamily="var(--cond)" textAnchor="middle" transform={`rotate(-90,10,${H/2})`}>
          {modoSa==='Sa'?'Sa (m/s2)':'Sa/g'}
        </text>
        {/* Breakpoints */}
        <line x1={xScale(0.2*Tp)} y1={pad.top} x2={xScale(0.2*Tp)} y2={H-pad.bottom} stroke="rgba(255,193,7,0.3)" strokeWidth="1" strokeDasharray="3,3" />
        <text x={xScale(0.2*Tp)} y={pad.top-3} fill="#ffc107" fontSize="6" fontFamily="var(--mono)" textAnchor="middle">0.2Tp</text>
        <line x1={xScale(Tp)} y1={pad.top} x2={xScale(Tp)} y2={H-pad.bottom} stroke="rgba(255,152,0,0.4)" strokeWidth="1" strokeDasharray="3,3" />
        <text x={xScale(Tp)} y={pad.top-3} fill="#ff9800" fontSize="6" fontFamily="var(--mono)" textAnchor="middle">Tp={Tp}</text>
        <line x1={xScale(TL)} y1={pad.top} x2={xScale(TL)} y2={H-pad.bottom} stroke="rgba(244,67,54,0.4)" strokeWidth="1" strokeDasharray="3,3" />
        <text x={xScale(TL)} y={pad.top-3} fill="#f44336" fontSize="6" fontFamily="var(--mono)" textAnchor="middle">TL={TL}</text>
        {/* Axes */}
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={H-pad.bottom} stroke="var(--text3)" strokeWidth="1" />
        <line x1={pad.left} y1={H-pad.bottom} x2={W-pad.right} y2={H-pad.bottom} stroke="var(--text3)" strokeWidth="1" />
        {/* Curve */}
        {path && <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />}
        {path && <path d={`${path} L${xScale(4).toFixed(1)},${yScale(0).toFixed(1)} L${xScale(0).toFixed(1)},${yScale(0).toFixed(1)} Z`} fill={fillColor} />}
        {/* Tooltip crosshair */}
        {tt && <>
          <line x1={xScale(tt.T)} y1={pad.top} x2={xScale(tt.T)} y2={H-pad.bottom} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          <circle cx={xScale(tt.T)} cy={yScale(modoSa==='Sa'?tt.Sa:tt.SaG)} r="3" fill={color} />
        </>}
      </svg>
      {tt && (
        <div className="esp-tooltip" style={{left: Math.min(tt.x+12, W-140), top: Math.max(tt.y-50,10)}}>
          T={tt.T.toFixed(2)}s &nbsp; C={tt.C.toFixed(4)}<br/>
          Sa={tt.Sa.toFixed(4)} m/s2 &nbsp; Sa/g={tt.SaG.toFixed(5)}
        </div>
      )}
    </div>
  )

  const activeEsp = tablaDir === 'X' ? espX : espY

  return (
    <div>
      <style>{`
        .esp-top-row { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
        .esp-left-col { flex: 0 0 300px; min-width: 260px; display: flex; flex-direction: column; gap: 10px; }
        .esp-right-col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
        @media(max-width:768px) { .esp-top-row { flex-direction: column; } .esp-left-col { flex: none; } }
        .esp-params-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 10px 12px;
          background: var(--surface); border-radius: var(--r2); border: 1px solid var(--border);
        }
        .esp-param { display: flex; flex-direction: column; gap: 2px; }
        .esp-param label {
          font-size: 7px; color: var(--text3); text-transform: uppercase; letter-spacing: .5px;
          font-weight: 500; font-family: var(--cond);
        }
        .esp-ia-block {
          padding: 8px 10px; background: var(--surface); border-radius: var(--r2);
          border: 1px solid var(--border);
        }
        .esp-ia-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px; }
        .esp-ia-title {
          font-size: 8px; color: var(--text3); text-transform: uppercase; letter-spacing: .5px;
          font-weight: 600; font-family: var(--cond);
        }
        .esp-ia-vals { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-family: var(--mono); font-size: 10px; }
        .esp-ia-val {
          padding: 3px 6px; border-radius: var(--r); text-align: center;
          background: rgba(46,125,50,0.12); border: 1px solid rgba(46,125,50,0.25); color: #4caf50;
        }
        .esp-ia-dir { font-size: 7px; color: var(--text3); display: block; font-family: var(--cond); }
        .esp-calc-table {
          width: 100%; font-size: 9px; font-family: var(--mono); border-collapse: collapse;
          background: var(--surface); border-radius: var(--r2); border: 1px solid var(--border); overflow: hidden;
        }
        .esp-calc-table th {
          padding: 4px 6px; background: #1f4e79; color: #fff; font-size: 8px; font-family: var(--cond);
          text-transform: uppercase; letter-spacing: .5px; font-weight: 600; text-align: center;
        }
        .esp-calc-table td { padding: 3px 6px; border-top: 1px solid var(--border); text-align: center; }
        .esp-calc-table .lbl { text-align: left; color: var(--text2); font-family: var(--cond); font-size: 9px; }
        .esp-calc-table .vx { color: #64b5f6; font-weight: 600; }
        .esp-calc-table .vy { color: #ef9a9a; font-weight: 600; }
        .esp-chart-wrap {
          background: var(--surface); border: 1px solid var(--border); border-radius: var(--r2);
          padding: 8px 10px; position: relative;
        }
        .esp-toggle-wrap { display: flex; gap: 4px; justify-content: flex-end; margin-bottom: 8px; }
        .esp-toggle-btn {
          padding: 2px 8px; font-size: 8px; font-family: var(--mono); border-radius: var(--r);
          border: 1px solid var(--border); cursor: pointer; background: var(--surface3); color: var(--text2);
          font-weight: 500; transition: all .15s;
        }
        .esp-toggle-btn.active { background: #2e75b6; color: #fff; border-color: #2e75b6; }
        .esp-btn-row { display: flex; gap: 6px; flex-wrap: wrap; }
        .esp-btn {
          padding: 5px 10px; font-size: 9px; font-family: var(--cond); font-weight: 600;
          border-radius: var(--r); border: 1px solid rgba(46,125,50,0.4); cursor: pointer;
          background: rgba(46,125,50,0.15); color: #4caf50; letter-spacing: .3px; transition: all .15s;
        }
        .esp-btn:hover { background: rgba(46,125,50,0.3); }
        .esp-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .esp-btn.yy { border-color: rgba(198,40,40,0.4); background: rgba(198,40,40,0.12); color: #ef9a9a; }
        .esp-btn.yy:hover { background: rgba(198,40,40,0.25); }
        .esp-table-wrap {
          max-height: 300px; overflow-y: auto; border: 1px solid var(--border); border-radius: var(--r2);
        }
        .esp-table-wrap::-webkit-scrollbar { width: 4px; }
        .esp-table-wrap::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }
        .esp-warning {
          padding: 8px 12px; background: rgba(198,40,40,0.12); border: 1px solid rgba(198,40,40,0.3);
          border-radius: var(--r2); color: #ef5350; font-size: 10px; font-weight: 600;
          font-family: var(--cond); margin-bottom: 12px;
        }
        .esp-tooltip {
          position: absolute; pointer-events: none; background: rgba(0,0,0,0.92); color: #fff;
          padding: 5px 8px; border-radius: var(--r); font-size: 8px; font-family: var(--mono);
          line-height: 1.5; white-space: nowrap; z-index: 10; border: 1px solid rgba(255,255,255,0.15);
        }
        .esp-dir-tabs { display: flex; gap: 4px; margin-bottom: 6px; }
        .esp-dir-tab {
          padding: 3px 12px; font-size: 9px; font-family: var(--cond); font-weight: 600;
          border-radius: var(--r); border: 1px solid var(--border); cursor: pointer;
          background: var(--surface3); color: var(--text2); transition: all .15s;
        }
        .esp-dir-tab.act-x { background: rgba(68,114,196,0.2); color: #64b5f6; border-color: rgba(68,114,196,0.4); }
        .esp-dir-tab.act-y { background: rgba(198,40,40,0.15); color: #ef9a9a; border-color: rgba(198,40,40,0.3); }
        .esp-charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media(max-width:900px) { .esp-charts-grid { grid-template-columns: 1fr; } }
        .esp-sys-badge {
          font-size: 9px; font-family: var(--mono); padding: 3px 8px; border-radius: var(--r);
          background: var(--surface3); border: 1px solid var(--border); color: var(--text1); text-align: center;
        }
      `}</style>

      {esEMS && (
        <div className="esp-warning">
          Zona 4 + Suelo S4: Se requiere Estudio de Microzonificacion Sismica (EMS). No se puede generar espectro.
        </div>
      )}

      {/* ── TOP ROW: params left + calc table right ── */}
      <div className="esp-top-row">
        <div className="esp-left-col">
          {/* 3 dropdowns (zona, suelo, categoria) — Sistema viene de barra */}
          <div className="esp-params-grid">
            <div className="esp-param">
              <label>Zona Sismica</label>
              <select style={selSt} value={zona} onChange={e => setZona(e.target.value)}>
                {ZONAS.map(z => <option key={z} value={z}>{z} (Z={Espectro.ZONA_Z[z]})</option>)}
              </select>
            </div>
            <div className="esp-param">
              <label>Perfil de Suelo</label>
              <select style={selSt} value={suelo} onChange={e => setSuelo(e.target.value)}>
                {Espectro.PERFILES_SUELO.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="esp-param">
              <label>Categoria</label>
              <select style={selSt} value={categoria} onChange={e => setCategoria(e.target.value)}>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {/* U value display */}
              <div style={{marginTop:3,fontSize:10,fontFamily:'var(--mono)',fontWeight:600,color:'#4caf50'}}>
                U = {U.toFixed(1)}
              </div>
            </div>
            <div className="esp-param">
              <label>Sistema (Barra Sup.)</label>
              <div style={{display:'flex',gap:4,flexDirection:'column'}}>
                <div className="esp-sys-badge"><span style={{color:'#64b5f6'}}>X:</span> {sistemaXName} (Ro={RoX})</div>
                <div className="esp-sys-badge"><span style={{color:'#ef9a9a'}}>Y:</span> {sistemaYName} (Ro={RoY})</div>
              </div>
            </div>
          </div>

          {/* Nota condicional de U */}
          {isA1Obligatorio && (
            <div style={{padding:'6px 10px',background:'rgba(217,119,6,0.12)',border:'1px solid rgba(217,119,6,0.3)',borderRadius:'var(--r2)',fontSize:9,fontFamily:'var(--cond)',color:'#ffa726'}}>
              Nota 1 (Art. 15): Aislamiento sismico <b>obligatorio</b> en Zona {zonaNum}. U = 1.0
            </div>
          )}
          {isA1Optional && (
            <div style={{padding:'8px 10px',background:'rgba(68,114,196,0.1)',border:'1px solid rgba(68,114,196,0.25)',borderRadius:'var(--r2)',fontSize:9,fontFamily:'var(--cond)',color:'#90caf9'}}>
              <div style={{marginBottom:5}}>Nota 1 (Art. 15): En Zona {zonaNum}, el aislamiento sismico es <b>opcional</b> para A1.</div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:8,color:'var(--text2)'}}>Aislamiento sismico:</span>
                <button onClick={() => setUsaAislamiento(true)} style={{
                  padding:'2px 10px',fontSize:8,fontFamily:'var(--cond)',fontWeight:600,borderRadius:'var(--r)',cursor:'pointer',
                  border: usaAislamiento ? '1px solid #2e7d32' : '1px solid var(--border)',
                  background: usaAislamiento ? 'rgba(46,125,50,0.25)' : 'var(--surface3)',
                  color: usaAislamiento ? '#4caf50' : 'var(--text3)',
                }}>SI (U=1.0)</button>
                <button onClick={() => setUsaAislamiento(false)} style={{
                  padding:'2px 10px',fontSize:8,fontFamily:'var(--cond)',fontWeight:600,borderRadius:'var(--r)',cursor:'pointer',
                  border: !usaAislamiento ? '1px solid #c62828' : '1px solid var(--border)',
                  background: !usaAislamiento ? 'rgba(198,40,40,0.15)' : 'var(--surface3)',
                  color: !usaAislamiento ? '#ef9a9a' : 'var(--text3)',
                }}>NO (U=1.5)</button>
              </div>
            </div>
          )}
          {isD && (
            <div style={{padding:'8px 10px',background:'rgba(68,114,196,0.1)',border:'1px solid rgba(68,114,196,0.25)',borderRadius:'var(--r2)',fontSize:9,fontFamily:'var(--cond)',color:'#90caf9'}}>
              <div style={{marginBottom:5}}>Nota 2 (Art. 15): Factor U a criterio del proyectista.</div>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:8,color:'var(--text2)'}}>Factor U:</span>
                <input type="number" min={0.5} max={1.5} step={0.1} value={uManualD}
                  onChange={e => {
                    const v = parseFloat(e.target.value)
                    if (!isNaN(v)) setUManualD(Math.max(0.5, Math.min(1.5, v)))
                  }}
                  style={{width:50,background:'var(--surface3)',border:'1px solid var(--border)',borderRadius:'var(--r)',
                    color:'var(--text0)',fontFamily:'var(--mono)',fontSize:10,padding:'3px 6px',outline:'none',textAlign:'center'}} />
                <span style={{fontSize:7,color:'var(--text3)'}}>(0.5 - 1.5)</span>
              </div>
            </div>
          )}

          {/* Ia auto/manual */}
          <div className="esp-ia-block">
            <div className="esp-ia-header">
              <span className="esp-ia-title">Ia (Altura)</span>
              <div style={{display:'flex',gap:4}}>
                <button style={toggleSt(iaMode==='auto')} onClick={() => setIaMode('auto')} disabled={!hasCalcIa}>Auto</button>
                <button style={toggleSt(iaMode==='manual')} onClick={() => setIaMode('manual')}>Manual</button>
              </div>
            </div>
            {iaMode === 'auto' && hasCalcIa ? (
              <div className="esp-ia-vals">
                <div className="esp-ia-val"><span className="esp-ia-dir">X-X</span>{IaX.toFixed(2)}</div>
                <div className="esp-ia-val"><span className="esp-ia-dir">Y-Y</span>{IaY.toFixed(2)}</div>
              </div>
            ) : (
              <div className="esp-ia-vals">
                <div><span className="esp-ia-dir">X-X</span>
                  <select style={{...selSt,width:'100%',minWidth:0}} value={iaManIdx} onChange={e=>setIaManIdx(+e.target.value)}>
                    {Espectro.IA_OPTIONS.map((o,i)=><option key={i} value={i}>{o.label}</option>)}
                  </select></div>
                <div><span className="esp-ia-dir">Y-Y</span>
                  <select style={{...selSt,width:'100%',minWidth:0}} value={iaManIdxY} onChange={e=>setIaManIdxY(+e.target.value)}>
                    {Espectro.IA_OPTIONS.map((o,i)=><option key={i} value={i}>{o.label}</option>)}
                  </select></div>
              </div>
            )}
            {iaMode==='auto' && !hasCalcIa && <div style={{fontSize:8,color:'var(--amber)',marginTop:4,fontFamily:'var(--cond)'}}>Completa IRREG. ALTURA para usar Auto.</div>}
          </div>

          {/* Ip auto/manual */}
          <div className="esp-ia-block">
            <div className="esp-ia-header">
              <span className="esp-ia-title">Ip (Planta)</span>
              <div style={{display:'flex',gap:4}}>
                <button style={toggleSt(ipMode==='auto')} onClick={() => setIpMode('auto')} disabled={!hasCalcIp}>Auto</button>
                <button style={toggleSt(ipMode==='manual')} onClick={() => setIpMode('manual')}>Manual</button>
              </div>
            </div>
            {ipMode === 'auto' && hasCalcIp ? (
              <div className="esp-ia-vals">
                <div className="esp-ia-val"><span className="esp-ia-dir">X-X</span>{IpX.toFixed(2)}</div>
                <div className="esp-ia-val"><span className="esp-ia-dir">Y-Y</span>{IpY.toFixed(2)}</div>
              </div>
            ) : (
              <div className="esp-ia-vals">
                <div><span className="esp-ia-dir">X-X</span>
                  <select style={{...selSt,width:'100%',minWidth:0}} value={ipManIdxX} onChange={e=>setIpManIdxX(+e.target.value)}>
                    {Espectro.IP_OPTIONS.map((o,i)=><option key={i} value={i}>{o.label}</option>)}
                  </select></div>
                <div><span className="esp-ia-dir">Y-Y</span>
                  <select style={{...selSt,width:'100%',minWidth:0}} value={ipManIdxY} onChange={e=>setIpManIdxY(+e.target.value)}>
                    {Espectro.IP_OPTIONS.map((o,i)=><option key={i} value={i}>{o.label}</option>)}
                  </select></div>
              </div>
            )}
            {ipMode==='auto' && !hasCalcIp && <div style={{fontSize:8,color:'var(--amber)',marginTop:4,fontFamily:'var(--cond)'}}>Completa IRREG. PLANTA para usar Auto.</div>}
          </div>
        </div>

        {/* RIGHT COL: calc table + export */}
        <div className="esp-right-col">
          {!esEMS && (
            <table className="esp-calc-table">
              <thead><tr><th></th><th>Dir X-X</th><th>Dir Y-Y</th></tr></thead>
              <tbody>
                <tr><td className="lbl">Sistema</td><td className="vx" style={{fontSize:8}}>{sistemaXName}</td><td className="vy" style={{fontSize:8}}>{sistemaYName}</td></tr>
                <tr><td className="lbl">Ro</td><td className="vx">{RoX}</td><td className="vy">{RoY}</td></tr>
                <tr><td className="lbl">Ia</td><td className="vx">{IaX.toFixed(2)}</td><td className="vy">{IaY.toFixed(2)}</td></tr>
                <tr><td className="lbl">Ip</td><td className="vx">{IpX.toFixed(2)}</td><td className="vy">{IpY.toFixed(2)}</td></tr>
                <tr><td className="lbl" style={{fontWeight:700}}>R = Ro*Ia*Ip</td><td className="vx" style={{fontWeight:700,fontSize:11}}>{Rx.toFixed(2)}</td><td className="vy" style={{fontWeight:700,fontSize:11}}>{Ry.toFixed(2)}</td></tr>
                <tr><td className="lbl">Sa max (m/s2)</td><td className="vx">{saMaxX.toFixed(4)}</td><td className="vy">{saMaxY.toFixed(4)}</td></tr>
                <tr><td className="lbl">Sa/g max</td><td className="vx">{sagMaxX.toFixed(5)}</td><td className="vy">{sagMaxY.toFixed(5)}</td></tr>
                <tr><td className="lbl" colSpan={3} style={{textAlign:'center',color:'var(--text3)',fontSize:8,paddingTop:4}}>
                  Z={Z} &nbsp; S={sVal?.toFixed(2)} &nbsp; U={U.toFixed(1)} &nbsp; Tp={Tp}s &nbsp; TL={TL}s
                </td></tr>
              </tbody>
            </table>
          )}
          {!esEMS && (
            <div className="esp-btn-row">
              <button className="esp-btn" onClick={() => openExport('X')} disabled={espX.length===0}>Exportar X-X para ETABS</button>
              <button className="esp-btn yy" onClick={() => openExport('Y')} disabled={espY.length===0}>Exportar Y-Y para ETABS</button>
            </div>
          )}
        </div>
      </div>

      {/* ── TWO CHARTS side by side ── */}
      {!esEMS && espX.length > 0 && (
        <>
          <div className="esp-toggle-wrap">
            <button className={`esp-toggle-btn ${modoSa==='Sa'?'active':''}`} onClick={() => setModoSa('Sa')}>Sa (m/s2)</button>
            <button className={`esp-toggle-btn ${modoSa==='SaG'?'active':''}`} onClick={() => setModoSa('SaG')}>Sa/g</button>
          </div>
          <div className="esp-charts-grid">
            {renderChart(espX, pathX, '#4fc3f7', 'rgba(79,195,247,0.08)', 'ESPECTRO X-X', Rx, saMaxX, sagMaxX, svgRefX, tooltipX, setTooltipX)}
            {renderChart(espY, pathY, '#ef9a9a', 'rgba(239,154,154,0.08)', 'ESPECTRO Y-Y', Ry, saMaxY, sagMaxY, svgRefY, tooltipY, setTooltipY)}
          </div>
        </>
      )}

      {/* ── TABLE ── */}
      {!esEMS && espX.length > 0 && (
        <Section title="TABLA DE ESPECTRO (201 puntos)" defaultOpen={false}>
          <div className="esp-dir-tabs">
            <button className={`esp-dir-tab ${tablaDir==='X'?'act-x':''}`} onClick={() => setTablaDir('X')}>Dir X-X (R={Rx.toFixed(2)})</button>
            <button className={`esp-dir-tab ${tablaDir==='Y'?'act-y':''}`} onClick={() => setTablaDir('Y')}>Dir Y-Y (R={Ry.toFixed(2)})</button>
          </div>
          <div className="esp-table-wrap">
            <table className="e030-table">
              <thead><tr>
                <th style={S.headerCell}>T (s)</th><th style={S.headerCell}>C</th>
                <th style={S.headerCell}>Sa (m/s2)</th><th style={S.headerCell}>Sa/g</th>
              </tr></thead>
              <tbody>
                {activeEsp.map((p, i) => (
                  <tr key={i}>
                    <td style={S.cell}>{p.T.toFixed(2)}</td><td style={S.cell}>{p.C.toFixed(4)}</td>
                    <td style={S.cell}>{p.Sa.toFixed(4)}</td><td style={S.cell}>{p.SaG.toFixed(5)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* ── EXPORT MODAL ── */}
      {showExport && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
          onClick={e => { if (e.target === e.currentTarget) setShowExport(false) }}>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--r3)',
            width:'100%',maxWidth:600,maxHeight:'90vh',overflow:'auto',padding:'20px 24px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <span style={{fontFamily:'var(--cond)',fontSize:14,fontWeight:700,color:'var(--text0)',letterSpacing:'.5px'}}>EXPORTAR ESPECTRO PARA ETABS</span>
              <button onClick={() => setShowExport(false)} style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',fontSize:18}}>&times;</button>
            </div>

            {/* Direction */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:8,color:'var(--text3)',fontFamily:'var(--cond)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4}}>Direccion</div>
              <div style={{display:'flex',gap:6}}>
                {[{k:'X',label:'X-X (R='+Rx.toFixed(2)+')',c:'#64b5f6'},{k:'Y',label:'Y-Y (R='+Ry.toFixed(2)+')',c:'#ef9a9a'},{k:'ambos',label:'Ambos (2 archivos)',c:'var(--text1)'}].map(d => (
                  <button key={d.k} onClick={() => { setExpDir(d.k); if(d.k!=='ambos') setExpName(Espectro.generarNombreArchivo(d.k+'-'+d.k,mkParams(d.k))); setCopied(false) }}
                    style={{padding:'4px 12px',fontSize:9,fontFamily:'var(--cond)',fontWeight:600,borderRadius:'var(--r)',cursor:'pointer',
                      border: expDir===d.k ? '1px solid '+d.c : '1px solid var(--border)',
                      background: expDir===d.k ? 'rgba(255,255,255,0.08)' : 'var(--surface3)',
                      color: expDir===d.k ? d.c : 'var(--text3)',
                    }}>{d.label}</button>
                ))}
              </div>
            </div>

            {/* Resolution */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:8,color:'var(--text3)',fontFamily:'var(--cond)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4}}>Resolucion</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                {[{k:'completo',label:'Completo (201 pts, dT=0.02s)'},{k:'reducido',label:'Reducido (41 pts, dT=0.10s)'},{k:'custom',label:'Personalizado'}].map(r => (
                  <button key={r.k} onClick={() => setExpRes(r.k)}
                    style={{padding:'4px 10px',fontSize:9,fontFamily:'var(--cond)',fontWeight:500,borderRadius:'var(--r)',cursor:'pointer',
                      border: expRes===r.k ? '1px solid #4caf50' : '1px solid var(--border)',
                      background: expRes===r.k ? 'rgba(46,125,50,0.15)' : 'var(--surface3)',
                      color: expRes===r.k ? '#4caf50' : 'var(--text3)',
                    }}>{r.label}</button>
                ))}
                {expRes === 'custom' && (
                  <div style={{display:'flex',alignItems:'center',gap:4}}>
                    <span style={{fontSize:8,color:'var(--text2)',fontFamily:'var(--mono)'}}>dT=</span>
                    <input type="number" min={0.01} max={0.50} step={0.01} value={expDT}
                      onChange={e => setExpDT(Math.max(0.01,Math.min(0.50,parseFloat(e.target.value)||0.05)))}
                      style={{width:50,background:'var(--surface3)',border:'1px solid var(--border)',borderRadius:'var(--r)',
                        color:'var(--text0)',fontFamily:'var(--mono)',fontSize:10,padding:'3px 6px',outline:'none',textAlign:'center'}} />
                    <span style={{fontSize:8,color:'var(--text3)',fontFamily:'var(--mono)'}}>s ({Math.floor(4/expDeltaT)+1} pts)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Filename */}
            {expDir !== 'ambos' && (
              <div style={{marginBottom:12}}>
                <div style={{fontSize:8,color:'var(--text3)',fontFamily:'var(--cond)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4}}>Nombre del archivo</div>
                <div style={{display:'flex',alignItems:'center',gap:4}}>
                  <input value={expName} onChange={e => setExpName(e.target.value)}
                    style={{flex:1,background:'var(--surface3)',border:'1px solid var(--border)',borderRadius:'var(--r)',
                      color:'var(--text0)',fontFamily:'var(--mono)',fontSize:10,padding:'5px 8px',outline:'none'}} />
                </div>
              </div>
            )}

            {/* Preview */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:8,color:'var(--text3)',fontFamily:'var(--cond)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4}}>Vista previa</div>
              <pre style={{background:'#0a0b10',border:'1px solid var(--border)',borderRadius:'var(--r)',
                padding:10,fontFamily:'var(--mono)',fontSize:8,color:'var(--text1)',
                maxHeight:180,overflow:'auto',whiteSpace:'pre',lineHeight:1.4,margin:0}}>
                {(() => {
                  const lines = expContent.split('\r\n')
                  if (lines.length <= 30) return expContent
                  const header = lines.filter(l => l.startsWith('$'))
                  const data = lines.filter(l => !l.startsWith('$') && l.trim())
                  const first5 = data.slice(0, 5)
                  const last3 = data.slice(-3)
                  return [...header, ...first5, '...   (' + data.length + ' puntos en total)', ...last3].join('\r\n')
                })()}
              </pre>
            </div>

            {/* ETABS instructions */}
            <div style={{padding:'8px 10px',background:'rgba(68,114,196,0.08)',border:'1px solid rgba(68,114,196,0.2)',
              borderRadius:'var(--r)',marginBottom:14,fontSize:8,fontFamily:'var(--cond)',color:'#90caf9',lineHeight:1.6}}>
              <b>Como importar en ETABS:</b><br/>
              1. Define &gt; Functions &gt; Response Spectrum<br/>
              2. Choose Function Type: "From File"<br/>
              3. Browse &gt; seleccionar el .txt descargado<br/>
              4. Header Lines to Skip: <b>0</b> (las lineas con $ se saltan solas)<br/>
              5. Function is: <b>Period vs Value</b><br/>
              6. Click "Convert to User Defined" (recomendado)
            </div>

            {/* Actions */}
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button onClick={handleCopy}
                style={{padding:'6px 14px',fontSize:10,fontFamily:'var(--cond)',fontWeight:600,borderRadius:'var(--r)',cursor:'pointer',
                  border:'1px solid rgba(155,89,182,0.4)',background:'rgba(155,89,182,0.12)',color:'#ce93d8',letterSpacing:'.3px'}}>
                {copied ? 'Copiado!' : 'Copiar al portapapeles'}
              </button>
              {expDir === 'ambos' ? (<>
                <button onClick={() => { descargarTxt(dlContentX, dlNameX); setTimeout(() => descargarTxt(dlContentY, dlNameY), 500) }}
                  style={{padding:'6px 14px',fontSize:10,fontFamily:'var(--cond)',fontWeight:600,borderRadius:'var(--r)',cursor:'pointer',
                    border:'1px solid rgba(46,125,50,0.5)',background:'rgba(46,125,50,0.2)',color:'#4caf50',letterSpacing:'.3px'}}>
                  Descargar ambos .txt
                </button>
              </>) : (
                <button onClick={() => { descargarTxt(expDir === 'X' ? dlContentX : dlContentY, expDir === 'X' ? dlNameX : dlNameY); setTimeout(() => setShowExport(false), 300) }}
                  style={{padding:'6px 14px',fontSize:10,fontFamily:'var(--cond)',fontWeight:600,borderRadius:'var(--r)',cursor:'pointer',
                    border:'1px solid rgba(46,125,50,0.5)',background:'rgba(46,125,50,0.2)',color:'#4caf50',letterSpacing:'.3px'}}>
                  Descargar .txt
                </button>
              )}
              <button onClick={() => {
                  const txt = expDir === 'ambos' ? (dlContentX + '\r\n\r\n' + dlContentY) : (expDir === 'X' ? dlContentX : dlContentY)
                  const name = expDir === 'X' ? dlNameX : (expDir === 'Y' ? dlNameY : 'Espectro_E030.txt')
                  const w = window.open('', '_blank')
                  if (w) {
                    w.document.write('<html><head><title>' + name + '</title></head><body style="margin:0;padding:16px;background:#1a1d26;color:#e0e0e0;font-family:monospace;font-size:12px;white-space:pre">' +
                      txt.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</body></html>')
                    w.document.close()
                  }
                }}
                style={{padding:'6px 14px',fontSize:10,fontFamily:'var(--cond)',fontWeight:600,borderRadius:'var(--r)',cursor:'pointer',
                  border:'1px solid rgba(217,119,6,0.5)',background:'rgba(217,119,6,0.12)',color:'#ffa726',letterSpacing:'.3px'}}>
                Abrir como texto (Ctrl+S)
              </button>
            </div>
          </div>
        </div>
      )}
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
      nombre: e.nombre, vx: parseNum(e.vx), vy: parseNum(e.vy), npX: e.npX, npY: e.npY,
    }))
    return E030.calcularNoParalelos(state.noParalelos.activo, elems)
  }, [state.noParalelos])

  const ipFinal = useMemo(() => {
    return E030.calcularIpFinal(torsionXRes.ipTorsion, torsionYRes.ipTorsion, esquinasRes.ipX, esquinasRes.ipY, diafRes.ipX, diafRes.ipY, npRes.ipX, npRes.ipY)
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
    { nombre: '2. Esquinas Entrantes (0.90)', x: esquinasRes.ipX, y: esquinasRes.ipY },
    { nombre: '3. Discontinuidad Diafragma (0.85)', x: diafRes.ipX, y: diafRes.ipY },
    { nombre: '4. Sistemas No Paralelos (0.90)', x: npRes.ipX, y: npRes.ipY },
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
          {['DERIVAS', 'IRREG. PLANTA', 'IRREG. ALTURA', 'RESUMEN', 'ESPECTRO'].map(t => (
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
        {tab === 'ESPECTRO' && (
          <TabEspectro iaCalcX={iaFinal.iaX} iaCalcY={iaFinal.iaY} ipCalcX={ipFinal.ipX} ipCalcY={ipFinal.ipY}
            RoXParam={RoX} RoYParam={RoY} sistemaXName={state.sistemaX} sistemaYName={state.sistemaY} />
        )}
      </div>
    </div>
  )
}
