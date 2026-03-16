import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'

// ── Superficie sólida triangulada con wireframe ───────────────────────
function SolidSurface({ puntos, scale }) {
  const { solidGeo, wireGeo } = useMemo(() => {
    // Agrupar puntos por ángulo del eje neutro (excluir límites)
    const angleMap = new Map()
    for (const p of puntos) {
      if (p.profundidad_c >= 900 || p.profundidad_c <= 0.001) continue
      const key = p.angulo_neutro
      if (!angleMap.has(key)) angleMap.set(key, [])
      angleMap.get(key).push(p)
    }

    const angles = [...angleMap.keys()].sort((a, b) => a - b)
    if (angles.length < 3) return {}

    // Ordenar cada grupo por profundidad
    for (const pts of angleMap.values()) {
      pts.sort((a, b) => a.profundidad_c - b.profundidad_c)
    }

    const minLen = Math.min(...angles.map(a => angleMap.get(a).length))
    if (minLen < 2) return {}

    const nA = angles.length
    const nD = minLen

    // Construir vértices: grilla ángulo × profundidad
    const positions = []
    for (let ia = 0; ia < nA; ia++) {
      const pts = angleMap.get(angles[ia])
      for (let ic = 0; ic < nD; ic++) {
        const p = pts[ic]
        positions.push(p.My / scale.M, p.P / scale.P, p.Mx / scale.M)
      }
    }

    // Centros de tapas superior e inferior
    const topPt = puntos.find(p => p.profundidad_c >= 900)
    const botPt = puntos.find(p => p.profundidad_c <= 0.001 && p.P < 0)
    const topIdx = nA * nD
    if (topPt) positions.push(topPt.My / scale.M, topPt.P / scale.P, topPt.Mx / scale.M)
    const botIdx = topPt ? topIdx + 1 : topIdx
    if (botPt) positions.push(botPt.My / scale.M, botPt.P / scale.P, botPt.Mx / scale.M)

    // Construir triángulos
    const indices = []

    // Superficie principal: quad strips entre ángulos adyacentes
    for (let ia = 0; ia < nA; ia++) {
      const nextIa = (ia + 1) % nA
      for (let ic = 0; ic < nD - 1; ic++) {
        const i00 = ia * nD + ic
        const i01 = ia * nD + ic + 1
        const i10 = nextIa * nD + ic
        const i11 = nextIa * nD + ic + 1
        indices.push(i00, i10, i01)
        indices.push(i01, i10, i11)
      }
    }

    // Tapa superior: conectar última profundidad de cada ángulo al centro superior
    if (topPt) {
      for (let ia = 0; ia < nA; ia++) {
        const nextIa = (ia + 1) % nA
        indices.push(ia * nD + (nD - 1), nextIa * nD + (nD - 1), topIdx)
      }
    }

    // Tapa inferior: conectar primera profundidad de cada ángulo al centro inferior
    if (botPt) {
      for (let ia = 0; ia < nA; ia++) {
        const nextIa = (ia + 1) % nA
        indices.push(ia * nD, botIdx, nextIa * nD)
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()

    return { solidGeo: geo, wireGeo: new THREE.WireframeGeometry(geo) }
  }, [puntos, scale])

  if (!solidGeo) return null

  return (
    <group>
      <mesh geometry={solidGeo}>
        <meshPhongMaterial
          color="#9b59b6"
          transparent
          opacity={0.75}
          side={THREE.DoubleSide}
          shininess={80}
          specular={new THREE.Color('#c39bd3')}
        />
      </mesh>
      <lineSegments geometry={wireGeo}>
        <lineBasicMaterial color="#c39bd3" transparent opacity={0.4} />
      </lineSegments>
    </group>
  )
}

// ── Nube de puntos (modo alternativo) ─────────────────────────────────
function PointCloud({ puntos, scale, ptSize }) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(puntos.length * 3)
    const col = new Float32Array(puntos.length * 3)
    puntos.forEach((p, i) => {
      pos[i*3]   = p.My / scale.M
      pos[i*3+1] = p.P  / scale.P
      pos[i*3+2] = p.Mx / scale.M
      col[i*3]=0.61; col[i*3+1]=0.35; col[i*3+2]=0.71
    })
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color',    new THREE.BufferAttribute(col, 3))
    return g
  }, [puntos, scale])

  return (
    <points geometry={geom}>
      <pointsMaterial
        size={ptSize / 100} vertexColors transparent opacity={0.9}
        sizeAttenuation={false} depthWrite={false} toneMapped={false}
      />
    </points>
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
        <octahedronGeometry args={[0.12]} />
        <meshStandardMaterial
          color="#e74c3c" emissive="#e74c3c" emissiveIntensity={1.0}
          toneMapped={false}
        />
      </mesh>
      {/* Glow sphere */}
      <mesh>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshBasicMaterial color="#e74c3c" transparent opacity={0.2} />
      </mesh>
      {/* Línea vertical al plano P=0 */}
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[new Float32Array([0,0,0, 0,-y,0]),3]}/>
        </bufferGeometry>
        <lineBasicMaterial color="#e74c3c" transparent opacity={0.5}/>
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
              <lineBasicMaterial color={color} transparent opacity={0.3} />
            </line>
            <Text
              position={[x*(L+0.15), y*(L+0.15), z*(L+0.15)]}
              fontSize={0.1} color="#ffffff" anchorX="center" anchorY="middle"
              fillOpacity={0.7}
            >
              {label}
            </Text>
          </group>
        )
      })}
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
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 8, 4]} intensity={1.5} />
      <directionalLight position={[-3, 5, -3]} intensity={0.5} color="#c39bd3" />
      <pointLight position={[-4, 4, -4]} intensity={0.8} color="#8b5cf6" />

      {(viewType === 'mesh' || viewType === 'solid') && (
        <SolidSurface puntos={puntos} scale={scale} />
      )}
      {viewType === 'points' && (
        <PointCloud puntos={puntos} scale={scale} ptSize={ptSize} />
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
  const f = v => Math.abs(v) >= 1000 ? `${(v/1000).toFixed(1)} t` : `${Math.round(v)} kg`
  return (
    <div style={{
      position:'absolute',bottom:14,left:14,zIndex:10,
      background:'rgba(13,13,26,.92)',border:'1px solid rgba(255,255,255,.1)',
      borderRadius:8,padding:'10px 14px',backdropFilter:'blur(8px)',
      minWidth:110,
    }}>
      <div style={{fontSize:8,color:'rgba(255,255,255,.35)',textTransform:'uppercase',letterSpacing:1,marginBottom:8,fontWeight:600}}>
        Superficie
      </div>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
        <div style={{width:14,height:10,borderRadius:2,background:'#9b59b6',opacity:0.75,border:'1px solid #c39bd3'}} />
        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:'rgba(255,255,255,.7)'}}>Malla sólida</span>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:'rgba(255,255,255,.5)'}}>
          φP₀ = <span style={{color:'#c39bd3'}}>{f(Pmax)}</span>
        </div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:'rgba(255,255,255,.5)'}}>
          φPt = <span style={{color:'#8b5cf6'}}>{f(Pmin)}</span>
        </div>
      </div>
      <div style={{marginTop:6,paddingTop:6,borderTop:'1px solid rgba(255,255,255,.08)',display:'flex',alignItems:'center',gap:6}}>
        <div style={{width:9,height:9,background:'#e74c3c',transform:'rotate(45deg)',flexShrink:0,borderRadius:1}} />
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
      background:'rgba(13,13,26,.9)',border:'1px solid rgba(255,255,255,.08)',
      borderRadius:8,padding:'8px 12px',backdropFilter:'blur(8px)',
    }}>
      {[
        { l:'Pts',  v:surfaceData.puntos.length, c:'rgba(255,255,255,.6)' },
        { l:'φP₀',  v:f(surfaceData.P_max),      c:'#c39bd3' },
        { l:'φPt',  v:f(surfaceData.P_min),       c:'#8b5cf6' },
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
export default function ThreeSurfaceViewer({ surfaceData, demandPoint, loading, progress, ptSize = 4, viewType = 'mesh' }) {
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
          style={{ position:'absolute', inset:0, background:'#0d0d1a' }}
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
            fontSize:9,color:'rgba(255,255,255,.18)',
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
