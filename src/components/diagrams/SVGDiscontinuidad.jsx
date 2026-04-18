export default function SVGDiscontinuidad() {
  return (
    <svg viewBox="0 0 400 380" width="100%" style={{ maxWidth: 400 }}>
      {/* Title */}
      <text x="200" y="18" textAnchor="middle" fill="#90caf9" fontSize="11" fontFamily="monospace" fontWeight="700">DISCONTINUIDAD DE SISTEMAS RESISTENTES</text>

      {/* Floor level lines */}
      <line x1="30" y1="100" x2="370" y2="100" stroke="#555" strokeWidth="1" strokeDasharray="6,4" />
      <line x1="30" y1="200" x2="370" y2="200" stroke="#555" strokeWidth="1" strokeDasharray="6,4" />
      <text x="25" y="97" textAnchor="end" fill="#aaa" fontSize="9" fontFamily="monospace">Nivel i+1</text>
      <text x="25" y="197" textAnchor="end" fill="#aaa" fontSize="9" fontFamily="monospace">Nivel i</text>

      {/* Lower wall (wider - D orig) */}
      <rect x="120" y="130" width="160" height="70" rx="2" fill="#1565C0" fillOpacity="0.4" stroke="#4FC3F7" strokeWidth="1.5" />
      {/* Center axis lower */}
      <line x1="200" y1="125" x2="200" y2="205" stroke="#4FC3F7" strokeWidth="0.8" strokeDasharray="4,3" />

      {/* Upper wall (narrower - D modif, offset) */}
      <rect x="145" y="50" width="110" height="50" rx="2" fill="#1565C0" fillOpacity="0.25" stroke="#90caf9" strokeWidth="1.5" />
      {/* Center axis upper */}
      <line x1="200" y1="45" x2="200" y2="105" stroke="#90caf9" strokeWidth="0.8" strokeDasharray="4,3" />

      {/* D orig dimension line */}
      <line x1="120" y1="215" x2="280" y2="215" stroke="#FF9800" strokeWidth="1.2" />
      <line x1="120" y1="210" x2="120" y2="220" stroke="#FF9800" strokeWidth="1.2" />
      <line x1="280" y1="210" x2="280" y2="220" stroke="#FF9800" strokeWidth="1.2" />
      <text x="200" y="228" textAnchor="middle" fill="#FF9800" fontSize="11" fontFamily="monospace" fontWeight="700">D orig</text>

      {/* D modif dimension line */}
      <line x1="145" y1="42" x2="255" y2="42" stroke="#FF9800" strokeWidth="1.2" />
      <line x1="145" y1="37" x2="145" y2="47" stroke="#FF9800" strokeWidth="1.2" />
      <line x1="255" y1="37" x2="255" y2="47" stroke="#FF9800" strokeWidth="1.2" />
      <text x="200" y="37" textAnchor="middle" fill="#FF9800" fontSize="11" fontFamily="monospace" fontWeight="700">D modif</text>

      {/* Shear force arrow V */}
      <defs>
        <marker id="arrowR" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6" fill="#FF5252" />
        </marker>
      </defs>
      <line x1="290" y1="165" x2="350" y2="165" stroke="#FF5252" strokeWidth="2" markerEnd="url(#arrowR)" />
      <text x="320" y="158" textAnchor="middle" fill="#FF5252" fontSize="10" fontFamily="monospace" fontWeight="700">V elem</text>

      {/* ── PLAN VIEW ── */}
      <text x="200" y="258" textAnchor="middle" fill="#90caf9" fontSize="10" fontFamily="monospace" fontWeight="600">VISTA EN PLANTA</text>
      <line x1="60" y1="262" x2="340" y2="262" stroke="#333" strokeWidth="0.5" />

      {/* Lower rect (D orig) in plan */}
      <rect x="100" y="275" width="200" height="30" rx="2" fill="#1565C0" fillOpacity="0.35" stroke="#4FC3F7" strokeWidth="1.2" />
      {/* Upper rect (D modif) in plan */}
      <rect x="125" y="315" width="150" height="25" rx="2" fill="#1565C0" fillOpacity="0.2" stroke="#90caf9" strokeWidth="1.2" />

      {/* Center axes plan */}
      <line x1="200" y1="270" x2="200" y2="310" stroke="#4FC3F7" strokeWidth="0.8" strokeDasharray="3,3" />
      <line x1="200" y1="312" x2="200" y2="345" stroke="#90caf9" strokeWidth="0.8" strokeDasharray="3,3" />

      {/* D orig dim plan */}
      <line x1="100" y1="355" x2="300" y2="355" stroke="#FF9800" strokeWidth="1" />
      <line x1="100" y1="350" x2="100" y2="360" stroke="#FF9800" strokeWidth="1" />
      <line x1="300" y1="350" x2="300" y2="360" stroke="#FF9800" strokeWidth="1" />
      <text x="200" y="368" textAnchor="middle" fill="#FF9800" fontSize="9" fontFamily="monospace">D orig</text>

      {/* D modif dim plan */}
      <line x1="125" y1="345" x2="275" y2="345" stroke="#FF9800" strokeWidth="1" />
      <line x1="125" y1="340" x2="125" y2="350" stroke="#FF9800" strokeWidth="1" />
      <line x1="275" y1="340" x2="275" y2="350" stroke="#FF9800" strokeWidth="1" />
      <text x="200" y="343" textAnchor="middle" fill="#FF9800" fontSize="8" fontFamily="monospace">D modif</text>

      {/* Formula */}
      <text x="200" y="378" textAnchor="middle" fill="#ccc" fontSize="10" fontFamily="monospace">e = |D orig - D modif| / 2</text>
    </svg>
  )
}
