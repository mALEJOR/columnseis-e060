import { useState } from 'react'
import { generarDisposicion } from '../utils/engine'
import { VARILLAS_PERU, VARILLAS_ESTRIBOS, buscarVarilla } from '../utils/varillas'

const area = d => {
  const v = buscarVarilla(d)
  return v ? v.area : Math.PI * d * d / 4
}

export default function InputPanel({ onCalculate, loading }) {
  const [fc, setFc]   = useState(280)
  const [fy, setFy]   = useState(4200)
  const [b, setB]     = useState(40)
  const [h, setH]     = useState(50)
  const [rec, setRec] = useState(4)
  const [lon, setLon] = useState(300)
  const [sis, setSis] = useState('SMF')
  const [ang, setAng] = useState(36)
  const [pas, setPas] = useState(50)
  const [barras, setBarras] = useState([])
  const [nB, setNB]   = useState(8)
  const [dSel, setDSel] = useState(2.540)
  const [tipo, setTipo] = useState('rectangular')

  const generar = () => {
    const bs = generarDisposicion(+b, +h, +rec, +nB, dSel, tipo)
    setBarras(bs)
  }

  const updBar = (i, f, v) => setBarras(prev => prev.map((bar, idx) => {
    if (idx !== i) return bar
    const u = {...bar, [f]: +v}
    if (f === 'diametro') u.area = area(+v)
    return u
  }))

  const calcular = () => {
    if (!barras.length) { alert('Defina barras de refuerzo'); return }
    onCalculate({
      material: {fc:+fc, fy:+fy},
      geometria: {b:+b, h:+h, recubrimiento:+rec, longitud:+lon},
      refuerzo: {barras},
      sistema_estructural: sis,
      angulos_neutro: +ang,
      pasos_profundidad: +pas,
    })
  }

  const ejemplo = () => {
    setFc(280);setFy(4200);setB(40);setH(50);setRec(4);setLon(300);setSis('SMF');setAng(36);setPas(50)
    const d=2.540, a=area(d)
    setBarras([
      {x:-15.73,y:-20.73,diametro:d,area:a},{x:0,y:-20.73,diametro:d,area:a},{x:15.73,y:-20.73,diametro:d,area:a},
      {x:-15.73,y:0,diametro:d,area:a},{x:15.73,y:0,diametro:d,area:a},
      {x:-15.73,y:20.73,diametro:d,area:a},{x:0,y:20.73,diametro:d,area:a},{x:15.73,y:20.73,diametro:d,area:a},
    ])
  }

  const As = barras.reduce((s,b)=>s+(b.area||0), 0)
  const rho = b&&h ? (As/(b*h)*100) : 0
  const rhoOk = rho>=1&&rho<=6

  return (
    <div>
      {/* SISTEMA Y MATERIALES */}
      <div className="panel">
        <div className="panel-title">Sist. Est. y Materiales</div>
        <div className="form-row">
          <label>Sistema Estructural</label>
          <select value={sis} onChange={e=>setSis(e.target.value)}>
            <option value="SMF">M. Est. / Dual — SMF (φ=0.65)</option>
            <option value="BF">Arriostrado — BF (φ=0.70)</option>
          </select>
        </div>
        <div className="form-row-2">
          <div className="form-row">
            <label>f'c (kg/cm²)</label>
            <input type="number" value={fc} onChange={e=>setFc(e.target.value)} min="140" max="600"/>
          </div>
          <div className="form-row">
            <label>fy (kg/cm²)</label>
            <input type="number" value={fy} onChange={e=>setFy(e.target.value)} min="2800" max="6300"/>
          </div>
        </div>
      </div>

      {/* GEOMETRÍA */}
      <div className="panel">
        <div className="panel-title">Geometría</div>
        <div className="form-row-3">
          <div className="form-row">
            <label>Dim. 33 [b] cm</label>
            <input type="number" value={b} onChange={e=>setB(e.target.value)} min="15"/>
          </div>
          <div className="form-row">
            <label>Dim. 22 [h] cm</label>
            <input type="number" value={h} onChange={e=>setH(e.target.value)} min="15"/>
          </div>
          <div className="form-row">
            <label>Hc (cm)</label>
            <input type="number" value={lon} onChange={e=>setLon(e.target.value)} min="50"/>
          </div>
        </div>
        <div className="form-row-2">
          <div className="form-row">
            <label>r (cm)</label>
            <input type="number" value={rec} onChange={e=>setRec(e.target.value)} min="2" step="0.5"/>
          </div>
          <div className="form-row">
            <label>∅ Estribo</label>
            <select value={dSel} onChange={e=>setDSel(parseFloat(e.target.value))}>
              {VARILLAS_ESTRIBOS.map(v=><option key={v.numero} value={v.d}>{v.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* PROPUESTA DE REFUERZO */}
      <div className="panel">
        <div className="panel-title">Propuesta de Refuerzo Longitudinal</div>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:10}}>
          <div style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:4,padding:'5px 7px'}}>
            <div style={{fontSize:8,color:'var(--text3)',textTransform:'uppercase',letterSpacing:.5}}>Ag</div>
            <div style={{fontFamily:'var(--mono)',fontSize:12,fontWeight:500,color:'var(--text0)'}}>{(b*h||0).toFixed(0)}<span style={{fontSize:8,color:'var(--text2)',marginLeft:2}}>cm²</span></div>
          </div>
          <div style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:4,padding:'5px 7px'}}>
            <div style={{fontSize:8,color:'var(--text3)',textTransform:'uppercase',letterSpacing:.5}}># Varillas</div>
            <div style={{fontFamily:'var(--mono)',fontSize:12,fontWeight:500,color:'var(--text0)'}}>{barras.length}<span style={{fontSize:8,color:'var(--text2)',marginLeft:2}}>u</span></div>
          </div>
          <div style={{background:'var(--surface2)',border:`1px solid ${rhoOk?'#b8e8e0':'#fcc'}`,borderRadius:4,padding:'5px 7px'}}>
            <div style={{fontSize:8,color:'var(--text3)',textTransform:'uppercase',letterSpacing:.5}}>ρ</div>
            <div style={{fontFamily:'var(--mono)',fontSize:12,fontWeight:500,color:rhoOk?'var(--teal)':'var(--red)'}}>{rho.toFixed(2)}<span style={{fontSize:8,marginLeft:2}}>%</span></div>
          </div>
        </div>
        <div style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:4,padding:8,marginBottom:8}}>
          <div style={{fontSize:8,color:'var(--text2)',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Generador automático</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:6}}>
            <div className="form-row">
              <label>Columnas [Eje₁₁]</label>
              <input type="number" value={Math.max(2,Math.round(nB/4))} readOnly style={{background:'var(--border)',cursor:'default'}}/>
            </div>
            <div className="form-row">
              <label>∅ Esquinas</label>
              <select value={dSel} onChange={e=>setDSel(parseFloat(e.target.value))}>
                {VARILLAS_PERU.map(v=><option key={v.numero} value={v.d}>{v.label}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>Filas [Eje₂₂]</label>
              <input type="number" value={nB} onChange={e=>setNB(e.target.value)} min="4" max="40"/>
            </div>
            <div className="form-row">
              <label>Tipo disposición</label>
              <select value={tipo} onChange={e=>setTipo(e.target.value)}>
                <option value="rectangular">Rectangular</option>
                <option value="circular">Circular</option>
              </select>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
            <button className="btn-secondary" onClick={generar} style={{fontSize:9,padding:'4px 8px'}}>
              Estribos manuales
            </button>
            <button className="btn-secondary" onClick={generar} style={{fontSize:9,padding:'4px 8px',background:'#f0f4ff',borderColor:'var(--accent)',color:'var(--accent)'}}>
              Paquetes de barras
            </button>
          </div>
        </div>

        {/* Tabla barras */}
        {barras.length > 0 && (
          <div className="bars-table-container">
            <table className="bars-table">
              <thead><tr><th>#</th><th>X (cm)</th><th>Y (cm)</th><th>∅ (cm)</th><th>As</th><th/></tr></thead>
              <tbody>
                {barras.map((bar,i)=>(
                  <tr key={i}>
                    <td style={{color:'var(--text3)'}}>{i+1}</td>
                    <td><input type="number" value={bar.x} step="0.01" onChange={e=>updBar(i,'x',e.target.value)} style={{width:55,padding:'2px 4px',fontSize:9}}/></td>
                    <td><input type="number" value={bar.y} step="0.01" onChange={e=>updBar(i,'y',e.target.value)} style={{width:55,padding:'2px 4px',fontSize:9}}/></td>
                    <td>
                      <select value={bar.diametro} onChange={e=>updBar(i,'diametro',e.target.value)} style={{width:62,padding:'2px 4px',fontSize:9}}>
                        {VARILLAS_PERU.map(v=><option key={v.numero} value={v.d}>{v.label}</option>)}
                      </select>
                    </td>
                    <td style={{color:'var(--accent)',fontWeight:500}}>{(bar.area||0).toFixed(2)}</td>
                    <td><button className="btn-danger" onClick={()=>setBarras(p=>p.filter((_,j)=>j!==i))}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!barras.length && (
          <div style={{textAlign:'center',padding:'12px 0',color:'var(--text3)',fontSize:10,fontFamily:'var(--mono)'}}>
            SIN BARRAS DEFINIDAS
          </div>
        )}
        <div style={{display:'flex',gap:6,marginTop:6}}>
          <button className="btn-secondary" onClick={()=>setBarras(p=>[...p,{x:0,y:0,diametro:dSel,area:area(dSel)}])} style={{flex:1,fontSize:9}}>+ Agregar</button>
          <button className="btn-secondary" onClick={()=>setBarras([])} style={{fontSize:9,color:'var(--red)',borderColor:'#fcc'}}>Limpiar</button>
        </div>
      </div>

      {/* PARÁMETROS */}
      <div className="panel">
        <div className="panel-title">Parámetros de Cálculo</div>
        <div className="form-row-2">
          <div className="form-row">
            <label>Inc. Angular (θ)</label>
            <select value={ang} onChange={e=>setAng(e.target.value)}>
              <option value="12">12° — Rápido</option>
              <option value="24">24° — Normal</option>
              <option value="36">36° — Recomendado</option>
              <option value="72">72° — Preciso</option>
            </select>
          </div>
          <div className="form-row">
            <label>N° Divisiones</label>
            <select value={pas} onChange={e=>setPas(e.target.value)}>
              <option value="20">20 — Rápido</option>
              <option value="50">50 — Normal</option>
              <option value="80">80 — Fino</option>
            </select>
          </div>
        </div>
      </div>

      <div className="panel" style={{display:'flex',flexDirection:'column',gap:6}}>
        <button className="btn-primary" onClick={calcular} disabled={loading||!barras.length}>
          {loading ? 'CALCULANDO…' : 'DISEÑO DE SECCIÓN'}
        </button>
        <button className="btn-secondary" onClick={ejemplo} style={{textAlign:'center',fontSize:10}}>
          Cargar ejemplo — Col. 40×50 cm, 8∅1"
        </button>
      </div>
    </div>
  )
}
