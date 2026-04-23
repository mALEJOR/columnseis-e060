import { useState, useRef, useCallback, useEffect, useMemo } from 'react'

// ── Helpers ───────────────────────────────────────────────────────────────────
function smartParseNum(raw) {
  if (raw === '' || raw == null) return ''
  const s = String(raw).trim().replace(',', '.')
  const n = parseFloat(s)
  return isNaN(n) ? raw : n
}

function colLetter(colIdx) {
  let result = ''
  let n = colIdx + 1
  while (n > 0) {
    const rem = (n - 1) % 26
    result = String.fromCharCode(65 + rem) + result
    n = Math.floor((n - 1) / 26)
  }
  return result
}

function cellRef(rowIdx, colIdx) {
  return `${colLetter(colIdx)}${rowIdx + 1}`
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  container: {
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 300,
    minHeight: 100,
    resize: 'both',
  },
  formulaBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 8px',
    background: 'var(--surface)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    fontSize: 10,
    fontFamily: 'var(--mono)',
    flexShrink: 0,
    userSelect: 'none',
  },
  formulaRef: {
    background: '#1a2744',
    padding: '2px 8px',
    borderRadius: 3,
    color: '#4FC3F7',
    fontWeight: 700,
    minWidth: 40,
    textAlign: 'center',
    fontSize: 10,
    fontFamily: 'var(--mono)',
  },
  formulaDivider: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 14,
  },
  formulaInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: 'var(--text0)',
    fontFamily: 'var(--mono)',
    fontSize: 10,
    outline: 'none',
  },
  scrollWrap: {
    overflow: 'auto',
    flex: 1,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontFamily: 'var(--mono)',
    fontSize: 10,
    tableLayout: 'fixed',
  },
  headerRow: {
    background: '#2e75b6',
  },
  cornerCell: {
    background: '#244a8a',
    width: 36,
    minWidth: 36,
    borderRight: '1px solid rgba(255,255,255,0.12)',
    borderBottom: '1px solid rgba(255,255,255,0.12)',
  },
  headerCell: {
    background: '#2e75b6',
    color: '#fff',
    fontWeight: 700,
    fontSize: 9,
    padding: '6px 8px',
    textAlign: 'center',
    position: 'relative',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    borderRight: '1px solid rgba(255,255,255,0.12)',
    borderBottom: '1px solid rgba(255,255,255,0.12)',
    fontFamily: 'var(--cond)',
    textTransform: 'uppercase',
    letterSpacing: '.5px',
  },
  headerCellActive: {
    background: '#3a8acf',
  },
  rowNumCell: {
    background: 'var(--surface2)',
    color: 'var(--text3)',
    textAlign: 'center',
    fontSize: 9,
    padding: '2px 4px',
    borderRight: '1px solid rgba(255,255,255,0.08)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    userSelect: 'none',
    minWidth: 36,
    width: 36,
    fontFamily: 'var(--mono)',
  },
  cell: {
    padding: '2px 4px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    borderRight: '1px solid rgba(255,255,255,0.04)',
    textAlign: 'center',
    cursor: 'cell',
    position: 'relative',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: 'var(--text0)',
    height: 22,
    lineHeight: '18px',
  },
  cellInput: {
    background: '#1a2744',
  },
  cellComputed: {
    background: '#1a3328',
    color: '#81c784',
  },
  cellSelected: {
    outline: '2px solid #4FC3F7',
    outlineOffset: -2,
    zIndex: 2,
    position: 'relative',
  },
  cellInRange: {
    background: 'rgba(79,195,247,0.15)',
  },
  cellEditing: {
    padding: 0,
    overflow: 'visible',
    zIndex: 10,
    position: 'relative',
  },
  editInput: {
    width: '100%',
    height: '100%',
    minHeight: 22,
    background: '#1a2744',
    border: '2px solid #4FC3F7',
    color: 'var(--text0)',
    fontFamily: 'var(--mono)',
    fontSize: 10,
    textAlign: 'center',
    padding: '2px 4px',
    outline: 'none',
    display: 'block',
    boxSizing: 'border-box',
  },
  resizeHandle: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 6,
    cursor: 'col-resize',
    zIndex: 5,
    background: 'transparent',
  },
  sortIndicator: {
    marginLeft: 4,
    fontSize: 8,
    opacity: 0.8,
  },
}

