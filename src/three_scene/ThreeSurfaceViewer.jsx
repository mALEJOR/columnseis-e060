import { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'

// ── Gradiente púrpura/violeta ─────────────────────────────────────────
function pColor(P, Pmin, Pmax) {
  const t = Math.max(0, Math.min(1, (P - Pmin) / (Math.abs(Pmax - Pmin) + 1)))
  const stops = [
    [0.25, 0.35, 0.85],  // azul-violeta — tracción
    [0.40, 0.28, 0.75],  // índigo
    [0.61, 0.35, 0.71],  // púrpura (#9b59b6)
    [0.78, 0.42, 0.68],  // rosa-púrpura
    [0.90, 0.35, 0.55],  // rosa — compresión
  ]
  const idx = t * (stops.length - 1)
  const i = Math.min(Math.floor(idx), stops.length - 2)
  const f = idx - i
  return stops[i].map((v, k) => v + f * (stops[i + 1][k] - v))
}

// ── Nube de puntos ────────────────────────────────────────────────────
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
        size={ptSize / 100} vertexColors transparent opacity={0.95}
        sizeAttenuation={false} depthWrite={false}
        toneMapped={false}
      />
    </points>
  )
}

// ── Superficie con malla (wireframe) ──────────────────────────────────
function SurfaceMesh({ puntos, Pmin, Pmax, scale }) {
  const { geometry, wireGeometry } = useMemo(() => {
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
    const wg = g.clone()
    return { geometry: g, wireGeometry: wg }
  }, [puntos, Pmin, Pmax, scale])

  return (
    <group>
      <points geometry={geometry}>
        <pointsMaterial size={0.035} vertexColors transparent opacity={0.6}
          sizeAttenuation={false} depthWrite={false} toneMapped={false} />
      </points>
      <points geometry={wireGeometry}>
        <pointsMaterial size={0.015} vertexColors transparent opacity={0.3}
          sizeAttenuation={false} depthWrite={false} toneMapped={false} />
      </points>
    </group>
  )
}

// ── Punto de demanda ──────────────────────────────────────────────────
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
        <octahedronGeometry args={[0.1]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.8} toneMapped={false} />
      </mesh>
      {/* Línea vertical al plano P=0 */}
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[new Float32Array([0,0,0, 0,-y,0]),3]}/>
        </bufferGeometry>
        <lineBasicMaterial color="#dc2626" transparent opacity={0.4}/>
      </line>
    </group>
  )
}

// ── Ejes coordinados ──────────────────────────────────────────────────
function Axes() {
  const L = 1.3
  const axes = [
    { dir: [1,0,0], color: '#ffffff', label: 'My' },
    { dir: [0,1,0], color: '#ffffff', label: 'P'  },
    { dir: [0,0,1], color: '#ffffff', label: 'Mx' },
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
              <lineBasicMaterial color={color} transparent opacity={0.25} />
            </line>
            <Text
              position={[x*(L+0.15), y*(L+0.15), z*(L+0.15)]}
              fontSize={0.1} color="#ffffff" anchorX="center" anchorY="middle"
              fillOpacity={0.6}
            >
              {label}
            </Text>
          </group>
        )
      })}
      {/* Plano P=0 */}
      <mesh rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[2.6, 2.6]} />
        <meshBasicMaterial color="#1e1e3a" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
      {/* Grid */}
      {[-1, -0.5, 0, 0.5, 1].map(v => (
        <group key={v}>
          <line>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[new Float32Array([-1.3,0,v, 1.3,0,v]),3]}/>
            </bufferGeometry>
            <lineBasicMaterial color="#ffffff" transparent opacity={0.06}/>
          </line>
          <line>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[new Float32Array([v,0,-1.3, v,0,1.3]),3]}/>
            </bufferGeometry>
            <lineBasicMaterial color="#ffffff" transparent opacity={0.06}/>
          </line>
        </group>
      ))}
    </group>
  )
}

// ── Escena principal ──────────────────────────────────────────────────
function Scene({ surfaceData, demandPoint, ptSize, viewType }) {
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
      <ambientLight intensity={1.0} />
      <directionalLight position={[5, 8, 4]} intensity={1.0} />
      <pointLight position={[-4, 4, -4]} intensity={0.6} color="#8b5cf6" />

      {viewType === 'points' && (
        <PointCloud puntos={puntos} Pmin={P_min} Pmax={P_max} scale={scale} ptSize={ptSize} />
      )}
      {viewType === 'mesh' && (
        <SurfaceMesh puntos={puntos} Pmin={P_min} Pmax={P_max} scale={scale} />
      )}
      {viewType === 'solid' && (
        <PointCloud puntos={puntos} Pmin={P_min} Pmax={P_max} scale={scale} ptSize={ptSize * 1.5} />
      )}

      <DemandSphere dp={demandPoint} scale={scale} />
      <Axes />

      <OrbitControls
        enableDamping dampingFactor={0.07}
        minDistance={0.3} maxDistance={10}
      />
    </>
  )
}

