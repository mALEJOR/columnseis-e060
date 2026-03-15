import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text, Line } from '@react-three/drei'
import * as THREE from 'three'

// ── Gradiente de color por carga axial ────────────────────────────────────
function pColor(P, Pmin, Pmax) {
  const t = Math.max(0, Math.min(1, (P - Pmin) / (Math.abs(Pmax - Pmin) + 1)))
  const stops = [
    [0.30, 0.50, 1.00],  // azul — tracción
    [0.00, 0.80, 0.90],  // cyan
    [0.10, 0.85, 0.30],  // verde
    [1.00, 0.72, 0.00],  // amarillo
    [1.00, 0.18, 0.08],  // rojo — compresión
  ]
  const idx = t * (stops.length - 1)
  const i = Math.min(Math.floor(idx), stops.length - 2)
  const f = idx - i
  return stops[i].map((v, k) => v + f * (stops[i + 1][k] - v))
}

// ── Nube de puntos ────────────────────────────────────────────────────────
function PointCloud({ puntos, Pmin, Pmax, scale, ptSize }) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(puntos.length * 3)
    const col = new Float32Array(puntos.length * 3)
    puntos.forEach((p, i) => {
      pos[i*3]   = p.My / scale.M
      pos[i*3+1] = p.P  / scale.P
      pos[i*3+2] = p.Mx / scale.M
      const [r, g2, b] = pColor(p.P, Pmin, Pmax)
      col[i*3]=r; col[i*3+1]=g2; col[i*3+2]=b
    })
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color',    new THREE.BufferAttribute(col, 3))
    return g
  }, [puntos, Pmin, Pmax, scale])

  return (
    <points geometry={geom}>
      <pointsMaterial
        size={ptSize} vertexColors transparent opacity={0.92}
        sizeAttenuation depthWrite={false}
      />
    </points>
  )
}

// ── Punto de demanda ──────────────────────────────────────────────────────
function DemandSphere({ dp, scale }) {
  const ref = useRef()
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 1.8 })
  if (!dp) return null
  const x = dp.Muy / scale.M
  const y = dp.Pu  / scale.P
  const z = dp.Mux / scale.M
  return (
    <group position={[x, y, z]}>
      <mesh ref={ref}>
        <octahedronGeometry args={[0.08]} />
        <meshStandardMaterial color="#f4a015" emissive="#f4a015" emissiveIntensity={0.7} />
      </mesh>
      {/* Líneas verticales y horizontales hacia el origen */}
      {[[x,y,z],[0,y,0]].map((p,i)=> null)}
    </group>
  )
}

// ── Ejes coordinados ──────────────────────────────────────────────────────
function Axes({ scale }) {
  const L = 1.25
  const axes = [
    { dir: [1,0,0], color: '#5588ff', label: 'My' },
    { dir: [0,1,0], color: '#ff5555', label: 'P'  },
    { dir: [0,0,1], color: '#00ddb8', label: 'Mx' },
  ]
  return (
    <group>
      {axes.map(({ dir, color, label }) => {
        const [x, y, z] = dir
        const pts = new Float32Array([-x*L, -y*L, -z*L, x*L, y*L, z*L])
        const g = new THREE.BufferGeometry()
        g.setAttribute('position', new THREE.BufferAttribute(pts, 3))
        return (
          <group key={label}>
            <line geometry={g}>
              <lineBasicMaterial color={color} transparent opacity={0.55} />
            </line>
            <Text
              position={[x*(L+0.2), y*(L+0.2), z*(L+0.2)]}
              fontSize={0.11} color={color} anchorX="center" anchorY="middle"
            >
              {label}
            </Text>
          </group>
        )
      })}
      {/* Plano P=0 */}
      <mesh rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[2.5, 2.5]} />
        <meshBasicMaterial color="#1e2235" transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
      {/* Grid lines en plano P=0 */}
      {[-1, -0.5, 0, 0.5, 1].map(v => (
        <group key={v}>
          <line>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[new Float32Array([-1.25,0,v, 1.25,0,v]),3]}/>
            </bufferGeometry>
            <lineBasicMaterial color="#2a2e45" transparent opacity={0.6}/>
          </line>
          <line>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[new Float32Array([v,0,-1.25, v,0,1.25]),3]}/>
            </bufferGeometry>
            <lineBasicMaterial color="#2a2e45" transparent opacity={0.6}/>
          </line>
        </group>
      ))}
    </group>
  )
}

