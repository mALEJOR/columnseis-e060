export default function SVGPisoBlando() {
  const floors = [
    { y: 40, h: 50, label: 'Piso 5', delta: 3, soft: false },
    { y: 90, h: 50, label: 'Piso 4', delta: 5, soft: false },
    { y: 140, h: 50, label: 'Piso 3', delta: 4, soft: false },
    { y: 190, h: 55, label: 'Piso 2', delta: 14, soft: true },
    { y: 245, h: 55, label: 'Piso 1', delta: 6, soft: false },
  ]

  return (
    <svg viewBox="0 0 400 350" width="100%" style={{ maxWidth: 400 }}>
      <text x="200" y="18" textAnchor="middle" fill="#90caf9" fontSize="11" fontFamily="monospace" fontWeight="700">PISO BLANDO - RIGIDEZ LATERAL</text>

      <defs>
        <marker id="arrB" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
          <path d="M0,0 L7,2.5 L0,5" fill="#FF5252" />
        </marker>
        <marker id="arrG" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
          <path d="M0,0 L7,2.5 L0,5" fill="#4FC3F7" />
        </marker>
      </defs>

      {/* Ground */}
      <line x1="70" y1="300" x2="230" y2="300" stroke="#888" strokeWidth="2" />
      <line x1="70" y1="300" x2="60" y2="310" stroke="#888" strokeWidth="1" />
      <line x1="100" y1="300" x2="90" y2="310" stroke="#888" strokeWidth="1" />
      <line x1="130" y1="300" x2="120" y2="310" stroke="#888" strokeWidth="1" />
      <line x1="160" y1="300" x2="150" y2="310" stroke="#888" strokeWidth="1" />
      <line x1="190" y1="300" x2="180" y2="310" stroke="#888" strokeWidth="1" />
      <line x1="220" y1="300" x2="210" y2="310" stroke="#888" strokeWidth="1" />

      {/* Building columns & floors */}
      {floors.map((f, i) => {
        const colColor = f.soft ? '#FF5252' : '#4FC3F7'
        const fillOp = f.soft ? 0.15 : 0.08
        const offset = f.soft ? 12 : 2
        return (
          <g key={i}>
            {/* Floor slab */}
            <rect x={70 + offset} y={f.y} width={160 - offset * 2} height={4} rx="1" fill={colColor} fillOpacity="0.5" />
            {/* Left column */}
            <line x1={80} y1={f.y + 4} x2={80 + offset} y2={f.y + f.h} stroke={colColor} strokeWidth={f.soft ? 2 : 1.5} />
            {/* Right column */}
            <line x1={220} y1={f.y + 4} x2={220 - offset} y2={f.y + f.h} stroke={colColor} strokeWidth={f.soft ? 2 : 1.5} />
            {/* Floor fill */}
            <rect x={70 + offset} y={f.y} width={160 - offset * 2} height={f.h} fill={colColor} fillOpacity={fillOp} />
            {/* Floor label */}
            <text x={60} y={f.y + f.h / 2 + 3} textAnchor="end" fill="#aaa" fontSize="9" fontFamily="monospace">{f.label}</text>
            {/* Delta arrow */}
            <line x1={240} y1={f.y + f.h / 2} x2={240 + f.delta * 3} y2={f.y + f.h / 2}
              stroke={f.soft ? '#FF5252' : '#4FC3F7'} strokeWidth={f.soft ? 2 : 1}
              markerEnd={f.soft ? 'url(#arrB)' : 'url(#arrG)'} />
            <text x={248 + f.delta * 3} y={f.y + f.h / 2 + 3} fill={f.soft ? '#FF5252' : '#ccc'} fontSize="9" fontFamily="monospace" fontWeight={f.soft ? 700 : 400}>
              {f.soft ? `\u0394=${f.delta}` : `\u0394=${f.delta}`}
            </text>
          </g>
        )
      })}

      {/* Soft story label */}
      <text x="310" y="222" fill="#FF5252" fontSize="10" fontFamily="monospace" fontWeight="700">PISO</text>
      <text x="310" y="234" fill="#FF5252" fontSize="10" fontFamily="monospace" fontWeight="700">BLANDO</text>

      {/* Formula */}
      <text x="200" y="330" textAnchor="middle" fill="#ccc" fontSize="10" fontFamily="monospace">Ki = Vi / \u0394i</text>
      <text x="200" y="345" textAnchor="middle" fill="#aaa" fontSize="9" fontFamily="monospace">Si Ki &lt; 0.70*K(i+1) = IRREGULAR</text>
    </svg>
  )
}
