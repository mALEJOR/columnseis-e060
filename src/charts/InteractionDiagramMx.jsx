import { useRef, useEffect } from 'react'

let Plotly = null
async function loadPlotly() {
  if (Plotly) return Plotly
  return new Promise(resolve => {
    if (window.Plotly) { Plotly=window.Plotly; resolve(Plotly); return }
    const s=document.createElement('script')
    s.src='https://cdn.jsdelivr.net/npm/plotly.js-dist@2.27.0/plotly.min.js'
    s.onload=()=>{ Plotly=window.Plotly; resolve(Plotly) }
    document.head.appendChild(s)
  })
}

const LAYOUT_BASE = {
  paper_bgcolor:'#ffffff',
  plot_bgcolor:'#f8f9fc',
  font:{family:"'IBM Plex Mono',monospace",size:10,color:'#606880'},
  margin:{l:46,r:10,t:10,b:44},
  xaxis:{gridcolor:'#e4e7ee',zerolinecolor:'#b8bece',tickfont:{size:8,family:"'IBM Plex Mono',monospace",color:'#9aa0b4'},showgrid:true,zeroline:true},
  yaxis:{gridcolor:'#e4e7ee',zerolinecolor:'#b8bece',tickfont:{size:8,family:"'IBM Plex Mono',monospace",color:'#9aa0b4'},showgrid:true,zeroline:true},
  legend:{font:{size:8,color:'#606880'},bgcolor:'rgba(248,249,252,.9)',bordercolor:'#d4d8e2',borderwidth:1,x:0.02,y:0.02},
  hovermode:'closest',
  showlegend:true,
}

function DiagramChart({ curva, labelX, titulo, demandPoint, color }) {
  const ref = useRef(null)

  useEffect(() => {
    let ok = true
    loadPlotly().then(plt => {
      if (!ok||!ref.current) return
      if (!curva||curva.length===0) return

      const sorted = [...curva].sort((a,b)=>b.P-a.P)
      const posM = sorted.filter(p=>p.M>=0)
      const negM = sorted.filter(p=>p.M<0).sort((a,b)=>a.P-b.P)
      const pts  = [...posM,...negM,posM[0]].filter(Boolean)

      const Mv = pts.map(p=>p.M/100000)
      const Pv = pts.map(p=>p.P/1000)

      const traces = [
        {
          type:'scatter',mode:'lines',x:Mv,y:Pv,
          fill:'toself',fillcolor:`${color}14`,
          line:{color,width:1.5},
          name:'Diagrama',
          hovertemplate:`${labelX}: %{x:.2f} t·m<br>P: %{y:.2f} t<extra></extra>`,
        },
        {
          type:'scatter',mode:'lines',
          x:[Math.min(...Mv)*0.05, Math.max(...Mv)*0.05],
          y:[Math.max(...Pv),Math.max(...Pv)],
          line:{color:'#cc2b2b',width:1,dash:'dot'},
          name:`φP₀=${Math.max(...Pv).toFixed(0)}t`,
          hovertemplate:'φP₀=%{y:.1f}t<extra></extra>',
        },
      ]

      if (demandPoint) {
        traces.push({
          type:'scatter',mode:'markers',
          x:[demandPoint.M/100000],y:[demandPoint.P/1000],
          marker:{symbol:'diamond',size:9,color:'#f4a015',line:{color:'#fff',width:1}},
          name:'Demanda',
          hovertemplate:`Mu: %{x:.3f} t·m<br>Pu: %{y:.2f} t<extra></extra>`,
        })
      }

      const layout = {
        ...LAYOUT_BASE,
        xaxis:{...LAYOUT_BASE.xaxis,title:{text:`${labelX} (t·m)`,font:{size:8,color:'#9aa0b4'}}},
        yaxis:{...LAYOUT_BASE.yaxis,title:{text:'P (ton)',font:{size:8,color:'#9aa0b4'}}},
        annotations:[
          {x:Math.max(...Mv)*.85,y:Math.min(...Pv)*.4,text:'Tracción',showarrow:false,font:{size:7,color:'rgba(204,43,43,.4)'}},
          {x:Math.max(...Mv)*.85,y:Math.max(...Pv)*.8,text:'Compresión',showarrow:false,font:{size:7,color:'rgba(21,71,200,.4)'}},
        ],
      }

      plt.newPlot(ref.current, traces, layout, {
        responsive:true, displayModeBar:false,
      })
    })
    return () => { ok=false }
  }, [curva, demandPoint, color, labelX])

  if (!curva||curva.length===0) return (
    <div className="chart-placeholder">Sin datos</div>
  )
  return <div ref={ref} style={{flex:1,minHeight:0,width:'100%'}}/>
}

export default function InteractionDiagramMx({ curva, demandPoint }) {
  return (
    <div className="chart-block">
      <div className="chart-block-header">
        <span style={{width:6,height:6,borderRadius:'50%',background:'#1547c8',flexShrink:0,display:'inline-block'}}/>
        <span className="chart-block-title">Diagrama P-Mx</span>
      </div>
      <DiagramChart curva={curva} labelX="Mx" titulo="P-Mx" demandPoint={demandPoint} color="#1547c8"/>
    </div>
  )
}
