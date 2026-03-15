import { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'

function pToColor(P, Pmin, Pmax) {
  const t = Math.max(0, Math.min(1, (P - Pmin) / (Pmax - Pmin + 1)))
  const stops = [[0.2,0.4,1],[0.0,0.85,0.8],[0.3,0.8,0.2],[1.0,0.7,0.0],[1.0,0.15,0.1]]
  const idx = t*(stops.length-1), i=Math.floor(idx), f=idx-i
  const a=stops[Math.min(i,stops.length-1)], b=stops[Math.min(i+1,stops.length-1)]
  return [a[0]+f*(b[0]-a[0]), a[1]+f*(b[1]-a[1]), a[2]+f*(b[2]-a[2])]
}

function SurfacePoints({ puntos, Pmin, Pmax, scale, ptSize, showPts }) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const n = puntos.length
    const pos = new Float32Array(n*3), col = new Float32Array(n*3)
    puntos.forEach((p,i) => {
      pos[i*3]=p.My/scale.M; pos[i*3+1]=p.P/scale.P; pos[i*3+2]=p.Mx/scale.M
      const [r,g2,b] = pToColor(p.P,Pmin,Pmax)
      col[i*3]=r; col[i*3+1]=g2; col[i*3+2]=b
    })
    g.setAttribute('position', new THREE.BufferAttribute(pos,3))
    g.setAttribute('color', new THREE.BufferAttribute(col,3))
    return g
  }, [puntos, Pmin, Pmax, scale])

  if (!showPts) return null
  return (
    <points geometry={geom}>
      <pointsMaterial size={ptSize} vertexColors transparent opacity={0.9} sizeAttenuation/>
    </points>
  )
}

function SurfaceMesh({ puntos, Pmin, Pmax, scale, opacity, showSurf }) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const verts=[], colors=[]
    puntos.forEach(p => {
      verts.push(p.My/scale.M, p.P/scale.P, p.Mx/scale.M)
      const [r,g2,b] = pToColor(p.P,Pmin,Pmax)
      colors.push(r,g2,b)
    })
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts),3))
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors),3))
    g.computeVertexNormals()
    return g
  }, [puntos, Pmin, Pmax, scale])

  if (!showSurf) return null
  return (
    <points geometry={geom}>
      <pointsMaterial size={0.018} vertexColors transparent opacity={opacity} sizeAttenuation/>
    </points>
  )
}

function DemandPoint({ demandPoint, scale }) {
  const ref = useRef()
  useFrame((_,dt) => { if(ref.current) ref.current.rotation.y += dt*1.5 })
  if (!demandPoint) return null
  const x=demandPoint.Muy/scale.M, y=demandPoint.Pu/scale.P, z=demandPoint.Mux/scale.M
  return (
    <group position={[x,y,z]}>
      <mesh ref={ref}>
        <octahedronGeometry args={[0.07]}/>
        <meshStandardMaterial color="#f4a015" emissive="#f4a015" emissiveIntensity={0.6}/>
      </mesh>
    </group>
  )
}

function Axes() {
  const L = 1.35
  const lines = [[L,0,0,'#4d8aff','My'],[-L,0,0,'#4d8aff',null],[0,L,0,'#ff5f57','P'],[0,-L,0,'#ff5f57',null],[0,0,L,'#00e5c8','Mx'],[0,0,-L,'#00e5c8',null]]
  return (
    <group>
      {[[1,0,0,'#4d8aff','My'],[0,1,0,'#ff6060','P'],[0,0,1,'#00d4b8','Mx']].map(([x,y,z,col,lbl])=>{
        const pts=new Float32Array([-x*L,-y*L,-z*L, x*L,y*L,z*L])
        const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(pts,3))
        return (
          <group key={lbl}>
            <line geometry={g}><lineBasicMaterial color={col} opacity={0.6} transparent/></line>
            <Text position={[x*(L+0.18),y*(L+0.18),z*(L+0.18)]} fontSize={0.1} color={col} anchorX="center">{lbl}</Text>
          </group>
        )
      })}
      {/* Plano P=0 */}
      <mesh rotation={[-Math.PI/2,0,0]}>
        <planeGeometry args={[2.7,2.7]}/>
        <meshBasicMaterial color="#1e2030" transparent opacity={0.3} side={THREE.DoubleSide}/>
      </mesh>
    </group>
  )
}

function Scene({ surfaceData, demandPoint, ptSize, showPts, showSurf, opacity }) {
  const { puntos, P_max, P_min } = surfaceData
  const scale = useMemo(() => {
    const maxM = Math.max(...puntos.map(p=>Math.abs(p.Mx)),...puntos.map(p=>Math.abs(p.My)),1)
    return { P: Math.max(Math.abs(P_max),Math.abs(P_min),1), M: maxM }
  }, [puntos,P_max,P_min])
  return (
    <>
      <ambientLight intensity={0.7}/>
      <directionalLight position={[5,8,5]} intensity={0.8}/>
      <pointLight position={[-5,5,-5]} intensity={0.4} color="#4d8aff"/>
      <SurfaceMesh puntos={puntos} Pmin={P_min} Pmax={P_max} scale={scale} opacity={opacity} showSurf={showSurf}/>
      <SurfacePoints puntos={puntos} Pmin={P_min} Pmax={P_max} scale={scale} ptSize={ptSize} showPts={showPts}/>
      {demandPoint && <DemandPoint demandPoint={demandPoint} scale={scale}/>}
      <Axes/>
      <OrbitControls enableDamping dampingFactor={0.08} minDistance={0.4} maxDistance={8}/>
    </>
  )
}

