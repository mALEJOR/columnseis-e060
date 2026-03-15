import { useMemo, useRef, useEffect } from 'react'

// Usamos Plotly via CDN para evitar el bundle pesado
let Plotly = null

async function loadPlotly() {
  if (Plotly) return Plotly
  return new Promise((resolve) => {
    if (window.Plotly) { Plotly = window.Plotly; resolve(Plotly); return }
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/plotly.js-dist@2.27.0/plotly.min.js'
    script.onload = () => { Plotly = window.Plotly; resolve(Plotly) }
    document.head.appendChild(script)
  })
}

export default function InteractionChart({ curva, titulo, labelM, demandPoint }) {
  const divRef = useRef(null)

  // Ordenar puntos para una curva suave
  const curvaProcesada = useMemo(() => {
    if (!curva || curva.length === 0) return []
    // Eliminar duplicados y ordenar por P descendente
    const sorted = [...curva].sort((a, b) => b.P - a.P)
    // Construir curva cerrada (rama positiva M + rama negativa M)
    const posM = sorted.filter(p => p.M >= 0)
    const negM = sorted.filter(p => p.M < 0).sort((a, b) => a.P - b.P)
    return [...posM, ...negM, posM[0]].filter(Boolean)
  }, [curva])

  useEffect(() => {
    let mounted = true
    loadPlotly().then((plt) => {
      if (!mounted || !divRef.current || curvaProcesada.length === 0) return

      const Mvals = curvaProcesada.map(p => p.M / 100000)  // kg·cm → ton·m
      const Pvals = curvaProcesada.map(p => p.P / 1000)     // kg → ton

      const traces = [
        // Curva de interacción (relleno)
        {
          type: 'scatter',
          mode: 'lines',
          x: Mvals,
          y: Pvals,
          fill: 'toself',
          fillcolor: 'rgba(77, 138, 255, 0.08)',
          line: { color: '#4d8aff', width: 2 },
          name: 'Superficie de interacción',
          hovertemplate: 'M: %{x:.2f} ton·m<br>P: %{y:.2f} ton<extra></extra>',
        },
        // Zona de compresión pura
        {
          type: 'scatter',
          mode: 'lines',
          x: [Math.min(...Mvals) * 0.05, Math.max(...Mvals) * 0.05],
          y: [Math.max(...Pvals), Math.max(...Pvals)],
          line: { color: '#ff5f57', width: 1, dash: 'dot' },
          name: `φP₀ = ${Math.max(...Pvals).toFixed(1)} ton`,
          hovertemplate: 'φP₀ = %{y:.1f} ton<extra></extra>',
        },
        // Línea P=0
        {
          type: 'scatter',
          mode: 'lines',
          x: [Math.min(...Mvals), Math.max(...Mvals)],
          y: [0, 0],
          line: { color: 'rgba(110,122,150,0.3)', width: 1, dash: 'dash' },
          name: 'P = 0',
          showlegend: false,
        },
      ]

      // Punto de demanda
      if (demandPoint) {
        traces.push({
          type: 'scatter',
          mode: 'markers',
          x: [demandPoint.M / 100000],
          y: [demandPoint.P / 1000],
          marker: {
            symbol: 'diamond',
            size: 14,
            color: '#ffb627',
            line: { color: '#fff', width: 1.5 },
          },
          name: 'Demanda (Pu, Mu)',
          hovertemplate: 'Mu: %{x:.2f} ton·m<br>Pu: %{y:.2f} ton<extra></extra>',
        })
      }

      const layout = {
        title: {
          text: titulo,
          font: { family: 'Syne, sans-serif', size: 15, color: '#b8c0d4' },
          x: 0.05,
        },
        paper_bgcolor: '#0a0c10',
        plot_bgcolor: '#0f1117',
        font: { family: 'Inter, sans-serif', size: 11, color: '#6e7a96' },
        xaxis: {
          title: { text: labelM.replace('kg·cm', 'ton·m'), font: { color: '#6e7a96', size: 12 } },
          gridcolor: 'rgba(99,140,255,0.08)',
          zerolinecolor: 'rgba(99,140,255,0.25)',
          tickfont: { color: '#6e7a96', family: 'JetBrains Mono' },
          showgrid: true,
        },
        yaxis: {
          title: { text: 'P (ton)', font: { color: '#6e7a96', size: 12 } },
          gridcolor: 'rgba(99,140,255,0.08)',
          zerolinecolor: 'rgba(99,140,255,0.25)',
          tickfont: { color: '#6e7a96', family: 'JetBrains Mono' },
          showgrid: true,
        },
        legend: {
          font: { color: '#b8c0d4', size: 11 },
          bgcolor: 'rgba(15,17,23,0.8)',
          bordercolor: 'rgba(99,140,255,0.2)',
          borderwidth: 1,
          x: 0.02, y: 0.02,
        },
        margin: { l: 60, r: 20, t: 50, b: 55 },
        hovermode: 'closest',
        shapes: [
          // Zona de tracción - sombreado
          {
            type: 'rect',
            x0: Math.min(...Mvals) * 1.1,
            x1: Math.max(...Mvals) * 1.1,
            y0: Math.min(...Pvals) * 1.05,
            y1: 0,
            fillcolor: 'rgba(255,95,87,0.03)',
            line: { width: 0 },
            layer: 'below',
          }
        ],
        annotations: [
          {
            x: Math.max(...Mvals) * 0.9,
            y: Math.min(...Pvals) * 0.5,
            text: 'Zona tracción',
            showarrow: false,
            font: { size: 10, color: 'rgba(255,95,87,0.5)' },
          },
          {
            x: Math.max(...Mvals) * 0.9,
            y: Math.max(...Pvals) * 0.85,
            text: 'Zona compresión',
            showarrow: false,
            font: { size: 10, color: 'rgba(77,138,255,0.5)' },
          },
        ],
      }

      const config = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['lasso2d', 'select2d'],
        displaylogo: false,
        toImageButtonOptions: {
          format: 'png',
          filename: titulo.replace(/ /g, '_'),
          height: 700,
          width: 900,
        },
      }

      plt.newPlot(divRef.current, traces, layout, config)
    })

    return () => { mounted = false }
  }, [curvaProcesada, titulo, labelM, demandPoint])

  return (
    <div className="chart-wrapper" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {curvaProcesada.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>
          Sin datos para mostrar
        </div>
      ) : (
        <div
          ref={divRef}
          style={{ flex: 1, minHeight: 400, width: '100%' }}
        />
      )}
    </div>
  )
}
