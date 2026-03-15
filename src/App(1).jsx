import { useState, useCallback } from 'react'
import InputPanel from './components/InputPanel'
import SectionView from './components/SectionView'
import Surface3D from './three_scene/Surface3D'
import InteractionChart from './charts/InteractionChart'
import VerificationPanel from './components/VerificationPanel'
import StirrupPanel from './components/StirrupPanel'
import { generarSuperficie } from './utils/engine'
import './App.css'

const TABS = [
  { id:'surface3d',    label:'Superficie 3D',  icon:'⬡' },
  { id:'pMx',          label:'P-Mx',            icon:'/' },
  { id:'pMy',          label:'P-My',            icon:'/' },
  { id:'verificacion', label:'Verificación',    icon:'✓' },
  { id:'estribos',     label:'Estribos',        icon:'#' },
]

const fmt = (v, d=1) => isNaN(v) ? '—' : Number(v).toFixed(d)

export default function App() {
  const [columnData, setColumnData]   = useState(null)
  const [surfaceData, setSurfaceData] = useState(null)
  const [loading, setLoading]         = useState(false)
  const [progress, setProgress]       = useState(0)
  const [error, setError]             = useState(null)
  const [activeTab, setActiveTab]     = useState('surface3d')
  const [demandPoint, setDemandPoint] = useState(null)
  const [proyecto, setProyecto]       = useState({ nombre: '', licencia: '', autor: '' })

  const handleCalculate = useCallback((data) => {
    setLoading(true); setError(null); setProgress(0); setColumnData(data)
    setTimeout(() => {
      try {
        const result = generarSuperficie(data, pct => setProgress(pct))
        setSurfaceData(result); setActiveTab('surface3d')
      } catch(err) {
        setError(err.message || 'Error en el cálculo')
      } finally { setLoading(false) }
    }, 50)
  }, [])

  const geo = columnData?.geometria
  const mat = columnData?.material

  return (
    <div className="app">
      {/* HEADER */}
      <header className="app-header">
        <div className="header-brand">
          <div className="header-icon">⬡</div>
          <div>
            <h1>Software <span>E.060</span> — Diseño Sismorresistente de Columnas</h1>
          </div>
        </div>
        <div className="header-badges">
          <span className="badge">NTP E.060</span>
          <span className="badge">ACI 318</span>
          <span className="badge accent">vX.Y.Z</span>
        </div>
      </header>

      {/* PROJECT BAR */}
      <div className="project-bar">
        <div className="project-field">
          <span>Proyecto:</span>
          <strong>
            <input
              value={proyecto.nombre}
              onChange={e => setProyecto(p => ({...p, nombre: e.target.value}))}
              placeholder="NOMBRE DEL PROYECTO"
              style={{background:'transparent',border:'none',outline:'none',fontFamily:'var(--mono)',fontSize:11,fontWeight:600,color:'var(--text1)',width:200,textTransform:'uppercase'}}
            />
          </strong>
        </div>
        <div className="project-field">
          <span>Licencia:</span>
          <strong>
            <input
              value={proyecto.licencia}
              onChange={e => setProyecto(p => ({...p, licencia: e.target.value}))}
              placeholder="LIC-000000"
              style={{background:'transparent',border:'none',outline:'none',fontFamily:'var(--mono)',fontSize:11,fontWeight:600,color:'var(--text1)',width:100}}
            />
          </strong>
        </div>
        <div className="project-field">
          <span>Profesional:</span>
          <strong>
            <input
              value={proyecto.autor}
              onChange={e => setProyecto(p => ({...p, autor: e.target.value}))}
              placeholder="NOMBRE Y APELLIDOS"
              style={{background:'transparent',border:'none',outline:'none',fontFamily:'var(--mono)',fontSize:11,fontWeight:600,color:'var(--text1)',width:180,textTransform:'uppercase'}}
            />
          </strong>
        </div>
        {geo && (
          <>
            <div className="project-field" style={{marginLeft:'auto'}}>
              <span>Sección:</span>
              <strong>{geo.b}×{geo.h} cm</strong>
            </div>
            <div className="project-field">
              <span>f'c =</span>
              <strong>{mat?.fc} kg/cm²</strong>
            </div>
            <div className="project-field">
              <span>fy =</span>
              <strong>{mat?.fy} kg/cm²</strong>
            </div>
          </>
        )}
      </div>

      <div className="app-body">
        {/* LEFT PANEL */}
        <aside className="left-panel">
          {/* Sección 1 */}
          <div className="section-header">
            <div className="sec-num">1</div>
            DATOS DE ENTRADA
          </div>
          <InputPanel onCalculate={handleCalculate} loading={loading} />

          {/* Sección 2 */}
          {columnData && (
            <>
              <div className="section-header">
                <div className="sec-num">2</div>
                SECCIÓN TRANSVERSAL
              </div>
              <SectionView columnData={columnData} />
            </>
          )}

          {/* Resultados rápidos */}
          {surfaceData && (
            <>
              <div className="section-header">
                <div className="sec-num">3</div>
                RESULTADOS
              </div>
              <div className="panel">
                <div className="data-grid">
                  <div className="data-field">
                    <div className="df-label">φP₀</div>
                    <div className="df-value">{fmt(surfaceData.P_max/1000)}<span className="df-unit">ton</span></div>
                  </div>
                  <div className="data-field">
                    <div className="df-label">φPt</div>
                    <div className="df-value" style={{color:'var(--red)'}}>{fmt(surfaceData.P_min/1000)}<span className="df-unit">ton</span></div>
                  </div>
                  <div className="data-field">
                    <div className="df-label">As</div>
                    <div className="df-value">{fmt(surfaceData.area_acero,2)}<span className="df-unit">cm²</span></div>
                  </div>
                  <div className="data-field">
                    <div className="df-label">ρ</div>
                    <div className="df-value" style={{color: surfaceData.cuantia_acero>=1&&surfaceData.cuantia_acero<=6?'var(--teal)':'var(--red)'}}>
                      {fmt(surfaceData.cuantia_acero,2)}<span className="df-unit">%</span>
                    </div>
                  </div>
                  <div className="data-field">
                    <div className="df-label">φMx</div>
                    <div className="df-value">{fmt(Math.max(...surfaceData.puntos.map(p=>Math.abs(p.Mx)))/100000,1)}<span className="df-unit">t·m</span></div>
                  </div>
                  <div className="data-field">
                    <div className="df-label">Pts</div>
                    <div className="df-value">{surfaceData.puntos.length}<span className="df-unit">pts</span></div>
                  </div>
                </div>
                {/* E.060 check */}
                <div style={{
                  padding:'5px 8px',borderRadius:3,fontSize:9,fontFamily:'var(--mono)',
                  background: surfaceData.cuantia_acero>=1&&surfaceData.cuantia_acero<=6 ? '#f0faf8' : '#fff5f5',
                  border: `1px solid ${surfaceData.cuantia_acero>=1&&surfaceData.cuantia_acero<=6 ? '#b8e8e0' : '#fcc'}`,
                  color: surfaceData.cuantia_acero>=1&&surfaceData.cuantia_acero<=6 ? 'var(--teal)' : 'var(--red)',
                }}>
                  {surfaceData.cuantia_acero>=1&&surfaceData.cuantia_acero<=6
                    ? `✓ E.060: 1% ≤ ρ=${fmt(surfaceData.cuantia_acero,2)}% ≤ 6%`
                    : `✗ E.060: ρ=${fmt(surfaceData.cuantia_acero,2)}% fuera del rango 1-6%`}
                </div>
              </div>
            </>
          )}
        </aside>

        {/* RIGHT PANEL */}
        <main className="right-panel">
          {error && <div className="error-banner"><span>⚠</span> {error}</div>}

          {!surfaceData && !loading && (
            <div className="empty-state">
              <div className="empty-icon">⬡</div>
              <h2>Flexo-Compresión Biaxial</h2>
              <p>Ingrese los datos en el panel izquierdo y presione<br/><strong>Calcular</strong> para generar la superficie de interacción</p>
              <ul className="feature-list">
                <li>Superficie de interacción P-Mx-My en 3D</li>
                <li>Diagramas de interacción P-Mx y P-My</li>
                <li>Verificación con múltiples combinaciones de carga</li>
                <li>Diseño de estribos E.060 Capítulo 21</li>
              </ul>
            </div>
          )}

          {loading && (
            <div className="loading-state">
              <div className="spinner"/>
              <p>Calculando superficie de interacción</p>
              <small>{progress}% — procesando ángulos del eje neutro</small>
              <div className="progress-bar"><div className="progress-fill" style={{width:`${progress}%`}}/></div>
            </div>
          )}

          {(surfaceData||columnData) && !loading && (
            <>
              <div className="section-header" style={{borderBottom:'none'}}>
                <div className="sec-num" style={{background:'var(--text0)'}}>2</div>
                DISEÑO POR FLEXO-COMPRESIÓN BIAXIAL
              </div>

              <div className="tabs">
                {TABS.map(tab => {
                  const disabled = !surfaceData && tab.id !== 'estribos'
                  return (
                    <button key={tab.id} className={`tab-btn ${activeTab===tab.id?'active':''}`}
                      onClick={()=>!disabled&&setActiveTab(tab.id)}
                      style={{opacity:disabled?.35:1,cursor:disabled?'not-allowed':'pointer'}}>
                      {tab.label}
                    </button>
                  )
                })}
              </div>

              <div className="tab-content">
                {activeTab==='surface3d'    && surfaceData && <Surface3D surfaceData={surfaceData} demandPoint={demandPoint}/>}
                {activeTab==='pMx'          && surfaceData && <InteractionChart curva={surfaceData.puntos_curva_PMx} titulo="Diagrama de Interacción P-Mx" labelM="Mx (kg·cm)" demandPoint={demandPoint?{P:demandPoint.Pu,M:demandPoint.Mux}:null}/>}
                {activeTab==='pMy'          && surfaceData && <InteractionChart curva={surfaceData.puntos_curva_PMy} titulo="Diagrama de Interacción P-My" labelM="My (kg·cm)" demandPoint={demandPoint?{P:demandPoint.Pu,M:demandPoint.Muy}:null}/>}
                {activeTab==='verificacion' && surfaceData && <VerificationPanel surfaceData={surfaceData} columnData={columnData} onDemandChange={setDemandPoint}/>}
                {activeTab==='estribos'     && <StirrupPanel columnData={columnData}/>}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
