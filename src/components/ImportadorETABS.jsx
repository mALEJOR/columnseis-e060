import { useState, useRef, useCallback } from 'react'
import { useProyecto } from '../context/ProyectoContext'

// xlsx se carga dinámicamente para reducir bundle inicial
let _XLSX = null
async function loadXLSX() {
  if (!_XLSX) _XLSX = await import('xlsx')
  return _XLSX
}

// ══════════════════════════════════════════════════════════════════
//  Detección automática de formato ETABS
// ══════════════════════════════════════════════════════════════════

// Nombres de hojas típicas de ETABS
const ETABS_SHEETS = ['column forces', 'frame forces', 'pier forces', 'story forces']

// Mapeo de columnas ETABS → campos internos
const ETABS_COL_MAP = {
  nombre:  ['label', 'name', 'column', 'pier', 'unique name', 'uniquename', 'frame'],
  story:   ['story', 'nivel', 'level', 'piso'],
  combo:   ['load case', 'load combination', 'loadcase', 'loadcombo', 'combo', 'case', 'outputcase', 'output case'],
  P:       ['p', 'fz', 'axial', 'pu'],
  M2:      ['m2', 'm22', 'muy', 'my'],
  M3:      ['m3', 'm33', 'mux', 'mx'],
}

// Mapeo para CSV simple
const CSV_COL_MAP = {
  nombre: ['nombre', 'name', 'columna', 'column', 'label'],
  eje:    ['eje', 'axis', 'grid'],
  nivel:  ['nivel', 'level', 'story', 'piso'],
  Pu:     ['pu', 'p', 'fz', 'axial'],
  Mux:    ['mux', 'mx', 'm33', 'm3'],
  Muy:    ['muy', 'my', 'm22', 'm2'],
}

function normalizeHeader(h) {
  return String(h).toLowerCase().trim().replace(/[\s_\-]+/g, ' ')
}

function detectMapping(headers, isEtabs) {
  const map = {}
  const norm = headers.map(normalizeHeader)
  const colMap = isEtabs ? ETABS_COL_MAP : CSV_COL_MAP

  for (const [field, aliases] of Object.entries(colMap)) {
    const idx = norm.findIndex(h => aliases.some(a => h === a || h.includes(a)))
    if (idx !== -1) map[field] = idx
  }
  return map
}

function detectUnits(rows, mapping) {
  // Muestrear valores de P para detectar si son kN (> 100 típicamente) o ton
  const pIdx = mapping.P ?? mapping.Pu
  if (pIdx === undefined) return 'ton'

  const vals = rows.slice(0, 50).map(r => Math.abs(parseFloat(r[pIdx]) || 0)).filter(v => v > 0)
  if (vals.length === 0) return 'ton'

  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  // kN típicamente > 50 para columnas de edificios, ton < 50
  // Heurística: si promedio > 80, probablemente kN
  return avg > 80 ? 'kN' : 'ton'
}

function convertValue(val, fromUnit, toUnit) {
  const v = parseFloat(val)
  if (isNaN(v)) return ''
  if (fromUnit === toUnit) return String(v)
  // kN → ton: × 0.102
  if (fromUnit === 'kN' && toUnit === 'ton') return String(+(v * 0.102).toFixed(4))
  // kN·m → ton·m: × 0.102
  if (fromUnit === 'kN-m' && toUnit === 'ton-m') return String(+(v * 0.102).toFixed(4))
  return String(v)
}

