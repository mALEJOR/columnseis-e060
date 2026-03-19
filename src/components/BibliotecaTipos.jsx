import { useState } from 'react'
import { useProyecto } from '../context/ProyectoContext'
import { calcularAreaSeccion, generarDisposicion, generarDisposicionCircular, generarDisposicionT, generarDisposicionL } from '../utils/engine'
import { VARILLAS_PERU, buscarVarilla } from '../utils/varillas'

const areaFn = d => { const v = buscarVarilla(d); return v ? v.area : Math.PI * d * d / 4 }

function secLabel(geo) {
  if (!geo) return '—'
  if (geo.tipo === 'circular') return `\u2300${geo.D}`
  if (geo.tipo === 'T') return `T ${geo.b_alma}\u00d7${geo.h_total}`
  if (geo.tipo === 'L') return `L ${geo.b_alma}\u00d7${geo.h_total}`
  return `${geo.b}\u00d7${geo.h}`
}

function cuantia(tipo) {
  if (!tipo.refuerzo?.barras?.length) return null
  const As = tipo.refuerzo.barras.reduce((s, b) => s + (b.area || 0), 0)
  const Ag = calcularAreaSeccion(tipo.geometria)
  return Ag > 0 ? (As / Ag * 100) : 0
}

function cuantiaColor(rho) {
  if (rho === null) return 'var(--text3)'
  if (rho < 1 || rho > 6) return 'var(--red)'
  if (rho <= 4) return 'var(--teal)'
  return 'var(--amber)'
}

// ── Mini SVG de sección transversal ──
function SectionMini({ geo, barras }) {
  const W = 60, H = 60, P = 6
  if (!geo) return <div style={{ width: W, height: H }} />
  const esCirc = geo.tipo === 'circular'
  const bv = esCirc ? geo.D : geo.tipo === 'T' || geo.tipo === 'L' ? (geo.b_ala || geo.b_alma) : geo.b
  const hv = esCirc ? geo.D : geo.tipo === 'T' || geo.tipo === 'L' ? geo.h_total : geo.h
  const sc = Math.min((W - 2 * P) / bv, (H - 2 * P) / hv)
  const cx = W / 2, cy = H / 2

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ background: '#fff', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)' }}>
      {esCirc ? (
        <circle cx={cx} cy={cy} r={bv * sc / 2} fill="none" stroke="#444" strokeWidth="1" />
      ) : (
        <rect x={cx - bv * sc / 2} y={cy - hv * sc / 2} width={bv * sc} height={hv * sc} fill="none" stroke="#444" strokeWidth="1" />
      )}
      {barras?.map((b, i) => (
        <circle key={i} cx={cx + b.x * sc} cy={cy - b.y * sc} r={Math.max(1.5, (b.diametro || 1) * sc * 0.4)} fill="#2563eb" />
      ))}
    </svg>
  )
}

