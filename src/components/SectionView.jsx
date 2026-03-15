import { useMemo } from 'react'

export default function SectionView({ columnData }) {
  const { geometria: geo, refuerzo, material } = columnData

  const SIZE = 200
  const MARGIN = 24

  // Escalar la sección al viewport
  const scale = (SIZE - 2 * MARGIN) / Math.max(geo.b, geo.h)
  const sw = geo.b * scale
  const sh = geo.h * scale
  const cx = SIZE / 2
  const cy = SIZE / 2
  const rectX = cx - sw / 2
  const rectY = cy - sh / 2

  // Recubrimiento escalado
  const recubS = geo.recubrimiento * scale

  // Barras escaladas
  const bars = useMemo(() => {
    return refuerzo.barras.map(bar => ({
      cx: cx + bar.x * scale,
      cy: cy - bar.y * scale, // Y invertida en SVG
      r: Math.max(3, (bar.diametro / 2) * scale),
      area: bar.area || Math.PI * bar.diametro ** 2 / 4,
      label: `(${bar.x.toFixed(1)}, ${bar.y.toFixed(1)})`,
    }))
  }, [refuerzo.barras, scale, cx, cy])

  const asTotal = refuerzo.barras.reduce((s, b) => s + (b.area || Math.PI * b.diametro ** 2 / 4), 0)
  const rho = (asTotal / (geo.b * geo.h) * 100).toFixed(2)

  return (
    <div className="panel section-view">
      <div className="panel-title">Sección Transversal</div>
      <div className="section-svg-container">
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          style={{ borderRadius: 8, background: 'var(--bg2)', border: '1px solid var(--border)' }}
        >
          {/* Ejes */}
          <line x1={cx} y1={MARGIN / 2} x2={cx} y2={SIZE - MARGIN / 2}
            stroke="rgba(99,140,255,0.15)" strokeWidth="0.5" strokeDasharray="3,3" />
          <line x1={MARGIN / 2} y1={cy} x2={SIZE - MARGIN / 2} y2={cy}
            stroke="rgba(99,140,255,0.15)" strokeWidth="0.5" strokeDasharray="3,3" />

          {/* Sección de concreto */}
          <rect
            x={rectX} y={rectY} width={sw} height={sh}
            fill="rgba(77,138,255,0.06)"
            stroke="rgba(77,138,255,0.5)"
            strokeWidth="1.5"
            rx="1"
          />

          {/* Recubrimiento */}
          <rect
            x={rectX + recubS} y={rectY + recubS}
            width={sw - 2 * recubS} height={sh - 2 * recubS}
            fill="none"
            stroke="rgba(77,138,255,0.2)"
            strokeWidth="0.5"
            strokeDasharray="3,2"
          />

          {/* Barras de refuerzo */}
          {bars.map((bar, i) => (
            <g key={i}>
              <circle
                cx={bar.cx} cy={bar.cy} r={bar.r}
                fill="rgba(0, 229, 200, 0.7)"
                stroke="rgba(0, 229, 200, 1)"
                strokeWidth="0.8"
              />
            </g>
          ))}

          {/* Centroide */}
          <circle cx={cx} cy={cy} r={2} fill="rgba(255,182,39,0.8)" />

          {/* Cotas b y h */}
          <text x={cx} y={rectY - 4} textAnchor="middle" fill="rgba(110,122,150,0.9)" fontSize="8" fontFamily="JetBrains Mono, monospace">
            b={geo.b}cm
          </text>
          <text x={rectX - 4} y={cy} textAnchor="middle" fill="rgba(110,122,150,0.9)" fontSize="8" fontFamily="JetBrains Mono, monospace"
            transform={`rotate(-90, ${rectX - 4}, ${cy})`}>
            h={geo.h}cm
          </text>
        </svg>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 10 }}>
        <span style={{ color: 'var(--text2)' }}>
          <span style={{ color: '#00e5c8' }}>●</span> {refuerzo.barras.length} barras
        </span>
        <span style={{ fontFamily: 'var(--mono)', color: 'var(--text1)' }}>As={asTotal.toFixed(2)} cm²</span>
        <span style={{ fontFamily: 'var(--mono)', color: parseFloat(rho) < 1 || parseFloat(rho) > 8 ? 'var(--danger)' : 'var(--success)' }}>
          ρ={rho}%
        </span>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 6 }}>
        E.060: ρ mín=1% · ρ máx=6% (sismorresistente) · f'c={material.fc} kg/cm² · fy={material.fy} kg/cm²
      </div>
    </div>
  )
}
