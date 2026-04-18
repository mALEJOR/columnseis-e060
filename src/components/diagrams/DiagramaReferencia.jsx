import { useState, useEffect } from 'react'

function DiagramaModal({ abierto, onCerrar, titulo, children, formulas }) {
  useEffect(() => {
    if (!abierto) return
    const onKey = e => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [abierto, onCerrar])

  if (!abierto) return null

  return (
    <div onClick={onCerrar} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, animation: 'fadeIn 0.2s ease',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#1a1a2e', borderRadius: 12, padding: 24,
        maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto',
        border: '1px solid #333', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ color: '#4FC3F7', margin: 0, fontSize: 14, fontFamily: 'var(--cond)' }}>{titulo}</h3>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', padding: '0 4px' }}>✕</button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
          {children}
        </div>
        {formulas && (
          <div style={{ marginTop: 12, padding: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 8, color: '#ccc', fontSize: 11, fontFamily: 'monospace', lineHeight: 1.6 }}>
            {formulas}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DiagramaReferencia({ svgFallback, imagenIA, titulo, formulas }) {
  const [abierto, setAbierto] = useState(false)
  const [modal, setModal] = useState(false)
  const [verIA, setVerIA] = useState(false)
  const [iaError, setIaError] = useState(false)

  const contenido = verIA && imagenIA && !iaError
    ? <img src={imagenIA} alt={titulo} style={{ maxWidth: '100%', borderRadius: 8 }} onError={() => { setIaError(true); setVerIA(false) }} />
    : svgFallback

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button type="button" onClick={() => setAbierto(!abierto)}
          style={{ background: 'var(--surface3)', border: '1px solid var(--border)', color: '#4FC3F7', padding: '3px 8px', borderRadius: 3, fontSize: 10, cursor: 'pointer' }}>
          {abierto ? '▾' : '▸'} Diagrama de referencia
        </button>
        <button type="button" onClick={() => setModal(true)}
          style={{ background: 'var(--surface3)', border: '1px solid var(--border)', color: 'var(--text3)', padding: '3px 6px', borderRadius: 3, fontSize: 10, cursor: 'pointer' }}>
          Ampliar
        </button>
      </div>
      {abierto && (
        <div style={{ marginTop: 8, marginBottom: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 12, maxWidth: 420 }}>
          {contenido}
          {imagenIA && !iaError && (
            <button type="button" onClick={() => setVerIA(!verIA)}
              style={{ marginTop: 6, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', padding: '2px 6px', borderRadius: 3, fontSize: 9, cursor: 'pointer' }}>
              {verIA ? 'Ver SVG' : 'Ver imagen IA'}
            </button>
          )}
        </div>
      )}
      <DiagramaModal abierto={modal} onCerrar={() => setModal(false)} titulo={titulo} formulas={formulas}>
        {svgFallback}
      </DiagramaModal>
    </div>
  )
}

export { DiagramaModal }
