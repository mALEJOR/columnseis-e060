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
      zIndex: 9999,
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
        <div style={{ display: 'flex', justifyContent: 'center', padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 8, flexWrap: 'wrap', gap: 16 }}>
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

export default function DiagramaReferencia({ svgFallback, titulo, formulas, extraImage }) {
  const [modal, setModal] = useState(false)

  return (
    <div style={{ marginBottom: 8 }}>
      <button type="button" onClick={() => setModal(true)}
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#4FC3F7', padding: '5px 12px', borderRadius: 6, fontSize: 10, cursor: 'pointer' }}>
        Diagrama de referencia
      </button>
      <DiagramaModal abierto={modal} onCerrar={() => setModal(false)} titulo={titulo} formulas={formulas}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#888', marginBottom: 4 }}>Diagrama esquematico</div>
          {svgFallback}
        </div>
        {extraImage && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#888', marginBottom: 4 }}>Referencia normativa</div>
            <img src={extraImage} alt="Referencia normativa" style={{ maxWidth: 340, maxHeight: '70vh', borderRadius: 8 }} />
          </div>
        )}
      </DiagramaModal>
    </div>
  )
}

export { DiagramaModal }
