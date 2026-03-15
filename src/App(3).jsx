import { useState, useCallback } from 'react'
import SidebarInputs from './components/SidebarInputs'
import ThreeSurfaceViewer from './three_scene/ThreeSurfaceViewer'
import InteractionDiagramMx from './charts/InteractionDiagramMx'
import InteractionDiagramMy from './charts/InteractionDiagramMy'
import { generarSuperficie } from './utils/engine'
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
          <span className="topbar-title">Software <span>E.060</span></span>
        </div>
        <div className="topbar-meta">
          <div className="topbar-field">
            <label>Proyecto</label>
            <input value={proyecto.nombre} onChange={e=>setProyecto(p=>({...p,nombre:e.target.value}))} placeholder="nombre del proyecto"/>
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
            <div className="topbar-field" style={{marginLeft:16}}>
              <label>Sección</label>
              <input readOnly value={`${geo.b}×${geo.h} cm`} style={{width:70,color:'rgba(255,255,255,.7)',cursor:'default'}}/>
            </div>
            <div className="topbar-field">
              <label>f'c</label>
              <input readOnly value={`${mat?.fc} kg/cm²`} style={{width:80,color:'rgba(255,255,255,.7)',cursor:'default'}}/>
            </div>
          </>}
        </div>
        <div className="topbar-badges">
          <span className="badge norm">NTP E.060</span>
          <span className="badge norm">ACI 318</span>
          <span className="badge accent">v2.1</span>
        </div>
      </header>

      <div className="app-body">

        {/* ══ ZONA 1 — PANEL LATERAL IZQUIERDO ══ */}
        <aside className="sidebar">
          <SidebarInputs
            onCalculate={handleCalculate}
            loading={loading}
            columnData={columnData}
            surfaceData={surfaceData}
            onDemandChange={setDemandPoint}
          />
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

        {/* ══ ZONA 2 — VISOR 3D CENTRAL ══ */}
        <section className="center-zone">
          {error && <div className="err-bar">⚠ {error}</div>}
          <ThreeSurfaceViewer
            surfaceData={surfaceData}
            demandPoint={demandPoint}
            loading={loading}
            progress={progress}
          />
        </section>

        {/* ══ ZONA 3 — PANEL DERECHO GRÁFICOS ══ */}
        <aside className="charts-panel">
          <div className="charts-panel-header">
            <div className="sec-num" style={{background:'var(--purple)'}}>D</div>
            <span className="charts-panel-title">Diagramas de Interacción</span>
          </div>
          <InteractionDiagramMx
            curva={surfaceData?.puntos_curva_PMx}
            demandPoint={demandPoint ? {P:demandPoint.Pu, M:demandPoint.Mux} : null}
          />
          <InteractionDiagramMy
            curva={surfaceData?.puntos_curva_PMy}
            demandPoint={demandPoint ? {P:demandPoint.Pu, M:demandPoint.Muy} : null}
          />
        </aside>

      </div>
    </div>
  )
}
