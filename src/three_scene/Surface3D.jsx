import { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid, Text } from '@react-three/drei'
import * as THREE from 'three'

// ── Color por altura P ────────────────────────────────────────────────────────
function pToColor(P, Pmin, Pmax) {
  const t = Math.max(0, Math.min(1, (P - Pmin) / (Pmax - Pmin)))
  // Gradiente: azul (tracción) → cyan → verde → amarillo → rojo (compresión)
  const colors = [
    [0.2, 0.4, 1.0],   // azul
    [0.0, 0.9, 0.8],   // cyan
    [0.0, 0.85, 0.3],  // verde
    [1.0, 0.7, 0.0],   // amarillo
    [1.0, 0.2, 0.1],   // rojo
  ]
  const idx = t * (colors.length - 1)
  const i = Math.floor(idx)
  const f = idx - i
  const c0 = colors[Math.min(i, colors.length - 1)]
  const c1 = colors[Math.min(i + 1, colors.length - 1)]
  return [
    c0[0] + f * (c1[0] - c0[0]),
    c0[1] + f * (c1[1] - c0[1]),
    c0[2] + f * (c1[2] - c0[2]),
  ]
}

// ── Nube de puntos de la superficie ──────────────────────────────────────────
function SurfacePoints({ puntos, Pmin, Pmax, scale, pointSize }) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const n = puntos.length
    const pos = new Float32Array(n * 3)
    const col = new Float32Array(n * 3)

    for (let i = 0; i < n; i++) {
      const p = puntos[i]
      pos[i * 3]     = (p.My / scale.M)
      pos[i * 3 + 1] = (p.P  / scale.P)
      pos[i * 3 + 2] = (p.Mx / scale.M)

      const [r, g2, b] = pToColor(p.P, Pmin, Pmax)
      col[i * 3]     = r
      col[i * 3 + 1] = g2
      col[i * 3 + 2] = b
    }

    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    return g
  }, [puntos, Pmin, Pmax, scale])

  return (
    <points geometry={geom}>
      <pointsMaterial
        size={pointSize}
        vertexColors
        transparent
        opacity={0.85}
        sizeAttenuation
      />
    </points>
  )
}

// ── Superficie mesh (convex hull aproximado por triangulación) ────────────────
function SurfaceMesh({ puntos, Pmin, Pmax, scale, opacity }) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const verts = []
    const colors = []

    puntos.forEach(p => {
      verts.push(p.My / scale.M, p.P / scale.P, p.Mx / scale.M)
      const [r, g2, b] = pToColor(p.P, Pmin, Pmax)
      colors.push(r, g2, b)
    })

    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3))
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3))
    g.computeVertexNormals()
    return g
  }, [puntos, Pmin, Pmax, scale])

  return (
    <points geometry={geom}>
      <pointsMaterial
        size={0.015}
        vertexColors
        transparent
        opacity={opacity}
        sizeAttenuation
      />
    </points>
  )
}

// ── Punto de demanda (Pu, Mux, Muy) ──────────────────────────────────────────
function DemandPointMesh({ demandPoint, scale }) {
  const ref = useRef()
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 1.5
  })

  if (!demandPoint) return null
  const { Pu, Mux, Muy } = demandPoint
  const x = Muy / scale.M
  const y = Pu  / scale.P
  const z = Mux / scale.M

  return (
    <group position={[x, y, z]}>
      <mesh ref={ref}>
        <octahedronGeometry args={[0.06]} />
        <meshStandardMaterial color="#ffb627" emissive="#ffb627" emissiveIntensity={0.5} />
      </mesh>
      {/* líneas al origen */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([-x, -y, -z, 0, 0, 0]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ffb627" transparent opacity={0.4} />
      </line>
    </group>
  )
}

// ── Ejes coordinados ──────────────────────────────────────────────────────────
function AxesLabels() {
  const axLen = 1.3

  const axisLine = (dir, color) => {
    const pts = new Float32Array([0, 0, 0, ...dir])
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pts, 3))
    return (
      <line geometry={g}>
        <lineBasicMaterial color={color} />
      </line>
    )
  }

  return (
    <group>
      {axisLine([axLen, 0, 0], '#4d8aff')}   {/* My → X */}
      {axisLine([0, axLen, 0], '#ff5f57')}    {/* P  → Y */}
      {axisLine([0, 0, axLen], '#00e5c8')}    {/* Mx → Z */}

      <Text position={[axLen + 0.15, 0, 0]} fontSize={0.09} color="#4d8aff" anchorX="left">My</Text>
      <Text position={[0, axLen + 0.15, 0]} fontSize={0.09} color="#ff5f57" anchorX="center">P</Text>
      <Text position={[0, 0, axLen + 0.15]} fontSize={0.09} color="#00e5c8" anchorX="left">Mx</Text>
    </group>
  )
}

