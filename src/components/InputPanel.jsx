import { useState } from 'react'
import { generarDisposicion } from '../utils/engine'

const DIAMS = [
  { n:'#3',d:0.953 },{ n:'#4',d:1.270 },{ n:'#5',d:1.588 },
  { n:'#6',d:1.905 },{ n:'#7',d:2.222 },{ n:'#8',d:2.540 },
  { n:'#9',d:2.857 },{ n:'#10',d:3.225 },{ n:'#11',d:3.581 },
]
const area = d => Math.PI * d * d / 4

export default function InputPanel({ onCalculate, loading }) {
  const [fc, setFc]       = useState(280)
  const [fy, setFy]       = useState(4200)
  const [b, setB]         = useState(40)
  const [h, setH]         = useState(50)
  const [rec, setRec]     = useState(4)
  const [lon, setLon]     = useState(300)
  const [sis, setSis]     = useState('SMF')
  const [ang, setAng]     = useState(36)
  const [pas, setPas]     = useState(50)
  const [barras, setBarras] = useState([])
  const [nB, setNB]       = useState(8)
  const [dSel, setDSel]   = useState(2.540)
  const [tipo, setTipo]   = useState('rectangular')

  const generar = () => {
    const bs = generarDisposicion(+b, +h, +rec, +nB, dSel, tipo)
    setBarras(bs)
  }

  const updBar = (i, f, v) => setBarras(prev => prev.map((bar, idx) => {
    if (idx !== i) return bar
    const u = { ...bar, [f]: +v }
    if (f === 'diametro') u.area = area(+v)
    return u
  }))

  const calcular = () => {
    if (!barras.length) { alert('Defina barras de refuerzo'); return }
    onCalculate({
      material: { fc: +fc, fy: +fy },
      geometria: { b: +b, h: +h, recubrimiento: +rec, longitud: +lon },
      refuerzo: { barras },
      sistema_estructural: sis,
      angulos_neutro: +ang,
      pasos_profundidad: +pas,
    })
  }

  const ejemplo = () => {
    setFc(280); setFy(4200); setB(40); setH(50); setRec(4); setLon(300)
    setSis('SMF'); setAng(36); setPas(50)
    const d = 2.540, a = area(d)
    setBarras([
      {x:-15.73,y:-20.73,diametro:d,area:a},{x:0,y:-20.73,diametro:d,area:a},{x:15.73,y:-20.73,diametro:d,area:a},
      {x:-15.73,y:0,diametro:d,area:a},{x:15.73,y:0,diametro:d,area:a},
      {x:-15.73,y:20.73,diametro:d,area:a},{x:0,y:20.73,diametro:d,area:a},{x:15.73,y:20.73,diametro:d,area:a},
    ])
  }

  const As = barras.reduce((s, bar) => s + (bar.area||0), 0)
  const rho = b && h ? (As / (b * h) * 100) : 0
  const rhoCol = rho < 1 || rho > 8 ? 'var(--danger)' : rho <= 4 ? 'var(--success)' : 'var(--warn)'

  return (
    <div>
      {/* MATERIALES */}
      <div className="panel">
        <div className="panel-title">Materiales</div>
        <div className="form-row-2">
          <div className="form-row"><label>f'c (kg/cm²)</label><input type="number" value={fc} onChange={e=>setFc(e.target.value)} min="140" max="600"/></div>
          <div className="form-row"><label>fy (kg/cm²)</label><input type="number" value={fy} onChange={e=>setFy(e.target.value)} min="2800" max="6300"/></div>
        </div>
      </div>

      {/* GEOMETRÍA */}
      <div className="panel">
        <div className="panel-title">Geometría</div>
        <div className="form-row-2">
          <div className="form-row"><label>b — Ancho (cm)</label><input type="number" value={b} onChange={e=>setB(e.target.value)} min="15"/></div>
          <div className="form-row"><label>h — Alto (cm)</label><input type="number" value={h} onChange={e=>setH(e.target.value)} min="15"/></div>
        </div>
        <div className="form-row-2">
          <div className="form-row"><label>Recubrimiento (cm)</label><input type="number" value={rec} onChange={e=>setRec(e.target.value)} min="2" step="0.5"/></div>
          <div className="form-row"><label>Longitud (cm)</label><input type="number" value={lon} onChange={e=>setLon(e.target.value)} min="50"/></div>
        </div>
        <div className="form-row">
          <label>Sistema estructural</label>
          <select value={sis} onChange={e=>setSis(e.target.value)}>
            <option value="SMF">SMF — Pórtico resistente (φ=0.65)</option>
            <option value="BF">BF — Sistema arriostrado (φ=0.70)</option>
          </select>
        </div>
      </div>

      {/* REFUERZO */}
      <div className="panel">
        <div className="panel-title">Refuerzo Longitudinal</div>
        <div style={{background:'var(--bg2)',borderRadius:7,padding:10,marginBottom:10,border:'1px solid var(--border)'}}>
          <div style={{fontSize:9,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:7}}>Generador automático</div>
          <div className="form-row-2">
            <div className="form-row"><label>N° barras</label><input type="number" value={nB} onChange={e=>setNB(e.target.value)} min="4" max="40"/></div>
            <div className="form-row">
              <label>Diámetro</label>
              <select value={dSel} onChange={e=>setDSel(parseFloat(e.target.value))}>
                {DIAMS.map(d=><option key={d.n} value={d.d}>{d.n} (ø{d.d})</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <label>Tipo</label>
            <select value={tipo} onChange={e=>setTipo(e.target.value)}>
              <option value="rectangular">Rectangular perimetral</option>
              <option value="circular">Circular</option>
            </select>
          </div>
          <button className="btn-secondary" onClick={generar} style={{width:'100%',marginTop:3}}>Generar disposición</button>
        </div>

        <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:10}}>
          <span style={{color:'var(--text2)'}}>As = <span style={{fontFamily:'var(--mono)',color:'var(--text1)'}}>{As.toFixed(2)} cm²</span></span>
          <span style={{fontFamily:'var(--mono)',color:rhoCol}}>ρ = {rho.toFixed(2)}%</span>
        </div>

        {barras.length > 0 && (
          <div className="bars-table-container">
            <table className="bars-table">
              <thead><tr><th>#</th><th>X(cm)</th><th>Y(cm)</th><th>ø(cm)</th><th>As</th><th/></tr></thead>
              <tbody>
                {barras.map((bar,i)=>(
                  <tr key={i}>
                    <td style={{color:'var(--text2)'}}>{i+1}</td>
                    <td><input type="number" value={bar.x} step="0.01" onChange={e=>updBar(i,'x',e.target.value)} style={{width:55,padding:'2px 4px',fontSize:9}}/></td>
                    <td><input type="number" value={bar.y} step="0.01" onChange={e=>updBar(i,'y',e.target.value)} style={{width:55,padding:'2px 4px',fontSize:9}}/></td>
                    <td>
                      <select value={bar.diametro} onChange={e=>updBar(i,'diametro',e.target.value)} style={{width:65,padding:'2px 4px',fontSize:9}}>
                        {DIAMS.map(d=><option key={d.n} value={d.d}>{d.d}</option>)}
                      </select>
                    </td>
                    <td style={{color:'var(--accent)'}}>{(bar.area||0).toFixed(2)}</td>
                    <td><button className="btn-danger" onClick={()=>setBarras(p=>p.filter((_,j)=>j!==i))}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!barras.length && <div style={{textAlign:'center',padding:'14px 0',color:'var(--text2)',fontSize:11}}>Sin barras definidas</div>}
        <button className="btn-secondary" onClick={()=>setBarras(p=>[...p,{x:0,y:0,diametro:dSel,area:area(dSel)}])} style={{marginTop:6,width:'100%'}}>
          + Agregar barra manualmente
        </button>
      </div>

      {/* CÁLCULO */}
      <div className="panel">
        <div className="panel-title">Parámetros de Cálculo</div>
        <div className="form-row-2">
          <div className="form-row">
            <label>Ángulos eje neutro</label>
            <select value={ang} onChange={e=>setAng(e.target.value)}>
              <option value="12">12 — Rápido</option>
              <option value="24">24 — Normal</option>
              <option value="36">36 — Recomendado</option>
              <option value="72">72 — Preciso</option>
            </select>
          </div>
          <div className="form-row">
            <label>Pasos por ángulo</label>
            <select value={pas} onChange={e=>setPas(e.target.value)}>
              <option value="20">20 — Rápido</option>
              <option value="50">50 — Normal</option>
              <option value="80">80 — Fino</option>
            </select>
          </div>
        </div>
      </div>

      <div className="panel" style={{display:'flex',flexDirection:'column',gap:7}}>
        <button className="btn-primary" onClick={calcular} disabled={loading||!barras.length}>
          {loading ? 'Calculando…' : '⬡ Calcular Superficie de Interacción'}
        </button>
        <button className="btn-secondary" onClick={ejemplo} style={{textAlign:'center'}}>
          Cargar ejemplo C40×50 — 8#8
        </button>
      </div>
    </div>
  )
}
