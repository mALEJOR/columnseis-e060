import { useState, useCallback } from 'react'
import { useProyecto } from './context/ProyectoContext'
import ProjectDashboard from './components/ProjectDashboard'
import SidebarInputs from './components/SidebarInputs'
import ThreeSurfaceViewer from './three_scene/ThreeSurfaceViewer'
import InteractionChart from './charts/InteractionDiagramMx'
import StirrupDesign from './components/StirrupDesign'
import { generarSuperficie } from './utils/engine'
import { generarPDF } from './components/PDFReport'
import './App.css'

const fmt = (v, d=1) => (isNaN(v)||v===undefined) ? '—' : Number(v).toFixed(d)

// ══════════════════════════════════════════════════════════════════
//  EDITOR DE COLUMNA (antes era todo App)
// ══════════════════════════════════════════════════════════════════
function ColumnEditor() {
  const { columnaActiva, columnas, dispatch, nombre: proyNombre } = useProyecto()
  const col = columnaActiva

  // Estado local del editor (no persiste entre columnas adrede)
  const [loading, setLoading]         = useState(false)
  const [progress, setProgress]       = useState(0)
  const [error, setError]             = useState(null)
  const [demandPoint, setDemandPoint] = useState(null)
  const [dcrMax, setDcrMax]           = useState(col?.dcr_max ?? null)
  const [dcrOk, setDcrOk]            = useState(col?.estado !== 'no_conforme')
  const [activeTab, setActiveTab]     = useState('interaccion')

  // Viewer settings
  const [ptSize, setPtSize]     = useState(4)
  const [viewType, setViewType] = useState('mesh')

  // Datos derivados de la columna activa
  const columnData = col ? {
    material: { fc: col.material.fc, fy: col.material.fy, Es: 2000000 },
    geometria: col.geometria,
    refuerzo: col.refuerzo,
    sistema_estructural: col.sistema_estructural || 'SMF',
    angulos_neutro: 36,
    pasos_profundidad: 50,
  } : null

  const surfaceData = col?.superficie ?? null
  const estribosData = col?.estribosData ?? null

  const handleCalculate = useCallback((data) => {
    if (!col) return
    setLoading(true); setError(null); setProgress(0)
    // Guardar columnData en contexto
    dispatch({
      type: 'ACTUALIZAR_COLUMNA', id: col.id,
      changes: {
        material: { fc: data.material.fc, fy: data.material.fy },
        geometria: data.geometria,
        refuerzo: data.refuerzo,
        sistema_estructural: data.sistema_estructural,
        estado: 'calculando',
      },
    })
    setTimeout(() => {
      try {
        const result = generarSuperficie(data, pct => setProgress(pct))
        dispatch({
          type: 'ACTUALIZAR_COLUMNA', id: col.id,
          changes: { superficie: result, estado: 'sin_calcular' },
        })
      } catch(err) {
        setError(err.message || 'Error en el cálculo estructural')
        dispatch({ type: 'ACTUALIZAR_CAMPO_COLUMNA', id: col.id, field: 'estado', value: 'sin_calcular' })
      } finally { setLoading(false) }
    }, 50)
  }, [col, dispatch])

  const handleExportPDF = () => {
    const proyecto = { nombre: proyNombre, licencia: col?.nombre || '', autor: '' }
    generarPDF({ proyecto, columnData, surfaceData, estribosData })
  }

  const handleDcrUpdate = (dcr, ok) => {
    setDcrMax(dcr)
    setDcrOk(ok)
    if (col) {
      dispatch({
        type: 'ACTUALIZAR_COLUMNA', id: col.id,
        changes: { dcr_max: dcr, estado: ok ? 'conforme' : 'no_conforme' },
      })
    }
  }

  const handleEstribosCalc = (data) => {
    if (col) {
      dispatch({ type: 'ACTUALIZAR_CAMPO_COLUMNA', id: col.id, field: 'estribosData', value: data })
    }
  }

  // Navegación
  const colIdx = columnas.findIndex(c => c.id === col?.id)
  const canPrev = colIdx > 0
  const canNext = colIdx < columnas.length - 1
  const goPrev = () => dispatch({ type: 'NAVEGAR_COLUMNA', dir: -1 })
  const goNext = () => dispatch({ type: 'NAVEGAR_COLUMNA', dir: 1 })
  const goBack = () => dispatch({ type: 'SET_VISTA', vista: 'dashboard' })

  const geo = columnData?.geometria
  const mat = columnData?.material
  const rho = surfaceData?.cuantia_acero
  const rhoOk = rho >= 1 && rho <= 6

  if (!col) return null

  return (
    <div className="app">
      {/* ── TOPBAR ── */}
      <header className="topbar">
        <div className="topbar-logo">
          <button className="btn-back" onClick={goBack} title="Volver al dashboard">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polygon points="12,2 22,8 22,16 12,22 2,16 2,8"/>
            <line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="8" x2="22" y2="16"/>
            <line x1="2" y1="16" x2="22" y2="8"/>
          </svg>
          <span className="topbar-title">Column<span>Seis</span></span>
        </div>

        {/* Breadcrumb + Nav */}
        <div className="topbar-nav">
          <span className="breadcrumb">
            <span className="breadcrumb-project" onClick={goBack}>{proyNombre || 'Proyecto'}</span>
            <span className="breadcrumb-sep">&gt;</span>
            <span className="breadcrumb-col">{col.nombre}</span>
            {col.eje && <span className="breadcrumb-detail">{col.eje}</span>}
            {col.nivel && <span className="breadcrumb-detail">N{col.nivel}</span>}
          </span>
          <div className="nav-arrows">
            <button className="nav-arrow" onClick={goPrev} disabled={!canPrev} title="Columna anterior">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="nav-counter">{colIdx + 1}/{columnas.length}</span>
            <button className="nav-arrow" onClick={goNext} disabled={!canNext} title="Columna siguiente">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="topbar-badges">
          <button className={`tab-btn ${activeTab==='interaccion'?'active':''}`} onClick={()=>setActiveTab('interaccion')}>Interacción</button>
          <button className={`tab-btn ${activeTab==='estribos'?'active':''}`} onClick={()=>setActiveTab('estribos')}>Estribos</button>
          <span style={{width:1,height:20,background:'var(--border)',margin:'0 4px'}}/>
          <button className="btn-pdf" onClick={handleExportPDF} disabled={!surfaceData} title="Exportar reporte PDF">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/>
              <polyline points="9 15 12 18 15 15"/>
            </svg>
            PDF
          </button>
          <span style={{width:1,height:20,background:'var(--border)',margin:'0 4px'}}/>
          <span className="badge norm">NTP E.060</span>
          <span className="badge norm">ACI 318</span>
          <span className="badge accent">v2.1</span>
        </div>
      </header>

      <div className="app-body">
        {/* ══ PANEL LATERAL IZQUIERDO ══ */}
        <aside className="sidebar">
          <SidebarInputs
            key={col.id}
            onCalculate={handleCalculate}
            loading={loading}
            surfaceData={surfaceData}
            onDemandChange={setDemandPoint}
            ptSize={ptSize}
            setPtSize={setPtSize}
            viewType={viewType}
            setViewType={setViewType}
            onDcrUpdate={handleDcrUpdate}
            columnaActiva={col}
          />
          {/* DCR Badge */}
          <div className={`dcr-badge ${dcrMax !== null ? (dcrOk ? 'ok' : 'bad') : 'neutral'}`}>
            <div className="dcr-badge-label">RATIO<br/>D/C MÁX</div>
            <div className="dcr-badge-value">{dcrMax !== null ? dcrMax.toFixed(3) : '—'}</div>
          </div>
          {/* RESULT BAR */}
          {surfaceData && (
            <div className="result-bar">
              <div className={`rchip ${rhoOk?'ok':'bad'}`}>
                <div className="rchip-l">φP₀</div>
                <div className="rchip-v">{fmt(surfaceData.P_max/1000)}<span className="rchip-u">t</span></div>
              </div>
              <div className="rchip bad">
                <div className="rchip-l">φPt</div>
                <div className="rchip-v">{fmt(surfaceData.P_min/1000)}<span className="rchip-u">t</span></div>
              </div>
              <div className={`rchip ${rhoOk?'ok':'bad'}`}>
                <div className="rchip-l">ρ</div>
                <div className="rchip-v">{fmt(rho,2)}<span className="rchip-u">%</span></div>
              </div>
              <div className="rchip">
                <div className="rchip-l">As</div>
                <div className="rchip-v">{fmt(surfaceData.area_acero,1)}<span className="rchip-u">cm²</span></div>
              </div>
            </div>
          )}
        </aside>

        {/* ══ CONTENIDO CENTRAL ══ */}
        <main className="main-content">
          {error && <div className="err-bar">⚠ {error}</div>}

          {activeTab === 'interaccion' && (
            <>
              <div className="viewer-wrapper">
                <ThreeSurfaceViewer
                  surfaceData={surfaceData}
                  demandPoint={demandPoint}
                  loading={loading}
                  progress={progress}
                  ptSize={ptSize}
                  viewType={viewType}
                />
              </div>

              <div className="charts-grid">
                <InteractionChart
                  curva={surfaceData?.puntos_curva_PMx}
                  demandPoint={demandPoint ? {P:demandPoint.Pu, M:demandPoint.Mux} : null}
                  title="P-M33 (Sismo X)"
                  labelX="M33"
                  color="#2563eb"
                  dotColor="#2563eb"
                />
                <InteractionChart
                  curva={surfaceData?.puntos_curva_PMy}
                  demandPoint={demandPoint ? {P:demandPoint.Pu, M:demandPoint.Muy} : null}
                  title="P-M22 (Sismo X)"
                  labelX="M22"
                  color="#d97706"
                  dotColor="#d97706"
                />
                <InteractionChart
                  curva={surfaceData?.puntos_curva_PMx}
                  demandPoint={null}
                  title="P-M33 (Sismo Y)"
                  labelX="M33"
                  color="#dc2626"
                  dotColor="#dc2626"
                />
                <InteractionChart
                  curva={surfaceData?.puntos_curva_PMy}
                  demandPoint={null}
                  title="P-M22 (Sismo Y)"
                  labelX="M22"
                  color="#059669"
                  dotColor="#059669"
                />
              </div>
            </>
          )}

          {activeTab === 'estribos' && (
            <StirrupDesign
              columnData={columnData}
              onEstribosCalc={handleEstribosCalc}
            />
          )}
        </main>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
//  APP ROOT — Decide entre Dashboard y Editor
// ══════════════════════════════════════════════════════════════════
export default function App() {
  const { vista } = useProyecto()

  if (vista === 'editor') return <ColumnEditor />
  return <ProjectDashboard />
}
