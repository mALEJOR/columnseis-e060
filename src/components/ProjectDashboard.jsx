import { useState, useRef } from 'react'
import { useProyecto, crearColumna } from '../context/ProyectoContext'
import { generarSuperficie, calcularAreaSeccion, verificarPunto } from '../utils/engine'
import ImportadorETABS from './ImportadorETABS'

// ── Helpers ──
const fmt = (v, d = 1) => (v == null || isNaN(v)) ? '—' : Number(v).toFixed(d)

function seccionLabel(geo) {
  if (!geo) return '—'
  if (geo.tipo === 'circular') return `∅${geo.D || 0}`
  if (geo.tipo === 'T') return `T ${geo.b_alma}×${geo.h_total}`
  if (geo.tipo === 'L') return `L ${geo.b_alma}×${geo.h_total}`
  return `${geo.b || 0}×${geo.h || 0}`
}

function cuantia(col) {
  if (!col.refuerzo?.barras?.length) return null
  const As = col.refuerzo.barras.reduce((s, b) => s + (b.area || 0), 0)
  const Ag = calcularAreaSeccion(col.geometria)
  return Ag > 0 ? (As / Ag * 100) : 0
}

function cuantiaColor(rho) {
  if (rho === null) return 'var(--text3)'
  if (rho < 1) return 'var(--red)'
  if (rho <= 4) return 'var(--teal)'
  if (rho <= 6) return 'var(--amber)'
  return 'var(--red)'
}

function estadoBadge(estado) {
  const map = {
    sin_calcular: { label: 'SIN CALCULAR', cls: 'badge-estado badge-gray' },
    calculando:   { label: 'CALCULANDO',   cls: 'badge-estado badge-blue' },
    conforme:     { label: 'CONFORME',     cls: 'badge-estado badge-green' },
    no_conforme:  { label: 'NO CONFORME',  cls: 'badge-estado badge-red' },
  }
  const { label, cls } = map[estado] || map.sin_calcular
  return <span className={cls}>{label}</span>
}

function dcrBar(dcr) {
  if (dcr == null) return <span style={{ color: 'var(--text3)', fontSize: 10, fontFamily: 'var(--mono)' }}>—</span>
  const pct = Math.min(dcr * 100, 100)
  const color = dcr <= 0.7 ? 'var(--teal)' : dcr <= 1 ? 'var(--amber)' : 'var(--red)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
      <div className="dcr-progress-track">
        <div className="dcr-progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color, fontWeight: 600, minWidth: 38 }}>
        {dcr.toFixed(3)}
      </span>
    </div>
  )
}

