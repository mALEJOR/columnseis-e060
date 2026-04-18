export default function SVGMasa() {
  const floors = [
    { label: 'Azotea', mass: 1, excluded: true },
    { label: 'Piso 4', mass: 2, excluded: false },
    { label: 'Piso 3', mass: 5, excluded: false, heavy: true },
    { label: 'Piso 2', mass: 2.5, excluded: false },
    { label: 'Piso 1', mass: 2, excluded: false },
  ]

  const yBase = 280
  const floorH = 45

  return (
    <svg viewBox="0 0 400 350" width="100%" style={{ maxWidth: 400 }}>
      <text x="200" y="18" textAnchor="middle" fill="#90caf9" fontSize="11" fontFamily="monospace" fontWeight="700">IRREGULARIDAD DE MASA O PESO</text>

      {/* Ground */}
      <line x1="80" y1={yBase} x2="240" y2={yBase} stroke="#888" strokeWidth="2" />

      {floors.map((f, i) => {
        const y = yBase - (floors.length - i) * floorH
        const w = 40 + f.mass * 25
        const x = 160 - w / 2
        const color = f.excluded ? '#666' : f.heavy ? '#FF5252' : '#4FC3F7'
        const fillOp = f.excluded ? 0.1 : f.heavy ? 0.35 : 0.15

        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={floorH - 4} rx="2"
              fill={color} fillOpacity={fillOp}
              stroke={color} strokeWidth={f.heavy ? 2 : 1} strokeDasharray={f.excluded ? '4,3' : 'none'} />
            {/* Mass label inside */}
            <text x={160} y={y + floorH / 2} textAnchor="middle" fill={color} fontSize="10" fontFamily="monospace" fontWeight={f.heavy ? 700 : 400}>
              m{floors.length - i} = {f.mass * 100} Tn
            </text>
            {/* Floor name */}
            <text x={55} y={y + floorH / 2} textAnchor="end" fill={f.excluded ? '#666' : '#aaa'} fontSize="9" fontFamily="monospace">
              {f.label}
            </text>

            {/* Arrow for heavy floor */}
            {f.heavy && (
              <>
                <line x1={x + w + 10} y1={y + floorH / 2} x2={x + w + 50} y2={y + floorH / 2} stroke="#FF5252" strokeWidth="1.5" />
                <text x={x + w + 55} y={y + floorH / 2 - 5} fill="#FF5252" fontSize="9" fontFamily="monospace" fontWeight="700">mi &gt; 1.5*m(i+1)</text>
                <text x={x + w + 55} y={y + floorH / 2 + 7} fill="#FF5252" fontSize="9" fontFamily="monospace" fontWeight="700">IRREGULAR</text>
              </>
            )}
            {f.excluded && (
              <text x={x + w + 10} y={y + floorH / 2 + 3} fill="#666" fontSize="8" fontFamily="monospace">EXCLUIDO</text>
            )}
          </g>
        )
      })}

      {/* Note */}
      <text x="200" y="330" textAnchor="middle" fill="#aaa" fontSize="9" fontFamily="monospace">No aplica en azoteas ni sotanos</text>
      <text x="200" y="345" textAnchor="middle" fill="#ccc" fontSize="10" fontFamily="monospace">Criterio: mi &gt; 1.50 * m(i+1)</text>
    </svg>
  )
}
