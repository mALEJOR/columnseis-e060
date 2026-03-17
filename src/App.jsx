import { useState, useCallback } from 'react'
import SidebarInputs from './components/SidebarInputs'
import ThreeSurfaceViewer from './three_scene/ThreeSurfaceViewer'
import InteractionChart from './charts/InteractionDiagramMx'
import StirrupDesign from './components/StirrupDesign'
import { generarSuperficie } from './utils/engine'
import { generarPDF } from './components/PDFReport'
import './App.css'

const fmt = (v, d=1) => (isNaN(v)||v===undefined) ? '—' : Number(v).toFixed(d)

export default function App() {
  const [columnData, setColumnData]   = useState(null)
  const [surfaceData, setSurfaceData] = useState(null)
  const [loading, setLoading]         = useState(false)
  const [progress, setProgress]       = useState(0)
  const [error, setError]             = useState(null)
  const [demandPoint, setDemandPoint] = useState(null)
  const [proyecto, setProyecto]       = useState({ nombre:'', licencia:'', autor:'' })
  const [dcrMax, setDcrMax]           = useState(null)
  const [dcrOk, setDcrOk]            = useState(true)
  const [activeTab, setActiveTab]     = useState('interaccion')
  const [estribosData, setEstribosData] = useState(null)

  // Viewer settings (controlled from sidebar)
  const [ptSize, setPtSize]       = useState(4)
  const [viewType, setViewType]   = useState('mesh')

  const handleCalculate = useCallback((data) => {
    setLoading(true); setError(null); setProgress(0); setColumnData(data)
    setTimeout(() => {
      try {
        const result = generarSuperficie(data, pct => setProgress(pct))
        setSurfaceData(result)
      } catch(err) {
        setError(err.message || 'Error en el cálculo estructural')
      } finally { setLoading(false) }
    }, 50)
  }, [])

  const handleExportPDF = () => {
    generarPDF({ proyecto, columnData, surfaceData, estribosData })
  }

  const geo = columnData?.geometria
  const mat = columnData?.material
  const rho = surfaceData?.cuantia_acero
  const rhoOk = rho >= 1 && rho <= 6

  return (
    <div className="app">
      {/* ── TOPBAR ── */}
      <header className="topbar">
        <div className="topbar-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polygon points="12,2 22,8 22,16 12,22 2,16 2,8"/>
            <line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="8" x2="22" y2="16"/>
            <line x1="2" y1="16" x2="22" y2="8"/>
          </svg>
          <span className="topbar-title">Column<span>Seis</span></span>
        </div>
        <div className="topbar-meta">
          <div className="topbar-field">
            <label>Proyecto</label>
            <input value={proyecto.nombre} onChange={e=>setProyecto(p=>({...p,nombre:e.target.value}))} placeholder="Nombre del proyecto"/>
          </div>
          <div className="topbar-field">
            <label>Elemento</label>
            <input value={proyecto.licencia} onChange={e=>setProyecto(p=>({...p,licencia:e.target.value}))} placeholder="COL C-11" style={{width:80}}/>
          </div>
          <div className="topbar-field">
            <label>Profesional</label>
            <input value={proyecto.autor} onChange={e=>setProyecto(p=>({...p,autor:e.target.value}))} placeholder="Ing. Nombre Apellidos"/>
          </div>
          {geo && <>
            <div className="topbar-field" style={{marginLeft:8}}>
              <label>Sección</label>
              <input readOnly value={geo.tipo==='circular' ? `∅${geo.D} cm` : `${geo.b} x ${geo.h} cm`} style={{width:70}}/>
            </div>
            <div className="topbar-field">
              <label>f'c</label>
              <input readOnly value={`${mat?.fc} kg/cm²`} style={{width:85}}/>
            </div>
          </>}
        </div>
        <div className="topbar-badges">
          {/* Tabs */}
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
            onCalculate={handleCalculate}
            loading={loading}
            surfaceData={surfaceData}
            onDemandChange={setDemandPoint}
            ptSize={ptSize}
            setPtSize={setPtSize}
            viewType={viewType}
            setViewType={setViewType}
            onDcrUpdate={(dcr, ok) => { setDcrMax(dcr); setDcrOk(ok) }}
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
              {/* Visor 3D */}
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

              {/* Grilla 2x2 de diagramas */}
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
              onEstribosCalc={setEstribosData}
            />
          )}
        </main>
      </div>
    </div>
  )
}
