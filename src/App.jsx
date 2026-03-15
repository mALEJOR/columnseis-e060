import { useState, useCallback } from 'react'
import InputPanel from './components/InputPanel'
import SectionView from './components/SectionView'
import Surface3D from './three_scene/Surface3D'
import InteractionChart from './charts/InteractionChart'
import ResultsPanel from './components/ResultsPanel'
import VerificationPanel from './components/VerificationPanel'
import StirrupPanel from './components/StirrupPanel'
import { generarSuperficie } from './utils/engine'
import './App.css'

const TABS = [
  { id:'surface3d',    label:'Superficie 3D', icon:'⬡' },
  { id:'pMx',          label:'P-Mx',          icon:'◧' },
  { id:'pMy',          label:'P-My',          icon:'◨' },
  { id:'verificacion', label:'Verificación',  icon:'✓' },
  { id:'estribos',     label:'Estribos',      icon:'⊞' },
]

export default function App() {
  const [columnData, setColumnData]   = useState(null)
  const [surfaceData, setSurfaceData] = useState(null)
  const [loading, setLoading]         = useState(false)
  const [progress, setProgress]       = useState(0)
  const [error, setError]             = useState(null)
  const [activeTab, setActiveTab]     = useState('surface3d')
  const [demandPoint, setDemandPoint] = useState(null)

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

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <div className="header-icon">⬡</div>
          <div>
            <h1>ColumnSeis <span>E.060</span></h1>
            <p>Diseño Sismorresistente · Flexo-compresión Biaxial · 100% en el navegador</p>
          </div>
        </div>
        <div className="header-badges">
          <span className="badge">NTP E.060</span>
          <span className="badge">ACI 318</span>
          <span className="badge accent">v2.0 Web</span>
        </div>
      </header>

      <div className="app-body">
        <aside className="left-panel">
          <InputPanel onCalculate={handleCalculate} loading={loading} />
          {columnData && <SectionView columnData={columnData} />}
          {surfaceData && <ResultsPanel surfaceData={surfaceData} />}
        </aside>

        <main className="right-panel">
          {error && <div className="error-banner"><span>⚠</span> {error}</div>}

          {!surfaceData && !loading && (
            <div className="empty-state">
              <div className="empty-icon">⬡</div>
              <h2>ColumnSeis E.060</h2>
              <p>Software de diseño sismorresistente de columnas<br/><strong>100% en el navegador</strong> — sin instalaciones, sin servidor</p>
              <ul className="feature-list">
                <li>⬡  Superficie de interacción P-Mx-My en 3D</li>
                <li>◧  Diagramas de interacción P-Mx y P-My</li>
                <li>✓  Verificación con múltiples combinaciones de carga</li>
                <li>⊞  Diseño de estribos E.060 Capítulo 21</li>
              </ul>
              <div style={{marginTop:20,padding:'10px 16px',background:'rgba(77,138,255,.08)',border:'1px solid rgba(77,138,255,.2)',borderRadius:8,fontSize:11,color:'var(--text2)'}}>
                Use el botón <strong style={{color:'var(--text1)'}}>Cargar ejemplo C40×50</strong> para comenzar rápido
              </div>
            </div>
          )}

          {loading && (
            <div className="loading-state">
              <div className="spinner"/>
              <p>Calculando superficie de interacción…</p>
              <small>{progress}% completado</small>
              <div style={{width:200,height:4,background:'var(--bg3)',borderRadius:2,overflow:'hidden',marginTop:6}}>
                <div style={{height:'100%',background:'var(--accent)',borderRadius:2,width:`${progress}%`,transition:'width .3s'}}/>
              </div>
            </div>
          )}

          {(surfaceData || columnData) && !loading && (
            <>
              <div className="tabs">
                {TABS.map(tab => {
                  const disabled = !surfaceData && tab.id !== 'estribos'
                  return (
                    <button key={tab.id} className={`tab-btn ${activeTab===tab.id?'active':''}`}
                      onClick={()=>!disabled&&setActiveTab(tab.id)}
                      style={{opacity:disabled?.4:1,cursor:disabled?'not-allowed':'pointer'}}>
                      {tab.icon} {tab.label}
                    </button>
                  )
                })}
              </div>
              <div className="tab-content">
                {activeTab==='surface3d' && surfaceData && <Surface3D surfaceData={surfaceData} demandPoint={demandPoint}/>}
                {activeTab==='pMx' && surfaceData && <InteractionChart curva={surfaceData.puntos_curva_PMx} titulo="Diagrama de Interacción P-Mx" labelM="Mx (kg·cm)" demandPoint={demandPoint?{P:demandPoint.Pu,M:demandPoint.Mux}:null}/>}
                {activeTab==='pMy' && surfaceData && <InteractionChart curva={surfaceData.puntos_curva_PMy} titulo="Diagrama de Interacción P-My" labelM="My (kg·cm)" demandPoint={demandPoint?{P:demandPoint.Pu,M:demandPoint.Muy}:null}/>}
                {activeTab==='verificacion' && surfaceData && <VerificationPanel surfaceData={surfaceData} columnData={columnData} onDemandChange={setDemandPoint}/>}
                {activeTab==='estribos' && <StirrupPanel columnData={columnData}/>}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
