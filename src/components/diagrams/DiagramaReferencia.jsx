import { useState } from 'react'

export default function DiagramaReferencia({ svgFallback, imagenIA, titulo }) {
  const [abierto, setAbierto] = useState(false)
  const [usarSVG, setUsarSVG] = useState(false)

  return (
    <div style={{ marginBottom: 8 }}>
      <button type="button" onClick={() => setAbierto(!abierto)}
        style={{ background: 'var(--surface3)', border: '1px solid var(--border)', color: '#4FC3F7', padding: '3px 8px', borderRadius: 3, fontSize: 10, cursor: 'pointer' }}>
        {abierto ? '▾' : '▸'} Diagrama de referencia
      </button>
      {abierto && (
        <div style={{ marginTop: 8, marginBottom: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 12, maxWidth: 420 }}>
          {usarSVG || !imagenIA ? (
            svgFallback
          ) : (
            <img src={imagenIA} alt={titulo}
              style={{ maxWidth: '100%', borderRadius: 8 }}
              onError={() => setUsarSVG(true)} />
          )}
        </div>
      )}
    </div>
  )
}