// ── Panel lateral de edición ──
function PanelEdicion({ tipo, onClose, onSave }) {
  const [codigo, setCodigo] = useState(tipo?.codigo || 'CT-01')
  const [desc, setDesc] = useState(tipo?.descripcion || '')
  const [fc, setFc] = useState(tipo?.material?.fc || 280)
  const [fy, setFy] = useState(tipo?.material?.fy || 4200)
  const [tipoSec, setTipoSec] = useState(tipo?.geometria?.tipo || 'rectangular')
  const [b, setB] = useState(tipo?.geometria?.b || 40)
  const [h, setH] = useState(tipo?.geometria?.h || 50)
  const [diam, setDiam] = useState(tipo?.geometria?.D || 50)
  const [bAlma, setBAlma] = useState(tipo?.geometria?.b_alma || 25)
  const [hTotal, setHTotal] = useState(tipo?.geometria?.h_total || 60)
  const [bAla, setBAla] = useState(tipo?.geometria?.b_ala || 50)
  const [hAla, setHAla] = useState(tipo?.geometria?.h_ala || 15)
  const [rec, setRec] = useState(tipo?.geometria?.recubrimiento || 4)
  const [lon, setLon] = useState(tipo?.geometria?.longitud || 300)
  const [sis, setSis] = useState(tipo?.sistema_estructural || 'SMF')
  const [barras, setBarras] = useState(tipo?.refuerzo?.barras ? [...tipo.refuerzo.barras] : [])
  const [nB, setNB] = useState(8)
  const [dSel, setDSel] = useState(2.540)

  const esCirc = tipoSec === 'circular'
  const esT = tipoSec === 'T'
  const esL = tipoSec === 'L'

  const buildGeo = () => {
    if (esCirc) return { tipo: 'circular', D: +diam, recubrimiento: +rec, longitud: +lon }
    if (esT) return { tipo: 'T', b_alma: +bAlma, h_total: +hTotal, b_ala: +bAla, h_ala: +hAla, recubrimiento: +rec, longitud: +lon }
    if (esL) return { tipo: 'L', b_alma: +bAlma, h_total: +hTotal, b_ala: +bAla, h_ala: +hAla, recubrimiento: +rec, longitud: +lon }
    return { tipo: 'rectangular', b: +b, h: +h, recubrimiento: +rec, longitud: +lon }
  }

  const generar = () => {
    if (esCirc) setBarras(generarDisposicionCircular(+diam, +rec, +nB, dSel))
    else if (esT) setBarras(generarDisposicionT(+bAlma, +hTotal, +bAla, +hAla, +rec, +nB, dSel))
    else if (esL) setBarras(generarDisposicionL(+bAlma, +hTotal, +bAla, +hAla, +rec, +nB, dSel))
    else setBarras(generarDisposicion(+b, +h, +rec, +nB, dSel, 'rectangular'))
  }

  const guardar = () => {
    onSave({
      codigo, descripcion: desc,
      material: { fc: +fc, fy: +fy },
      geometria: buildGeo(),
      sistema_estructural: sis,
      refuerzo: { barras },
    })
  }

  const As = barras.reduce((s, br) => s + (br.area || 0), 0)
  const geoObj = buildGeo()
  const Ag = calcularAreaSeccion(geoObj)
  const rho = Ag ? (As / Ag * 100) : 0

  return (
    <div className="bib-panel-overlay" onClick={onClose}>
      <div className="bib-panel" onClick={e => e.stopPropagation()}>
        <div className="bib-panel-header">
          <span className="modal-title">{tipo ? 'Editar Tipo' : 'Nuevo Tipo'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="bib-panel-body">
          {/* Código y descripción */}
          <div className="modal-field">
            <label>Codigo</label>
            <input className="f-input" value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="CT-01" />
          </div>
          <div className="modal-field">
            <label>Descripcion</label>
            <input className="f-input" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Columna principal..." />
          </div>

          {/* Materiales */}
          <div className="bib-section-title">Materiales</div>
          <div className="modal-row">
            <div className="modal-field">
              <label>f'c (kg/cm2)</label>
              <input className="f-input" type="number" value={fc} onChange={e => setFc(e.target.value)} />
            </div>
            <div className="modal-field">
              <label>fy (kg/cm2)</label>
              <input className="f-input" type="number" value={fy} onChange={e => setFy(e.target.value)} />
            </div>
          </div>

          {/* Geometría */}
          <div className="bib-section-title">Geometria</div>
          <div className="modal-field">
            <label>Tipo de seccion</label>
            <div className="view-btns" style={{ marginTop: 2 }}>
              {[{ key: 'rectangular', l: 'Rect' }, { key: 'circular', l: 'Circ' }, { key: 'T', l: 'T' }, { key: 'L', l: 'L' }].map(t => (
                <button key={t.key} className={`view-btn ${tipoSec === t.key ? 'active' : ''}`}
                  onClick={() => { setTipoSec(t.key); setBarras([]) }}>{t.l}</button>
              ))}
            </div>
          </div>
          {esCirc ? (
            <div className="modal-row">
              <div className="modal-field"><label>D (cm)</label><input className="f-input" type="number" value={diam} onChange={e => setDiam(e.target.value)} /></div>
              <div className="modal-field"><label>r (cm)</label><input className="f-input" type="number" value={rec} onChange={e => setRec(e.target.value)} /></div>
            </div>
          ) : (esT || esL) ? (
            <>
              <div className="modal-row">
                <div className="modal-field"><label>b alma</label><input className="f-input" type="number" value={bAlma} onChange={e => setBAlma(e.target.value)} /></div>
                <div className="modal-field"><label>h total</label><input className="f-input" type="number" value={hTotal} onChange={e => setHTotal(e.target.value)} /></div>
              </div>
              <div className="modal-row">
                <div className="modal-field"><label>b ala</label><input className="f-input" type="number" value={bAla} onChange={e => setBAla(e.target.value)} /></div>
                <div className="modal-field"><label>h ala</label><input className="f-input" type="number" value={hAla} onChange={e => setHAla(e.target.value)} /></div>
              </div>
              <div className="modal-row">
                <div className="modal-field"><label>r (cm)</label><input className="f-input" type="number" value={rec} onChange={e => setRec(e.target.value)} /></div>
                <div />
              </div>
            </>
          ) : (
            <div className="modal-row">
              <div className="modal-field"><label>b (cm)</label><input className="f-input" type="number" value={b} onChange={e => setB(e.target.value)} /></div>
              <div className="modal-field"><label>h (cm)</label><input className="f-input" type="number" value={h} onChange={e => setH(e.target.value)} /></div>
            </div>
          )}
          <div className="modal-row">
            <div className="modal-field"><label>Longitud (cm)</label><input className="f-input" type="number" value={lon} onChange={e => setLon(e.target.value)} /></div>
            <div className="modal-field">
              <label>Sistema</label>
              <select className="f-input" value={sis} onChange={e => setSis(e.target.value)}>
                <option value="SMF">SMF (0.65)</option><option value="BF">BF (0.70)</option>
              </select>
            </div>
          </div>

          {/* Refuerzo */}
          <div className="bib-section-title">Refuerzo</div>
          <div className="modal-row">
            <div className="modal-field">
              <label>N barras</label>
              <input className="f-input" type="number" value={nB} onChange={e => setNB(e.target.value)} min="4" />
            </div>
            <div className="modal-field">
              <label>Diametro</label>
              <select className="f-input" value={dSel} onChange={e => setDSel(+e.target.value)}>
                {VARILLAS_PERU.map(v => <option key={v.numero} value={v.d}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <button className="btn-sec" onClick={generar} style={{ width: '100%', fontSize: 9, marginBottom: 8 }}>Generar disposicion</button>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <div className="bib-stat">{barras.length} <span>barras</span></div>
            <div className="bib-stat" style={{ color: cuantiaColor(rho) }}>{rho.toFixed(2)}% <span>cuantia</span></div>
            <div className="bib-stat">{As.toFixed(1)} <span>cm2</span></div>
          </div>

          {/* Mini preview */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <SectionMini geo={geoObj} barras={barras} />
          </div>

          {/* Tabla barras resumen */}
          {barras.length > 0 && (
            <div style={{ fontSize: 9, color: 'var(--text2)', marginBottom: 8 }}>
              {barras.length} barras definidas
              <button className="bt-clear" onClick={() => setBarras([])} style={{ marginLeft: 8 }}>Limpiar</button>
            </div>
          )}
        </div>
        <div className="bib-panel-footer">
          <button className="btn-sec" onClick={onClose}>Cancelar</button>
          <button className="btn-calc" style={{ width: 'auto', padding: '8px 24px', fontSize: 11 }} onClick={guardar}>
            Guardar Tipo
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
//  BIBLIOTECA DE TIPOS
// ══════════════════════════════════════════════════════════════════
export default function BibliotecaTipos() {
  const { tiposColumna, columnas, dispatch } = useProyecto()
  const [editId, setEditId] = useState(null)
  const [creating, setCreating] = useState(false)

  const goBack = () => dispatch({ type: 'SET_VISTA', vista: 'dashboard' })

  const handleSave = (changes) => {
    if (creating) {
      dispatch({ type: 'AGREGAR_TIPO', overrides: changes })
      setCreating(false)
    } else if (editId) {
      dispatch({ type: 'ACTUALIZAR_TIPO', id: editId, changes })
      setEditId(null)
    }
  }

  const editingTipo = editId ? tiposColumna.find(t => t.id === editId) : null

  return (
    <div className="dashboard">
      {/* Header */}
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
            <button className="dash-nav-tab" onClick={goBack}>Proyecto</button>
            <button className="dash-nav-tab active">Biblioteca</button>
          </div>
        </div>
        <div className="dash-header-right">
          <span className="badge norm">NTP E.060</span>
          <span className="badge accent">v2.1</span>
        </div>
      </header>

      <div className="dash-body">
        <div className="dash-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="dash-toolbar-title">Biblioteca de Tipos de Columna</span>
            <span className="badge-tipo-count">{tiposColumna.length}</span>
          </div>
          <button className="btn-calc" style={{ width: 'auto', padding: '7px 20px', fontSize: 10 }}
            onClick={() => setCreating(true)}>
            NUEVO TIPO
          </button>
        </div>

        {/* Tabla */}
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th style={{ width: 100 }}>Codigo</th>
                <th style={{ width: 180 }}>Descripcion</th>
                <th style={{ width: 90 }}>Seccion</th>
                <th style={{ width: 60 }}>f'c</th>
                <th style={{ width: 60 }}>fy</th>
                <th style={{ width: 60 }}>Barras</th>
                <th style={{ width: 80 }}>Cuantia</th>
                <th style={{ width: 70 }}>Preview</th>
                <th style={{ width: 80 }}>Usado en</th>
                <th style={{ width: 120 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tiposColumna.map((tipo, i) => {
                const rho = cuantia(tipo)
                const usadoEn = columnas.filter(c => c.tipoId === tipo.id).length
                return (
                  <tr key={tipo.id} className={i % 2 === 0 ? 'dash-row-even' : 'dash-row-odd'}
                    onClick={() => setEditId(tipo.id)} style={{ cursor: 'pointer' }}>
                    <td>
                      <span className="badge-tipo-code">{tipo.codigo}</span>
                    </td>
                    <td>
                      <input className="dash-inline-input" value={tipo.descripcion}
                        onClick={e => e.stopPropagation()}
                        onChange={e => dispatch({ type: 'ACTUALIZAR_TIPO', id: tipo.id, changes: { descripcion: e.target.value } })}
                        placeholder="Sin descripcion" />
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>{secLabel(tipo.geometria)} cm</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>{tipo.material.fc}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>{tipo.material.fy}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 10, textAlign: 'center' }}>{tipo.refuerzo?.barras?.length || 0}</td>
                    <td>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, color: cuantiaColor(rho) }}>
                        {rho !== null ? `${rho.toFixed(2)}%` : '—'}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <SectionMini geo={tipo.geometria} barras={tipo.refuerzo?.barras} />
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: usadoEn > 0 ? 'var(--teal)' : 'var(--text3)' }}>
                        {usadoEn} col{usadoEn !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="dash-actions">
                        <button className="dash-act-btn" onClick={() => setEditId(tipo.id)} title="Editar">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button className="dash-act-btn" onClick={() => dispatch({ type: 'DUPLICAR_TIPO', id: tipo.id })} title="Duplicar">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        </button>
                        <button className="dash-act-btn dash-act-del" onClick={() => dispatch({ type: 'ELIMINAR_TIPO', id: tipo.id })} title="Eliminar">
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
      </div>

      {/* Panel de edición */}
      {(editId || creating) && (
        <PanelEdicion
          tipo={creating ? null : editingTipo}
          onClose={() => { setEditId(null); setCreating(false) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
