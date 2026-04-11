function drawTable(doc, x, y, headers, rows, colWidths) {
  const rowH = 6
  const totalW = colWidths.reduce((a,b)=>a+b,0)

  // Header
  doc.setFillColor(30, 36, 52)
  doc.rect(x, y, totalW, rowH, 'F')
  doc.setFontSize(7)
  doc.setTextColor(200, 205, 220)
  let cx = x
  headers.forEach((h, i) => {
    doc.text(h, cx + 2, y + 4)
    cx += colWidths[i]
  })

  // Rows
  rows.forEach((row, ri) => {
    const ry = y + rowH + ri * rowH
    if (ri % 2 === 0) {
      doc.setFillColor(240, 241, 245)
      doc.rect(x, ry, totalW, rowH, 'F')
    }
    doc.setTextColor(40, 45, 60)
    doc.setFontSize(7)
    cx = x
    row.forEach((cell, ci) => {
      doc.text(String(cell), cx + 2, ry + 4)
      cx += colWidths[ci]
    })
  })

  // Border
  const tableH = rowH + rows.length * rowH
  doc.setDrawColor(180, 185, 200)
  doc.rect(x, y, totalW, tableH)

  return y + tableH + 4
}

export async function generarPDF({ proyecto, columnData, surfaceData, estribosData }) {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF('p', 'mm', 'a4')
  const W = 210, margin = 15
  const contentW = W - 2 * margin

  // ═══════════════════════════════════════════════════════════════
  // PÁGINA 1 — MEMBRETE Y DATOS
  // ═══════════════════════════════════════════════════════════════

  // Header bar
  doc.setFillColor(21, 71, 200)
  doc.rect(0, 0, W, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('COLUMNSEIS E.060', margin, 10)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('DISEÑO SISMORRESISTENTE DE COLUMNAS — NTP E.060 / ACI 318', margin, 16)

  // Date
  doc.setFontSize(7)
  doc.text(new Date().toLocaleDateString('es-PE', { year:'numeric', month:'long', day:'numeric' }), W - margin, 10, { align: 'right' })

  let y = 30

  // Project info
  doc.setFillColor(245, 246, 250)
  doc.rect(margin, y, contentW, 20, 'F')
  doc.setDrawColor(200, 205, 220)
  doc.rect(margin, y, contentW, 20)
  doc.setTextColor(100, 105, 120)
  doc.setFontSize(7)
  doc.text('PROYECTO:', margin + 4, y + 6)
  doc.text('ELEMENTO:', margin + 4, y + 12)
  doc.text('PROFESIONAL:', margin + 4, y + 18)
  doc.setTextColor(30, 35, 50)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text(proyecto?.nombre || '—', margin + 30, y + 6)
  doc.text(proyecto?.licencia || '—', margin + 30, y + 12)
  doc.text(proyecto?.autor || '—', margin + 38, y + 18)
  doc.setFont('helvetica', 'normal')

  y += 28

  // Section title helper
  const sectionTitle = (title, yPos) => {
    doc.setFillColor(30, 36, 52)
    doc.rect(margin, yPos, contentW, 7, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(title, margin + 3, yPos + 5)
    doc.setFont('helvetica', 'normal')
    return yPos + 10
  }

  // ── DATOS DE ENTRADA ──
  y = sectionTitle('DATOS DE ENTRADA', y)

  const geo = columnData?.geometria
  const mat = columnData?.material
  const esCircular = geo?.tipo === 'circular'

  const inputRows = [
    ["f'c", `${mat?.fc || '—'} kg/cm²`, 'Resistencia del concreto'],
    ['fy', `${mat?.fy || '—'} kg/cm²`, 'Fluencia del acero'],
  ]
  if (esCircular) {
    inputRows.push(['D', `${geo?.D || '—'} cm`, 'Diámetro de sección circular'])
  } else {
    inputRows.push(['b', `${geo?.b || '—'} cm`, 'Ancho de sección'])
    inputRows.push(['h', `${geo?.h || '—'} cm`, 'Peralte de sección'])
  }
  inputRows.push(
    ['Recubrimiento', `${geo?.recubrimiento || '—'} cm`, 'Recubrimiento al centroide del acero'],
    ['As', surfaceData ? `${surfaceData.area_acero.toFixed(2)} cm²` : '—', 'Área total de acero'],
    ['ρ', surfaceData ? `${surfaceData.cuantia_acero.toFixed(2)}%` : '—', 'Cuantía de refuerzo'],
  )

  y = drawTable(doc, margin, y, ['Parámetro', 'Valor', 'Descripción'], inputRows, [40, 35, contentW - 75])

  y += 4

  // ── RESULTADOS ──
  if (surfaceData) {
    y = sectionTitle('RESULTADOS DE INTERACCIÓN', y)

    const maxMx = Math.max(...surfaceData.puntos.map(p => Math.abs(p.Mx)))
    const maxMy = Math.max(...surfaceData.puntos.map(p => Math.abs(p.My)))

    const resRows = [
      ['φP₀ (compresión)', `${(surfaceData.P_max / 1000).toFixed(1)} ton`, 'Capacidad axial máxima de diseño'],
      ['φPt (tracción)', `${(surfaceData.P_min / 1000).toFixed(1)} ton`, 'Capacidad a tracción pura'],
      ['φMx,máx', `${(maxMx / 100000).toFixed(2)} ton·m`, 'Momento máximo en X'],
      ['φMy,máx', `${(maxMy / 100000).toFixed(2)} ton·m`, 'Momento máximo en Y'],
      ['Puntos calculados', `${surfaceData.puntos.length}`, 'Puntos de la superficie'],
      ['Ag', `${surfaceData.area_concreto.toFixed(0)} cm²`, 'Área de concreto'],
    ]

    y = drawTable(doc, margin, y, ['Resultado', 'Valor', 'Descripción'], resRows, [42, 35, contentW - 77])

    y += 4

    // Cuantía check
    const rho = surfaceData.cuantia_acero
    const rhoOk = rho >= 1 && rho <= 6
    doc.setFillColor(rhoOk ? 230 : 255, rhoOk ? 248 : 235, rhoOk ? 245 : 235)
    doc.rect(margin, y, contentW, 8, 'F')
    doc.setDrawColor(rhoOk ? 0 : 220, rhoOk ? 168 : 38, rhoOk ? 150 : 38)
    doc.rect(margin, y, contentW, 8)
    doc.setTextColor(rhoOk ? 0 : 200, rhoOk ? 130 : 30, rhoOk ? 110 : 30)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(
      rhoOk
        ? `✓ Cuantía dentro del rango E.060: 1% ≤ ρ=${rho.toFixed(2)}% ≤ 6%`
        : `✗ Cuantía fuera del rango E.060: 1% ≤ ρ=${rho.toFixed(2)}% ≤ 6%`,
      margin + 3, y + 5.5
    )
    doc.setFont('helvetica', 'normal')
  }

  // ═══════════════════════════════════════════════════════════════
  // PÁGINA 2 — SECCIÓN Y BARRAS
  // ═══════════════════════════════════════════════════════════════
  doc.addPage()

  // Header
  doc.setFillColor(21, 71, 200)
  doc.rect(0, 0, W, 12, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('COLUMNSEIS E.060 — Sección Transversal y Refuerzo', margin, 8)
  doc.setFont('helvetica', 'normal')

  y = 20

  // Draw cross section
  y = sectionTitle('SECCIÓN TRANSVERSAL', y)

  const barras = columnData?.refuerzo?.barras || []
  const secSize = 70
  const secCx = margin + secSize / 2 + 10
  const secCy = y + secSize / 2 + 5
  const secB = esCircular ? (geo?.D || 50) : (geo?.b || 40)
  const secH = esCircular ? (geo?.D || 50) : (geo?.h || 50)
  const secScale = (secSize - 10) / Math.max(secB, secH)

  if (esCircular) {
    doc.setDrawColor(140, 150, 170)
    doc.setFillColor(220, 224, 232)
    doc.circle(secCx, secCy, (secB * secScale) / 2, 'FD')
  } else {
    const rw = secB * secScale, rh = secH * secScale
    doc.setDrawColor(140, 150, 170)
    doc.setFillColor(220, 224, 232)
    doc.rect(secCx - rw/2, secCy - rh/2, rw, rh, 'FD')
  }

  // Draw bars
  barras.forEach(bar => {
    const bx = secCx + bar.x * secScale
    const by = secCy - bar.y * secScale
    const br = Math.max(1.5, (bar.diametro / 2) * secScale)
    doc.setFillColor(220, 50, 50)
    doc.circle(bx, by, br, 'F')
  })

  // Dimension labels
  doc.setTextColor(80, 90, 110)
  doc.setFontSize(7)
  if (esCircular) {
    doc.text(`D = ${secB} cm`, secCx, secCy - (secB*secScale)/2 - 4, { align: 'center' })
  } else {
    doc.text(`b = ${secB} cm`, secCx, secCy - (secH*secScale)/2 - 4, { align: 'center' })
    doc.text(`h = ${secH} cm`, secCx + (secB*secScale)/2 + 6, secCy, { angle: 90 })
  }

  // Bars table
  const barsTableX = margin + secSize + 30
  const barsTableW = contentW - secSize - 30

  doc.setTextColor(30, 35, 50)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Coordenadas de Barras', barsTableX, y + 2)
  doc.setFont('helvetica', 'normal')

  const barHeaders = ['#', 'X (cm)', 'Y (cm)', '∅ (cm)', 'As (cm²)']
  const barRows = barras.map((bar, i) => [
    `${i+1}`,
    bar.x.toFixed(2),
    bar.y.toFixed(2),
    bar.diametro.toFixed(3),
    (bar.area || 0).toFixed(2),
  ])

  // Split bars into chunks if too many
  const maxRows = 12
  const chunk = barRows.slice(0, maxRows)
  const colW = barsTableW / 5
  drawTable(doc, barsTableX, y + 5, barHeaders, chunk, [colW, colW, colW, colW, colW])

  if (barRows.length > maxRows) {
    doc.setTextColor(130, 140, 160)
    doc.setFontSize(7)
    doc.text(`... y ${barRows.length - maxRows} barras más`, barsTableX, y + 5 + 6 + maxRows * 6 + 4)
  }

  // ═══════════════════════════════════════════════════════════════
  // PÁGINA 3 — ESTRIBOS (si disponible)
  // ═══════════════════════════════════════════════════════════════
  if (estribosData) {
    doc.addPage()

    doc.setFillColor(21, 71, 200)
    doc.rect(0, 0, W, 12, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('COLUMNSEIS E.060 — Diseño de Estribos Sísmicos (Cap. 21)', margin, 8)
    doc.setFont('helvetica', 'normal')

    y = 20
    y = sectionTitle('RESULTADOS DE ESTRIBOS E.060 SEC. 21.4.4', y)

    const estRows = [
      ['Zona confinamiento lo', `${estribosData.lo} cm`, `máx(h, ln/6, 45)`],
      ['Espaciamiento confinado so', `${estribosData.so} cm`, `mín(b/4, 6db, lím)`],
      ['Espaciamiento fuera s', `${estribosData.s_fuera} cm`, `mín(b/2, 30)`],
      ['Ash req. dir. b', `${estribosData.Ash_b} cm²`, `Ec. 21-3 / 21-4`],
      ['Ash req. dir. h', `${estribosData.Ash_h} cm²`, `Ec. 21-3 / 21-4`],
      ['Ash provista', `${estribosData.Ash_prov} cm²`, `n_ramas × A_estribo`],
      ['ρs mín.', `${estribosData.rho_s_min}%`, `0.12 f'c/fy`],
      ['ρs provista', `${estribosData.rho_s}%`, `Cuantía volumétrica`],
    ]

    y = drawTable(doc, margin, y, ['Parámetro', 'Valor', 'Referencia'], estRows, [55, 30, contentW - 85])

    y += 6
    y = sectionTitle('VERIFICACIONES', y)

    const checks = [
      [estribosData.ok_Ash_b, `Ash dir. b: ${estribosData.Ash_prov} ≥ ${estribosData.Ash_b} cm²`],
      [estribosData.ok_Ash_h, `Ash dir. h: ${estribosData.Ash_prov} ≥ ${estribosData.Ash_h} cm²`],
      [estribosData.ok_rho, `ρs: ${estribosData.rho_s}% ≥ ${estribosData.rho_s_min}%`],
      [estribosData.ok_diam, `∅ estribo ≥ ∅ mínimo (${estribosData.d_min} cm)`],
    ]

    checks.forEach(([ok, text]) => {
      doc.setFillColor(ok ? 230 : 255, ok ? 248 : 235, ok ? 245 : 235)
      doc.rect(margin, y, contentW, 7, 'F')
      doc.setDrawColor(ok ? 0 : 220, ok ? 168 : 38, ok ? 150 : 38)
      doc.rect(margin, y, contentW, 7)
      doc.setTextColor(ok ? 0 : 200, ok ? 130 : 30, ok ? 110 : 30)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text(`${ok ? '✓' : '✗'} ${text}`, margin + 3, y + 5)
      doc.setFont('helvetica', 'normal')
      y += 9
    })
  }

  // Footer on all pages
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setDrawColor(200, 205, 220)
    doc.line(margin, 285, W - margin, 285)
    doc.setTextColor(150, 155, 170)
    doc.setFontSize(6)
    doc.text('Generado por ColumnSeis E.060 — NTP E.060 / ACI 318', margin, 290)
    doc.text(`Página ${i} de ${totalPages}`, W - margin, 290, { align: 'right' })
  }

  doc.save(`ColumnSeis_${(proyecto?.nombre || 'Reporte').replace(/\s+/g,'_')}.pdf`)
}
