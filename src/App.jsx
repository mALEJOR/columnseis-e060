import { useState, useCallback } from 'react'
import { useProyecto } from './context/ProyectoContext'
import ProjectDashboard from './components/ProjectDashboard'
import BibliotecaTipos from './components/BibliotecaTipos'
import SidebarInputs from './components/SidebarInputs'
import ThreeSurfaceViewer from './three_scene/ThreeSurfaceViewer'
import InteractionChart from './charts/InteractionDiagramMx'
import StirrupDesign from './components/StirrupDesign'
import { generarSuperficie } from './utils/engine'
import { generarPDF } from './components/PDFReport'
import './App.css'

const fmt = (v, d=1) => (isNaN(v)||v===undefined) ? '—' : Number(v).toFixed(d)

// ── Card de tipo asignado en el sidebar ──
function TipoCard({ col, tiposColumna, dispatch }) {
  const [showSelect, setShowSelect] = useState(false)
  const tipo = col.tipoId ? tiposColumna.find(t => t.id === col.tipoId) : null

  if (tipo) {
    return (
      <div className="tipo-card">
        <div className="tipo-card-header">
          <span style={{fontSize:8,color:'var(--text3)',textTransform:'uppercase',letterSpacing:.8,fontWeight:600}}>Tipo Asignado</span>
          <div style={{display:'flex',gap:4}}>
            <button className="tipo-card-btn" onClick={() => dispatch({ type: 'SET_VISTA', vista: 'biblioteca' })}>Ver</button>
            <button className="tipo-card-btn tipo-card-btn-red" onClick={() => dispatch({ type: 'DESVINCULAR_TIPO', colId: col.id })}>Desvincular</button>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,marginTop:6}}>
          <span className="badge-tipo-code">{tipo.codigo}</span>
          <span style={{fontSize:10,color:'var(--text1)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{tipo.descripcion}</span>
        </div>
        {/* Toggle sobreescritura */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:8,paddingTop:6,borderTop:'1px solid var(--border)'}}>
          <span style={{fontSize:8,color:col.sobreescrito?'var(--amber)':'var(--text3)',textTransform:'uppercase',letterSpacing:.5,fontWeight:500}}>
            {col.sobreescrito ? 'Modificado localmente' : 'Heredado del tipo'}
          </span>
          <label style={{position:'relative',width:32,height:18,cursor:'pointer'}}>
            <input type="checkbox" checked={col.sobreescrito}
              onChange={e => dispatch({ type: 'SET_SOBREESCRITO', colId: col.id, value: e.target.checked })}
              style={{opacity:0,width:0,height:0}} />
            <span style={{position:'absolute',inset:0,borderRadius:9,background:col.sobreescrito?'var(--amber)':'var(--border)',transition:'background .2s'}}>
              <span style={{position:'absolute',top:2,left:col.sobreescrito?16:2,width:14,height:14,borderRadius:'50%',background:'#fff',transition:'left .2s',boxShadow:'0 1px 2px rgba(0,0,0,.15)'}} />
            </span>
          </label>
        </div>
      </div>
    )
  }

  // Sin tipo
  return (
    <div className="tipo-card">
      <div className="tipo-card-header">
        <span style={{fontSize:8,color:'var(--text3)',textTransform:'uppercase',letterSpacing:.8,fontWeight:600}}>Tipo Asignado</span>
      </div>
      {!showSelect ? (
        <button className="btn-sec" style={{width:'100%',fontSize:9,marginTop:6}} onClick={() => setShowSelect(true)}>
          Asignar tipo
        </button>
      ) : (
        <div style={{marginTop:6}}>
          <select className="f-input" style={{fontSize:10,marginBottom:4}}
            onChange={e => { dispatch({ type: 'ASIGNAR_TIPO', colId: col.id, tipoId: +e.target.value, forzar: true }); setShowSelect(false) }}>
            <option value="">— Seleccionar —</option>
            {tiposColumna.map(t => <option key={t.id} value={t.id}>{t.codigo} — {t.descripcion}</option>)}
          </select>
          <button className="btn-sec" style={{fontSize:8,padding:'2px 8px'}} onClick={() => setShowSelect(false)}>Cancelar</button>
        </div>
      )}
      <span className="badge-estado badge-gray" style={{marginTop:6,display:'inline-block'}}>SIN TIPO</span>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
//  EDITOR DE COLUMNA
// ══════════════════════════════════════════════════════════════════
function ColumnEditor() {
  const { columnaActiva, columnas, tiposColumna, dispatch, nombre: proyNombre } = useProyecto()
  const col = columnaActiva

  const [loading, setLoading]         = useState(false)
  const [progress, setProgress]       = useState(0)
  const [error, setError]             = useState(null)
  const [demandPoint, setDemandPoint] = useState(null)
  const [dcrMax, setDcrMax]           = useState(col?.dcr_max ?? null)
  const [dcrOk, setDcrOk]            = useState(col?.estado !== 'no_conforme')
  const [activeTab, setActiveTab]     = useState('interaccion')
  const [ptSize, setPtSize]     = useState(4)
  const [viewType, setViewType] = useState('mesh')

  const columnData = col ? {
    material: { fc: col.material.fc, fy: col.material.fy, Es: 2000000 },
    geometria: col.geometria,
    refuerzo: col.refuerzo,
    sistema_estructural: col.sistema_estructural || 'SMF',
    angulos_neutro: 36, pasos_profundidad: 50,
  } : null

  const surfaceData = col?.superficie ?? null
  const estribosData = col?.estribosData ?? null

  const handleCalculate = useCallback((data) => {
    if (!col) return
    setLoading(true); setError(null); setProgress(0)
    dispatch({ type: 'ACTUALIZAR_COLUMNA', id: col.id, changes: {
      material: { fc: data.material.fc, fy: data.material.fy },
      geometria: data.geometria, refuerzo: data.refuerzo,
      sistema_estructural: data.sistema_estructural, estado: 'calculando',
    }})
    setTimeout(() => {
      try {
        const result = generarSuperficie(data, pct => setProgress(pct))
        dispatch({ type: 'ACTUALIZAR_COLUMNA', id: col.id, changes: { superficie: result, estado: 'sin_calcular' } })
      } catch(err) {
        setError(err.message || 'Error en el calculo estructural')
        dispatch({ type: 'ACTUALIZAR_CAMPO_COLUMNA', id: col.id, field: 'estado', value: 'sin_calcular' })
      } finally { setLoading(false) }
    }, 50)
  }, [col, dispatch])

  const handleExportPDF = () => {
    generarPDF({ proyecto: { nombre: proyNombre, licencia: col?.nombre || '', autor: '' }, columnData, surfaceData, estribosData })
  }
  const handleDcrUpdate = (dcr, ok) => {
    setDcrMax(dcr); setDcrOk(ok)
    if (col) dispatch({ type: 'ACTUALIZAR_COLUMNA', id: col.id, changes: { dcr_max: dcr, estado: ok ? 'conforme' : 'no_conforme' } })
  }
  const handleEstribosCalc = (data) => {
    if (col) dispatch({ type: 'ACTUALIZAR_CAMPO_COLUMNA', id: col.id, field: 'estribosData', value: data })
  }

  const colIdx = columnas.findIndex(c => c.id === col?.id)
  const goPrev = () => dispatch({ type: 'NAVEGAR_COLUMNA', dir: -1 })
  const goNext = () => dispatch({ type: 'NAVEGAR_COLUMNA', dir: 1 })
  const goBack = () => dispatch({ type: 'SET_VISTA', vista: 'dashboard' })

  const rho = surfaceData?.cuantia_acero
  const rhoOk = rho >= 1 && rho <= 6

  if (!col) return null

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-logo">
          <button className="btn-back" onClick={goBack} title="Volver al dashboard">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polygon points="12,2 22,8 22,16 12,22 2,16 2,8"/><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="8" x2="22" y2="16"/><line x1="2" y1="16" x2="22" y2="8"/>
          </svg>
          <span className="topbar-title">Column<span>Seis</span></span>
        </div>
        <div className="topbar-nav">
          <span className="breadcrumb">
            <span className="breadcrumb-project" onClick={goBack}>{proyNombre || 'Proyecto'}</span>
            <span className="breadcrumb-sep">&gt;</span>
            <span className="breadcrumb-col">{col.nombre}</span>
            {col.eje && <span className="breadcrumb-detail">{col.eje}</span>}
            {col.nivel && <span className="breadcrumb-detail">N{col.nivel}</span>}
            {col.tipoId && (() => {
              const t = tiposColumna.find(t => t.id === col.tipoId)
              return t ? <span className="badge-tipo-code" style={{marginLeft:4}}>{t.codigo}</span> : null
            })()}
          </span>
          <div className="nav-arrows">
            <button className="nav-arrow" onClick={goPrev} disabled={colIdx <= 0}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg></button>
            <span className="nav-counter">{colIdx + 1}/{columnas.length}</span>
            <button className="nav-arrow" onClick={goNext} disabled={colIdx >= columnas.length - 1}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 6 15 12 9 18" /></svg></button>
          </div>
        </div>
        <div className="topbar-badges">
          <button className={`tab-btn ${activeTab==='interaccion'?'active':''}`} onClick={()=>setActiveTab('interaccion')}>Interaccion</button>
          <button className={`tab-btn ${activeTab==='estribos'?'active':''}`} onClick={()=>setActiveTab('estribos')}>Estribos</button>
          <span style={{width:1,height:20,background:'var(--border)',margin:'0 4px'}}/>
          <button className="btn-pdf" onClick={handleExportPDF} disabled={!surfaceData} title="Exportar PDF">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>
            PDF
          </button>
          <span style={{width:1,height:20,background:'var(--border)',margin:'0 4px'}}/>
          <span className="badge norm">NTP E.060</span>
          <span className="badge norm">ACI 318</span>
          <span className="badge accent">v2.1</span>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          {/* Tipo card */}
          <TipoCard col={col} tiposColumna={tiposColumna} dispatch={dispatch} />
          <SidebarInputs
            key={col.id}
            onCalculate={handleCalculate} loading={loading} surfaceData={surfaceData}
            onDemandChange={setDemandPoint} ptSize={ptSize} setPtSize={setPtSize}
            viewType={viewType} setViewType={setViewType} onDcrUpdate={handleDcrUpdate}
            columnaActiva={col}
          />
          <div className={`dcr-badge ${dcrMax !== null ? (dcrOk ? 'ok' : 'bad') : 'neutral'}`}>
            <div className="dcr-badge-label">RATIO<br/>D/C MAX</div>
            <div className="dcr-badge-value">{dcrMax !== null ? dcrMax.toFixed(3) : '—'}</div>
          </div>
          {surfaceData && (
            <div className="result-bar">
              <div className={`rchip ${rhoOk?'ok':'bad'}`}><div className="rchip-l">φP₀</div><div className="rchip-v">{fmt(surfaceData.P_max/1000)}<span className="rchip-u">t</span></div></div>
              <div className="rchip bad"><div className="rchip-l">φPt</div><div className="rchip-v">{fmt(surfaceData.P_min/1000)}<span className="rchip-u">t</span></div></div>
              <div className={`rchip ${rhoOk?'ok':'bad'}`}><div className="rchip-l">ρ</div><div className="rchip-v">{fmt(rho,2)}<span className="rchip-u">%</span></div></div>
              <div className="rchip"><div className="rchip-l">As</div><div className="rchip-v">{fmt(surfaceData.area_acero,1)}<span className="rchip-u">cm²</span></div></div>
            </div>
          )}
        </aside>
        <main className="main-content">
          {error && <div className="err-bar">⚠ {error}</div>}
          {activeTab === 'interaccion' && (<>
            <div className="viewer-wrapper">
              <ThreeSurfaceViewer surfaceData={surfaceData} demandPoint={demandPoint} loading={loading} progress={progress} ptSize={ptSize} viewType={viewType} />
            </div>
            <div className="charts-grid">
              <InteractionChart curva={surfaceData?.puntos_curva_PMx} demandPoint={demandPoint ? {P:demandPoint.Pu, M:demandPoint.Mux} : null} title="P-M33 (Sismo X)" labelX="M33" color="#2563eb" dotColor="#2563eb" />
              <InteractionChart curva={surfaceData?.puntos_curva_PMy} demandPoint={demandPoint ? {P:demandPoint.Pu, M:demandPoint.Muy} : null} title="P-M22 (Sismo X)" labelX="M22" color="#d97706" dotColor="#d97706" />
              <InteractionChart curva={surfaceData?.puntos_curva_PMx} demandPoint={null} title="P-M33 (Sismo Y)" labelX="M33" color="#dc2626" dotColor="#dc2626" />
              <InteractionChart curva={surfaceData?.puntos_curva_PMy} demandPoint={null} title="P-M22 (Sismo Y)" labelX="M22" color="#059669" dotColor="#059669" />
            </div>
          </>)}
          {activeTab === 'estribos' && <StirrupDesign columnData={columnData} onEstribosCalc={handleEstribosCalc} />}
        </main>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
//  APP ROOT
// ══════════════════════════════════════════════════════════════════
export default function App() {
  const { vista } = useProyecto()
  if (vista === 'editor') return <ColumnEditor />
  if (vista === 'biblioteca') return <BibliotecaTipos />
  return <ProjectDashboard />
}
