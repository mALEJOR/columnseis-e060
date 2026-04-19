import { useState, useMemo } from 'react'
import { VARILLAS_PERU, VARILLAS_ESTRIBOS, VARILLAS_LONGITUDINALES, labelVarilla } from '../utils/varillas'

function Resultado({ label, value, unit, ok, info }) {
  return (
    <div style={{
      background: 'var(--bg2)', border: `1px solid ${ok === undefined ? 'var(--border)' : ok ? 'rgba(0,229,200,0.25)' : 'rgba(255,95,87,0.25)'}`,
      borderRadius: 8, padding: '10px 14px',
    }}>
      <div style={{ fontSize: 9, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 600, color: ok === undefined ? 'var(--text0)' : ok ? 'var(--success)' : 'var(--danger)' }}>
          {value}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text2)' }}>{unit}</span>
        {ok !== undefined && <span style={{ fontSize: 11, marginLeft: 4 }}>{ok ? '✓' : '✗'}</span>}
      </div>
      {info && <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 4 }}>{info}</div>}
    </div>
  )
}

export default function StirrupPanel({ columnData }) {
  const { geometria: geo, material: mat, refuerzo } = columnData || {}

  const [dEstribo, setDEstribo] = useState(0.953)  // #3
  const [nRamas, setNRamas] = useState(2)
  const [dLong, setDLong] = useState(2.540)         // #8 por defecto
  const [ln, setLn] = useState(geo?.longitud || 300)

  const calc = useMemo(() => {
    if (!geo || !mat) return null

    const b   = geo.b
    const h   = geo.h
    const rec = geo.recubrimiento
    const fc  = mat.fc
    const fy  = mat.fy
    const Ag  = b * h

    // Dimensión menor
    const bMin = Math.min(b, h)
    const bMax = Math.max(b, h)

    // ── Zona de confinamiento lo (E.060 Sec. 21.4.4.4) ───────────────────
    const lo_h    = bMax            // mayor dimensión de la sección
    const lo_ln6  = ln / 6          // ln/6
    const lo_min  = 45              // mínimo 45 cm
    const lo = Math.max(lo_h, lo_ln6, lo_min)

    // ── Espaciamiento máximo en zona de confinamiento (E.060 21.4.4.2) ───
    const so_b4   = bMin / 4        // b/4
    const so_6db  = 6 * dLong       // 6 db longitudinal
    const so_100  = 10              // 100 mm = 10 cm (barras ≤ #6)
    const so_150  = 15              // 150 mm = 15 cm (barras > #6)
    const so_lim  = dLong <= 1.905 ? so_100 : so_150
    const so = Math.min(so_b4, so_6db, so_lim)

    // ── Espaciamiento fuera de zona de confinamiento (E.060 21.4.3.2) ────
    const s_fuera = Math.min(bMin / 2, 30)  // máx d/2 o 30 cm

    // ── Área de acero transversal mínima Ash (E.060 21.4.4.1) ────────────
    // bc = dimensión del núcleo (c a c de estribo)
    const bc_b = b - 2 * rec  // núcleo en dirección b
    const bc_h = h - 2 * rec  // núcleo en dirección h

    // As refuerzo longitudinal total
    const As = refuerzo?.barras.reduce((s, bar) => s + (bar.area || Math.PI * bar.diametro ** 2 / 4), 0) || 0

    // Ash_min = max(0.3·s·bc·(Ag/Ach - 1)·f'c/fy, 0.09·s·bc·f'c/fy)
    const Ach_b = bc_b * bc_h  // área del núcleo
    const Ash_b_opcion1 = 0.3 * so * bc_b * (Ag / Ach_b - 1) * (fc / fy)
    const Ash_b_opcion2 = 0.09 * so * bc_b * (fc / fy)
    const Ash_b = Math.max(Ash_b_opcion1, Ash_b_opcion2)

    const Ash_h_opcion1 = 0.3 * so * bc_h * (Ag / Ach_b - 1) * (fc / fy)
    const Ash_h_opcion2 = 0.09 * so * bc_h * (fc / fy)
    const Ash_h = Math.max(Ash_h_opcion1, Ash_h_opcion2)

    // Área de estribo seleccionado por rama
    const area_estribo = Math.PI * dEstribo ** 2 / 4

    // Ash provista por nRamas estribos
    const Ash_prov_b = nRamas * area_estribo
    const Ash_prov_h = nRamas * area_estribo

    const ok_Ash_b = Ash_prov_b >= Ash_b
    const ok_Ash_h = Ash_prov_h >= Ash_h

    // ── Cuantía volumétrica mínima (para secciones rectangulares) ────────
    const rho_s_min = 0.12 * fc / fy
    // rho_s real = (2·nRamas·area_estribo·(bc_b + bc_h)) / (bc_b·bc_h·so)
    const rho_s = (2 * nRamas * area_estribo * (bc_b + bc_h)) / (bc_b * bc_h * so)

    // ── Diámetro mínimo de estribo (E.060 21.4.4.1) ──────────────────────
    const d_estribo_min = dLong > 3.581 ? 1.270 : 0.953  // #4 si long > #11, #3 si no
    const ok_diam = dEstribo >= d_estribo_min

    return {
      lo: lo.toFixed(1),
      so: so.toFixed(1),
      s_fuera: s_fuera.toFixed(1),
      Ash_b: Ash_b.toFixed(3),
      Ash_h: Ash_h.toFixed(3),
      Ash_prov_b: Ash_prov_b.toFixed(3),
      Ash_prov_h: Ash_prov_h.toFixed(3),
      ok_Ash_b, ok_Ash_h,
      rho_s_min: (rho_s_min * 100).toFixed(3),
      rho_s: (rho_s * 100).toFixed(3),
      ok_rho: rho_s >= rho_s_min,
      ok_diam,
      d_estribo_min_nombre: d_estribo_min <= 0.953 ? '#3' : '#4',
      bc_b: bc_b.toFixed(1),
      bc_h: bc_h.toFixed(1),
      so_b4: so_b4.toFixed(1),
      so_6db: so_6db.toFixed(1),
      so_lim: so_lim.toFixed(1),
      lo_h: lo_h.toFixed(1),
      lo_ln6: lo_ln6.toFixed(1),
    }
  }, [geo, mat, refuerzo, dEstribo, nRamas, dLong, ln])

  if (!columnData) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>
      Calcule primero la superficie de interacción.
    </div>
  )

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
      <div style={{ maxWidth: 760 }}>

        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--display)', fontSize: 16, color: 'var(--text0)', marginBottom: 6 }}>
            Diseño de Estribos y Confinamiento Sísmico
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
            Diseño de refuerzo transversal según <strong style={{ color: 'var(--text1)' }}>E.060 Capítulo 21</strong> — Zonas sísmicas.
            Incluye zona de confinamiento, espaciamiento y cuantía mínima.
          </p>
        </div>

        {/* Datos de estribo */}
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, fontFamily: 'var(--display)', fontWeight: 600 }}>
            ▸ Parámetros del estribo
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            <div className="form-row">
              <label>Diámetro estribo</label>
              <select value={dEstribo} onChange={e => setDEstribo(parseFloat(e.target.value))}>
                {VARILLAS_ESTRIBOS.map(v => <option key={v.numero} value={v.d}>{v.label}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>N° ramas</label>
              <select value={nRamas} onChange={e => setNRamas(parseInt(e.target.value))}>
                {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} ramas</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>ø barra longit. (cm)</label>
              <select value={dLong} onChange={e => setDLong(parseFloat(e.target.value))}>
                {VARILLAS_LONGITUDINALES.map(v => (
                  <option key={v.numero} value={v.d}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>Luz libre ln (cm)</label>
              <input type="number" value={ln} onChange={e => setLn(parseFloat(e.target.value))} min="100" step="10" />
            </div>
          </div>
        </div>

        {calc && (
          <>
            {/* Sección de info contextual */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: 'var(--text1)' }}>
                <div style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 6, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Sección</div>
                <div>b × h = {geo.b} × {geo.h} cm</div>
                <div>Núcleo bc_b = {calc.bc_b} cm | bc_h = {calc.bc_h} cm</div>
                <div>f'c = {mat.fc} kg/cm² | fy = {mat.fy} kg/cm²</div>
              </div>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: 'var(--text1)' }}>
                <div style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 6, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Criterio espaciamiento so</div>
                <div>b/4 = {calc.so_b4} cm</div>
                <div>6·db = {calc.so_6db} cm</div>
                <div>Límite normativo = {calc.so_lim} cm</div>
              </div>
            </div>

            {/* Resultados principales */}
            <div style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, fontFamily: 'var(--display)', fontWeight: 600 }}>
              Resultados E.060 Cap. 21
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
              <Resultado label="Longitud de confinamiento lo" value={calc.lo} unit="cm"
                info={`máx(h=${calc.lo_h}, ln/6=${calc.lo_ln6}, 45) cm`} />
              <Resultado label="Espaciamiento en zona lo" value={calc.so} unit="cm"
                info="mín(b/4, 6db, 100/150mm)" />
              <Resultado label="Espaciamiento fuera de lo" value={calc.s_fuera} unit="cm"
                info="mín(bmin/2, 30cm)" />
            </div>

            {/* Ash requerido vs provisto */}
            <div style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, fontFamily: 'var(--display)', fontWeight: 600 }}>
              Área transversal Ash — E.060 Ec. 21-3 y 21-4
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
              <Resultado label="Ash requerida (dir. b)" value={calc.Ash_b} unit="cm²" />
              <Resultado label="Ash provista (dir. b)" value={calc.Ash_prov_b} unit="cm²" ok={calc.ok_Ash_b}
                info={`${nRamas} ramas × ${(Math.PI * dEstribo**2/4).toFixed(3)} cm²`} />
              <Resultado label="Ash requerida (dir. h)" value={calc.Ash_h} unit="cm²" />
              <Resultado label="Ash provista (dir. h)" value={calc.Ash_prov_h} unit="cm²" ok={calc.ok_Ash_h}
                info={`${nRamas} ramas × ${(Math.PI * dEstribo**2/4).toFixed(3)} cm²`} />
            </div>

            {/* Cuantía volumétrica */}
            <div style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, fontFamily: 'var(--display)', fontWeight: 600 }}>
              Cuantía volumétrica ρs
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
              <Resultado label="ρs mínima (0.12f'c/fy)" value={calc.rho_s_min} unit="%" />
              <Resultado label="ρs provista" value={calc.rho_s} unit="%" ok={calc.ok_rho} />
              <Resultado label="Diámetro mínimo estribo" value={calc.d_estribo_min_nombre} unit=""
                ok={calc.ok_diam} info={`Requerido ≥ ${calc.d_estribo_min_nombre}`} />
            </div>

            {/* Esquema de confinamiento */}
            <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', marginBottom: 18 }}>
              <div style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, fontFamily: 'var(--display)', fontWeight: 600 }}>
                Esquema de distribución de estribos
              </div>
              <svg viewBox="0 0 600 120" width="100%" style={{ display: 'block' }}>
                {/* Columna */}
                <rect x="10" y="30" width="580" height="60" fill="none" stroke="rgba(99,140,255,0.3)" strokeWidth="1" />

                {/* Zona confinamiento izquierda */}
                <rect x="10" y="30" width="120" height="60" fill="rgba(77,138,255,0.08)" stroke="var(--accent)" strokeWidth="1" strokeDasharray="4,2" />
                <text x="70" y="24" textAnchor="middle" fill="#4d8aff" fontSize="9" fontFamily="JetBrains Mono">lo = {calc.lo}cm</text>
                <text x="70" y="105" textAnchor="middle" fill="#4d8aff" fontSize="8" fontFamily="JetBrains Mono">so = {calc.so}cm</text>

                {/* Zona media */}
                <text x="300" y="105" textAnchor="middle" fill="rgba(110,122,150,0.7)" fontSize="8" fontFamily="JetBrains Mono">s = {calc.s_fuera}cm</text>

                {/* Zona confinamiento derecha */}
                <rect x="470" y="30" width="120" height="60" fill="rgba(77,138,255,0.08)" stroke="var(--accent)" strokeWidth="1" strokeDasharray="4,2" />
                <text x="530" y="24" textAnchor="middle" fill="#4d8aff" fontSize="9" fontFamily="JetBrains Mono">lo = {calc.lo}cm</text>
                <text x="530" y="105" textAnchor="middle" fill="#4d8aff" fontSize="8" fontFamily="JetBrains Mono">so = {calc.so}cm</text>

                {/* Estribos zona confinamiento izq */}
                {[20,32,44,56,68,80,92,104,116].map(x => (
                  <line key={x} x1={x} y1="32" x2={x} y2="88" stroke="rgba(0,229,200,0.6)" strokeWidth="1.5" />
                ))}
                {/* Estribos zona media */}
                {[145,175,205,235,265,295,325,355,385,415,445].map(x => (
                  <line key={x} x1={x} y1="32" x2={x} y2="88" stroke="rgba(110,122,150,0.35)" strokeWidth="1" />
                ))}
                {/* Estribos zona conf der */}
                {[476,488,500,512,524,536,548,560,572,584].map(x => x <= 590 && (
                  <line key={x} x1={x} y1="32" x2={x} y2="88" stroke="rgba(0,229,200,0.6)" strokeWidth="1.5" />
                ))}

                {/* Etiqueta nudo */}
                <rect x="0" y="28" width="12" height="64" fill="rgba(255,182,39,0.3)" />
                <rect x="588" y="28" width="12" height="64" fill="rgba(255,182,39,0.3)" />
              </svg>
            </div>

            {/* Resumen final */}
            {(calc.ok_Ash_b && calc.ok_Ash_h && calc.ok_rho && calc.ok_diam) ? (
              <div style={{ background: 'rgba(0,229,200,0.07)', border: '1px solid rgba(0,229,200,0.25)', borderRadius: 10, padding: '12px 16px', fontSize: 12, color: 'var(--text1)' }}>
                <span style={{ color: 'var(--success)', fontWeight: 700, fontFamily: 'var(--display)' }}>✓ Diseño de estribos CONFORME — </span>
                Estribo {labelVarilla(dEstribo)} @ {calc.so} cm en zona de confinamiento ({calc.lo} cm desde nudo) y @ {calc.s_fuera} cm en zona central.
              </div>
            ) : (
              <div style={{ background: 'rgba(255,95,87,0.07)', border: '1px solid rgba(255,95,87,0.25)', borderRadius: 10, padding: '12px 16px', fontSize: 12 }}>
                <div style={{ color: 'var(--danger)', fontWeight: 700, fontFamily: 'var(--display)', marginBottom: 6 }}>✗ Revisar diseño de estribos</div>
                {!calc.ok_Ash_b && <div style={{ color: 'var(--text1)' }}>• Ash insuficiente en dirección b → aumentar ramas o diámetro de estribo</div>}
                {!calc.ok_Ash_h && <div style={{ color: 'var(--text1)' }}>• Ash insuficiente en dirección h → aumentar ramas o diámetro de estribo</div>}
                {!calc.ok_rho  && <div style={{ color: 'var(--text1)' }}>• Cuantía volumétrica ρs insuficiente</div>}
                {!calc.ok_diam && <div style={{ color: 'var(--text1)' }}>• Diámetro de estribo menor al mínimo requerido ({calc.d_estribo_min_nombre})</div>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