// ── Modal para agregar columna ──
function ModalNuevaColumna({ open, onClose, onAdd, columnas, tiposColumna }) {
  const [nombre, setNombre] = useState('C-' + (columnas.length + 1))
  const [eje, setEje] = useState('')
  const [nivel, setNivel] = useState('')
  const [copiarDe, setCopiarDe] = useState('')
  const [tipoSel, setTipoSel] = useState('')

  if (!open) return null

  const handleAdd = () => {
    let overrides = { nombre, eje, nivel }
    if (tipoSel) {
      const tipo = tiposColumna.find(t => t.id === +tipoSel)
      if (tipo) {
        overrides = {
          ...overrides, tipoId: tipo.id,
          material: { ...tipo.material }, geometria: { ...tipo.geometria },
          sistema_estructural: tipo.sistema_estructural,
          refuerzo: JSON.parse(JSON.stringify(tipo.refuerzo)),
        }
      }
    } else if (copiarDe) {
      const src = columnas.find(c => c.id === copiarDe)
      if (src) {
        overrides = {
          ...overrides,
          material: { ...src.material }, geometria: { ...src.geometria },
          sistema_estructural: src.sistema_estructural,
          refuerzo: JSON.parse(JSON.stringify(src.refuerzo)),
          combinaciones: JSON.parse(JSON.stringify(src.combinaciones)),
        }
      }
    }
    onAdd(overrides)
    onClose()
    setNombre('C-' + (columnas.length + 2)); setEje(''); setNivel(''); setCopiarDe(''); setTipoSel('')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Nueva Columna</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-field">
            <label>Nombre</label>
            <input className="f-input" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="C-1" />
          </div>
          <div className="modal-row">
            <div className="modal-field">
              <label>Eje</label>
              <input className="f-input" value={eje} onChange={e => setEje(e.target.value)} placeholder="A-1" />
            </div>
            <div className="modal-field">
              <label>Nivel</label>
              <input className="f-input" value={nivel} onChange={e => setNivel(e.target.value)} placeholder="1-2" />
            </div>
          </div>
          <div className="modal-field">
            <label>Tipo de columna</label>
            <select className="f-input" value={tipoSel} onChange={e => { setTipoSel(e.target.value); if (e.target.value) setCopiarDe('') }}>
              <option value="">— Personalizada —</option>
              {tiposColumna.map(t => (
                <option key={t.id} value={t.id}>{t.codigo} — {t.descripcion}</option>
              ))}
            </select>
          </div>
          {!tipoSel && (
            <div className="modal-field">
              <label>Copiar configuracion de</label>
              <select className="f-input" value={copiarDe} onChange={e => setCopiarDe(e.target.value)}>
                <option value="">— Ninguna (valores por defecto) —</option>
                {columnas.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre} ({c.eje})</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-sec" onClick={onClose}>Cancelar</button>
          <button className="btn-calc" style={{ width: 'auto', padding: '8px 24px', fontSize: 11 }} onClick={handleAdd}>
            Agregar Columna
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
//  DASHBOARD PRINCIPAL
// ══════════════════════════════════════════════════════════════════
export default function ProjectDashboard() {
  const { nombre, ingeniero, fecha, columnas, tiposColumna, dispatch } = useProyecto()
  const [modalOpen, setModalOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [calculando, setCalculando] = useState(false)
  const calculandoRef = useRef(false)

  const goEditor = (id) => dispatch({ type: 'SET_COLUMNA_ACTIVA', id })
  const duplicar = (id) => dispatch({ type: 'DUPLICAR_COLUMNA', id })
  const eliminar = (id) => {
    if (columnas.length <= 1) return
    dispatch({ type: 'ELIMINAR_COLUMNA', id })
  }

  const agregarColumna = (overrides) => {
    dispatch({ type: 'AGREGAR_COLUMNA', overrides })
  }

  // ── Calcular todas secuencialmente ──
  const calcularTodas = async () => {
    setCalculando(true)
    calculandoRef.current = true

    for (const col of columnas) {
      if (!calculandoRef.current) break
      if (!col.refuerzo?.barras?.length) continue

      dispatch({ type: 'ACTUALIZAR_CAMPO_COLUMNA', id: col.id, field: 'estado', value: 'calculando' })

      // yield to UI
      await new Promise(r => setTimeout(r, 30))

      try {
        const input = {
          material: { fc: col.material.fc, fy: col.material.fy, Es: 2000000 },
          geometria: col.geometria,
          refuerzo: col.refuerzo,
          sistema_estructural: col.sistema_estructural || 'SMF',
          angulos_neutro: 36,
          pasos_profundidad: 50,
        }
        const superficie = generarSuperficie(input)

        // Auto-verificar combinaciones activas
        let dcr_max = null
        let todasConformes = true
        const resultados = col.combinaciones
          .filter(c => c.activa && c.Pu && c.Mux && c.Muy)
          .map(c => {
            const Pu = parseFloat(c.Pu) * 1000
            const Mux = parseFloat(c.Mux) * 100000
            const Muy = parseFloat(c.Muy) * 100000
            const r = verificarPunto(superficie, Pu, Mux, Muy)
            if (dcr_max === null || r.dcr > dcr_max) dcr_max = r.dcr
            if (!r.dentro) todasConformes = false
            return { ...c, ...r }
          })

        const estado = dcr_max !== null
          ? (todasConformes ? 'conforme' : 'no_conforme')
          : 'sin_calcular'

        dispatch({
          type: 'ACTUALIZAR_COLUMNA',
          id: col.id,
          changes: { superficie, resultados, dcr_max, estado },
        })
      } catch (err) {
        dispatch({
          type: 'ACTUALIZAR_COLUMNA',
          id: col.id,
          changes: { estado: 'no_conforme', dcr_max: null },
        })
      }
    }

    setCalculando(false)
    calculandoRef.current = false
  }

  // ── Resumen ──
  const total = columnas.length
  const conformes = columnas.filter(c => c.estado === 'conforme').length
  const noConformes = columnas.filter(c => c.estado === 'no_conforme').length
  const sinCalcular = columnas.filter(c => c.estado === 'sin_calcular').length

  return (
    <div className="dashboard">
      {/* ── HEADER ── */}
      <header className="dash-header">
        <div className="dash-header-left">
          <div className="dash-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polygon points="12,2 22,8 22,16 12,22 2,16 2,8" />
              <line x1="12" y1="2" x2="12" y2="22" /><line x1="2" y1="8" x2="22" y2="16" />
              <line x1="2" y1="16" x2="22" y2="8" />
            </svg>
            <span className="topbar-title">Column<span>Seis</span></span>
          </div>
          <div className="dash-nav-tabs">
            <button className="dash-nav-tab active">Proyecto</button>
            <button className="dash-nav-tab" onClick={() => dispatch({ type: 'SET_VISTA', vista: 'biblioteca' })}>Biblioteca</button>
          </div>
          <div className="dash-project-name">
            <input
              value={nombre}
              onChange={e => dispatch({ type: 'SET_PROYECTO', field: 'nombre', value: e.target.value })}
              placeholder="Nombre del proyecto"
              className="dash-name-input"
            />
          </div>
        </div>
        <div className="dash-header-right">
          <div className="dash-header-field">
            <label>Ingeniero</label>
            <input
              value={ingeniero}
              onChange={e => dispatch({ type: 'SET_PROYECTO', field: 'ingeniero', value: e.target.value })}
              placeholder="Ing. Nombre Apellidos"
            />
          </div>
          <div className="dash-header-field">
            <label>Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={e => dispatch({ type: 'SET_PROYECTO', field: 'fecha', value: e.target.value })}
            />
          </div>
          <span className="badge norm">NTP E.060</span>
          <span className="badge accent">v2.1</span>
        </div>
      </header>

      {/* ── CONTENIDO ── */}
      <div className="dash-body">
        {/* Toolbar */}
        <div className="dash-toolbar">
          <span className="dash-toolbar-title">Columnas del Proyecto</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn-sec"
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, padding: '7px 14px' }}
              onClick={() => setImportOpen(true)}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              IMPORTAR ETABS
            </button>
            <button
              className="btn-calc"
              style={{ width: 'auto', padding: '7px 20px', fontSize: 10 }}
              onClick={calcularTodas}
              disabled={calculando}
            >
              {calculando ? 'CALCULANDO...' : 'CALCULAR TODAS'}
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th style={{ width: 80 }}>Tipo</th>
                <th style={{ width: 120 }}>Nombre</th>
                <th style={{ width: 80 }}>Eje</th>
                <th style={{ width: 70 }}>Nivel</th>
                <th style={{ width: 90 }}>Sección</th>
                <th style={{ width: 70 }}>f'c</th>
                <th style={{ width: 60 }}>fy</th>
                <th style={{ width: 80 }}>Cuantía</th>
                <th style={{ width: 90 }}>φP₀ (t)</th>
                <th style={{ width: 140 }}>DCR máx</th>
                <th style={{ width: 120 }}>Estado</th>
                <th style={{ width: 120 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {columnas.map((col, i) => {
                const rho = cuantia(col)
                const phiP0 = col.superficie ? col.superficie.P_max / 1000 : null
                return (
                  <tr
                    key={col.id}
                    className={i % 2 === 0 ? 'dash-row-even' : 'dash-row-odd'}
                    onClick={() => goEditor(col.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="dash-num">{i + 1}</td>
                    <td onClick={e => e.stopPropagation()}>
                      {(() => {
                        const tipo = col.tipoId ? tiposColumna.find(t => t.id === col.tipoId) : null
                        return tipo
                          ? <span className="badge-tipo-code">{tipo.codigo}</span>
                          : <span className="badge-estado badge-gray" style={{fontSize:7}}>SIN TIPO</span>
                      })()}
                    </td>
                    <td>
                      <input
                        className="dash-inline-input"
                        value={col.nombre}
                        onClick={e => e.stopPropagation()}
                        onChange={e => dispatch({ type: 'ACTUALIZAR_CAMPO_COLUMNA', id: col.id, field: 'nombre', value: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="dash-inline-input"
                        value={col.eje}
                        onClick={e => e.stopPropagation()}
                        onChange={e => dispatch({ type: 'ACTUALIZAR_CAMPO_COLUMNA', id: col.id, field: 'eje', value: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="dash-inline-input"
                        value={col.nivel}
                        onClick={e => e.stopPropagation()}
                        onChange={e => dispatch({ type: 'ACTUALIZAR_CAMPO_COLUMNA', id: col.id, field: 'nivel', value: e.target.value })}
                      />
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>{seccionLabel(col.geometria)}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>{col.material.fc}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>{col.material.fy}</td>
                    <td>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, color: cuantiaColor(rho) }}>
                        {rho !== null ? `${rho.toFixed(2)}%` : '—'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>{phiP0 !== null ? fmt(phiP0) : '—'}</td>
                    <td>{dcrBar(col.dcr_max)}</td>
                    <td>{estadoBadge(col.estado)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="dash-actions">
                        <button className="dash-act-btn" onClick={() => goEditor(col.id)} title="Editar">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button className="dash-act-btn" onClick={() => duplicar(col.id)} title="Duplicar">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        </button>
                        <button
                          className="dash-act-btn dash-act-del"
                          onClick={() => eliminar(col.id)}
                          title="Eliminar"
                          disabled={columnas.length <= 1}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Cards resumen */}
        <div className="dash-summary">
          <div className="dash-card">
            <div className="dash-card-label">Total Columnas</div>
            <div className="dash-card-value">{total}</div>
          </div>
          <div className="dash-card dash-card-green">
            <div className="dash-card-label">Conformes</div>
            <div className="dash-card-value">{conformes}</div>
          </div>
          <div className="dash-card dash-card-red">
            <div className="dash-card-label">No Conformes</div>
            <div className="dash-card-value">{noConformes}</div>
          </div>
          <div className="dash-card dash-card-gray">
            <div className="dash-card-label">Sin Calcular</div>
            <div className="dash-card-value">{sinCalcular}</div>
          </div>
        </div>
      </div>

      {/* FAB */}
      <button className="dash-fab" onClick={() => setModalOpen(true)} title="Agregar columna">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Modal nueva columna */}
      <ModalNuevaColumna
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={agregarColumna}
        columnas={columnas}
        tiposColumna={tiposColumna}
      />

      {/* Modal importador ETABS */}
      {importOpen && <ImportadorETABS onClose={() => setImportOpen(false)} />}
    </div>
  )
}
