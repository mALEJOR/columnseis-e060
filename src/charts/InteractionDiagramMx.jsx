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
  plot_bgcolor:'#fafbfc',
  font:{family:"'IBM Plex Mono',monospace",size:10,color:'#6b7280'},
  margin:{l:42,r:8,t:6,b:36},
  xaxis:{
    gridcolor:'#f0f1f3',zerolinecolor:'#e2e5ea',
    tickfont:{size:8,family:"'IBM Plex Mono',monospace",color:'#9ca3af'},
    showgrid:true,zeroline:true,
  },
  yaxis:{
    gridcolor:'#f0f1f3',zerolinecolor:'#e2e5ea',
    tickfont:{size:8,family:"'IBM Plex Mono',monospace",color:'#9ca3af'},
    showgrid:true,zeroline:true,
  },
  legend:{
    font:{size:7,color:'#6b7280'},
    bgcolor:'rgba(255,255,255,.95)',bordercolor:'#e2e5ea',borderwidth:1,
    x:0.02,y:0.98,xanchor:'left',yanchor:'top',
  },
  hovermode:'closest',
  showlegend:true,
}

export default function InteractionChart({ curva, demandPoint, title, labelX, color, dotColor }) {
  const ref = useRef(null)

  useEffect(() => {
    let ok = true
    loadPlotly().then(plt => {
      if (!ok||!ref.current) return
      if (!curva||curva.length===0) {
        plt.purge(ref.current)
        return
      }

      const sorted = [...curva].sort((a,b)=>b.P-a.P)
      const posM = sorted.filter(p=>p.M>=0)
      const negM = sorted.filter(p=>p.M<0).sort((a,b)=>a.P-b.P)
      const pts  = [...posM,...negM,posM[0]].filter(Boolean)

      const Mv = pts.map(p=>p.M/100000)
      const Pv = pts.map(p=>p.P/1000)

      const traces = [
        {
          type:'scatter',mode:'lines',x:Mv,y:Pv,
          fill:'toself',fillcolor:color+'12',
          line:{color,width:1.8},
          name:'Diseño',
          hovertemplate:`${labelX}: %{x:.2f} t·m<br>P: %{y:.2f} t<extra></extra>`,
        },
        {
          type:'scatter',mode:'lines',
          x:[Math.min(...Mv)*0.05, Math.max(...Mv)*0.05],
          y:[Math.max(...Pv),Math.max(...Pv)],
          line:{color:'#dc2626',width:1,dash:'dot'},
          name:`φP₀ max`,
          hovertemplate:'φP₀=%{y:.1f}t<extra></extra>',
        },
      ]

      if (demandPoint) {
        traces.push({
          type:'scatter',mode:'markers',
          x:[demandPoint.M/100000],y:[demandPoint.P/1000],
          marker:{symbol:'diamond',size:8,color:dotColor || '#dc2626',line:{color:'#fff',width:1.5}},
          name:'Demanda',
          hovertemplate:`Mu: %{x:.3f} t·m<br>Pu: %{y:.2f} t<extra></extra>`,
        })
      }

      const layout = {
        ...LAYOUT_BASE,
        xaxis:{...LAYOUT_BASE.xaxis,title:{text:`${labelX} (t·m)`,font:{size:8,color:'#9ca3af'}}},
        yaxis:{...LAYOUT_BASE.yaxis,title:{text:'P (ton)',font:{size:8,color:'#9ca3af'}}},
      }

      plt.newPlot(ref.current, traces, layout, {
        responsive:true, displayModeBar:false,
      })
    })
    return () => { ok=false }
  }, [curva, demandPoint, color, dotColor, labelX])

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div className="chart-card-dot" style={{background:color}}/>
        <span className="chart-card-title">{title}</span>
      </div>
      <div className="chart-card-body">
        {(!curva || curva.length===0)
          ? <div className="chart-placeholder">Sin datos</div>
          : <div ref={ref} style={{width:'100%',height:'100%'}}/>
        }
      </div>
    </div>
  )
}