// ── Legend overlay ────────────────────────────────────────────────────
function Legend({ Pmax, Pmin }) {
  const f = v => {
    const abs = Math.abs(v)
    return abs >= 1000 ? `${(v/1000).toFixed(1)} t` : `${Math.round(v)} kg`
  }
  const items = [
    { c: '#e65990', l: f(Pmax),    label: 'Comp.' },
    { c: '#c76bb8', l: '',         label: '' },
    { c: '#9b59b6', l: '',         label: '' },
    { c: '#6648c0', l: '',         label: '' },
    { c: '#4059d9', l: f(Pmin),    label: 'Trac.' },
  ]
  return (
    <div style={{
      position:'absolute',bottom:14,left:14,zIndex:10,
      background:'rgba(26,26,46,.92)',border:'1px solid rgba(255,255,255,.1)',
      borderRadius:8,padding:'10px 14px',backdropFilter:'blur(8px)',
      minWidth:100,
    }}>
      <div style={{fontSize:8,color:'rgba(255,255,255,.35)',textTransform:'uppercase',letterSpacing:1,marginBottom:8,fontWeight:600}}>
        Carga P
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:2}}>
        {items.map(({ c, l, label }, idx) => (
          <div key={idx} style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:12,height:4,borderRadius:2,background:c,flexShrink:0}} />
            {l && <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:'rgba(255,255,255,.7)'}}>{l}</span>}
            {label && <span style={{fontSize:8,color:'rgba(255,255,255,.35)',marginLeft:'auto'}}>{label}</span>}
          </div>
        ))}
      </div>
      <div style={{marginTop:8,paddingTop:6,borderTop:'1px solid rgba(255,255,255,.08)',display:'flex',alignItems:'center',gap:6}}>
        <div style={{width:8,height:8,background:'#dc2626',transform:'rotate(45deg)',flexShrink:0,borderRadius:1}} />
        <span style={{fontSize:8,color:'rgba(255,255,255,.4)'}}>Demanda</span>
      </div>
    </div>
  )
}

// ── Stats overlay ────────────────────────────────────────────────────
function Stats({ surfaceData }) {
  const f = v => Math.abs(v) >= 1000 ? `${(v/1000).toFixed(1)}t` : `${Math.round(v)}kg`
  return (
    <div style={{
      position:'absolute',top:12,right:12,zIndex:10,
      background:'rgba(26,26,46,.9)',border:'1px solid rgba(255,255,255,.08)',
      borderRadius:8,padding:'8px 12px',backdropFilter:'blur(8px)',
    }}>
      {[
        { l:'Pts',  v:surfaceData.puntos.length, c:'rgba(255,255,255,.6)' },
        { l:'φP₀',  v:f(surfaceData.P_max),      c:'#e65990' },
        { l:'φPt',  v:f(surfaceData.P_min),       c:'#4059d9' },
        { l:'ρ',    v:`${surfaceData.cuantia_acero.toFixed(2)}%`, c:surfaceData.cuantia_acero>=1&&surfaceData.cuantia_acero<=6?'#34d399':'#f87171' },
      ].map(({ l, v, c }) => (
        <div key={l} style={{display:'flex',gap:10,alignItems:'center',marginBottom:3}}>
          <span style={{fontSize:8,color:'rgba(255,255,255,.3)',fontFamily:"'IBM Plex Mono',monospace",width:22}}>{l}</span>
          <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,fontWeight:500,color:c}}>{v}</span>
        </div>
      ))}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────
export default function ThreeSurfaceViewer({ surfaceData, demandPoint, loading, progress, ptSize = 4, viewType = 'points' }) {
  return (
    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column'}}>

      {/* Estado vacío */}
      {!surfaceData && !loading && (
        <div className="viewer-empty">
          <div className="viewer-empty-icon">⬡</div>
          <h3>Superficie de Interacción</h3>
          <p>Ingrese los datos y presione<br/><strong style={{color:'rgba(255,255,255,.35)'}}>CALCULAR INTERACCIÓN</strong></p>
        </div>
      )}

      {/* Cargando */}
      {loading && (
        <div className="viewer-loading">
          <div className="spinner" />
          <p>Calculando superficie…</p>
          <small>{progress}% — ángulos del eje neutro</small>
          <div className="prog-bar">
            <div className="prog-fill" style={{width:`${progress}%`}} />
          </div>
        </div>
      )}

      {/* Canvas Three.js */}
      {surfaceData && !loading && (
        <Canvas
          camera={{ position: [2.2, 1.6, 2.2], fov: 40 }}
          style={{ position:'absolute', inset:0, background:'#1a1a2e' }}
          gl={{ antialias:true }}
        >
          <Scene
            surfaceData={surfaceData}
            demandPoint={demandPoint}
            ptSize={ptSize}
            viewType={viewType}
          />
        </Canvas>
      )}

      {/* Overlays */}
      {surfaceData && !loading && (
        <>
          <Legend Pmax={surfaceData.P_max} Pmin={surfaceData.P_min} />
          <Stats surfaceData={surfaceData} />
          <div style={{
            position:'absolute',bottom:14,right:14,zIndex:10,
            fontSize:9,color:'rgba(255,255,255,.2)',
            fontFamily:"'IBM Plex Mono',monospace",textAlign:'right',lineHeight:2,
          }}>
            <div>Arrastrar — rotar</div>
            <div>Scroll — zoom</div>
            <div>Clic der. — desplazar</div>
          </div>
        </>
      )}
    </div>
  )
}