// ── Escena principal ──────────────────────────────────────────────────────
function Scene({ surfaceData, demandPoint, ptSize }) {
  const { puntos, P_max, P_min } = surfaceData

  const scale = useMemo(() => {
    const maxM = Math.max(
      ...puntos.map(p => Math.abs(p.Mx)),
      ...puntos.map(p => Math.abs(p.My)),
      1
    )
    const maxP = Math.max(Math.abs(P_max), Math.abs(P_min), 1)
    return { P: maxP, M: maxM }
  }, [puntos, P_max, P_min])

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 4]} intensity={0.9} />
      <pointLight position={[-4, 4, -4]} intensity={0.5} color="#4466ff" />

      <PointCloud
        puntos={puntos}
        Pmin={P_min} Pmax={P_max}
        scale={scale}
        ptSize={ptSize}
      />

      <DemandSphere dp={demandPoint} scale={scale} />
      <Axes scale={scale} />

      <OrbitControls
        enableDamping dampingFactor={0.07}
        minDistance={0.3} maxDistance={10}
      />
    </>
  )
}

// ── Leyenda de colores ────────────────────────────────────────────────────
function Legend({ Pmax, Pmin }) {
  const f = v => {
    const abs = Math.abs(v)
    return abs >= 1000 ? `${(v/1000).toFixed(1)} t` : `${Math.round(v)} kg`
  }
  const items = [
    { c: '#ff2d10', l: f(Pmax),      label: 'Comp. máx.' },
    { c: '#ffb320', l: f(Pmax * .6), label: '' },
    { c: '#18d940', l: f(Pmax * .2), label: '' },
    { c: '#00ddb8', l: '0',          label: 'P = 0' },
    { c: '#4d88ff', l: f(Pmin),      label: 'Trac. máx.' },
  ]
  return (
    <div style={{
      position: 'absolute', bottom: 14, left: 14, zIndex: 10,
      background: 'rgba(8,10,18,.9)', border: '1px solid rgba(255,255,255,.1)',
      borderRadius: 6, padding: '10px 14px', backdropFilter: 'blur(6px)',
      minWidth: 130,
    }}>
      <div style={{ fontSize: 8, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
        Carga axial P
      </div>
      {items.map(({ c, l, label }) => (
        <div key={l+label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: c, flexShrink: 0 }} />
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: 'rgba(255,255,255,.75)', flex: 1 }}>{l}</span>
          {label && <span style={{ fontSize: 8, color: 'rgba(255,255,255,.3)' }}>{label}</span>}
        </div>
      ))}
      <div style={{ marginTop: 8, paddingTop: 7, borderTop: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 10, height: 10, background: '#f4a015', transform: 'rotate(45deg)', flexShrink: 0 }} />
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,.45)' }}>Punto de demanda</span>
      </div>
    </div>
  )
}

// ── Stats overlay ─────────────────────────────────────────────────────────
function Stats({ surfaceData }) {
  const f = v => Math.abs(v) >= 1000 ? `${(v/1000).toFixed(1)}t` : `${Math.round(v)}kg`
  return (
    <div style={{
      position: 'absolute', top: 10, right: 10, zIndex: 10,
      background: 'rgba(8,10,18,.85)', border: '1px solid rgba(255,255,255,.08)',
      borderRadius: 5, padding: '7px 11px', backdropFilter: 'blur(4px)',
    }}>
      {[
        { l: 'Pts',  v: surfaceData.puntos.length,          c: 'rgba(255,255,255,.7)' },
        { l: 'φP₀',  v: f(surfaceData.P_max),               c: '#ff6060' },
        { l: 'φPt',  v: f(surfaceData.P_min),               c: '#5588ff' },
        { l: 'ρ',    v: `${surfaceData.cuantia_acero.toFixed(2)}%`, c: surfaceData.cuantia_acero >= 1 && surfaceData.cuantia_acero <= 6 ? '#00ddb8' : '#ff5555' },
      ].map(({ l, v, c }) => (
        <div key={l} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 3 }}>
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,.3)', fontFamily: 'monospace', width: 24 }}>{l}</span>
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, fontWeight: 500, color: c }}>{v}</span>
        </div>
      ))}
    </div>
  )
}

