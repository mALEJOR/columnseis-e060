export default function SectionViewer({ b, h, rec, barras, compact, circular, tipo, geoT }) {
  const SIZE = compact ? 140 : 200
  const PAD  = compact ? 16 : 22

  const maxDim = Math.max(b||1, h||1)
  const scale = (SIZE - 2*PAD) / maxDim
  const sw = (b||0)*scale, sh = (h||0)*scale
  const cx = SIZE/2, cy = SIZE/2
  const recS = (rec||0)*scale

  const esT = tipo === 'T'
  const esL = tipo === 'L'

  // Geometría T/L
  const bAlma = geoT?.b_alma || 0
  const hTotal = geoT?.h_total || 0
  const bAla = geoT?.b_ala || 0
  const hAla = geoT?.h_ala || 0

  // T shape polygon (centrado en cx, cy)
  const renderT = () => {
    const hAlma = hTotal - hAla
    const A = bAlma * hAlma + bAla * hAla
    const ycent = (bAlma * hAlma * (hAlma / 2) + bAla * hAla * (hAlma + hAla / 2)) / A
    const s = scale
    // Polígono T desde centroide
    const pts = [
      [cx - bAlma/2*s, cy + ycent*s],                    // base izq alma
      [cx + bAlma/2*s, cy + ycent*s],                    // base der alma
      [cx + bAlma/2*s, cy + (ycent - hAlma)*s],          // top alma der
      [cx + bAla/2*s,  cy + (ycent - hAlma)*s],          // inicio ala der
      [cx + bAla/2*s,  cy + (ycent - hTotal)*s],         // top ala der
      [cx - bAla/2*s,  cy + (ycent - hTotal)*s],         // top ala izq
      [cx - bAla/2*s,  cy + (ycent - hAlma)*s],          // inicio ala izq
      [cx - bAlma/2*s, cy + (ycent - hAlma)*s],          // top alma izq
    ]
    return pts.map(p => p.join(',')).join(' ')
  }

  // L shape polygon
  const renderL = () => {
    const A = bAlma * hTotal + (bAla - bAlma) * hAla
    const xcent = (bAlma * hTotal * (bAlma / 2) + (bAla - bAlma) * hAla * (bAlma + (bAla - bAlma) / 2)) / A
    const ycent = (bAlma * hTotal * (hTotal / 2) + (bAla - bAlma) * hAla * (hAla / 2)) / A
    const s = scale
    // Polígono L desde centroide
    const pts = [
      [cx - xcent*s,              cy + ycent*s],                    // base izq
      [cx + (bAla - xcent)*s,     cy + ycent*s],                    // base der (ala)
      [cx + (bAla - xcent)*s,     cy + (ycent - hAla)*s],           // top ala der
      [cx + (bAlma - xcent)*s,    cy + (ycent - hAla)*s],           // top ala izq = alma der
      [cx + (bAlma - xcent)*s,    cy + (ycent - hTotal)*s],         // top alma der
      [cx - xcent*s,              cy + (ycent - hTotal)*s],         // top alma izq
    ]
    return pts.map(p => p.join(',')).join(' ')
  }

  return (
    <div style={{display:'flex',justifyContent:'center',padding:compact?'8px 0':'10px 0'}}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{borderRadius:6,background:'#ffffff',border:'1px solid #d4d8e2',display:'block'}}>
        {/* Ejes */}
        <line x1={cx} y1={PAD/2} x2={cx} y2={SIZE-PAD/2} stroke="#b0b8cc" strokeWidth="0.5" strokeDasharray="3,3"/>
        <line x1={PAD/2} y1={cy} x2={SIZE-PAD/2} y2={cy} stroke="#b0b8cc" strokeWidth="0.5" strokeDasharray="3,3"/>

        {esT ? (
          <polygon points={renderT()} fill="#d0d4dc" stroke="#9099b0" strokeWidth="1" strokeLinejoin="miter"/>
        ) : esL ? (
          <polygon points={renderL()} fill="#d0d4dc" stroke="#9099b0" strokeWidth="1" strokeLinejoin="miter"/>
        ) : circular ? (
          <>
            <circle cx={cx} cy={cy} r={sw/2}
              fill="#d0d4dc" stroke="#9099b0" strokeWidth="1"/>
            {rec > 0 && (
              <circle cx={cx} cy={cy} r={sw/2 - recS}
                fill="none" stroke="#b0b8cc" strokeWidth="0.5" strokeDasharray="3,3"/>
            )}
          </>
        ) : (
          <>
            <rect x={cx-sw/2} y={cy-sh/2} width={sw} height={sh}
              fill="#d0d4dc" stroke="#9099b0" strokeWidth="1" rx="2"/>
            {rec > 0 && (
              <rect x={cx-sw/2+recS} y={cy-sh/2+recS}
                width={sw-2*recS} height={sh-2*recS}
                fill="none" stroke="#b0b8cc" strokeWidth="0.5" strokeDasharray="3,3"/>
            )}
          </>
        )}

        {/* Barras */}
        {barras && barras.map((bar,i) => {
          const bx = cx + bar.x*scale
          const by = cy - bar.y*scale
          const br = Math.max(compact?3:3.5, (bar.diametro/2)*scale)
          return (
            <circle key={i} cx={bx} cy={by} r={br}
              fill="#e03030" stroke="#b02020" strokeWidth="0.8" opacity="0.95"/>
          )
        })}

        {/* Centroide */}
        <circle cx={cx} cy={cy} r={compact?1.5:2} fill="#d97706"/>

        {/* Cotas */}
        {circular ? (
          b > 0 && <text x={cx} y={cy-sw/2-5} textAnchor="middle" fill="#444444" fontSize={compact?7.5:8.5} fontFamily="IBM Plex Mono,monospace" fontWeight="500">D={b}cm</text>
        ) : esT ? (
          <>
            {bAla > 0 && <text x={cx} y={cy-sh/2-5} textAnchor="middle" fill="#444444" fontSize={compact?7:8} fontFamily="IBM Plex Mono,monospace" fontWeight="500">b_ala={bAla}</text>}
            {hTotal > 0 && <text x={cx-sw/2-5} y={cy} textAnchor="middle" fill="#444444" fontSize={compact?7:8} fontFamily="IBM Plex Mono,monospace" fontWeight="500" transform={`rotate(-90,${cx-sw/2-5},${cy})`}>h={hTotal}</text>}
          </>
        ) : esL ? (
          <>
            {bAla > 0 && <text x={cx} y={cy+sh/2+10} textAnchor="middle" fill="#444444" fontSize={compact?7:8} fontFamily="IBM Plex Mono,monospace" fontWeight="500">b_ala={bAla}</text>}
            {hTotal > 0 && <text x={cx-sw/2-5} y={cy} textAnchor="middle" fill="#444444" fontSize={compact?7:8} fontFamily="IBM Plex Mono,monospace" fontWeight="500" transform={`rotate(-90,${cx-sw/2-5},${cy})`}>h={hTotal}</text>}
          </>
        ) : (
          <>
            {b > 0 && <text x={cx} y={cy-sh/2-5} textAnchor="middle" fill="#444444" fontSize={compact?7.5:8.5} fontFamily="IBM Plex Mono,monospace" fontWeight="500">b={b}cm</text>}
            {h > 0 && <text x={cx-sw/2-5} y={cy} textAnchor="middle" fill="#444444" fontSize={compact?7.5:8.5} fontFamily="IBM Plex Mono,monospace" fontWeight="500" transform={`rotate(-90,${cx-sw/2-5},${cy})`}>h={h}cm</text>}
          </>
        )}
      </svg>
    </div>
  )
}
