import { useState } from 'react'

export default function DiagramaReferencia({ svgFallback, imagenIA, titulo }) {
  const [abierto, setAbierto] = useState(false)
  const [verIA, setVerIA] = useState(false)
  const [iaError, setIaError] = useState(false)

  return (
    <div style={{ marginBottom: 8 }}>
      <button type="button" onClick={() => setAbierto(!abierto)}
        style={{ background: 'var(--surface3)', border: '1px solid var(--border)', color: '#4FC3F7', padding: '3px 8px', borderRadius: 3, fontSize: 10, cursor: 'pointer' }}>
        {abierto ? '▾' : '▸'} Diagrama de referencia
      </button>
      {abierto && (
        <div style={{ marginTop: 8, marginBottom: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 12, maxWidth: 420 }}>
          {verIA && imagenIA && !iaError ? (
            <img src={imagenIA} alt={titulo}
              style={{ maxWidth: '100%', borderRadius: 8 }}
              onError={() => { setIaError(true); setVerIA(false) }} />
          ) : (
            svgFallback
          )}
          {imagenIA && !iaError && (
            <button type="button" onClick={() => setVerIA(!verIA)}
              style={{ marginTop: 6, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', padding: '2px 6px', borderRadius: 3, fontSize: 9, cursor: 'pointer' }}>
              {verIA ? 'Ver SVG' : 'Ver imagen IA'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
