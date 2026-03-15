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

function Section({ num, title, children, defaultOpen=true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <>
      <div className="sec-header" onClick={() => setOpen(o=>!o)}>
        <div className="sec-num">{num}</div>
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
  { id:1, label:'1.4CM + 1.7CV',    Pu:'', Mux:'', Muy:'', color:'#1547c8' },
  { id:2, label:'1.25(CM+CV) + CS', Pu:'', Mux:'', Muy:'', color:'#0d8a72' },
  { id:3, label:'1.25(CM+CV) - CS', Pu:'', Mux:'', Muy:'', color:'#6b3fa0' },
  { id:4, label:'0.9CM + CS',       Pu:'', Mux:'', Muy:'', color:'#c47e00' },
  { id:5, label:'0.9CM - CS',       Pu:'', Mux:'', Muy:'', color:'#cc2b2b' },
]

export default function SidebarInputs({ onCalculate, loading, columnData, surfaceData, onDemandChange }) {
  // ── MATERIALES ──────────────────────────────────────────────────
  const [fc,  setFc]  = useState(280)
  const [fy,  setFy]  = useState(4200)
  const [Es,  setEs]  = useState(2000000)
  const [phi, setPhi] = useState(0.65)

  // ── GEOMETRÍA ──────────────────────────────────────────────────
  const [b,    setB]    = useState(40)
  const [h,    setH]    = useState(50)
  const [rec,  setRec]  = useState(4)
  const [lon,  setLon]  = useState(300)
  const [tipo, setTipo] = useState('rectangular')
  const [sis,  setSis]  = useState('SMF')

  // ── REFUERZO ────────────────────────────────────────────────────
  const [barras,  setBarras]  = useState([])
  const [nB,      setNB]      = useState(8)
  const [dSel,    setDSel]    = useState(2.540)
  const [arrConf, setArrConf] = useState('perimetro')

  // ── ANÁLISIS ────────────────────────────────────────────────────
  const [ang, setAng]   = useState(36)
  const [pas, setPas]   = useState(50)
  const [res, setRes]   = useState(50)

  // ── VERIFICACIÓN ────────────────────────────────────────────────
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
    }
  }

  // Generar disposición
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
    setBarras([
      {x:-15.73,y:-20.73,diametro:d,area:a},{x:0,y:-20.73,diametro:d,area:a},{x:15.73,y:-20.73,diametro:d,area:a},
      {x:-15.73,y:0,diametro:d,area:a},{x:15.73,y:0,diametro:d,area:a},
      {x:-15.73,y:20.73,diametro:d,area:a},{x:0,y:20.73,diametro:d,area:a},{x:15.73,y:20.73,diametro:d,area:a},
    ])
  }

  const As  = barras.reduce((s,b)=>s+(b.area||0), 0)
  const Ag  = (+b)*(+h)
  const rho = Ag ? (As/Ag*100) : 0
  const rhoOk = rho>=1&&rho<=6

  return (
    <div className="sidebar-scroll">

      {/* ══ SECCIÓN 1 — MATERIALES ══ */}
      <Section num="1" title="Propiedades de Materiales">
        <div className="field-row col2">
          <Field label="f'c (kg/cm²)" tip="Resistencia a compresión del concreto">
            <div className="field-wrap">
              <input className="f-input" type="number" value={fc} onChange={e=>setFc(e.target.value)} min="140" max="600"/>
            </div>
          </Field>
          <Field label="fy (kg/cm²)" tip="Esfuerzo de fluencia del acero">
            <div className="field-wrap">
              <input className="f-input" type="number" value={fy} onChange={e=>setFy(e.target.value)} min="2800" max="6300"/>
            </div>
          </Field>
        </div>
        <div className="field-row col2">
          <Field label="Es (kg/cm²)" tip="Módulo de elasticidad del acero">
            <div className="field-wrap">
              <input className="f-input" type="number" value={Es} onChange={e=>setEs(e.target.value)}/>
            </div>
          </Field>
          <Field label="Sistema Est." tip="Define el factor φ de reducción">
            <select className="f-input" value={sis} onChange={e=>setSis(e.target.value)}>
              <option value="SMF">M.Est./Dual φ=0.65</option>
              <option value="BF">Arriostrado φ=0.70</option>
            </select>
          </Field>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 0',borderTop:'1px solid var(--border)',marginTop:4}}>
          <span style={{fontSize:9,color:'var(--text2)',textTransform:'uppercase',letterSpacing:.5}}>Factor φ</span>
          <span style={{fontFamily:'var(--mono)',fontSize:12,fontWeight:600,color:'var(--accent)'}}>{sis==='SMF'?'0.65':'0.70'}</span>
        </div>
      </Section>

      {/* ══ SECCIÓN 2 — GEOMETRÍA ══ */}
      <Section num="2" title="Geometría de la Columna">
        <Field label="Tipo de sección">
          <select className="f-input" value={tipo} onChange={e=>setTipo(e.target.value)}>
            <option value="rectangular">Rectangular</option>
            <option value="cuadrada">Cuadrada</option>
          </select>
        </Field>
        <div className="field-row col3">
          <Field label="b (cm)" tip="Ancho de la sección">
            <input className="f-input" type="number" value={b} onChange={e=>{ setB(e.target.value); if(tipo==='cuadrada') setH(e.target.value) }} min="15"/>
          </Field>
          <Field label="h (cm)" tip="Altura de la sección">
            <input className="f-input" type="number" value={tipo==='cuadrada'?b:h} onChange={e=>setH(e.target.value)} min="15" readOnly={tipo==='cuadrada'}/>
          </Field>
          <Field label="r (cm)" tip="Recubrimiento libre">
            <input className="f-input" type="number" value={rec} onChange={e=>setRec(e.target.value)} min="2" step="0.5"/>
          </Field>
        </div>
        <Field label="Longitud del elemento (cm)">
          <div className="field-wrap">
            <input className="f-input" type="number" value={lon} onChange={e=>setLon(e.target.value)} min="50"/>
            <span className="f-unit">cm</span>
          </div>
        </Field>

        {/* Vista previa de sección */}
        <SectionViewer b={+b} h={+h} rec={+rec} barras={barras} compact />
      </Section>

      {/* ══ SECCIÓN 3 — REFUERZO ══ */}
      <Section num="3" title="Refuerzo Longitudinal">
        <div className="field-row col2">
          <Field label="N° total de barras">
            <input className="f-input" type="number" value={nB} onChange={e=>setNB(e.target.value)} min="4" max="60"/>
          </Field>
          <Field label="Diámetro de barras">
            <select className="f-input" value={dSel} onChange={e=>setDSel(parseFloat(e.target.value))}>
              {DIAMS_MM.map(d=><option key={d.label} value={d.d}>{d.label}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Configuración del arreglo">
          <select className="f-input" value={arrConf} onChange={e=>setArrConf(e.target.value)}>
            <option value="esquinas">Barras en esquinas</option>
            <option value="perimetro">Distribuidas en perímetro</option>
            <option value="circular">Arreglo circular</option>
          </select>
        </Field>

        {/* Stats en tiempo real */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:5,margin:'8px 0'}}>
          {[
            {l:'Ag', v:`${Ag.toFixed(0)}`, u:'cm²'},
            {l:'As', v:`${As.toFixed(2)}`, u:'cm²'},
            {l:'ρ',  v:`${rho.toFixed(2)}`, u:'%', ok:rhoOk},
          ].map(({l,v,u,ok}) => (
            <div key={l} style={{background:'var(--surface2)',border:`1px solid ${ok===false?'#f0c0c0':ok===true?'#b8e8e0':'var(--border)'}`,borderRadius:'var(--r)',padding:'4px 6px'}}>
              <div style={{fontSize:7,color:'var(--text3)',textTransform:'uppercase',letterSpacing:.5}}>{l}</div>
              <div style={{fontFamily:'var(--mono)',fontSize:12,fontWeight:500,color:ok===false?'var(--red)':ok===true?'var(--teal)':'var(--text0)'}}>{v}<span style={{fontSize:7,color:'var(--text2)',marginLeft:1}}>{u}</span></div>
            </div>
          ))}
        </div>

        <div style={{display:'flex',gap:5,marginBottom:8}}>
          <button className="btn-sec" onClick={generar} style={{flex:1,fontSize:9}}>Generar disposición</button>
          <button className="btn-sec" onClick={ejemplo} style={{fontSize:9}}>Ej. 8#8</button>
          <button className="btn-sec" onClick={()=>setBarras(p=>[...p,{x:0,y:0,diametro:dSel,area:area(dSel)}])} style={{fontSize:9}}>+1</button>
        </div>

        {barras.length > 0 && (
          <div className="bars-table-wrap">
            <table className="bars-table">
              <thead><tr><th>#</th><th>X</th><th>Y</th><th>∅ (cm)</th><th>As</th><th/></tr></thead>
              <tbody>
                {barras.map((bar,i) => (
                  <tr key={i}>
                    <td style={{color:'var(--text3)'}}>{i+1}</td>
                    <td><input type="number" value={bar.x} step="0.01"
                      onChange={e=>setBarras(p=>p.map((b,j)=>j===i?{...b,x:+e.target.value}:b))}
                      style={{width:48,padding:'1px 3px',fontSize:9,border:'none',background:'transparent',fontFamily:'var(--mono)'}}/></td>
                    <td><input type="number" value={bar.y} step="0.01"
                      onChange={e=>setBarras(p=>p.map((b,j)=>j===i?{...b,y:+e.target.value}:b))}
                      style={{width:48,padding:'1px 3px',fontSize:9,border:'none',background:'transparent',fontFamily:'var(--mono)'}}/></td>
                    <td>
                      <select value={bar.diametro}
                        onChange={e=>setBarras(p=>p.map((b,j)=>j===i?{...b,diametro:+e.target.value,area:area(+e.target.value)}:b))}
                        style={{width:58,padding:'1px 3px',fontSize:9,border:'none',background:'transparent',fontFamily:'var(--mono)'}}>
                        {DIAMS_MM.map(d=><option key={d.label} value={d.d}>{d.d}</option>)}
                      </select>
                    </td>
                    <td style={{color:'var(--accent)',fontWeight:500}}>{(bar.area||0).toFixed(2)}</td>
                    <td><button className="btn-del" onClick={()=>setBarras(p=>p.filter((_,j)=>j!==i))}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!barras.length && <div style={{textAlign:'center',padding:'10px 0',color:'var(--text3)',fontSize:9,fontFamily:'var(--mono)',letterSpacing:.5}}>SIN BARRAS — USE GENERADOR</div>}

        {/* E.060 check */}
        {barras.length > 0 && (
          <div style={{marginTop:6,padding:'4px 7px',borderRadius:'var(--r)',fontSize:9,fontFamily:'var(--mono)',background:rhoOk?'var(--teal-l)':'var(--red-l)',border:`1px solid ${rhoOk?'#b8e8e0':'#f0c0c0'}`,color:rhoOk?'var(--teal)':'var(--red)'}}>
            {rhoOk ? `✓ E.060: 1% ≤ ρ=${rho.toFixed(2)}% ≤ 6%` : `✗ E.060: ρ=${rho.toFixed(2)}% fuera de rango (1–6%)`}
          </div>
        )}
      </Section>

      {/* ══ SECCIÓN 4 — CONFIGURACIÓN ANÁLISIS ══ */}
      <Section num="4" title="Configuración del Análisis">
        <div className="field-row col2">
          <Field label="Divisiones angulares" tip="Número de ángulos del eje neutro (mayor = más preciso)">
            <select className="f-input" value={ang} onChange={e=>setAng(e.target.value)}>
              <option value="12">12 — Rápido</option>
              <option value="24">24 — Normal</option>
              <option value="36">36 — Recomendado</option>
              <option value="72">72 — Preciso</option>
            </select>
          </Field>
          <Field label="Divisiones eje neutro" tip="Pasos de profundidad del eje neutro">
            <select className="f-input" value={pas} onChange={e=>setPas(e.target.value)}>
              <option value="20">20 — Rápido</option>
              <option value="50">50 — Normal</option>
              <option value="80">80 — Fino</option>
            </select>
          </Field>
        </div>
        <Field label="Resolución de superficie">
          <div className="slider-wrap">
            <input type="range" min="10" max="100" value={res} onChange={e=>setRes(e.target.value)}/>
            <span className="slider-val">{res}%</span>
          </div>
        </Field>
        <div style={{marginTop:8,display:'flex',flexDirection:'column',gap:5}}>
          <button className="btn-calc" onClick={calcular} disabled={loading||!barras.length}>
            {loading ? 'CALCULANDO…' : 'CALCULAR INTERACCIÓN'}
          </button>
        </div>
      </Section>

      {/* ══ SECCIÓN 5 — VERIFICACIÓN (si hay superficie) ══ */}
      {surfaceData && (
        <Section num="5" title="Análisis de Solicitaciones" defaultOpen={false}>
          <div style={{display:'flex',gap:5,marginBottom:8}}>
            {['ton','kg'].map(u=>(
              <button key={u} onClick={()=>setUnit(u)} style={{flex:1,padding:'3px 0',border:`1px solid ${unit===u?'var(--accent)':'var(--border)'}`,borderRadius:'var(--r)',background:unit===u?'var(--accent-l)':'var(--surface2)',color:unit===u?'var(--accent)':'var(--text2)',fontSize:9,fontFamily:'var(--mono)',cursor:'pointer'}}>
                {u==='ton'?'ton / t·m':'kg / kg·cm'}
              </button>
            ))}
          </div>

          {/* Header tabla */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 68px 68px 68px',gap:3,marginBottom:3,padding:'0 2px'}}>
            {['Combinación','Pu','Mux','Muy'].map(h=>(
              <div key={h} style={{fontSize:7,color:'var(--text3)',textTransform:'uppercase',letterSpacing:.5}}>{h}</div>
            ))}
          </div>

          {combos.map(c => {
            const res = results.find(r=>r.id===c.id)
            const isCrit = res && results[critIdx]?.id===c.id
            const dcrColor = res ? (res.dcr<=.7?'var(--teal)':res.dcr<=1?'var(--amber)':'var(--red)') : 'var(--text3)'
            return (
              <div key={c.id} style={{display:'grid',gridTemplateColumns:'1fr 68px 68px 68px',gap:3,marginBottom:4,padding:'4px',borderRadius:'var(--r)',background:isCrit?'#fffbeb':'var(--surface2)',border:`1px solid ${isCrit?'#f0d060':res?res.dentro?'#b8e8e0':'#f0c0c0':'var(--border)'}`}}>
                <div style={{display:'flex',alignItems:'center',gap:4}}>
                  <div style={{width:5,height:5,borderRadius:'50%',background:c.color,flexShrink:0}}/>
                  <input value={c.label} onChange={e=>updCombo(c.id,'label',e.target.value)}
                    style={{background:'transparent',border:'none',outline:'none',fontSize:8,color:'var(--text1)',fontFamily:'var(--sans)',width:'100%'}}/>
                </div>
                {['Pu','Mux','Muy'].map(f=>(
                  <input key={f} type="number" value={c[f]} placeholder="0.0" step="0.01"
                    onChange={e=>updCombo(c.id,f,e.target.value)}
                    style={{padding:'2px 4px',fontSize:9,fontFamily:'var(--mono)',textAlign:'right',borderRadius:3,border:'1px solid var(--border)',background:'#fff',width:'100%'}}/>
                ))}
                {res && (
                  <div style={{gridColumn:'1/-1',display:'flex',alignItems:'center',gap:6,paddingTop:3,borderTop:'1px solid var(--border)',marginTop:2}}>
                    <div style={{flex:1,height:3,background:'var(--surface3)',borderRadius:2,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${Math.min(res.dcr*100,100)}%`,background:dcrColor,borderRadius:2}}/>
                    </div>
                    <span style={{fontSize:9,fontFamily:'var(--mono)',color:dcrColor,minWidth:36}}>DCR={res.dcr.toFixed(3)}</span>
                    <span style={{fontSize:8,padding:'1px 5px',borderRadius:2,background:res.dentro?'var(--teal-l)':'var(--red-l)',color:res.dentro?'var(--teal)':'var(--red)',fontWeight:600}}>
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
            <button className="btn-sec" style={{fontSize:9}} onClick={()=>setCombos(p=>[...p,{id:Date.now(),label:`Combo ${p.length+1}`,Pu:'',Mux:'',Muy:'',color:'#606880'}])}>+</button>
          </div>

          {results.length>0 && (
            <div style={{marginTop:8,padding:'6px 8px',borderRadius:'var(--r)',background:results.some(r=>!r.dentro)?'var(--red-l)':'var(--teal-l)',border:`1px solid ${results.some(r=>!r.dentro)?'#f0c0c0':'#b8e8e0'}`,fontSize:9,color:results.some(r=>!r.dentro)?'var(--red)':'var(--teal)',fontFamily:'var(--mono)'}}>
              {results.some(r=>!r.dentro)
                ? `✗ ${results.filter(r=>!r.dentro).length} combinación(es) NO CONFORME(S) — DCR máx: ${Math.max(...results.map(r=>r.dcr)).toFixed(3)}`
                : `✓ TODAS CONFORMES — DCR máx: ${Math.max(...results.map(r=>r.dcr)).toFixed(3)}`}
            </div>
          )}
        </Section>
      )}

    </div>
  )
}