// ── Escena 3D completa ────────────────────────────────────────────────────────
function Scene({ surfaceData, demandPoint, pointSize }) {
  const { puntos, P_max, P_min } = surfaceData

  const scale = useMemo(() => {
    const maxM = Math.max(
      ...puntos.map(p => Math.abs(p.Mx)),
      ...puntos.map(p => Math.abs(p.My)),
      1
    )
    const maxP = Math.max(Math.abs(P_max), Math.abs(P_min), 1)
    // Normalizar a rango ±1
    return { P: maxP, M: maxM }
  }, [puntos, P_max, P_min])

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={0.8} />
      <pointLight position={[-5, 5, -5]} intensity={0.4} color="#4d8aff" />

      <SurfacePoints
        puntos={puntos}
        Pmin={P_min}
        Pmax={P_max}
        scale={scale}
        pointSize={pointSize}
      />

      {demandPoint && (
        <DemandPointMesh demandPoint={demandPoint} scale={scale} />
      )}

      <AxesLabels />

      {/* Plano P=0 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[2.6, 2.6]} />
        <meshStandardMaterial color="#1d2130" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        dampingFactor={0.08}
        enableDamping
        minDistance={0.5}
        maxDistance={8}
      />
    </>
  )
}

// ── Panel de leyenda ──────────────────────────────────────────────────────────
function Legend({ Pmax, Pmin }) {
  const fmt = (v) => {
    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)} ton`
    return `${v.toFixed(0)} kg`
  }

  const stops = [
    { label: fmt(Pmax), color: '#ff3322' },
    { label: fmt(Pmax * 0.6), color: '#ffb627' },
    { label: fmt(Pmax * 0.2), color: '#00d878' },
    { label: '0', color: '#00e5c8' },
    { label: fmt(Pmin), color: '#4d8aff' },
  ]

  return (
    <div style={{
      position: 'absolute', bottom: 12, left: 12, zIndex: 10,
      background: 'rgba(15,17,23,0.85)', border: '1px solid rgba(99,140,255,0.2)',
      borderRadius: 8, padding: '10px 14px', backdropFilter: 'blur(4px)',
    }}>
      <div style={{ fontSize: 9, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
        Carga Axial P
      </div>
      {stops.map(s => (
        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }} />
          <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text1)' }}>{s.label}</span>
        </div>
      ))}
      <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(99,140,255,0.15)' }}>
        {demandPointLegend}
      </div>
    </div>
  )
}

const demandPointLegend = (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <div style={{ width: 10, height: 10, background: '#ffb627', transform: 'rotate(45deg)' }} />
    <span style={{ fontSize: 10, color: 'var(--text1)' }}>Punto de demanda</span>
  </div>
)

// ── Componente principal exportado ────────────────────────────────────────────
export default function Surface3D({ surfaceData, demandPoint }) {
  const [pointSize, setPointSize] = useState(0.025)
  const [bgColor] = useState('#0a0c10')

  const fmt = (v) => Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}T` : `${Math.round(v)}kg`

  return (
    <div className="surface-container">
      {/* Controles flotantes */}
      <div style={{
        position: 'absolute', top: 12, right: 12, zIndex: 10,
        background: 'rgba(15,17,23,0.9)', border: '1px solid rgba(99,140,255,0.2)',
        borderRadius: 8, padding: '12px 14px', minWidth: 180,
        backdropFilter: 'blur(4px)',
      }}>
        <div style={{ fontSize: 9, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
          Controles 3D
        </div>

        <div style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 4 }}>
          Tamaño puntos: <span style={{ color: 'var(--text1)', fontFamily: 'monospace' }}>{pointSize.toFixed(3)}</span>
        </div>
        <input
          type="range" min="0.005" max="0.08" step="0.005"
          value={pointSize}
          onChange={e => setPointSize(parseFloat(e.target.value))}
          style={{ width: '100%', marginBottom: 10 }}
        />

        <div style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 6 }}>
          Estadísticas:
        </div>
        <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text1)' }}>
          <div>Puntos: {surfaceData.puntos.length}</div>
          <div>P₀ = {fmt(surfaceData.P_max)}</div>
          <div>Pt = {fmt(surfaceData.P_min)}</div>
        </div>

        <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(99,140,255,0.1)', fontSize: 10, color: 'var(--text2)' }}>
          <div>🖱 Arrastrar: rotar</div>
          <div>🖱 Scroll: zoom</div>
          <div>🖱 Clic der.: desplazar</div>
        </div>
      </div>

      {/* Leyenda */}
      <Legend Pmax={surfaceData.P_max} Pmin={surfaceData.P_min} />

      {/* Canvas Three.js */}
      <Canvas
        camera={{ position: [1.8, 1.4, 1.8], fov: 45 }}
        style={{ background: bgColor, flex: 1 }}
        gl={{ antialias: true, alpha: false }}
      >
        <Scene
          surfaceData={surfaceData}
          demandPoint={demandPoint}
          pointSize={pointSize}
          showMesh={false}
        />
      </Canvas>

      {/* Título */}
      <div style={{
        position: 'absolute', top: 12, left: 12, zIndex: 10,
        fontSize: 11, color: 'rgba(99,140,255,0.8)',
        fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1,
        textTransform: 'uppercase',
      }}>
        Superficie de Interacción P-Mx-My
      </div>
    </div>
  )
}