// ── Generar plantilla Excel de ejemplo ──
async function descargarPlantilla() {
  const XLSX = await loadXLSX()
  const wb = XLSX.utils.book_new()
  const data = [
    ['Nombre', 'Eje', 'Nivel', 'Combinacion', 'Pu (ton)', 'Mux (ton-m)', 'Muy (ton-m)'],
    ['C-1', 'A-1', '1-2', '1.4CM+1.7CV', 85.2, 3.4, 2.1],
    ['C-1', 'A-1', '1-2', '1.25(CM+CV)+CS', 72.5, 12.8, 8.5],
    ['C-1', 'A-1', '1-2', '1.25(CM+CV)-CS', 72.5, -9.2, -6.3],
    ['C-1', 'A-1', '1-2', '0.9CM+CS', 45.0, 11.5, 7.8],
    ['C-1', 'A-1', '1-2', '0.9CM-CS', 45.0, -8.0, -5.6],
    ['C-2', 'B-1', '1-2', '1.4CM+1.7CV', 120.3, 4.8, 3.2],
    ['C-2', 'B-1', '1-2', '1.25(CM+CV)+CS', 102.0, 18.5, 12.1],
    ['C-2', 'B-1', '1-2', '1.25(CM+CV)-CS', 102.0, -14.2, -9.8],
    ['C-3', 'A-2', '2-3', '1.4CM+1.7CV', 55.0, 2.1, 1.5],
    ['C-3', 'A-2', '2-3', '1.25(CM+CV)+CS', 46.0, 8.5, 5.9],
  ]
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [{ wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, ws, 'Column Forces')
  XLSX.writeFile(wb, 'plantilla_columnseis.xlsx')
}

// ══════════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════
const CAMPOS = [
  { key: 'nombre', label: 'Nombre columna', required: true },
  { key: 'story',  label: 'Nivel / Story' },
  { key: 'combo',  label: 'Combinación de carga' },
  { key: 'P',      label: 'P (Carga axial)', required: true },
  { key: 'M3',     label: 'Mux / M33', required: true },
  { key: 'M2',     label: 'Muy / M22', required: true },
]
const CAMPOS_CSV = [
  { key: 'nombre', label: 'Nombre columna', required: true },
  { key: 'eje',    label: 'Eje' },
  { key: 'nivel',  label: 'Nivel' },
  { key: 'Pu',     label: 'Pu (ton)', required: true },
  { key: 'Mux',    label: 'Mux (ton-m)', required: true },
  { key: 'Muy',    label: 'Muy (ton-m)', required: true },
]

export default function ImportadorETABS({ onClose }) {
  const { columnas, dispatch } = useProyecto()

  // Estado
  const [step, setStep] = useState('drop')  // drop | preview | result
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState([])
  const [rows, setRows] = useState([])
  const [isEtabs, setIsEtabs] = useState(false)
  const [mapping, setMapping] = useState({})
  const [unidadEntrada, setUnidadEntrada] = useState('ton')
  const [modoConflicto, setModoConflicto] = useState('agregar')
  const [resultado, setResultado] = useState(null)

  const fileRef = useRef(null)

  // ── Leer archivo ──
  const processFile = useCallback((file) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const XLSX = await loadXLSX()
        const data = new Uint8Array(e.target.result)
        const wb = XLSX.read(data, { type: 'array' })

        // Detectar hoja ETABS
        let sheetName = wb.SheetNames[0]
        let etabsDetected = false
        for (const sn of wb.SheetNames) {
          if (ETABS_SHEETS.some(es => normalizeHeader(sn).includes(es))) {
            sheetName = sn
            etabsDetected = true
            break
          }
        }

        const ws = wb.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        if (json.length < 2) {
          alert('El archivo no contiene datos suficientes')
          return
        }

        const hdrs = json[0].map(String)
        const dataRows = json.slice(1).filter(r => r.some(c => c !== ''))

        setHeaders(hdrs)
        setRows(dataRows)
        setIsEtabs(etabsDetected)

        // Auto-mapear
        const autoMap = detectMapping(hdrs, etabsDetected)
        setMapping(autoMap)

        // Auto-detectar unidades
        const detectedUnit = detectUnits(dataRows, autoMap)
        setUnidadEntrada(detectedUnit)

        setStep('preview')
      } catch (err) {
        alert('Error al leer el archivo: ' + err.message)
      }
    }
    reader.readAsArrayBuffer(file)
  }, [])

  // ── Drag & Drop ──
  const onDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)
  const onDrop = (e) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }
  const onFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) processFile(file)
  }

  // ── Actualizar mapeo ──
  const setMap = (field, colIdx) => {
    setMapping(prev => {
      const next = { ...prev }
      if (colIdx === '') {
        delete next[field]
      } else {
        next[field] = parseInt(colIdx)
      }
      return next
    })
  }

  // ── Importar datos ──
  const importar = () => {
    const campos = isEtabs ? CAMPOS : CAMPOS_CSV
    const nombreKey = 'nombre'
    const pKey = isEtabs ? 'P' : 'Pu'
    const muxKey = isEtabs ? 'M3' : 'Mux'
    const muyKey = isEtabs ? 'M2' : 'Muy'
    const comboKey = isEtabs ? 'combo' : null
    const storyKey = isEtabs ? 'story' : 'nivel'
    const ejeKey = isEtabs ? null : 'eje'

    if (mapping[nombreKey] === undefined || mapping[pKey] === undefined ||
        mapping[muxKey] === undefined || mapping[muyKey] === undefined) {
      alert('Faltan campos requeridos: Nombre, P, Mux y Muy son obligatorios')
      return
    }

    const unitP = unidadEntrada === 'kN' ? 'kN' : 'ton'
    const unitM = unidadEntrada === 'kN' ? 'kN-m' : 'ton-m'

    // Agrupar por nombre de columna
    const colMap = new Map()
    let errores = 0

    for (const row of rows) {
      const nombre = String(row[mapping[nombreKey]] || '').trim()
      if (!nombre) { errores++; continue }

      const pVal = convertValue(row[mapping[pKey]], unitP, 'ton')
      const muxVal = convertValue(row[mapping[muxKey]], unitM, 'ton-m')
      const muyVal = convertValue(row[mapping[muyKey]], unitM, 'ton-m')

      if (!pVal && !muxVal && !muyVal) { errores++; continue }

      const label = comboKey && mapping[comboKey] !== undefined
        ? String(row[mapping[comboKey]] || `Combo`)
        : `Combo`

      const story = storyKey && mapping[storyKey] !== undefined
        ? String(row[mapping[storyKey]] || '')
        : ''

      const eje = ejeKey && mapping[ejeKey] !== undefined
        ? String(row[mapping[ejeKey]] || '')
        : ''

      if (!colMap.has(nombre)) {
        colMap.set(nombre, { nombre, eje, nivel: story, combinaciones: [] })
      }

      const colData = colMap.get(nombre)
      // Actualizar eje/nivel si viene en una fila posterior con datos
      if (eje && !colData.eje) colData.eje = eje
      if (story && !colData.nivel) colData.nivel = story

      colData.combinaciones.push({
        label,
        Pu: pVal,
        Mux: muxVal,
        Muy: muyVal,
      })
    }

    const columnasImport = [...colMap.values()]
    let totalCombos = columnasImport.reduce((s, c) => s + c.combinaciones.length, 0)

    // Despachar importación
    dispatch({
      type: 'IMPORTAR_COLUMNAS',
      columnas: columnasImport,
      modo: modoConflicto,
    })

    setResultado({
      columnas: columnasImport.length,
      combinaciones: totalCombos,
      errores,
    })
    setStep('result')
  }

  // ══════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="imp-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span className="modal-title">Importar desde ETABS / Excel</span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="imp-body">
          {/* ══ PASO 1: DRAG & DROP ══ */}
          {step === 'drop' && (
            <>
              <div
                className={`imp-dropzone ${dragging ? 'imp-dropzone-active' : ''}`}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              >
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={dragging ? '#4d8aff' : 'var(--text3)'} strokeWidth="1.2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <polyline points="9 15 12 12 15 15" />
                </svg>
                <span className="imp-drop-title">ARRASTRA TU ARCHIVO EXCEL DE ETABS AQUI</span>
                <span className="imp-drop-sub">Formatos soportados: .xlsx, .xls, .csv</span>
              </div>

              <div className="imp-drop-actions">
                <button className="btn-sec imp-btn-file" onClick={() => fileRef.current?.click()}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  O SELECCIONAR ARCHIVO
                </button>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={onFileSelect} />

                <button className="btn-sec" onClick={descargarPlantilla} style={{ fontSize: 10 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  DESCARGAR PLANTILLA
                </button>
              </div>
            </>
          )}

          {/* ══ PASO 2: PREVISUALIZACIÓN ══ */}
          {step === 'preview' && (
            <>
              {/* Info barra */}
              <div className="imp-info-bar">
                <div className="imp-file-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  {fileName}
                </div>
                <span className="imp-rows-badge">{rows.length} registros</span>
                {isEtabs
                  ? <span className="badge-estado badge-green">ETABS DETECTADO</span>
                  : <span className="badge-estado" style={{ background: 'rgba(217,119,6,0.15)', color: '#d97706', border: '1px solid rgba(217,119,6,0.4)' }}>FORMATO PERSONALIZADO</span>
                }
              </div>

              {/* Mapeo de columnas */}
              <div className="imp-mapping-section">
                <div className="imp-section-title">MAPEO DE COLUMNAS</div>
                <div className="imp-mapping-grid">
                  {(isEtabs ? CAMPOS : CAMPOS_CSV).map(campo => (
                    <div key={campo.key} className="imp-map-row">
                      <span className="imp-map-label">
                        {campo.label}
                        {campo.required && <span style={{ color: 'var(--red)', marginLeft: 3 }}>*</span>}
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" style={{ flexShrink: 0 }}>
                        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                      </svg>
                      <select
                        className="imp-map-select"
                        value={mapping[campo.key] ?? ''}
                        onChange={e => setMap(campo.key, e.target.value)}
                      >
                        <option value="">— Sin asignar —</option>
                        {headers.map((h, i) => (
                          <option key={i} value={i}>{h}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selector de unidades */}
              <div className="imp-units-section">
                <div className="imp-section-title">UNIDADES DE ENTRADA</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[
                    { key: 'ton', label: 'Toneladas (ton / ton-m)' },
                    { key: 'kN', label: 'kN (kN / kN-m)' },
                  ].map(u => (
                    <button
                      key={u.key}
                      className={`imp-unit-btn ${unidadEntrada === u.key ? 'active' : ''}`}
                      onClick={() => setUnidadEntrada(u.key)}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
                {unidadEntrada === 'kN' && (
                  <div className="imp-unit-note">Los valores se convertiran automaticamente: kN x 0.102 = ton</div>
                )}
              </div>

              {/* Modo conflicto */}
              <div className="imp-conflict-section">
                <div className="imp-section-title">SI LA COLUMNA YA EXISTE</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className={`imp-unit-btn ${modoConflicto === 'agregar' ? 'active' : ''}`}
                    onClick={() => setModoConflicto('agregar')}
                  >
                    Agregar combinaciones
                  </button>
                  <button
                    className={`imp-unit-btn ${modoConflicto === 'sobreescribir' ? 'active' : ''}`}
                    onClick={() => setModoConflicto('sobreescribir')}
                  >
                    Sobreescribir
                  </button>
                </div>
              </div>

              {/* Tabla previsualización */}
              <div className="imp-section-title" style={{ marginTop: 16 }}>PREVISUALIZACION (PRIMEROS 10 REGISTROS)</div>
              <div className="imp-preview-wrap">
                <table className="dash-table imp-preview-table">
                  <thead>
                    <tr>
                      {headers.map((h, i) => {
                        const mapped = Object.entries(mapping).find(([, v]) => v === i)
                        return (
                          <th key={i}>
                            {h}
                            {mapped && <span className="imp-mapped-tag">{mapped[0]}</span>}
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 10).map((row, ri) => (
                      <tr key={ri} className={ri % 2 === 0 ? 'dash-row-even' : 'dash-row-odd'}>
                        {headers.map((_, ci) => (
                          <td key={ci} style={{ fontSize: 10, fontFamily: 'var(--mono)' }}>
                            {row[ci] != null ? String(row[ci]) : ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Acciones */}
              <div className="imp-preview-actions">
                <button className="btn-sec" onClick={() => { setStep('drop'); setRows([]); setHeaders([]) }}>
                  Volver
                </button>
                <button className="btn-calc" style={{ width: 'auto', padding: '9px 28px', fontSize: 11 }} onClick={importar}>
                  IMPORTAR {rows.length} REGISTROS
                </button>
              </div>
            </>
          )}

          {/* ══ PASO 3: RESULTADO ══ */}
          {step === 'result' && resultado && (
            <div className="imp-result">
              <div className="imp-result-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div className="imp-result-title">IMPORTACION COMPLETADA</div>
              <div className="imp-result-cards">
                <div className="imp-rcard imp-rcard-blue">
                  <div className="imp-rcard-value">{resultado.columnas}</div>
                  <div className="imp-rcard-label">Columnas importadas</div>
                </div>
                <div className="imp-rcard imp-rcard-green">
                  <div className="imp-rcard-value">{resultado.combinaciones}</div>
                  <div className="imp-rcard-label">Combinaciones importadas</div>
                </div>
                <div className="imp-rcard imp-rcard-red">
                  <div className="imp-rcard-value">{resultado.errores}</div>
                  <div className="imp-rcard-label">Errores</div>
                </div>
              </div>
              <button className="btn-calc" style={{ width: 'auto', padding: '10px 32px', fontSize: 11, marginTop: 20 }} onClick={onClose}>
                CERRAR
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
