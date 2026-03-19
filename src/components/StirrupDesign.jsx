import { useState } from 'react'
import { disenarEstribos } from '../utils/engine'
import { VARILLAS_LONGITUDINALES, VARILLAS_ESTRIBOS } from '../utils/varillas'

function Check({ ok, label, value, req }) {
  return (
    <div style={{
      display:'flex',alignItems:'center',gap:8,padding:'6px 10px',
      borderRadius:6,marginBottom:4,
      background:ok?'rgba(0,168,150,0.08)':'rgba(220,38,38,0.08)',
      border:`1px solid ${ok?'rgba(0,168,150,0.25)':'rgba(220,38,38,0.25)'}`,
    }}>
      <span style={{fontSize:14,lineHeight:1}}>{ok?'✓':'✗'}</span>
      <div style={{flex:1}}>
        <div style={{fontSize:10,color:'var(--text1)',fontWeight:500}}>{label}</div>
        <div style={{fontSize:9,fontFamily:'var(--mono)',color:'var(--text2)',marginTop:1}}>
          {value} {req && <span style={{color:'var(--text3)'}}>({req})</span>}
        </div>
      </div>
    </div>
  )
}

function StirrupSVG({ b, h, lo, so, sFuera, ln }) {
  const W = 200, H = 320, PAD = 30
  const colW = 50, colH = H - 2*PAD
  const cx = W/2, cy = H/2
  const loScale = Math.min(lo / ln, 0.4) * colH
  const y1 = cy - colH/2
  const y2 = cy + colH/2

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}
      style={{display:'block',margin:'8px auto',background:'var(--surface3)',borderRadius:8,border:'1px solid var(--border)'}}>
      {/* Columna */}
      <rect x={cx-colW/2} y={y1} width={colW} height={colH}
        fill="none" stroke="var(--text2)" strokeWidth="1.5"/>

      {/* Zona confinada superior */}
      <rect x={cx-colW/2+2} y={y1+2} width={colW-4} height={loScale}
        fill="rgba(220,38,38,0.12)" stroke="none"/>
      {/* Zona confinada inferior */}
      <rect x={cx-colW/2+2} y={y2-loScale-2} width={colW-4} height={loScale}
        fill="rgba(220,38,38,0.12)" stroke="none"/>

      {/* Estribos zona confinada superior */}
      {Array.from({length:Math.min(Math.floor(loScale/8),12)}).map((_,i)=>(
        <line key={`t${i}`} x1={cx-colW/2+4} y1={y1+4+i*8} x2={cx+colW/2-4} y2={y1+4+i*8}
          stroke="var(--red)" strokeWidth="1" opacity="0.6"/>
      ))}

      {/* Estribos zona central (más espaciados) */}
      {Array.from({length:Math.min(Math.floor((colH-2*loScale)/16),8)}).map((_,i)=>(
        <line key={`m${i}`} x1={cx-colW/2+4} y1={y1+loScale+8+i*16} x2={cx+colW/2-4} y2={y1+loScale+8+i*16}
          stroke="var(--text2)" strokeWidth="0.8" opacity="0.4"/>
      ))}

      {/* Estribos zona confinada inferior */}
      {Array.from({length:Math.min(Math.floor(loScale/8),12)}).map((_,i)=>(
        <line key={`b${i}`} x1={cx-colW/2+4} y1={y2-4-i*8} x2={cx+colW/2-4} y2={y2-4-i*8}
          stroke="var(--red)" strokeWidth="1" opacity="0.6"/>
      ))}

      {/* Cotas */}
      {/* lo superior */}
      <line x1={cx+colW/2+8} y1={y1} x2={cx+colW/2+8} y2={y1+loScale} stroke="var(--amber)" strokeWidth="0.8"/>
      <line x1={cx+colW/2+4} y1={y1} x2={cx+colW/2+12} y2={y1} stroke="var(--amber)" strokeWidth="0.8"/>
      <line x1={cx+colW/2+4} y1={y1+loScale} x2={cx+colW/2+12} y2={y1+loScale} stroke="var(--amber)" strokeWidth="0.8"/>
      <text x={cx+colW/2+14} y={y1+loScale/2+3} fontSize="8" fill="var(--amber)" fontFamily="IBM Plex Mono,monospace">lo={lo}cm</text>

      {/* so label */}
      <text x={cx-colW/2-6} y={y1+loScale/2} fontSize="7" fill="var(--red)" fontFamily="IBM Plex Mono,monospace" textAnchor="end">so={so}cm</text>

      {/* s fuera label */}
      <text x={cx-colW/2-6} y={cy} fontSize="7" fill="var(--text2)" fontFamily="IBM Plex Mono,monospace" textAnchor="end">s={sFuera}cm</text>

      {/* ln label */}
      <text x={cx} y={y2+16} textAnchor="middle" fontSize="8" fill="var(--text2)" fontFamily="IBM Plex Mono,monospace">ln={ln}cm</text>

      {/* Sección label */}
      <text x={cx} y={y1-6} textAnchor="middle" fontSize="8" fill="var(--text1)" fontFamily="IBM Plex Sans,sans-serif" fontWeight="600">{b}×{h} cm</text>
    </svg>
  )
}

