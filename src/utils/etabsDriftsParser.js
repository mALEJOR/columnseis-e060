// ═══════════════════════════════════════════════════════════════
// Parser de Story Drifts exportados desde ETABS
// Soporta: archivos Excel (.xlsx/.xls) y texto pegado (clipboard)
// ═══════════════════════════════════════════════════════════════
import * as XLSX from 'xlsx'

const HEADER_KEYWORDS = ['story', 'drift', 'direction', 'output case']

function norm(s) { return String(s || '').toLowerCase().trim() }

function findHeaderRow(rows, maxScan = 20) {
  for (let r = 0; r < Math.min(maxScan, rows.length); r++) {
    const cells = (rows[r] || []).map(norm)
    const hits = HEADER_KEYWORDS.filter(kw => cells.some(c => c.includes(kw)))
    if (hits.length >= 2) return r
  }
  return -1
}

function mapColumns(headerRow) {
  const h = headerRow.map(norm)
  return {
    story:     h.findIndex(c => c === 'story'),
    outCase:   h.findIndex(c => c.includes('output') && c.includes('case')),
    caseType:  h.findIndex(c => c.includes('case') && c.includes('type')),
    stepType:  h.findIndex(c => c.includes('step') && c.includes('type')),
    direction: h.findIndex(c => c === 'direction'),
    drift:     h.findIndex(c => c === 'drift'),
    driftInv:  h.findIndex(c => /^drift[\s/]/.test(c) && c !== 'drift'),
    z:         h.findIndex(c => /^z[\s(m)]?/.test(c) || c === 'z' || c === 'z m' || c === 'z(m)'),
  }
}

function getDirection(row, cols) {
  if (cols.direction >= 0) {
    const d = String(row[cols.direction] || '').toUpperCase().trim()
    if (d === 'X' || d === 'Y') return d
  }
  if (cols.outCase >= 0) {
    const oc = String(row[cols.outCase] || '').toUpperCase()
    if (/X/.test(oc) && !/Y/.test(oc)) return 'X'
    if (/Y/.test(oc) && !/X/.test(oc)) return 'Y'
  }
  return null
}

function parseRows(dataRows, cols) {
  const datosX = [], datosY = []

  for (const row of dataRows) {
    const storyName = String(row[cols.story] || '').trim()
    if (!storyName) continue

    const dir = getDirection(row, cols)
    if (!dir) continue

    const drift = parseFloat(row[cols.drift])
    if (isNaN(drift) || drift === 0) continue

    const z = cols.z >= 0 ? (parseFloat(row[cols.z]) || 0) : 0
    const driftInv = cols.driftInv >= 0 ? String(row[cols.driftInv] || '') : ''
    const stepType = cols.stepType >= 0 ? String(row[cols.stepType] || '').trim() : ''

    const entry = { story: storyName, drift, driftInv, z, stepType }

    if (dir === 'X') datosX.push(entry)
    else datosY.push(entry)
  }

  return { datosX, datosY }
}

// Deduplicate: keep "Max" step type or highest drift per story
function dedup(datos) {
  const map = new Map()
  for (const d of datos) {
    const key = d.story.toLowerCase()
    const existing = map.get(key)
    if (!existing) { map.set(key, d); continue }
    if (d.stepType.toLowerCase() === 'max' && existing.stepType.toLowerCase() !== 'max') {
      map.set(key, d)
    } else if (d.drift > existing.drift) {
      map.set(key, d)
    }
  }
  return Array.from(map.values())
}

// Sort bottom to top (ascending Z), compute hi
function sortAndComputeHi(datos) {
  datos.sort((a, b) => a.z - b.z)
  for (let i = 0; i < datos.length; i++) {
    datos[i].hi = datos[i].z - (i > 0 ? datos[i - 1].z : 0)
    // Convert hi from m to cm
    datos[i].hiCm = Math.round(datos[i].hi * 100)
  }
  // Reverse so top floor first (matches app display: top = index 0)
  datos.reverse()
  return datos
}

/**
 * Parse an Excel file (ArrayBuffer) containing ETABS Story Drifts
 * @param {ArrayBuffer} buffer
 * @returns {{ datosX: Array, datosY: Array, numPisos: number, error?: string }}
 */
export function parseExcelFile(buffer) {
  const wb = XLSX.read(buffer, { type: 'array' })

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

    const headerIdx = findHeaderRow(rows)
    if (headerIdx < 0) continue

    const cols = mapColumns(rows[headerIdx])
    if (cols.story < 0 || cols.drift < 0) continue

    const dataRows = rows.slice(headerIdx + 1).filter(r => r && r.length > 0)
    let { datosX, datosY } = parseRows(dataRows, cols)

    datosX = dedup(datosX)
    datosY = dedup(datosY)

    if (datosX.length === 0 && datosY.length === 0) continue

    sortAndComputeHi(datosX)
    sortAndComputeHi(datosY)

    return {
      datosX,
      datosY,
      numPisos: Math.max(datosX.length, datosY.length),
    }
  }

  return { datosX: [], datosY: [], numPisos: 0, error: 'No se encontro tabla Story Drifts en el archivo.' }
}

/**
 * Parse clipboard text (tab-separated from ETABS)
 * @param {string} text
 * @returns {{ datosX: Array, datosY: Array, numPisos: number, error?: string }}
 */
export function parseClipboardText(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim())
  if (lines.length === 0) return { datosX: [], datosY: [], numPisos: 0, error: 'Sin datos' }

  const rows = lines.map(l => l.split('\t').map(c => c.trim()))

  // Detect if first row is header
  const headerIdx = findHeaderRow(rows)

  let cols, dataRows

  if (headerIdx >= 0) {
    cols = mapColumns(rows[headerIdx])
    dataRows = rows.slice(headerIdx + 1)
  } else {
    // Assume standard ETABS column order:
    // Story, OutputCase, CaseType, StepType, StepNum, Direction, Drift, Drift/, Label, X, Y, Z
    if (rows[0].length >= 7) {
      cols = { story: 0, outCase: 1, caseType: 2, stepType: 3, direction: 5, drift: 6, driftInv: 7, z: 11 }
      dataRows = rows
    } else {
      return { datosX: [], datosY: [], numPisos: 0, error: 'Formato no reconocido. Copie la tabla completa de ETABS.' }
    }
  }

  if (cols.story < 0 || cols.drift < 0) {
    return { datosX: [], datosY: [], numPisos: 0, error: 'No se encontraron columnas Story/Drift.' }
  }

  let { datosX, datosY } = parseRows(dataRows, cols)
  datosX = dedup(datosX)
  datosY = dedup(datosY)

  if (datosX.length === 0 && datosY.length === 0) {
    return { datosX: [], datosY: [], numPisos: 0, error: 'No se detectaron datos de deriva en el texto pegado.' }
  }

  sortAndComputeHi(datosX)
  sortAndComputeHi(datosY)

  return { datosX, datosY, numPisos: Math.max(datosX.length, datosY.length) }
}

/**
 * Check if pasted text looks like a full ETABS table (many columns)
 * vs simple column paste (just numbers)
 */
export function isETABSTable(text) {
  const firstLine = text.trim().split(/\r?\n/)[0] || ''
  const cols = firstLine.split('\t')
  return cols.length >= 6
}