// ── Componente principal exportado ────────────────────────────────────────
export default function ThreeSurfaceViewer({ surfaceData, demandPoint, loading, progress }) {
  const [ptSize,    setPtSize]    = useState(0.03)
  const [showPts,   setShowPts]   = useState(true)
  const [showMesh,  setShowMesh]  = useState(false)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Barra de controles ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 12px', background: 'rgba(255,255,255,.04)',
        borderBottom: '1px solid rgba(255,255,255,.06)', flexShrink: 0, flexWrap: 'wrap',
      }}>
        <span style={{ fontFamily: "'IBM Plex Sans Condensed',sans-serif", fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,.4)', marginRight: 6 }}>
          Superficie P-Mx-My
        </span>
        <div style={{ display: 'flex', gap: 5, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {[
            { label: '⬡ Puntos', active: showPts, toggle: () => setShowPts(s => !s) },
          ].map(({ label, active, toggle }) => (
            <button key={label} onClick={toggle} style={{
              padding: '3px 10px', borderRadius: 3, fontSize: 9, fontFamily: 'monospace',
              cursor: 'pointer', transition: 'all .15s',
              background: active ? 'rgba(77,138,255,.2)' : 'rgba(255,255,255,.06)',
              border: `1px solid ${active ? '#4d8aff' : 'rgba(255,255,255,.1)'}`,
              color: active ? '#7eb4ff' : 'rgba(255,255,255,.4)',
            }}>{label}</button>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 3 }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>Tamaño</span>
            <input type="range" min="0.008" max="0.09" step="0.004" value={ptSize}
              onChange={e => setPtSize(parseFloat(e.target.value))}
              style={{ width: 70, cursor: 'pointer', height: 2, accentColor: '#4d8aff' }} />
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,.5)', fontFamily: 'monospace', minWidth: 30 }}>{ptSize.toFixed(3)}</span>
          </div>
        </div>
      </div>

      {/* ── Área de canvas ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* Estado vacío */}
        {!surfaceData && !loading && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 14,
            color: 'rgba(255,255,255,.15)',
          }}>
            <div style={{ fontSize: 60, lineHeight: 1 }}>⬡</div>
            <div style={{ fontFamily: "'IBM Plex Sans Condensed',sans-serif", fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
              Superficie de Interacción
            </div>
            <div style={{ fontSize: 11, textAlign: 'center', lineHeight: 1.7, maxWidth: 260 }}>
              Ingrese los datos en el panel izquierdo<br/>y presione <strong style={{ color: 'rgba(255,255,255,.3)' }}>CALCULAR INTERACCIÓN</strong>
            </div>
          </div>
        )}

        {/* Cargando */}
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, background: '#12141a',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 14,
          }}>
            <div style={{ width: 36, height: 36, border: '2px solid rgba(255,255,255,.1)', borderTopColor: '#4d8aff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
            <div style={{ fontFamily: "'IBM Plex Sans Condensed',sans-serif", fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,.4)' }}>
              Calculando superficie…
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.25)', fontFamily: 'monospace' }}>
              {progress}% — ángulos del eje neutro
            </div>
            <div style={{ width: 180, height: 2, background: 'rgba(255,255,255,.1)', borderRadius: 1, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#4d8aff', borderRadius: 1, width: `${progress}%`, transition: 'width .3s' }} />
            </div>
          </div>
        )}

        {/* Canvas Three.js */}
        {surfaceData && !loading && (
          <Canvas
            camera={{ position: [2.0, 1.5, 2.0], fov: 42 }}
            style={{ position: 'absolute', inset: 0, background: '#12141a' }}
            gl={{ antialias: true }}
          >
            <Scene
              surfaceData={surfaceData}
              demandPoint={demandPoint}
              ptSize={ptSize}
            />
          </Canvas>
        )}

        {/* Overlays */}
        {surfaceData && !loading && (
          <>
            <Legend Pmax={surfaceData.P_max} Pmin={surfaceData.P_min} />
            <Stats surfaceData={surfaceData} />
            <div style={{
              position: 'absolute', bottom: 14, right: 14, zIndex: 10,
              fontSize: 9, color: 'rgba(255,255,255,.2)',
              fontFamily: 'monospace', textAlign: 'right', lineHeight: 2,
            }}>
              <div>⟳ Arrastrar — rotar</div>
              <div>⊕ Scroll — zoom</div>
              <div>⊞ Botón der. — desplazar</div>
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
