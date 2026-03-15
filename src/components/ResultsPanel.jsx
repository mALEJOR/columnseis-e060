export default function ResultsPanel({ surfaceData }) {
  const { P_max, P_min, cuantia_acero, area_acero, area_concreto, puntos } = surfaceData

  const fmt = (v) => {
    const abs = Math.abs(v)
    if (abs >= 1000000) return `${(v / 1000000).toFixed(2)} MN`
    if (abs >= 1000) return `${(v / 1000).toFixed(1)} ton`
    return `${Math.round(v)} kg`
  }

  const rhoOk = cuantia_acero >= 1.0 && cuantia_acero <= 6.0
  const rhoColor = rhoOk ? 'var(--success)' : 'var(--danger)'

  const maxMx = Math.max(...puntos.map(p => Math.abs(p.Mx)))
  const maxMy = Math.max(...puntos.map(p => Math.abs(p.My)))

  return (
    <div className="panel">
      <div className="panel-title">Resultados</div>
      <div className="results-grid">
        <div className="result-card">
          <div className="result-label">φP₀ (compresión)</div>
          <div className="result-value">
            {(P_max / 1000).toFixed(1)}
            <span className="result-unit">ton</span>
          </div>
        </div>
        <div className="result-card">
          <div className="result-label">φPt (tracción)</div>
          <div className="result-value" style={{ color: '#ff5f57' }}>
            {(P_min / 1000).toFixed(1)}
            <span className="result-unit">ton</span>
          </div>
        </div>
        <div className="result-card">
          <div className="result-label">φMx,máx</div>
          <div className="result-value" style={{ color: 'var(--accent3)' }}>
            {(maxMx / 100000).toFixed(2)}
            <span className="result-unit">ton·m</span>
          </div>
        </div>
        <div className="result-card">
          <div className="result-label">φMy,máx</div>
          <div className="result-value" style={{ color: 'var(--accent3)' }}>
            {(maxMy / 100000).toFixed(2)}
            <span className="result-unit">ton·m</span>
          </div>
        </div>
        <div className="result-card">
          <div className="result-label">As total</div>
          <div className="result-value">
            {area_acero.toFixed(2)}
            <span className="result-unit">cm²</span>
          </div>
        </div>
        <div className="result-card">
          <div className="result-label">Cuantía ρ</div>
          <div className="result-value" style={{ color: rhoColor }}>
            {cuantia_acero.toFixed(2)}
            <span className="result-unit">%</span>
          </div>
        </div>
      </div>

      {/* Cuantía E.060 check */}
      <div style={{
        marginTop: 10, padding: '8px 10px', borderRadius: 6,
        background: rhoOk ? 'rgba(0,229,200,0.07)' : 'rgba(255,95,87,0.07)',
        border: `1px solid ${rhoOk ? 'rgba(0,229,200,0.2)' : 'rgba(255,95,87,0.2)'}`,
        fontSize: 10, color: rhoOk ? 'var(--success)' : 'var(--danger)',
      }}>
        {rhoOk
          ? `✓ Cuantía dentro del rango E.060: 1% ≤ ρ=${cuantia_acero.toFixed(2)}% ≤ 6%`
          : `✗ Cuantía fuera del rango E.060: 1% ≤ ρ=${cuantia_acero.toFixed(2)}% ≤ 6%`}
      </div>

      <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>
        {puntos.length} puntos calculados · Ag={area_concreto.toFixed(0)} cm²
      </div>
    </div>
  )
}
