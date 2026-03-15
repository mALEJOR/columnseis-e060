import { useMemo } from 'react'

export default function SectionView({ columnData }) {
  const { geometria: geo, refuerzo, material } = columnData
  const SIZE = 180, MARGIN = 20
  const scale = (SIZE - 2*MARGIN) / Math.max(geo.b, geo.h)
  const sw = geo.b*scale, sh = geo.h*scale
  const cx = SIZE/2, cy = SIZE/2
  const recubS = geo.recubrimiento*scale

  const bars = useMemo(() => refuerzo.barras.map(bar => ({
    cx: cx + bar.x*scale,
    cy: cy - bar.y*scale,
    r: Math.max(3, (bar.diametro/2)*scale),
  })), [refuerzo.barras, scale, cx, cy])

  const As = refuerzo.barras.reduce((s,b) => s+(b.area||Math.PI*b.diametro**2/4), 0)
  const rho = (As/(geo.b*geo.h)*100).toFixed(2)
  const rhoOk = parseFloat(rho)>=1 && parseFloat(rho)<=6

  return (
    <div className="section-view">
      <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}
          style={{borderRadius:4,background:'#f8f9fc',border:'1px solid var(--border)',flexShrink:0}}>
          {/* Ejes */}
          <line x1={cx} y1={8} x2={cx} y2={SIZE-8} stroke="#dde1ea" strokeWidth="0.5" strokeDasharray="3,3"/>
          <line x1={8} y1={cy} x2={SIZE-8} y2={cy} stroke="#dde1ea" strokeWidth="0.5" strokeDasharray="3,3"/>

          {/* Sección */}
          <rect x={cx-sw/2} y={cy-sh/2} width={sw} height={sh}
            fill="rgba(26,92,255,0.04)" stroke="#1a5cff" strokeWidth="1.5" rx="1"/>

          {/* Recubrimiento */}
          <rect x={cx-sw/2+recubS} y={cy-sh/2+recubS}
            width={sw-2*recubS} height={sh-2*recubS}
            fill="none" stroke="#b0b7c8" strokeWidth="0.5" strokeDasharray="3,2"/>

          {/* Barras */}
          {bars.map((bar,i) => (
            <circle key={i} cx={bar.cx} cy={bar.cy} r={bar.r}
              fill="#00a896" stroke="#008073" strokeWidth="0.8" opacity="0.85"/>
          ))}

          {/* Centroide */}
          <circle cx={cx} cy={cy} r={2} fill="#f4a015"/>

          {/* Cotas */}
          <text x={cx} y={cy-sh/2-5} textAnchor="middle" fill="#7a8194" fontSize="8" fontFamily="DM Mono,monospace">b={geo.b}cm</text>
          <text x={cx-sw/2-4} y={cy} textAnchor="middle" fill="#7a8194" fontSize="8" fontFamily="DM Mono,monospace"
            transform={`rotate(-90,${cx-sw/2-4},${cy})`}>h={geo.h}cm</text>
        </svg>

        {/* Info lateral */}
        <div style={{flex:1}}>
          {[
            {label:'Sección', value:`${geo.b}×${geo.h} cm`},
            {label:'Recub.', value:`${geo.recubrimiento} cm`},
            {label:'# Barras', value:`${refuerzo.barras.length} u`},
            {label:'As total', value:`${As.toFixed(2)} cm²`},
            {label:'ρ', value:`${rho} %`, color: rhoOk?'var(--teal)':'var(--red)'},
            {label:"f'c", value:`${material.fc} kg/cm²`},
            {label:'fy', value:`${material.fy} kg/cm²`},
          ].map(({label,value,color}) => (
            <div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'2px 0',borderBottom:'1px solid var(--border)'}}>
              <span style={{fontSize:9,color:'var(--text2)',textTransform:'uppercase',letterSpacing:.5}}>{label}</span>
              <span style={{fontSize:10,fontFamily:'var(--mono)',fontWeight:500,color:color||'var(--text0)'}}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
