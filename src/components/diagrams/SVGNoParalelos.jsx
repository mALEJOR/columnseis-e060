export default function SVGNoParalelos() {
  return (
    <svg viewBox="0 0 400 350" width="100%" style={{ maxWidth: 400 }}>
      <text x="200" y="18" textAnchor="middle" fill="#90caf9" fontSize="11" fontFamily="monospace" fontWeight="700">SISTEMAS NO PARALELOS</text>
      <text x="200" y="32" textAnchor="middle" fill="#777" fontSize="9" fontFamily="monospace">Vista en planta</text>

      <defs>
        <marker id="axArr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6" fill="#888" />
        </marker>
        <marker id="fArr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6" fill="#FF5252" />
        </marker>
      </defs>

      {/* Axes */}
      <line x1="60" y1="300" x2="60" y2="50" stroke="#888" strokeWidth="1.2" markerEnd="url(#axArr)" />
      <text x="50" y="48" fill="#ccc" fontSize="11" fontFamily="monospace" fontWeight="700">Y</text>
      <line x1="60" y1="300" x2="360" y2="300" stroke="#888" strokeWidth="1.2" markerEnd="url(#axArr)" />
      <text x="362" y="304" fill="#ccc" fontSize="11" fontFamily="monospace" fontWeight="700">X</text>

      {/* Parallel walls (aligned with X) */}
      <rect x="100" y="260" width="80" height="14" rx="2" fill="#4FC3F7" fillOpacity="0.3" stroke="#4FC3F7" strokeWidth="1.2" />
      <text x="140" y="255" textAnchor="middle" fill="#4FC3F7" fontSize="8" fontFamily="monospace">Muro 1 (// X)</text>

      <rect x="220" y="260" width="80" height="14" rx="2" fill="#4FC3F7" fillOpacity="0.3" stroke="#4FC3F7" strokeWidth="1.2" />
      <text x="260" y="255" textAnchor="middle" fill="#4FC3F7" fontSize="8" fontFamily="monospace">Muro 2 (// X)</text>

      {/* Parallel walls (aligned with Y) */}
      <rect x="90" y="120" width="14" height="80" rx="2" fill="#2e7d32" fillOpacity="0.3" stroke="#66bb6a" strokeWidth="1.2" />
      <text x="75" y="160" textAnchor="end" fill="#66bb6a" fontSize="8" fontFamily="monospace">M3</text>
      <text x="75" y="172" textAnchor="end" fill="#66bb6a" fontSize="8" fontFamily="monospace">(// Y)</text>

      <rect x="300" y="100" width="14" height="80" rx="2" fill="#2e7d32" fillOpacity="0.3" stroke="#66bb6a" strokeWidth="1.2" />
      <text x="330" y="140" fill="#66bb6a" fontSize="8" fontFamily="monospace">M4 (// Y)</text>

      {/* Non-parallel wall (inclined) */}
      <g transform="translate(180, 150) rotate(-35)">
        <rect x="0" y="-7" width="100" height="14" rx="2" fill="#FF5252" fillOpacity="0.25" stroke="#FF5252" strokeWidth="2" />
      </g>
      <text x="250" y="118" fill="#FF5252" fontSize="9" fontFamily="monospace" fontWeight="700">Muro NP</text>

      {/* Angle arc */}
      <path d="M 230 190 A 40 40 0 0 1 260 166" fill="none" stroke="#FF9800" strokeWidth="1.5" />
      <text x="262" y="183" fill="#FF9800" fontSize="10" fontFamily="monospace" fontWeight="700">{'\u03B8'}</text>

      {/* Force decomposition */}
      {/* V arrow along wall */}
      <line x1="210" y1="158" x2="255" y2="128" stroke="#FF5252" strokeWidth="1.8" markerEnd="url(#fArr)" />
      <text x="245" y="122" fill="#FF5252" fontSize="9" fontFamily="monospace" fontWeight="700">V</text>

      {/* Vx projection */}
      <line x1="210" y1="185" x2="260" y2="185" stroke="#FF9800" strokeWidth="1" strokeDasharray="4,3" />
      <text x="270" y="188" fill="#FF9800" fontSize="8" fontFamily="monospace">Vx=V*cos{'\u03B8'}</text>

      {/* Vy projection */}
      <line x1="210" y1="185" x2="210" y2="145" stroke="#FF9800" strokeWidth="1" strokeDasharray="4,3" />
      <text x="165" y="168" fill="#FF9800" fontSize="8" fontFamily="monospace">Vy=V*sin{'\u03B8'}</text>

      {/* Formula */}
      <text x="200" y="330" textAnchor="middle" fill="#ccc" fontSize="10" fontFamily="monospace">Si 15 &lt; {'\u03B8'} &lt; 75 = NO PARALELO</text>
      <text x="200" y="345" textAnchor="middle" fill="#aaa" fontSize="9" fontFamily="monospace">Ip = 0.90</text>
    </svg>
  )
}
