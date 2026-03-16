import { useState, useMemo } from 'react'
import { generarDisposicion, disenarEstribos, verificarPunto } from '../utils/engine'
import SectionViewer from './SectionViewer'

const DIAMS_MM = [
  { label:'8 mm',  d:0.800 },{ label:'10 mm', d:1.000 },{ label:'12 mm', d:1.200 },
  { label:'16 mm', d:1.600 },{ label:'20 mm', d:2.000 },{ label:'25 mm', d:2.500 },
  { label:'#3 (9.5mm)',  d:0.953 },{ label:'#4 (12.7mm)', d:1.270 },
  { label:'#5 (15.9mm)', d:1.588 },{ label:'#6 (19.1mm)', d:1.905 },
  { label:'#7 (22.2mm)', d:2.222 },{ label:'#8 (25.4mm)', d:2.540 },
  { label:'#9 (28.6mm)', d:2.857 },{ label:'#10 (32.3mm)',d:3.225 },
  { label:'#11 (35.8mm)',d:3.581 },
]
const area = d => Math.PI*d*d/4

function Section({ num, title, children, defaultOpen=true, color }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <>
      <div className="sec-header" onClick={() => setOpen(o=>!o)}>
        <div className="sec-num" style={color ? {background:color} : {}}>{num}</div>
        <span className="sec-title">{title}</span>
        <span className={`sec-arrow ${open?'open':''}`}>▶</span>
      </div>
      {open && <div className="sec-body">{children}</div>}
    </>
  )
}

function Field({ label, children, tip }) {
  return (
    <div className="field">
      <label>
        {label}
        {tip && <span className="tip" title={tip}>?</span>}
      </label>
      {children}
    </div>
  )
}

const COMBOS_INI = [
  { id:1, label:'1.4CM + 1.7CV',    Pu:'', Mux:'', Muy:'', color:'#2563eb' },
  { id:2, label:'1.25(CM+CV) + CS', Pu:'', Mux:'', Muy:'', color:'#059669' },
  { id:3, label:'1.25(CM+CV) - CS', Pu:'', Mux:'', Muy:'', color:'#9b59b6' },
  { id:4, label:'0.9CM + CS',       Pu:'', Mux:'', Muy:'', color:'#d97706' },
  { id:5, label:'0.9CM - CS',       Pu:'', Mux:'', Muy:'', color:'#dc2626' },
]

