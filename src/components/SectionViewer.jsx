export default function SectionViewer({ b, h, rec, barras, compact }) {
  const SIZE = compact ? 140 : 200
  const PAD  = compact ? 16 : 22

  const scale = (SIZE - 2*PAD) / Math.max(b||1, h||1)
  const sw = (b||0)*scale, sh = (h||0)*scale
  const cx = SIZE/2, cy = SIZE/2
  const recS = (rec||0)*scale

  return (
    <div style={{display:'flex',justifyContent:'center',padding:compact?'8px 0':'10px 0'}}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{borderRadius:6,background:'#fafbfc',border:'0.5px solid #e2e5ea',display:'block'}}>
        {/* Ejes */}
        <line x1={cx} y1={PAD/2} x2={cx} y2={SIZE-PAD/2} stroke="#dde0e6" strokeWidth="0.5" strokeDasharray="3,3"/>
        <line x1={PAD/2} y1={cy} x2={SIZE-PAD/2} y2={cy} stroke="#dde0e6" strokeWidth="0.5" strokeDasharray="3,3"/>

        {/* Concreto */}
        <rect x={cx-sw/2} y={cy-sh/2} width={sw} height={sh}
          fill="#eef0f4" stroke="#9ca3af" strokeWidth="1" rx="2"/>

        {/* Recubrimiento */}
        {rec > 0 && (
          <rect x={cx-sw/2+recS} y={cy-sh/2+recS}
            width={sw-2*recS} height={sh-2*recS}
            fill="none" stroke="#c4c9d4" strokeWidth="0.5" strokeDasharray="3,3"/>
        )}

        {/* Barras */}
        {barras && barras.map((bar,i) => {
          const bx = cx + bar.x*scale
          const by = cy - bar.y*scale
          const br = Math.max(compact?3:3.5, (bar.diametro/2)*scale)
          return (
            <circle key={i} cx={bx} cy={by} r={br}
              fill="#9b59b6" stroke="#7e3fa0" strokeWidth="0.8" opacity="0.95"/>
          )
        })}

        {/* Centroide */}
        <circle cx={cx} cy={cy} r={compact?1.5:2} fill="#d97706"/>

        {/* Cotas */}
        {b > 0 && <text x={cx} y={cy-sh/2-5} textAnchor="middle" fill="#9ca3af" fontSize={compact?7.5:8.5} fontFamily="IBM Plex Mono,monospace" fontWeight="500">b={b}cm</text>}
        {h > 0 && <text x={cx-sw/2-5} y={cy} textAnchor="middle" fill="#9ca3af" fontSize={compact?7.5:8.5} fontFamily="IBM Plex Mono,monospace" fontWeight="500" transform={`rotate(-90,${cx-sw/2-5},${cy})`}>h={h}cm</text>}
      </svg>
    </div>
  )
}