export default function StirrupDesign({ columnData, onEstribosCalc }) {
  const [dEstr, setDEstr] = useState(1.270)
  const [nRamas, setNRamas] = useState(2)
  const [dLong, setDLong] = useState(2.540)
  const [ln, setLn] = useState(260)
  const [result, setResult] = useState(null)

  const geo = columnData?.geometria
  const mat = columnData?.material

  const calcular = () => {
    if (!geo || !mat) return
    const geoEst = {
      b: geo.tipo === 'circular' ? geo.D : geo.b,
      h: geo.tipo === 'circular' ? geo.D : geo.h,
      recubrimiento: geo.recubrimiento,
    }
    const r = disenarEstribos(geoEst, mat, null, dEstr, +nRamas, dLong, +ln)
    setResult(r)
    if (onEstribosCalc) onEstribosCalc(r)
  }

  if (!columnData) {
    return (
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text3)',fontSize:12,fontFamily:'var(--mono)'}}>
        Calcule primero la interacción para habilitar estribos
      </div>
    )
  }

  const bShow = geo.tipo === 'circular' ? geo.D : geo.b
  const hShow = geo.tipo === 'circular' ? geo.D : geo.h

  return (
    <div style={{flex:1,overflow:'auto',padding:'18px 22px'}}>
      <div style={{maxWidth:700}}>
        <h3 style={{fontFamily:'var(--cond)',fontSize:15,color:'var(--text0)',marginBottom:4,textTransform:'uppercase',letterSpacing:1}}>
          Diseño de Estribos Sísmicos
        </h3>
        <p style={{fontSize:10,color:'var(--text2)',marginBottom:16,lineHeight:1.6}}>
          NTP E.060 Sección 21.4.4 — Requisitos de confinamiento para columnas en pórticos sismorresistentes.
        </p>

        {/* Inputs */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,padding:'12px 14px'}}>
            <div style={{fontSize:8,color:'var(--text3)',textTransform:'uppercase',letterSpacing:.8,marginBottom:8,fontWeight:600}}>Estribo</div>
            <div style={{marginBottom:8}}>
              <label style={{fontSize:9,color:'var(--text2)',display:'block',marginBottom:3}}>Diámetro estribo</label>
              <select value={dEstr} onChange={e=>setDEstr(+e.target.value)}
                style={{width:'100%',padding:'6px 8px',fontSize:11,fontFamily:'var(--mono)',background:'var(--surface3)',border:'1px solid var(--border)',borderRadius:4,color:'var(--text0)',outline:'none'}}>
                {VARILLAS_ESTRIBOS.map(v=><option key={v.numero} value={v.d}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:9,color:'var(--text2)',display:'block',marginBottom:3}}>N° de ramas</label>
              <input type="number" value={nRamas} onChange={e=>setNRamas(e.target.value)} min="2" max="8"
                style={{width:'100%',padding:'6px 8px',fontSize:11,fontFamily:'var(--mono)',background:'var(--surface3)',border:'1px solid var(--border)',borderRadius:4,color:'var(--text0)',outline:'none'}}/>
            </div>
          </div>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,padding:'12px 14px'}}>
            <div style={{fontSize:8,color:'var(--text3)',textTransform:'uppercase',letterSpacing:.8,marginBottom:8,fontWeight:600}}>Columna</div>
            <div style={{marginBottom:8}}>
              <label style={{fontSize:9,color:'var(--text2)',display:'block',marginBottom:3}}>∅ barra longitudinal</label>
              <select value={dLong} onChange={e=>setDLong(+e.target.value)}
                style={{width:'100%',padding:'6px 8px',fontSize:11,fontFamily:'var(--mono)',background:'var(--surface3)',border:'1px solid var(--border)',borderRadius:4,color:'var(--text0)',outline:'none'}}>
                {VARILLAS_LONGITUDINALES.map(v=><option key={v.numero} value={v.d}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:9,color:'var(--text2)',display:'block',marginBottom:3}}>Luz libre ln (cm)</label>
              <input type="number" value={ln} onChange={e=>setLn(e.target.value)} min="50"
                style={{width:'100%',padding:'6px 8px',fontSize:11,fontFamily:'var(--mono)',background:'var(--surface3)',border:'1px solid var(--border)',borderRadius:4,color:'var(--text0)',outline:'none'}}/>
            </div>
          </div>
        </div>

        <button onClick={calcular}
          style={{width:'100%',padding:'10px',border:'none',borderRadius:6,background:'var(--accent)',color:'#fff',fontFamily:'var(--cond)',fontSize:12,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',cursor:'pointer',marginBottom:16,boxShadow:'0 2px 12px rgba(21,71,200,.35)'}}>
          CALCULAR ESTRIBOS E.060
        </button>

        {result && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            {/* Resultados */}
            <div>
              {/* Cards de resultado */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:12}}>
                {[
                  {l:'lo',v:`${result.lo} cm`,sub:'Zona confinamiento'},
                  {l:'so',v:`${result.so} cm`,sub:'Esp. confinado'},
                  {l:'s',v:`${result.s_fuera} cm`,sub:'Esp. fuera'},
                ].map(({l,v,sub})=>(
                  <div key={l} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:6,padding:'8px 10px',textAlign:'center'}}>
                    <div style={{fontSize:7,color:'var(--text3)',textTransform:'uppercase',letterSpacing:.6}}>{sub}</div>
                    <div style={{fontFamily:'var(--mono)',fontSize:16,fontWeight:600,color:'var(--text0)',margin:'4px 0 2px'}}>{v}</div>
                    <div style={{fontSize:8,color:'var(--purple)',fontWeight:600}}>{l}</div>
                  </div>
                ))}
              </div>

              {/* Verificaciones */}
              <div style={{fontSize:9,color:'var(--text3)',textTransform:'uppercase',letterSpacing:.8,marginBottom:6,fontWeight:600}}>Verificaciones E.060</div>
              <Check ok={result.ok_Ash_b}
                label={`Ash dir. b (bc=${result.bc_b}cm)`}
                value={`Ash_prov = ${result.Ash_prov} cm²`}
                req={`req. ${result.Ash_b} cm²`}/>
              <Check ok={result.ok_Ash_h}
                label={`Ash dir. h (bc=${result.bc_h}cm)`}
                value={`Ash_prov = ${result.Ash_prov} cm²`}
                req={`req. ${result.Ash_h} cm²`}/>
              <Check ok={result.ok_rho}
                label="Cuantía volumétrica ρs"
                value={`ρs = ${result.rho_s}%`}
                req={`mín. ${result.rho_s_min}%`}/>
              <Check ok={result.ok_diam}
                label="Diámetro mínimo estribo"
                value={`∅ = ${dEstr.toFixed(3)} cm`}
                req={`mín. ${result.d_min} cm`}/>

              {/* Tabla resumen */}
              <div style={{marginTop:12,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,overflow:'hidden'}}>
                <div style={{padding:'6px 10px',background:'var(--surface2)',borderBottom:'1px solid var(--border)',fontSize:8,color:'var(--text2)',textTransform:'uppercase',letterSpacing:1,fontWeight:600}}>
                  Resumen de Espaciamiento
                </div>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:10,fontFamily:'var(--mono)'}}>
                  <thead>
                    <tr style={{borderBottom:'1px solid var(--border)'}}>
                      <th style={{padding:'6px 10px',textAlign:'left',fontSize:8,color:'var(--text3)',fontWeight:500}}>Criterio</th>
                      <th style={{padding:'6px 10px',textAlign:'right',fontSize:8,color:'var(--text3)',fontWeight:500}}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['b_menor / 4', `${result.so_b4} cm`],
                      ['6 × db_long', `${result.so_6db} cm`],
                      [`Límite (db≤16mm→10, sino→15)`, `${result.so_lim} cm`],
                      ['so = mín(...)', `${result.so} cm`],
                      ['s fuera = mín(b/2, 30)', `${result.s_fuera} cm`],
                      ['lo = máx(h, ln/6, 45)', `${result.lo} cm`],
                    ].map(([k,v])=>(
                      <tr key={k} style={{borderBottom:'1px solid rgba(255,255,255,.04)'}}>
                        <td style={{padding:'5px 10px',color:'var(--text1)'}}>{k}</td>
                        <td style={{padding:'5px 10px',textAlign:'right',color:'var(--purple)',fontWeight:600}}>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Esquema SVG */}
            <div>
              <StirrupSVG b={bShow} h={hShow} lo={result.lo} so={result.so} sFuera={result.s_fuera} ln={+ln}/>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