export default function SidebarInputs({
  onCalculate, loading, columnData, surfaceData, onDemandChange,
  ptSize, setPtSize, viewType, setViewType, onDcrUpdate,
}) {
  // ── MATERIALES
  const [fc,  setFc]  = useState(280)
  const [fy,  setFy]  = useState(4200)
  const [Es,  setEs]  = useState(2000000)
  const [sis, setSis]  = useState('SMF')

  // ── GEOMETRÍA
  const [b,    setB]    = useState(40)
  const [h,    setH]    = useState(50)
  const [rec,  setRec]  = useState(4)
  const [lon,  setLon]  = useState(300)
  const [tipo, setTipo] = useState('rectangular')

  // ── REFUERZO
  const [barras,  setBarras]  = useState([])
  const [nB,      setNB]      = useState(8)
  const [dSel,    setDSel]    = useState(2.540)
  const [dEsq,    setDEsq]    = useState(2.540) // diámetro esquinas
  const [nCol,    setNCol]    = useState(2)      // columnas (eje 11)
  const [nRow,    setNRow]    = useState(3)      // filas (eje 22)
  const [arrConf, setArrConf] = useState('perimetro')

  // ── ANÁLISIS
  const [ang, setAng] = useState(36)
  const [pas, setPas] = useState(50)

  // ── ESTRIBOS
  const [estribosManual, setEstribosManual] = useState(false)
  const [paquetes, setPaquetes] = useState(false)

  // ── VERIFICACIÓN
  const [combos,   setCombos]   = useState(COMBOS_INI)
  const [results,  setResults]  = useState([])
  const [critIdx,  setCritIdx]  = useState(null)
  const [unit,     setUnit]     = useState('ton')

  const toKg   = v => unit==='ton' ? parseFloat(v)*1000   : parseFloat(v)
  const toKgcm = v => unit==='ton' ? parseFloat(v)*100000 : parseFloat(v)

  const updCombo = (id,f,v) => setCombos(p=>p.map(c=>c.id===id?{...c,[f]:v}:c))

  const verificar = () => {
    if (!surfaceData) return
    const res = combos.map(c => {
      if (!c.Pu||!c.Mux||!c.Muy) return null
      const PuKg=toKg(c.Pu), MuxKgcm=toKgcm(c.Mux), MuyKgcm=toKgcm(c.Muy)
      const r = verificarPunto(surfaceData, PuKg, MuxKgcm, MuyKgcm)
      return {id:c.id,label:c.label,color:c.color,Pu:PuKg,Mux:MuxKgcm,Muy:MuyKgcm,...r}
    }).filter(Boolean)
    setResults(res)
    if (res.length > 0) {
      const idx = res.reduce((m,r,i,a)=>r.dcr>a[m].dcr?i:m, 0)
      setCritIdx(idx)
      onDemandChange({Pu:res[idx].Pu,Mux:res[idx].Mux,Muy:res[idx].Muy})
      const maxDcr = Math.max(...res.map(r=>r.dcr))
      onDcrUpdate(maxDcr, res.every(r=>r.dentro))
    }
  }

  const generar = () => {
    const tipo_disp = arrConf === 'circular' ? 'circular' : 'rectangular'
    const bs = generarDisposicion(+b, +h, +rec, +nB, dSel, tipo_disp)
    setBarras(bs)
  }

  const calcular = () => {
    if (!barras.length) { alert('Defina barras de refuerzo'); return }
    onCalculate({
      material: { fc:+fc, fy:+fy, Es:+Es },
      geometria: { b:+b, h:+h, recubrimiento:+rec, longitud:+lon },
      refuerzo: { barras },
      sistema_estructural: sis,
      angulos_neutro: +ang,
      pasos_profundidad: +pas,
    })
  }

  const ejemplo = () => {
    setFc(280);setFy(4200);setB(40);setH(50);setRec(4);setLon(300);setSis('SMF');setAng(36);setPas(50)
    const d=2.540, a=area(d)
    const bs = generarDisposicion(40, 50, 4, 8, d, 'rectangular')
    setBarras(bs)
    setNB(8)
    setDSel(d)
  }

  const As  = barras.reduce((s,b)=>s+(b.area||0), 0)
  const Ag  = (+b)*(+h)
  const rho = Ag ? (As/Ag*100) : 0
  const rhoOk = rho>=1&&rho<=6

  return (
    <div className="sidebar-scroll">

      {/* ══ SECCIÓN 1 — PROPUESTA DE REFUERZO LONGITUDINAL ══ */}
      <Section num="1" title="Propuesta de Refuerzo Longitudinal">

        {/* Materiales inline */}
        <div className="field-row col2">
          <Field label="f'c (kg/cm²)" tip="Resistencia del concreto">
            <input className="f-input" type="number" value={fc} onChange={e=>setFc(e.target.value)} min="140" max="600"/>
          </Field>
          <Field label="fy (kg/cm²)" tip="Fluencia del acero">
            <input className="f-input" type="number" value={fy} onChange={e=>setFy(e.target.value)} min="2800" max="6300"/>
          </Field>
        </div>

        {/* Geometría */}
        <div className="field-row col3">
          <Field label="b (cm)">
            <input className="f-input" type="number" value={b} onChange={e=>{ setB(e.target.value); if(tipo==='cuadrada') setH(e.target.value) }} min="15"/>
          </Field>
          <Field label="h (cm)">
            <input className="f-input" type="number" value={tipo==='cuadrada'?b:h} onChange={e=>setH(e.target.value)} min="15" readOnly={tipo==='cuadrada'}/>
          </Field>
          <Field label="r (cm)">
            <input className="f-input" type="number" value={rec} onChange={e=>setRec(e.target.value)} min="2" step="0.5"/>
          </Field>
        </div>

        {/* Barras config */}
        <div style={{borderTop:'0.5px solid var(--border)',paddingTop:8,marginTop:4}}>
          <div className="field-row col2">
            <Field label="Col. [Eje₁₁]">
              <input className="f-input" type="number" value={nCol} onChange={e=>setNCol(e.target.value)} min="2" max="20"/>
            </Field>
            <Field label="∅ Esquinas">
              <select className="f-input" value={dEsq} onChange={e=>setDEsq(parseFloat(e.target.value))}>
                {DIAMS_MM.map(d=><option key={d.label} value={d.d}>{d.label}</option>)}
              </select>
            </Field>
          </div>
          <div className="field-row col2">
            <Field label="Filas [Eje₂₂]">
              <input className="f-input" type="number" value={nRow} onChange={e=>setNRow(e.target.value)} min="2" max="20"/>
            </Field>
            <Field label="∅ Barras">
              <select className="f-input" value={dSel} onChange={e=>setDSel(parseFloat(e.target.value))}>
                {DIAMS_MM.map(d=><option key={d.label} value={d.d}>{d.label}</option>)}
              </select>
            </Field>
          </div>
          <div className="field-row col2">
            <Field label="N° total barras">
              <input className="f-input" type="number" value={nB} onChange={e=>setNB(e.target.value)} min="4" max="60"/>
            </Field>
            <Field label="Configuración">
              <select className="f-input" value={arrConf} onChange={e=>setArrConf(e.target.value)}>
                <option value="perimetro">Perímetro</option>
                <option value="esquinas">Esquinas</option>
                <option value="circular">Circular</option>
              </select>
            </Field>
          </div>
        </div>

        {/* Stats */}
        <div className="stat-grid">
          <div className="stat-chip">
            <div className="stat-chip-label">Ag</div>
            <div className="stat-chip-value">{Ag.toFixed(0)}<span>cm²</span></div>
          </div>
          <div className="stat-chip">
            <div className="stat-chip-label"># Varillas</div>
            <div className="stat-chip-value">{barras.length}</div>
          </div>
          <div className={`stat-chip ${rhoOk === true ? 'ok' : barras.length > 0 ? 'bad' : ''}`}>
            <div className="stat-chip-label">As</div>
            <div className="stat-chip-value">{As.toFixed(2)}<span>cm²</span></div>
          </div>
          <div className={`stat-chip ${rhoOk === true ? 'ok' : barras.length > 0 ? 'bad' : ''}`}>
            <div className="stat-chip-label">ρ</div>
            <div className="stat-chip-value">{rho.toFixed(2)}<span>%</span></div>
          </div>
        </div>

        {/* Section viewer */}
        <SectionViewer b={+b} h={+h} rec={+rec} barras={barras} compact />

        {/* Switches */}
        <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:8,paddingTop:8,borderTop:'0.5px solid var(--border)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontSize:9,color:'var(--text2)',textTransform:'uppercase',letterSpacing:.5,fontWeight:500}}>Estribos manuales</span>
            <label style={{position:'relative',width:32,height:18,cursor:'pointer'}}>
              <input type="checkbox" checked={estribosManual} onChange={e=>setEstribosManual(e.target.checked)} style={{opacity:0,width:0,height:0}}/>
              <span style={{position:'absolute',inset:0,borderRadius:9,background:estribosManual?'var(--purple)':'var(--border)',transition:'background .2s'}}>
                <span style={{position:'absolute',top:2,left:estribosManual?16:2,width:14,height:14,borderRadius:'50%',background:'#fff',transition:'left .2s',boxShadow:'0 1px 2px rgba(0,0,0,.15)'}}/>
              </span>
            </label>
          </div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontSize:9,color:'var(--text2)',textTransform:'uppercase',letterSpacing:.5,fontWeight:500}}>Paquetes de barras</span>
            <label style={{position:'relative',width:32,height:18,cursor:'pointer'}}>
              <input type="checkbox" checked={paquetes} onChange={e=>setPaquetes(e.target.checked)} style={{opacity:0,width:0,height:0}}/>
              <span style={{position:'absolute',inset:0,borderRadius:9,background:paquetes?'var(--purple)':'var(--border)',transition:'background .2s'}}>
                <span style={{position:'absolute',top:2,left:paquetes?16:2,width:14,height:14,borderRadius:'50%',background:'#fff',transition:'left .2s',boxShadow:'0 1px 2px rgba(0,0,0,.15)'}}/>
              </span>
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div style={{display:'flex',gap:5,marginTop:8}}>
          <button className="btn-sec" onClick={generar} style={{flex:1,fontSize:9}}>Generar disposición</button>
          <button className="btn-sec" onClick={ejemplo} style={{fontSize:9}}>Ej. 8#8</button>
          <button className="btn-sec" onClick={()=>setBarras(p=>[...p,{x:0,y:0,diametro:dSel,area:area(dSel)}])} style={{fontSize:9}}>+1</button>
        </div>

        {/* E.060 check */}
        {barras.length > 0 && (
          <div style={{marginTop:6,padding:'5px 8px',borderRadius:'var(--r)',fontSize:9,fontFamily:'var(--mono)',background:rhoOk?'var(--teal-l)':'var(--red-l)',border:`0.5px solid ${rhoOk?'#a7f3d0':'#fca5a5'}`,color:rhoOk?'var(--teal)':'var(--red)'}}>
            {rhoOk ? `E.060: 1% ≤ ρ=${rho.toFixed(2)}% ≤ 6%` : `ρ=${rho.toFixed(2)}% fuera de rango (1–6%)`}
          </div>
        )}
        {!barras.length && <div style={{textAlign:'center',padding:'10px 0',color:'var(--text3)',fontSize:9,fontFamily:'var(--mono)',letterSpacing:.5}}>SIN BARRAS — USE GENERADOR</div>}
      </Section>

      {/* ══ SECCIÓN 2 — DISEÑO POR FLEXO-COMPRESIÓN BIAXIAL ══ */}
      <Section num="2" title="Diseño por Flexo-Compresión Biaxial" color="#2563eb">

        {/* Tipo de vista */}
        <Field label="Tipo de vista">
          <div className="view-btns">
            {['points','mesh','solid'].map(vt => (
              <button key={vt}
                className={`view-btn ${viewType===vt?'active':''}`}
                onClick={()=>setViewType(vt)}
              >
                {vt==='points'?'Puntos':vt==='mesh'?'Malla':'Sólido'}
              </button>
            ))}
          </div>
        </Field>

        {/* Sliders */}
        <Field label="Inc. Angular (θ)" tip="Divisiones angulares del eje neutro">
          <div className="slider-wrap">
            <input type="range" min="12" max="72" step="6" value={ang} onChange={e=>setAng(+e.target.value)}/>
            <span className="slider-val">{ang}</span>
          </div>
        </Field>

        <Field label="N° Divisiones" tip="Pasos de profundidad del eje neutro">
          <div className="slider-wrap">
            <input type="range" min="20" max="100" step="5" value={pas} onChange={e=>setPas(+e.target.value)}/>
            <span className="slider-val">{pas}</span>
          </div>
        </Field>

        <Field label="Tamaño Puntos">
          <div className="slider-wrap">
            <input type="range" min="1" max="10" step="0.5" value={ptSize} onChange={e=>setPtSize(+e.target.value)}/>
            <span className="slider-val">{ptSize}</span>
          </div>
        </Field>

        <Field label="Sistema Estructural">
          <select className="f-input" value={sis} onChange={e=>setSis(e.target.value)}>
            <option value="SMF">Momento Est./Dual φ=0.65</option>
            <option value="BF">Arriostrado φ=0.70</option>
          </select>
        </Field>

        <Field label="Longitud (cm)">
          <div className="field-wrap">
            <input className="f-input" type="number" value={lon} onChange={e=>setLon(e.target.value)} min="50"/>
            <span className="f-unit">cm</span>
          </div>
        </Field>

        <div style={{marginTop:8}}>
          <button className="btn-calc" onClick={calcular} disabled={loading||!barras.length}>
            {loading ? 'CALCULANDO…' : 'CALCULAR INTERACCIÓN'}
          </button>
        </div>
      </Section>

      {/* ══ SECCIÓN 3 — VERIFICACIÓN ══ */}
      {surfaceData && (
        <Section num="3" title="Análisis de Solicitaciones" defaultOpen={false} color="#dc2626">
          <div style={{display:'flex',gap:5,marginBottom:8}}>
            {['ton','kg'].map(u=>(
              <button key={u} onClick={()=>setUnit(u)} style={{flex:1,padding:'4px 0',border:`0.5px solid ${unit===u?'var(--purple)':'var(--border)'}`,borderRadius:'var(--r)',background:unit===u?'#faf5ff':'var(--surface2)',color:unit===u?'var(--purple)':'var(--text2)',fontSize:9,fontFamily:'var(--mono)',cursor:'pointer',fontWeight:unit===u?600:400}}>
                {u==='ton'?'ton / t·m':'kg / kg·cm'}
              </button>
            ))}
          </div>

          {/* Header tabla */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 68px 68px 68px',gap:3,marginBottom:4,padding:'0 2px'}}>
            {['Combinación','Pu','Mux','Muy'].map(h=>(
              <div key={h} style={{fontSize:7,color:'var(--text3)',textTransform:'uppercase',letterSpacing:.6,fontWeight:500}}>{h}</div>
            ))}
          </div>

          {combos.map(c => {
            const res = results.find(r=>r.id===c.id)
            const isCrit = res && results[critIdx]?.id===c.id
            const dcrColor = res ? (res.dcr<=.7?'var(--teal)':res.dcr<=1?'var(--amber)':'var(--red)') : 'var(--text3)'
            return (
              <div key={c.id} style={{display:'grid',gridTemplateColumns:'1fr 68px 68px 68px',gap:3,marginBottom:4,padding:'5px',borderRadius:'var(--r)',background:isCrit?'#fffbeb':'var(--surface2)',border:`0.5px solid ${isCrit?'#fcd34d':res?res.dentro?'#a7f3d0':'#fca5a5':'var(--border)'}`}}>
                <div style={{display:'flex',alignItems:'center',gap:4}}>
                  <div style={{width:6,height:6,borderRadius:'50%',background:c.color,flexShrink:0}}/>
                  <input value={c.label} onChange={e=>updCombo(c.id,'label',e.target.value)}
                    style={{background:'transparent',border:'none',outline:'none',fontSize:8,color:'var(--text1)',fontFamily:'var(--sans)',width:'100%'}}/>
                </div>
                {['Pu','Mux','Muy'].map(f=>(
                  <input key={f} type="number" value={c[f]} placeholder="0.0" step="0.01"
                    onChange={e=>updCombo(c.id,f,e.target.value)}
                    style={{padding:'3px 4px',fontSize:9,fontFamily:'var(--mono)',textAlign:'right',borderRadius:3,border:'0.5px solid var(--border)',background:'#fff',width:'100%'}}/>
                ))}
                {res && (
                  <div style={{gridColumn:'1/-1',display:'flex',alignItems:'center',gap:6,paddingTop:4,borderTop:'0.5px solid var(--border)',marginTop:2}}>
                    <div style={{flex:1,height:3,background:'var(--surface3)',borderRadius:2,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${Math.min(res.dcr*100,100)}%`,background:dcrColor,borderRadius:2,transition:'width .3s'}}/>
                    </div>
                    <span style={{fontSize:9,fontFamily:'var(--mono)',color:dcrColor,minWidth:40,fontWeight:600}}>D/C={res.dcr.toFixed(3)}</span>
                    <span style={{fontSize:8,padding:'2px 6px',borderRadius:3,background:res.dentro?'var(--teal-l)':'var(--red-l)',color:res.dentro?'var(--teal)':'var(--red)',fontWeight:600}}>
                      {res.dentro?'OK':'FALLA'}
                    </span>
                  </div>
                )}
              </div>
            )
          })}

          <div style={{display:'flex',gap:5,marginTop:4}}>
            <button className="btn-calc" onClick={verificar} style={{flex:1,fontSize:10}} disabled={combos.every(c=>!c.Pu||!c.Mux||!c.Muy)}>
              VERIFICAR SEGURIDAD
            </button>
            <button className="btn-sec" style={{fontSize:9}} onClick={()=>setCombos(p=>[...p,{id:Date.now(),label:`Combo ${p.length+1}`,Pu:'',Mux:'',Muy:'',color:'#6b7280'}])}>+</button>
          </div>

          {results.length>0 && (
            <div style={{marginTop:8,padding:'6px 8px',borderRadius:'var(--r)',background:results.some(r=>!r.dentro)?'var(--red-l)':'var(--teal-l)',border:`0.5px solid ${results.some(r=>!r.dentro)?'#fca5a5':'#a7f3d0'}`,fontSize:9,color:results.some(r=>!r.dentro)?'var(--red)':'var(--teal)',fontFamily:'var(--mono)',fontWeight:500}}>
              {results.some(r=>!r.dentro)
                ? `${results.filter(r=>!r.dentro).length} combinación(es) NO CONFORME(S) — D/C máx: ${Math.max(...results.map(r=>r.dcr)).toFixed(3)}`
                : `TODAS CONFORMES — D/C máx: ${Math.max(...results.map(r=>r.dcr)).toFixed(3)}`}
            </div>
          )}
        </Section>
      )}

      {/* Bars table (collapsible) */}
      {barras.length > 0 && (
        <Section num="T" title={`Tabla de Barras (${barras.length})`} defaultOpen={false} color="var(--text2)">
          <div className="bars-table-wrap">
            <table className="bars-table">
              <thead><tr><th>#</th><th>X</th><th>Y</th><th>∅ (cm)</th><th>As</th><th/></tr></thead>
              <tbody>
                {barras.map((bar,i) => (
                  <tr key={i}>
                    <td style={{color:'var(--text3)'}}>{i+1}</td>
                    <td><input type="number" value={bar.x} step="0.01"
                      onChange={e=>setBarras(p=>p.map((b,j)=>j===i?{...b,x:+e.target.value}:b))}
                      style={{width:48,padding:'2px 3px',fontSize:9,border:'none',background:'transparent',fontFamily:'var(--mono)'}}/></td>
                    <td><input type="number" value={bar.y} step="0.01"
                      onChange={e=>setBarras(p=>p.map((b,j)=>j===i?{...b,y:+e.target.value}:b))}
                      style={{width:48,padding:'2px 3px',fontSize:9,border:'none',background:'transparent',fontFamily:'var(--mono)'}}/></td>
                    <td>
                      <select value={bar.diametro}
                        onChange={e=>setBarras(p=>p.map((b,j)=>j===i?{...b,diametro:+e.target.value,area:area(+e.target.value)}:b))}
                        style={{width:58,padding:'2px 3px',fontSize:9,border:'none',background:'transparent',fontFamily:'var(--mono)'}}>
                        {DIAMS_MM.map(d=><option key={d.label} value={d.d}>{d.d}</option>)}
                      </select>
                    </td>
                    <td style={{color:'var(--purple)',fontWeight:600}}>{(bar.area||0).toFixed(2)}</td>
                    <td><button className="btn-del" onClick={()=>setBarras(p=>p.filter((_,j)=>j!==i))}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

    </div>
  )
}
