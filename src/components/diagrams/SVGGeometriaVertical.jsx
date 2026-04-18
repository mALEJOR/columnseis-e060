export default function SVGGeometriaVertical() {
  const floors = [
    { label: 'Piso 5', w: 80, y: 40 },
    { label: 'Piso 4', w: 80, y: 85 },
    { label: 'Piso 3', w: 130, y: 130 },
    { label: 'Piso 2', w: 180, y: 175 },
    { label: 'Piso 1', w: 200, y: 220 },
  ]
  const h = 42
  const cx = 200

  return (
    <svg viewBox="0 0 400 350" width="100%" style={{ maxWidth: 400 }}>
      <text x="200" y="18" textAnchor="middle" fill="#90caf9" fontSize="11" fontFamily="monospace" fontWeight="700">IRREGULARIDAD DE GEOMETRIA VERTICAL</text>

      {/* Ground */}
      <line x1={cx - 110} y1={220 + h} x2={cx + 110} y2={220 + h} stroke="#888" strokeWidth="2" />

      {/* Vertical dashed alignment lines */}
      <line x1={cx - 100} y1="35" x2={cx - 100} y2={220 + h} stroke="#444" strokeWidth="0.5" strokeDasharray="4,4" />
      <line x1={cx + 100} y1="35" x2={cx + 100} y2={220 + h} stroke="#444" strokeWidth="0.5" strokeDasharray="4,4" />

      {floors.map((f, i) => {
        const x = cx - f.w / 2
        const isSetback = i === 2 // transition point
        const color = isSetback ? '#FF9800' : '#4FC3F7'

        return (
          <g key={i}>
            <rect x={x} y={f.y} width={f.w} height={h - 3} rx="2"
              fill={color} fillOpacity={isSetback ? 0.2 : 0.12}
              stroke={color} strokeWidth={isSetback ? 2 : 1} />
            <text x={45} y={f.y + h / 2} textAnchor="end" fill="#aaa" fontSize="9" fontFamily="monospace">{f.label}</text>

            {/* Dimension line */}
            <line x1={x} y1={f.y + h + 2} x2={x + f.w} y2={f.y + h + 2} stroke="#FF9800" strokeWidth="0.8" />
            <line x1={x} y1={f.y + h - 1} x2={x} y2={f.y + h + 5} stroke="#FF9800" strokeWidth="0.8" />
            <line x1={x + f.w} y1={f.y + h - 1} x2={x + f.w} y2={f.y + h + 5} stroke="#FF9800" strokeWidth="0.8" />
            <text x={cx} y={f.y + h + 11} textAnchor="middle" fill="#FF9800" fontSize="8" fontFamily="monospace">
              D{5 - i} = {f.w / 10}m
            </text>
          </g>
        )
      })}

      {/* Setback callout */}
      <line x1={cx + 70} y1={120} x2={cx + 120} y2={95} stroke="#FF5252" strokeWidth="1" />
      <text x={cx + 125} y={90} fill="#FF5252" fontSize="9" fontFamily="monospace" fontWeight="700">D3 &gt; 1.3 * D4</text>
      <text x={cx + 125} y={102} fill="#FF5252" fontSize="9" fontFamily="monospace" fontWeight="700">13 &gt; 1.3*8 = 10.4</text>
      <text x={cx + 125} y={114} fill="#FF5252" fontSize="9" fontFamily="monospace">IRREGULAR</text>

      {/* Formula */}
      <text x="200" y="300" textAnchor="middle" fill="#ccc" fontSize="10" fontFamily="monospace">Criterio: Di &gt; 1.30 * D(i adyacente)</text>
      <text x="200" y="315" textAnchor="middle" fill="#aaa" fontSize="9" fontFamily="monospace">No aplica en azoteas ni sotanos</text>
    </svg>
  )
}
