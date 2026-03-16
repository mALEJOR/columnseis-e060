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
  paper_bgcolor:'#13151c',
  plot_bgcolor:'#1a1d26',
  font:{family:"'IBM Plex Mono',monospace",size:10,color:'#8b92a8'},
  margin:{l:42,r:8,t:6,b:36},
  xaxis:{
    gridcolor:'rgba(255,255,255,0.06)',zerolinecolor:'rgba(255,255,255,0.1)',
    tickfont:{size:8,family:"'IBM Plex Mono',monospace",color:'#5a6178'},
    showgrid:true,zeroline:true,
  },
  yaxis:{
    gridcolor:'rgba(255,255,255,0.06)',zerolinecolor:'rgba(255,255,255,0.1)',
    tickfont:{size:8,family:"'IBM Plex Mono',monospace",color:'#5a6178'},
    showgrid:true,zeroline:true,
  },
  legend:{
    font:{size:7,color:'#8b92a8'},
    bgcolor:'rgba(19,21,28,.95)',bordercolor:'rgba(255,255,255,0.08)',borderwidth:1,
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

      // La curva ya viene como envolvente cerrada desde engine.js
      const Mv = curva.map(p => p.M / 100000)
      const Pv = curva.map(p => p.P / 1000)

      const maxP = Math.max(...Pv)
      const minP = Math.min(...Pv)
      const maxM = Math.max(...Mv)
      const minM = Math.min(...Mv)

      const traces = [
        // Curva de diseño (envolvente suavizada)
        {
          type:'scatter', mode:'lines', x:Mv, y:Pv,
          fill:'toself',
          fillcolor: color + '14',
          line:{ color, width:2, shape:'spline', smoothing:1.3 },
          name:'Diseño',
          hovertemplate:`${labelX}: %{x:.2f} t·m<br>P: %{y:.2f} t<extra></extra>`,
        },
        // Línea punteada φP₀ máximo
        {
          type:'scatter', mode:'lines',
          x:[minM * 1.1, maxM * 1.1],
          y:[maxP, maxP],
          line:{ color:'#dc2626', width:1, dash:'dot' },
          name:`φP₀=${maxP.toFixed(0)}t`,
          hovertemplate:'φP₀=%{y:.1f}t<extra></extra>',
        },
      ]

      // Punto de demanda
      if (demandPoint) {
        traces.push({
          type:'scatter', mode:'markers',
          x:[demandPoint.M / 100000], y:[demandPoint.P / 1000],
          marker:{
            symbol:'diamond', size:10,
            color: dotColor || '#e74c3c',
            line:{ color:'#fff', width:1.5 },
          },
          name:'Demanda',
          hovertemplate:`Mu: %{x:.3f} t·m<br>Pu: %{y:.2f} t<extra></extra>`,
        })
      }

      const layout = {
        ...LAYOUT_BASE,
        xaxis:{
          ...LAYOUT_BASE.xaxis,
          title:{ text:`${labelX} (t·m)`, font:{size:8,color:'#5a6178'} },
        },
        yaxis:{
          ...LAYOUT_BASE.yaxis,
          title:{ text:'P (ton)', font:{size:8,color:'#5a6178'} },
        },
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