// ── ResizeHandle subcomponent ─────────────────────────────────────────────────
function ResizeHandle({ colKey, onResize }) {
  const startX = useRef(null)
  const startW = useRef(null)

  const onMouseDown = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    startX.current = e.clientX
    const th = e.currentTarget.parentElement
    startW.current = th.offsetWidth

    const onMove = (me) => {
      const delta = me.clientX - startX.current
      const newW = Math.max(40, startW.current + delta)
      onResize(colKey, newW)
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [colKey, onResize])

  return <div style={S.resizeHandle} onMouseDown={onMouseDown} />
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ExcelTable({
  columns = [],
  data = [],
  onChange,
  onBulkChange,
  onPaste,
  readOnlyCols = [],
  className = '',
  maxRows,
  showFormulaBar = true,
  showRowNumbers = true,
  sortable = true,
}) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedCell, setSelectedCell] = useState(null)           // {row, col}
  const [selectionRange, setSelectionRange] = useState(null)       // {startRow,startCol,endRow,endCol}
  const [editingCell, setEditingCell] = useState(null)             // {row, col}
  const [editValue, setEditValue]     = useState('')
  const [colWidths, setColWidths]     = useState({})
  const [sortState, setSortState]     = useState({ key: null, dir: 0 }) // dir: 0=none,1=asc,-1=desc
  const [formulaEditing, setFormulaEditing] = useState(false)
  const [formulaLocal, setFormulaLocal] = useState('')
  const [isMouseSelecting, setIsMouseSelecting] = useState(false)

  const tableRef  = useRef(null)
  const editRef   = useRef(null)
  const formulaRef = useRef(null)

  // ── Computed columns (merge readOnly from props + column def) ──────────────
  const cols = useMemo(() => columns.map(c => ({
    ...c,
    readOnly: c.readOnly || readOnlyCols.includes(c.key),
  })), [columns, readOnlyCols])

  // ── Sorted data ────────────────────────────────────────────────────────────
  const sortedIndices = useMemo(() => {
    const indices = Array.from({ length: data.length }, (_, i) => i)
    if (!sortState.key || sortState.dir === 0) return indices
    return indices.sort((a, b) => {
      const av = data[a][sortState.key]
      const bv = data[b][sortState.key]
      const an = Number(av), bn = Number(bv)
      const cmp = !isNaN(an) && !isNaN(bn) ? an - bn : String(av).localeCompare(String(bv))
      return sortState.dir === 1 ? cmp : -cmp
    })
  }, [data, sortState])

  const rows = useMemo(() => sortedIndices.map(i => ({ ...data[i], _origIdx: i })), [sortedIndices, data])
  const displayRows = maxRows != null ? rows.slice(0, maxRows) : rows

  // ── Helpers ────────────────────────────────────────────────────────────────
  const isReadOnly = useCallback((colIdx) => cols[colIdx]?.readOnly, [cols])

  const colCount = cols.length
  const rowCount = displayRows.length

  const clampRow = useCallback(r => Math.max(0, Math.min(r, rowCount - 1)), [rowCount])
  const clampCol = useCallback(c => Math.max(0, Math.min(c, colCount - 1)), [colCount])

  const isInRange = useCallback((row, col) => {
    if (!selectionRange) return false
    const { startRow, startCol, endRow, endCol } = selectionRange
    const minR = Math.min(startRow, endRow)
    const maxR = Math.max(startRow, endRow)
    const minC = Math.min(startCol, endCol)
    const maxC = Math.max(startCol, endCol)
    return row >= minR && row <= maxR && col >= minC && col <= maxC
  }, [selectionRange])

  const getCellValue = useCallback((row, col) => {
    const key = cols[col]?.key
    if (key == null) return ''
    return displayRows[row]?.[key] ?? ''
  }, [displayRows, cols])

  // ── Formula bar sync ───────────────────────────────────────────────────────
  const formulaDisplay = useMemo(() => {
    if (!selectedCell) return ''
    const { row, col } = selectedCell
    return String(getCellValue(row, col) ?? '')
  }, [selectedCell, getCellValue])

  // ── Focus edit input when entering edit mode ───────────────────────────────
  useEffect(() => {
    if (editingCell && editRef.current) {
      editRef.current.focus()
      editRef.current.select()
    }
  }, [editingCell])

  // ── Commit edit ────────────────────────────────────────────────────────────
  const commitEdit = useCallback(() => {
    if (!editingCell) return
    const { row, col } = editingCell
    const origIdx = displayRows[row]._origIdx
    const key = cols[col].key
    const parsed = cols[col].type === 'number' ? smartParseNum(editValue) : editValue
    onChange?.(origIdx, key, parsed)
    setEditingCell(null)
  }, [editingCell, editValue, displayRows, cols, onChange])

  const cancelEdit = useCallback(() => {
    setEditingCell(null)
  }, [])

  const startEdit = useCallback((row, col, initialValue = null) => {
    if (isReadOnly(col)) return
    const val = initialValue !== null ? initialValue : String(getCellValue(row, col) ?? '')
    setEditValue(val)
    setEditingCell({ row, col })
  }, [isReadOnly, getCellValue])

  // ── Navigate ───────────────────────────────────────────────────────────────
  const navigate = useCallback((dRow, dCol, extendRange = false) => {
    if (!selectedCell) return
    let { row, col } = selectedCell
    let newRow = clampRow(row + dRow)
    let newCol = clampCol(col + dCol)

    // skip read-only cols on tab-like navigation
    if (dRow === 0 && dCol !== 0) {
      let attempts = colCount
      while (isReadOnly(newCol) && attempts-- > 0) {
        newCol = clampCol(newCol + (dCol > 0 ? 1 : -1))
      }
    }

    if (extendRange && selectionRange) {
      setSelectionRange(prev => ({
        ...prev,
        endRow: newRow,
        endCol: newCol,
      }))
    } else {
      setSelectedCell({ row: newRow, col: newCol })
      setSelectionRange(null)
    }
  }, [selectedCell, selectionRange, colCount, clampRow, clampCol, isReadOnly])

  // ── Copy/Paste ─────────────────────────────────────────────────────────────
  const handleCopy = useCallback(() => {
    if (!selectedCell) return
    const range = selectionRange || {
      startRow: selectedCell.row, startCol: selectedCell.col,
      endRow: selectedCell.row, endCol: selectedCell.col,
    }
    const minR = Math.min(range.startRow, range.endRow)
    const maxR = Math.max(range.startRow, range.endRow)
    const minC = Math.min(range.startCol, range.endCol)
    const maxC = Math.max(range.startCol, range.endCol)

    const lines = []
    for (let r = minR; r <= maxR; r++) {
      const cells = []
      for (let c = minC; c <= maxC; c++) {
        cells.push(getCellValue(r, c))
      }
      lines.push(cells.join('\t'))
    }
    navigator.clipboard?.writeText(lines.join('\n')).catch(() => {})
  }, [selectedCell, selectionRange, getCellValue])

  const handlePaste = useCallback(async () => {
    if (!selectedCell) return
    try {
      const text = await navigator.clipboard.readText()
      const pastedRows = text.split('\n').filter(r => r !== '').map(r => r.split('\t'))
      const { row: startRow, col: startCol } = selectedCell

      if (onPaste) {
        onPaste(startRow, startCol, pastedRows)
        return
      }

      const changes = []
      pastedRows.forEach((pastedRowData, dr) => {
        const rowIdx = startRow + dr
        if (rowIdx >= rowCount) return
        pastedRowData.forEach((val, dc) => {
          const colIdx = startCol + dc
          if (colIdx >= colCount) return
          if (isReadOnly(colIdx)) return
          const origIdx = displayRows[rowIdx]._origIdx
          const key = cols[colIdx].key
          const parsed = cols[colIdx].type === 'number' ? smartParseNum(val) : val
          changes.push({ rowIdx: origIdx, colKey: key, value: parsed })
        })
      })
      onBulkChange?.(changes)
      if (!onBulkChange && onChange) {
        changes.forEach(c => onChange(c.rowIdx, c.colKey, c.value))
      }
    } catch { /* clipboard error */ }
  }, [selectedCell, rowCount, colCount, isReadOnly, displayRows, cols, onPaste, onBulkChange, onChange])

  const handleDelete = useCallback((backspace = false) => {
    const range = selectionRange || (selectedCell ? {
      startRow: selectedCell.row, startCol: selectedCell.col,
      endRow: selectedCell.row, endCol: selectedCell.col,
    } : null)
    if (!range) return

    const minR = Math.min(range.startRow, range.endRow)
    const maxR = Math.max(range.startRow, range.endRow)
    const minC = Math.min(range.startCol, range.endCol)
    const maxC = Math.max(range.startCol, range.endCol)

    const changes = []
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        if (isReadOnly(c)) continue
        const origIdx = displayRows[r]._origIdx
        const key = cols[c].key
        changes.push({ rowIdx: origIdx, colKey: key, value: '' })
      }
    }
    onBulkChange?.(changes)
    if (!onBulkChange && onChange) {
      changes.forEach(c => onChange(c.rowIdx, c.colKey, c.value))
    }

    if (backspace && selectedCell && !selectionRange) {
      startEdit(selectedCell.row, selectedCell.col, '')
    }
  }, [selectedCell, selectionRange, isReadOnly, displayRows, cols, onBulkChange, onChange, startEdit])

  // ── Keyboard handler on container ─────────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    if (editingCell) return // edit input handles its own keys

    if (!selectedCell) return

    const { key, shiftKey, ctrlKey, metaKey } = e
    const ctrl = ctrlKey || metaKey

    if (ctrl && key === 'c') { e.preventDefault(); handleCopy(); return }
    if (ctrl && key === 'v') { e.preventDefault(); handlePaste(); return }

    switch (key) {
      case 'ArrowRight': e.preventDefault(); navigate(0, 1, shiftKey); break
      case 'ArrowLeft':  e.preventDefault(); navigate(0, -1, shiftKey); break
      case 'ArrowDown':  e.preventDefault(); navigate(1, 0, shiftKey); break
      case 'ArrowUp':    e.preventDefault(); navigate(-1, 0, shiftKey); break
      case 'Tab':
        e.preventDefault()
        if (editingCell) commitEdit()
        navigate(0, shiftKey ? -1 : 1)
        break
      case 'Enter':
        e.preventDefault()
        if (shiftKey) navigate(-1, 0)
        else navigate(1, 0)
        break
      case 'F2':
        e.preventDefault()
        startEdit(selectedCell.row, selectedCell.col)
        break
      case 'Delete':
      case 'Backspace':
        if (key === 'Delete') { e.preventDefault(); handleDelete(false) }
        else { e.preventDefault(); handleDelete(true) }
        break
      case 'Escape':
        setSelectionRange(null)
        break
      default:
        // Printable key → start editing with that key as initial value
        if (key.length === 1 && !ctrl) {
          e.preventDefault()
          startEdit(selectedCell.row, selectedCell.col, key)
        }
    }
  }, [editingCell, selectedCell, navigate, handleCopy, handlePaste, handleDelete, startEdit, commitEdit])

  // ── Edit input key handler ─────────────────────────────────────────────────
  const handleEditKeyDown = useCallback((e) => {
    const { key, shiftKey } = e
    switch (key) {
      case 'Enter':
        e.preventDefault()
        commitEdit()
        setTimeout(() => navigate(1, 0), 0)
        break
      case 'Tab':
        e.preventDefault()
        commitEdit()
        setTimeout(() => navigate(0, shiftKey ? -1 : 1), 0)
        break
      case 'Escape':
        e.preventDefault()
        cancelEdit()
        tableRef.current?.focus()
        break
      default: break
    }
  }, [commitEdit, cancelEdit, navigate])

  // ── Cell click ────────────────────────────────────────────────────────────
  const handleCellMouseDown = useCallback((e, row, col) => {
    e.stopPropagation()
    tableRef.current?.focus()

    if (e.shiftKey && selectedCell) {
      setSelectionRange({
        startRow: selectedCell.row,
        startCol: selectedCell.col,
        endRow: row,
        endCol: col,
      })
      return
    }

    setSelectedCell({ row, col })
    setSelectionRange(null)
    setIsMouseSelecting(true)

    if (editingCell && (editingCell.row !== row || editingCell.col !== col)) {
      commitEdit()
    }
  }, [selectedCell, editingCell, commitEdit])

  const handleCellMouseEnter = useCallback((row, col) => {
    if (!isMouseSelecting || !selectedCell) return
    setSelectionRange({
      startRow: selectedCell.row,
      startCol: selectedCell.col,
      endRow: row,
      endCol: col,
    })
  }, [isMouseSelecting, selectedCell])

  const handleMouseUp = useCallback(() => {
    setIsMouseSelecting(false)
  }, [])

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseUp])

  const handleCellDoubleClick = useCallback((row, col) => {
    startEdit(row, col)
  }, [startEdit])

  // ── Header sort click ──────────────────────────────────────────────────────
  const handleHeaderClick = useCallback((colKey) => {
    if (!sortable) return
    setSortState(prev => {
      if (prev.key !== colKey) return { key: colKey, dir: 1 }
      if (prev.dir === 1) return { key: colKey, dir: -1 }
      return { key: null, dir: 0 }
    })
  }, [sortable])

  // ── Column resize ──────────────────────────────────────────────────────────
  const handleColResize = useCallback((colKey, width) => {
    setColWidths(prev => ({ ...prev, [colKey]: width }))
  }, [])

  // ── Formula bar edit ──────────────────────────────────────────────────────
  const handleFormulaChange = useCallback((e) => {
    const val = e.target.value
    setFormulaLocal(val)
    if (selectedCell && !isReadOnly(selectedCell.col)) {
      setEditValue(val)
      // Apply immediately
      const origIdx = displayRows[selectedCell.row]._origIdx
      const key = cols[selectedCell.col].key
      const parsed = cols[selectedCell.col].type === 'number' ? smartParseNum(val) : val
      onChange?.(origIdx, key, parsed)
    }
  }, [selectedCell, isReadOnly, displayRows, cols, onChange])

  const handleFormulaKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      tableRef.current?.focus()
      navigate(1, 0)
    }
    if (e.key === 'Escape') {
      tableRef.current?.focus()
    }
  }, [navigate])

  // ── Render ────────────────────────────────────────────────────────────────
  const activeCol = selectedCell?.col ?? null
  const activeRow = selectedCell?.row ?? null

  const formulaRefLabel = selectedCell
    ? cellRef(selectedCell.row, selectedCell.col)
    : '—'

  const isSelectedCellReadOnly = selectedCell ? isReadOnly(selectedCell.col) : false

  return (
    <div
      style={S.container}
      className={className}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      ref={tableRef}
      onMouseLeave={() => setIsMouseSelecting(false)}
    >
      {/* ── Formula Bar ── */}
      {showFormulaBar && (
        <div style={S.formulaBar}>
          <span style={S.formulaRef}>{formulaRefLabel}</span>
          <span style={S.formulaDivider}>│</span>
          {isSelectedCellReadOnly ? (
            <span style={{ ...S.formulaInput, color: 'var(--text3)', fontStyle: 'italic' }}>
              (calculado)
            </span>
          ) : (
            <input
              ref={formulaRef}
              style={S.formulaInput}
              value={formulaEditing ? formulaLocal : formulaDisplay}
              onFocus={() => { setFormulaEditing(true); setFormulaLocal(formulaDisplay) }}
              onBlur={() => setFormulaEditing(false)}
              onChange={handleFormulaChange}
              onKeyDown={handleFormulaKeyDown}
              disabled={!selectedCell || isSelectedCellReadOnly}
              spellCheck={false}
            />
          )}
        </div>
      )}

      {/* ── Table ── */}
      <div style={S.scrollWrap}>
        <table style={S.table}>
          <colgroup>
            {showRowNumbers && <col style={{ width: 36, minWidth: 36 }} />}
            {cols.map(c => (
              <col
                key={c.key}
                style={{ width: colWidths[c.key] ?? c.width ?? 80, minWidth: 40 }}
              />
            ))}
          </colgroup>

          <thead>
            <tr style={S.headerRow}>
              {showRowNumbers && <th style={S.cornerCell} />}
              {cols.map((col, ci) => {
                const isActive = ci === activeCol
                const sort = sortState.key === col.key ? sortState.dir : 0
                return (
                  <th
                    key={col.key}
                    style={{
                      ...S.headerCell,
                      ...(isActive ? S.headerCellActive : {}),
                    }}
                    onClick={() => handleHeaderClick(col.key)}
                    title={col.label}
                  >
                    {col.label}
                    {sortable && sort !== 0 && (
                      <span style={S.sortIndicator}>{sort === 1 ? '▲' : '▼'}</span>
                    )}
                    <ResizeHandle colKey={col.key} onResize={handleColResize} />
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {displayRows.map((rowData, ri) => {
              const isActiveRow = ri === activeRow
              return (
                <tr
                  key={ri}
                  style={isActiveRow ? { background: 'rgba(255,255,255,0.02)' } : {}}
                >
                  {showRowNumbers && (
                    <td style={S.rowNumCell}>{ri + 1}</td>
                  )}
                  {cols.map((col, ci) => {
                    const isEditing = editingCell?.row === ri && editingCell?.col === ci
                    const isSelected = selectedCell?.row === ri && selectedCell?.col === ci
                    const inRange = isInRange(ri, ci)
                    const ro = col.readOnly
                    const rawVal = rowData[col.key]
                    const displayVal = rawVal == null ? '' : rawVal

                    let cellStyle = {
                      ...S.cell,
                      ...(ro ? S.cellComputed : S.cellInput),
                      ...(inRange && !isSelected ? S.cellInRange : {}),
                      ...(isSelected ? S.cellSelected : {}),
                      ...(isEditing ? S.cellEditing : {}),
                    }

                    return (
                      <td
                        key={col.key}
                        style={cellStyle}
                        onMouseDown={(e) => handleCellMouseDown(e, ri, ci)}
                        onMouseEnter={() => handleCellMouseEnter(ri, ci)}
                        onDoubleClick={() => handleCellDoubleClick(ri, ci)}
                      >
                        {isEditing ? (
                          col.type === 'select' ? (
                            <select
                              ref={editRef}
                              style={{ ...S.editInput, padding: '1px 2px' }}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleEditKeyDown}
                              onBlur={commitEdit}
                            >
                              {(col.options ?? []).map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              ref={editRef}
                              style={S.editInput}
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleEditKeyDown}
                              onBlur={commitEdit}
                              spellCheck={false}
                            />
                          )
                        ) : (
                          <span style={{ pointerEvents: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {displayVal === '' || displayVal == null ? '\u00A0' : String(displayVal)}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