function ColorLegend({ Pmax, Pmin }) {
  const f = v => Math.abs(v)>=1000 ? `${(v/1000).toFixed(1)}t` : `${Math.round(v)}kg`
  return (
    <div style={{position:'absolute',bottom:12,left:12,background:'rgba(8,10,16,.88)',border:'1px solid rgba(255,255,255,.1)',borderRadius:5,padding:'8px 12px',backdropFilter:'blur(4px)'}}>
      <div style={{fontSize:8,color:'rgba(255,255,255,.35)',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Carga Axial P</div>
      {[
        {c:'#ff2710',l:f(Pmax)},
        {c:'#ffb627',l:f(Pmax*.6)},
        {c:'#00d878',l:f(Pmax*.2)},
        {c:'#00e5c8',l:'0'},
        {c:'#4d8aff',l:f(Pmin)},
      ].map(({c,l}) => (
        <div key={l} style={{display:'flex',alignItems:'center',gap:7,marginBottom:3}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:c}}/>
          <span style={{fontSize:9,fontFamily:'IBM Plex Mono,monospace',color:'rgba(255,255,255,.7)'}}>{l}</span>
        </div>
      ))}
      <div style={{marginTop:6,paddingTop:5,borderTop:'1px solid rgba(255,255,255,.1)',display:'flex',alignItems:'center',gap:7}}>
        <div style={{width:8,height:8,background:'#f4a015',transform:'rotate(45deg)'}}/>
        <span style={{fontSize:9,color:'rgba(255,255,255,.5)'}}>Punto demanda</span>
      </div>
    </div>
  )
}

export default function ThreeSurfaceViewer({ surfaceData, demandPoint, loading, progress }) {
  const [ptSize,   setPtSize]   = useState(0.025)
  const [opacity,  setOpacity]  = useState(0.85)
  const [showPts,  setShowPts]  = useState(true)
  const [showSurf, setShowSurf] = useState(true)

  const fmt = v => Math.abs(v)>=1000 ? `${(v/1000).toFixed(1)}t` : `${Math.round(v)}kg`

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      {/* Controls topbar */}
      <div className="viewer-topbar">
        <span className="viewer-title">Superficie de Interacción P-Mx-My</span>
        <div className="viewer-controls">
          <button className={`vctrl ${showSurf?'active':''}`} onClick={()=>setShowSurf(s=>!s)}>
            ⬡ Superficie
          </button>
          <button className={`vctrl ${showPts?'active':''}`} onClick={()=>setShowPts(s=>!s)}>
            · Puntos
          </button>
          <div className="vctrl">
            Transparencia
            <input type="range" min="0.1" max="1" step="0.05" value={opacity}
              onChange={e=>setOpacity(parseFloat(e.target.value))}
              style={{cursor:'pointer'}}/>
          </div>
          <div className="vctrl">
            Puntos
            <input type="range" min="0.005" max="0.08" step="0.005" value={ptSize}
              onChange={e=>setPtSize(parseFloat(e.target.value))}
              style={{cursor:'pointer'}}/>
          </div>
        </div>
      </div>

      {/* Viewer area */}
      <div style={{flex:1,position:'relative',overflow:'hidden'}}>
        {!surfaceData && !loading && (
          <div className="viewer-empty" style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
            <div className="viewer-empty-icon">⬡</div>
            <h3>Superficie P-Mx-My</h3>
            <p>Ingrese los datos en el panel izquierdo<br/>y presione CALCULAR INTERACCIÓN</p>
          </div>
        )}

        {loading && (
          <div className="viewer-loading" style={{position:'absolute',inset:0,background:'#12141a',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14}}>
            <div className="spinner"/>
            <p>Calculando superficie de interacción</p>
            <small>{progress}% — procesando ángulos del eje neutro</small>
            <div className="prog-bar"><div className="prog-fill" style={{width:`${progress}%`}}/></div>
          </div>
        )}

        {surfaceData && !loading && (
          <Canvas camera={{position:[1.8,1.4,1.8],fov:44}}
            style={{position:'absolute',inset:0,background:'#12141a'}}>
            <Scene surfaceData={surfaceData} demandPoint={demandPoint}
              ptSize={ptSize} showPts={showPts} showSurf={showSurf} opacity={opacity}/>
          </Canvas>
        )}

        {surfaceData && (
          <>
            <ColorLegend Pmax={surfaceData.P_max} Pmin={surfaceData.P_min}/>
            <div className="viewer-stats" style={{position:'absolute',top:12,right:12}}>
              <div className="stat-row"><span className="stat-label" style={{fontSize:8,color:'rgba(255,255,255,.35)',fontFamily:'monospace',minWidth:36}}>Pts</span><span className="stat-value">{surfaceData.puntos.length}</span></div>
              <div className="stat-row"><span className="stat-label" style={{fontSize:8,color:'rgba(255,255,255,.35)',fontFamily:'monospace',minWidth:36}}>φP₀</span><span className="stat-value">{fmt(surfaceData.P_max)}</span></div>
              <div className="stat-row"><span className="stat-label" style={{fontSize:8,color:'rgba(255,255,255,.35)',fontFamily:'monospace',minWidth:36}}>φPt</span><span className="stat-value" style={{color:'#7eb4ff'}}>{fmt(surfaceData.P_min)}</span></div>
            </div>
            <div className="viewer-hint" style={{position:'absolute',bottom:12,right:12}}>
              <div>⟳ Arrastrar: rotar</div>
              <div>⊕ Scroll: zoom</div>
              <div>⊞ Clic der.: desplazar</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
