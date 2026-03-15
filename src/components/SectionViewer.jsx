export default function SectionViewer({ b, h, rec, barras, compact }) {
  const SIZE = compact ? 130 : 200
  const PAD  = compact ? 14 : 20

  const scale = (SIZE - 2*PAD) / Math.max(b||1, h||1)
  const sw = (b||0)*scale, sh = (h||0)*scale
  const cx = SIZE/2, cy = SIZE/2
  const recS = (rec||0)*scale

  return (
    <div style={{display:'flex',justifyContent:'center',padding:compact?'6px 0':'10px 0'}}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{borderRadius:4,background:'#f8f9fc',border:'1px solid var(--border)',display:'block'}}>
        {/* Ejes */}
        <line x1={cx} y1={PAD/2} x2={cx} y2={SIZE-PAD/2} stroke="#cdd0d9" strokeWidth="0.5" strokeDasharray="2,2"/>
        <line x1={PAD/2} y1={cy} x2={SIZE-PAD/2} y2={cy} stroke="#cdd0d9" strokeWidth="0.5" strokeDasharray="2,2"/>

        {/* Concreto — gris */}
        <rect x={cx-sw/2} y={cy-sh/2} width={sw} height={sh}
          fill="#e4e7ee" stroke="#9099b0" strokeWidth="1.2" rx="1"/>

        {/* Recubrimiento */}
        {rec > 0 && (
          <rect x={cx-sw/2+recS} y={cy-sh/2+recS}
            width={sw-2*recS} height={sh-2*recS}
            fill="none" stroke="#b0b8cc" strokeWidth="0.5" strokeDasharray="2,2"/>
        )}

        {/* Barras — rojo */}
        {barras && barras.map((bar,i) => {
          const bx = cx + bar.x*scale
          const by = cy - bar.y*scale
          const br = Math.max(compact?2.5:3, (bar.diametro/2)*scale)
          return (
            <circle key={i} cx={bx} cy={by} r={br}
              fill="#e03030" stroke="#b02020" strokeWidth="0.6" opacity="0.9"/>
          )
        })}

        {/* Centroide */}
        <circle cx={cx} cy={cy} r={compact?1.5:2} fill="#c47e00"/>

        {/* Cotas */}
        {b > 0 && <text x={cx} y={cy-sh/2-4} textAnchor="middle" fill="#7a8194" fontSize={compact?7:8} fontFamily="IBM Plex Mono,monospace">b={b}cm</text>}
        {h > 0 && <text x={cx-sw/2-4} y={cy} textAnchor="middle" fill="#7a8194" fontSize={compact?7:8} fontFamily="IBM Plex Mono,monospace" transform={`rotate(-90,${cx-sw/2-4},${cy})`}>h={h}cm</text>}
      </svg>
    </div>
  )
}
