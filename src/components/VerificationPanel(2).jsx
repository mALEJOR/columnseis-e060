import { useState, useCallback } from 'react'
import { verificarPunto } from '../utils/engine'

const fmt = (v, d=2) => isNaN(v) ? '—' : Number(v).toFixed(d)

const COMBOS_INI = [
  { id:1, label:'1.4CM + 1.7CV',       Pu:'', Mux:'', Muy:'', color:'#4d8aff' },
  { id:2, label:'1.25(CM+CV) + CS',    Pu:'', Mux:'', Muy:'', color:'#00e5c8' },
  { id:3, label:'1.25(CM+CV) - CS',    Pu:'', Mux:'', Muy:'', color:'#7c6dfa' },
  { id:4, label:'0.9CM + CS',          Pu:'', Mux:'', Muy:'', color:'#ffb627' },
  { id:5, label:'0.9CM - CS',          Pu:'', Mux:'', Muy:'', color:'#ff5f57' },
]

export default function VerificationPanel({ surfaceData, onDemandChange }) {
  const [unit, setUnit] = useState('ton')
  const [combos, setCombos] = useState(COMBOS_INI)
  const [results, setResults] = useState([])
  const [critIdx, setCritIdx] = useState(null)

  const toKg   = v => unit==='ton' ? parseFloat(v)*1000  : parseFloat(v)
  const toKgcm = v => unit==='ton' ? parseFloat(v)*100000: parseFloat(v)

  const upd = (id,f,v) => setCombos(p=>p.map(c=>c.id===id?{...c,[f]:v}:c))
  const add = () => {
    const cols = ['#4d8aff','#00e5c8','#7c6dfa','#ffb627','#ff5f57','#00d878']
    setCombos(p=>[...p,{id:Date.now(),label:`Combo ${p.length+1}`,Pu:'',Mux:'',Muy:'',color:cols[p.length%cols.length]}])
  }

  const verificar = useCallback(() => {
    const res = combos.map(c=>{
      if(!c.Pu||!c.Mux||!c.Muy) return null
      const PuKg=toKg(c.Pu), MuxKgcm=toKgcm(c.Mux), MuyKgcm=toKgcm(c.Muy)
      const r = verificarPunto(surfaceData, PuKg, MuxKgcm, MuyKgcm)
      return {id:c.id,label:c.label,color:c.color,Pu:PuKg,Mux:MuxKgcm,Muy:MuyKgcm,...r}
    }).filter(Boolean)
    setResults(res)
    if(res.length>0){
      const idx = res.reduce((m,r,i,a)=>r.dcr>a[m].dcr?i:m,0)
      setCritIdx(idx)
      onDemandChange({Pu:res[idx].Pu,Mux:res[idx].Mux,Muy:res[idx].Muy})
    }
  },[combos,surfaceData,unit])

  const anyFail = results.some(r=>!r.dentro)

  return (
    <div style={{flex:1,overflow:'auto',padding:'18px 22px'}}>
      <div style={{maxWidth:840}}>
        <div style={{marginBottom:18}}>
          <h3 style={{fontFamily:'var(--display)',fontSize:15,color:'var(--text0)',marginBottom:5}}>
            Verificación — Combinaciones NTE E.020 + E.030
          </h3>
          <p style={{fontSize:11,color:'var(--text2)',lineHeight:1.6}}>
            Ingrese todas las combinaciones últimas. El sistema identifica la combinación crítica automáticamente.
          </p>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
          <span style={{fontSize:10,color:'var(--text2)'}}>Unidades:</span>
          {['ton','kg'].map(u=>(
            <button key={u} onClick={()=>setUnit(u)} style={{padding:'3px 12px',borderRadius:20,fontSize:10,fontFamily:'var(--mono)',cursor:'pointer',background:unit===u?'var(--accent)':'var(--bg2)',color:unit===u?'#fff':'var(--text1)',border:`1px solid ${unit===u?'var(--accent)':'var(--border)'}`}}>
              {u==='ton'?'ton / ton·m':'kg / kg·cm'}
            </button>
          ))}
        </div>

        {/* Tabla combos */}
        <div style={{background:'var(--bg1)',border:'1px solid var(--border)',borderRadius:10,overflow:'hidden',marginBottom:12}}>
          <div style={{display:'grid',gridTemplateColumns:'20px 1fr 100px 100px 100px 28px',gap:5,padding:'6px 12px',background:'var(--bg2)',borderBottom:'1px solid var(--border)',fontSize:8,color:'var(--text2)',textTransform:'uppercase',letterSpacing:1}}>
            <span/><span>Combinación</span><span>Pu</span><span>Mux</span><span>Muy</span><span/>
          </div>
          {combos.map(c=>{
            const isCrit = results[critIdx]?.id===c.id
            return (
              <div key={c.id} style={{display:'grid',gridTemplateColumns:'20px 1fr 100px 100px 100px 28px',gap:5,padding:'6px 12px',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,.03)',background:isCrit?'rgba(255,182,39,.05)':'transparent'}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:c.color}}/>
                <input value={c.label} onChange={e=>upd(c.id,'label',e.target.value)} style={{background:'transparent',border:'none',outline:'none',color:isCrit?'#ffb627':'var(--text1)',fontFamily:'var(--sans)',fontSize:11,fontWeight:isCrit?600:400}}/>
                <input type="number" value={c.Pu} placeholder="0.0" step="0.1" onChange={e=>upd(c.id,'Pu',e.target.value)} style={{padding:'4px 7px',fontSize:11,textAlign:'right'}}/>
                <input type="number" value={c.Mux} placeholder="0.0" step="0.01" onChange={e=>upd(c.id,'Mux',e.target.value)} style={{padding:'4px 7px',fontSize:11,textAlign:'right'}}/>
                <input type="number" value={c.Muy} placeholder="0.0" step="0.01" onChange={e=>upd(c.id,'Muy',e.target.value)} style={{padding:'4px 7px',fontSize:11,textAlign:'right'}}/>
                <button onClick={()=>setCombos(p=>p.filter(x=>x.id!==c.id))} className="btn-danger" style={{padding:'2px 5px',fontSize:9}}>✕</button>
              </div>
            )
          })}
          <div style={{padding:'6px 12px'}}>
            <button onClick={add} className="btn-secondary" style={{fontSize:10}}>+ Agregar combinación</button>
          </div>
        </div>

        <button className="btn-primary" onClick={verificar} style={{marginBottom:18}} disabled={combos.every(c=>!c.Pu||!c.Mux||!c.Muy)}>
          ✓ Verificar todas las combinaciones
        </button>

        {results.length>0 && (
          <div>
            <div style={{padding:'12px 16px',borderRadius:9,marginBottom:14,display:'flex',alignItems:'center',gap:12,background:anyFail?'rgba(255,95,87,.07)':'rgba(0,229,200,.07)',border:`1px solid ${anyFail?'rgba(255,95,87,.25)':'rgba(0,229,200,.25)'}`}}>
              <span style={{fontSize:28}}>{anyFail?'✗':'✓'}</span>
              <div>
                <div style={{fontFamily:'var(--display)',fontSize:15,fontWeight:700,color:anyFail?'var(--danger)':'var(--success)'}}>
                  {anyFail?`${results.filter(r=>!r.dentro).length} combinación(es) NO CONFORME(S)`:'TODAS LAS COMBINACIONES CONFORMES'}
                </div>
                <div style={{fontSize:11,color:'var(--text2)',marginTop:3}}>
                  {results.length} verificadas · DCR máx = <span style={{fontFamily:'var(--mono)',color:anyFail?'var(--danger)':'var(--success)'}}>{Math.max(...results.map(r=>r.dcr)).toFixed(3)}</span>
                </div>
              </div>
            </div>

            <div style={{background:'var(--bg1)',border:'1px solid var(--border)',borderRadius:10,overflow:'hidden',marginBottom:14}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                <thead>
                  <tr style={{background:'var(--bg2)',borderBottom:'1px solid var(--border)'}}>
                    {['','Combinación','Pu','Mux','Muy','DCR','Estado'].map(h=>(
                      <th key={h} style={{padding:'7px 10px',textAlign:h==='DCR'||h==='Estado'?'center':'left',fontSize:8,color:'var(--text2)',textTransform:'uppercase',letterSpacing:1,fontWeight:500}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((r,i)=>{
                    const dc=r.dcr, col=dc<=.7?'#00e5c8':dc<=.85?'#4d8aff':dc<=1?'#ffb627':'#ff5f57'
                    const isCrit=i===critIdx
                    return (
                      <tr key={r.id} style={{borderBottom:'1px solid rgba(255,255,255,.03)',background:isCrit?'rgba(255,182,39,.05)':'transparent'}}>
                        <td style={{padding:'8px 10px'}}><div style={{width:7,height:7,borderRadius:'50%',background:r.color}}/></td>
                        <td style={{padding:'8px 10px',color:isCrit?'#ffb627':'var(--text1)',fontWeight:isCrit?600:400}}>
                          {r.label}{isCrit&&<span style={{fontSize:8,background:'rgba(255,182,39,.2)',color:'#ffb627',padding:'1px 6px',borderRadius:10,marginLeft:5}}>CRÍTICA</span>}
                        </td>
                        <td style={{padding:'8px 10px',fontFamily:'var(--mono)',color:'var(--text1)',fontSize:10}}>{unit==='ton'?fmt(r.Pu/1000):fmt(r.Pu,0)} {unit==='ton'?'t':'kg'}</td>
                        <td style={{padding:'8px 10px',fontFamily:'var(--mono)',color:'var(--text1)',fontSize:10}}>{unit==='ton'?fmt(r.Mux/100000,3):fmt(r.Mux,0)}</td>
                        <td style={{padding:'8px 10px',fontFamily:'var(--mono)',color:'var(--text1)',fontSize:10}}>{unit==='ton'?fmt(r.Muy/100000,3):fmt(r.Muy,0)}</td>
                        <td style={{padding:'8px 10px',textAlign:'center'}}>
                          <div style={{display:'flex',alignItems:'center',gap:6,justifyContent:'center'}}>
                            <div style={{width:60,height:4,background:'var(--bg3)',borderRadius:2,overflow:'hidden'}}>
                              <div style={{height:'100%',borderRadius:2,width:`${Math.min(dc*100,100)}%`,background:col}}/>
                            </div>
                            <span style={{fontFamily:'var(--mono)',fontSize:11,color:col,minWidth:38}}>{dc.toFixed(3)}</span>
                          </div>
                        </td>
                        <td style={{padding:'8px 10px',textAlign:'center'}}>
                          <span style={{fontSize:9,padding:'2px 8px',borderRadius:20,fontWeight:600,background:r.dentro?'rgba(0,229,200,.12)':'rgba(255,95,87,.12)',color:r.dentro?'var(--success)':'var(--danger)',border:`1px solid ${r.dentro?'rgba(0,229,200,.3)':'rgba(255,95,87,.3)'}`}}>
                            {r.dentro?'✓ OK':'✗ FALLA'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {anyFail&&(
              <div style={{background:'rgba(255,95,87,.06)',border:'1px solid rgba(255,95,87,.2)',borderRadius:9,padding:'12px 16px'}}>
                <div style={{color:'var(--danger)',fontFamily:'var(--display)',fontWeight:700,marginBottom:6}}>⚠ Acciones recomendadas</div>
                {results.filter(r=>!r.dentro).map(r=>(
                  <div key={r.id} style={{fontSize:11,color:'var(--text1)',lineHeight:1.9}}>
                    <span style={{color:r.color,fontWeight:600}}>• {r.label}:</span>{' '}
                    DCR={r.dcr.toFixed(3)} — déficit del {((r.dcr-1)*100).toFixed(0)}%. Aumentar sección o refuerzo.
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
