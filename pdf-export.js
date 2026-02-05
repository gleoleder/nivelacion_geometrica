// ===== PDF EXPORT =====
// Requiere: jspdf + jspdf-autotable cargados en el HTML
// Usa variables globales de script.js: calculatedData, perfilChart, pendientesChart

async function exportarPDF() {
    const { jsPDF } = window.jspdf;
    const filas = document.getElementById('cuerpoTabla').querySelectorAll('tr');
    if (filas.length === 0 || document.getElementById('empty-row')) { 
        alert('Añada datos y calcule primero'); return; 
    }
    if (!calculatedData) { alert('Primero presione "Calcular"'); return; }
    if (!confirm('¿Desea exportar el informe a PDF?')) return;

    const doc = new jsPDF('portrait', 'mm', 'letter');
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const M = 12;
    const usW = pageW - M * 2;
    let y = 0;
    let pageNum = 1;

    // --- Helper: truncar texto ---
    function truncText(txt, maxW, fSize) {
        doc.setFontSize(fSize);
        if (doc.getTextWidth(txt) <= maxW) return txt;
        while (doc.getTextWidth(txt + '...') > maxW && txt.length > 1) {
            txt = txt.slice(0, -1);
        }
        return txt + '...';
    }

    // --- Helper: encabezado de página ---
    function drawHeader() {
        doc.setFillColor(26, 26, 46);
        doc.rect(0, 0, pageW, 26, 'F');
        doc.setFillColor(193, 127, 62);
        doc.rect(0, 26, pageW, 1.2, 'F');

        doc.setTextColor(240, 235, 228);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('SISTEMA DE NIVELACIÓN TOPOGRÁFICA', pageW / 2, 10, { align: 'center' });

        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(154, 154, 176);
        doc.text('Perfil Longitudinal — Nivelación Geométrica Simple y Compuesta', pageW / 2, 16, { align: 'center' });

        doc.setFontSize(5.5);
        doc.text('Elaborado por: JOHN LEONARDO CABRERA ESPINDOLA', pageW / 2, 22, { align: 'center' });

        return 30;
    }

    // --- Helper: pie de página ---
    function drawFooter(pNum) {
        const fY = pageH - 8;
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.2);
        doc.line(M, fY - 2, pageW - M, fY - 2);
        doc.setFontSize(5.5);
        doc.setTextColor(120, 120, 120);
        doc.setFont(undefined, 'normal');
        const projName = document.getElementById('proyecto').value || 'Sin nombre';
        doc.text(truncText(projName, 60, 5.5), M, fY);
        doc.text('Pag. ' + pNum, pageW - M, fY, { align: 'right' });
        doc.text(document.getElementById('current-date').innerText, pageW / 2, fY, { align: 'center' });
    }

    // --- Helper: título de sección ---
    function drawSectionTitle(title, yPos) {
        doc.setFillColor(26, 26, 46);
        doc.roundedRect(M, yPos, usW, 6, 1, 1, 'F');
        doc.setFontSize(7);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(240, 235, 228);
        doc.text(title, M + 3, yPos + 4.2);
        return yPos + 8;
    }

    // --- Helper: nueva página si no hay espacio ---
    function checkNewPage(needed) {
        if (y > pageH - needed) {
            doc.addPage();
            pageNum++;
            y = drawHeader();
            drawFooter(pageNum);
        }
    }

    // ============================================
    //  PÁGINA 1: DATOS DEL PROYECTO + TABLA
    // ============================================
    y = drawHeader();

    // --- Caja de datos del proyecto ---
    doc.setFillColor(248, 245, 240);
    doc.roundedRect(M, y, usW, 16, 1.5, 1.5, 'F');
    doc.setDrawColor(193, 127, 62);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, y, usW, 16, 1.5, 1.5, 'S');

    const halfW = usW / 2;
    const projVal = document.getElementById('proyecto').value || 'N/A';
    const respVal = document.getElementById('responsable').value || 'N/A';
    const cotaVal = document.getElementById('cotaInicial').value || '0.000';
    const fechaVal = document.getElementById('current-date').innerText;
    const precVal = document.getElementById('precisionNivel').selectedOptions[0].text;

    doc.setFontSize(6.5);
    doc.setTextColor(26, 26, 46);

    doc.setFont(undefined, 'bold'); doc.text('PROYECTO:', M + 3, y + 5);
    doc.setFont(undefined, 'normal'); doc.text(truncText(projVal, halfW - 28, 6.5), M + 24, y + 5);

    doc.setFont(undefined, 'bold'); doc.text('FECHA:', M + halfW + 3, y + 5);
    doc.setFont(undefined, 'normal'); doc.text(truncText(fechaVal, halfW - 20, 6.5), M + halfW + 17, y + 5);

    doc.setFont(undefined, 'bold'); doc.text('RESPONSABLE:', M + 3, y + 10);
    doc.setFont(undefined, 'normal'); doc.text(truncText(respVal, halfW - 32, 6.5), M + 30, y + 10);

    doc.setFont(undefined, 'bold'); doc.text('COTA BM:', M + halfW + 3, y + 10);
    doc.setFont(undefined, 'normal'); doc.text(cotaVal + ' m', M + halfW + 22, y + 10);

    doc.setFont(undefined, 'bold'); doc.text('PRECISION:', M + 3, y + 15);
    doc.setFont(undefined, 'normal'); doc.text(truncText(precVal, halfW - 28, 6.5), M + 26, y + 15);

    y += 19;

    // --- TABLA con celdas combinadas por estación ---
    y = drawSectionTitle('LIBRETA DE CAMPO', y);

    const tableData = [];
    for (let i = 0; i < filas.length; i += 2) {
        const f1 = filas[i], f2 = filas[i + 1];
        if (!f2) break;

        const estName = f1.querySelector('.station-cell')?.innerText || '';
        const pvName1 = f1.querySelector('.pv-name')?.value || '-';
        const cx1 = f1.querySelector('.coord-x')?.value || '-';
        const cy1 = f1.querySelector('.coord-y')?.value || '-';
        const distV = f1.querySelector('.dist-val')?.value || '-';
        const vaV = f1.querySelector('.va')?.value || '-';
        const pvV = f1.querySelector('.pv')?.innerText || '-';
        const dhV = f1.querySelector('.dh')?.innerText || '-';
        const pendV = f1.querySelector('.pendiente-val')?.innerText || '-';
        const cota1 = f1.querySelectorAll('.cota-val')[0]?.innerText || '-';

        const pvName2 = f2.querySelector('.pv-name')?.value || '-';
        const cx2 = f2.querySelector('.coord-x')?.value || '-';
        const cy2 = f2.querySelector('.coord-y')?.value || '-';
        const vdV = f2.querySelector('.vd')?.value || '-';
        const cota2 = f2.querySelector('.cota-val')?.innerText || '-';

        // Fila 1: Est, Dist, Pend con rowSpan:2
        tableData.push([
            { content: estName, rowSpan: 2, styles: { fontStyle: 'bold', fillColor: [235, 230, 222], valign: 'middle' } },
            pvName1, cx1, cy1,
            { content: distV, rowSpan: 2, styles: { valign: 'middle' } },
            vaV,
            '',
            pvV,
            dhV,
            { content: pendV, rowSpan: 2, styles: { valign: 'middle', fontStyle: 'bold' } },
            cota1
        ]);
        // Fila 2
        tableData.push([
            pvName2, cx2, cy2,
            '',
            vdV,
            '', '',
            cota2
        ]);
    }

    // Fila de totales
    const dd = calculatedData;
    tableData.push([
        { content: 'TOTALES', colSpan: 4, styles: { fillColor: [26,26,46], textColor: [240,235,228], fontStyle: 'bold', halign: 'left' } },
        { content: dd.distAcum.toFixed(2), styles: { fillColor: [26,26,46], textColor: [232,168,92], fontStyle: 'bold' } },
        { content: dd.sumaVA.toFixed(3), styles: { fillColor: [26,26,46], textColor: [240,235,228] } },
        { content: dd.sumaVD.toFixed(3), styles: { fillColor: [26,26,46], textColor: [240,235,228] } },
        { content: '', styles: { fillColor: [26,26,46] } },
        { content: (dd.sumaVA - dd.sumaVD).toFixed(3), styles: { fillColor: [26,26,46], textColor: [232,168,92], fontStyle: 'bold' } },
        { content: dd.pendientePromedio.toFixed(2) + '%', styles: { fillColor: [26,26,46], textColor: [232,168,92], fontStyle: 'bold' } },
        { content: '', styles: { fillColor: [26,26,46] } },
    ]);

    doc.autoTable({
        startY: y,
        head: [['Est.', 'Punto', 'X (m)', 'Y (m)', 'Dist.(m)', 'V.At.(+)', 'V.Ad.(-)', 'P.Vis.', 'DH (m)', 'Pend.(%)', 'Cota(m)']],
        body: tableData,
        theme: 'grid',
        styles: { 
            fontSize: 5.8, 
            halign: 'center', 
            valign: 'middle',
            cellPadding: 1.5,
            lineColor: [180, 180, 180],
            lineWidth: 0.15,
            font: 'helvetica',
            overflow: 'ellipsize',
            cellWidth: 'wrap'
        },
        headStyles: { 
            fillColor: [26, 26, 46], 
            textColor: [240, 235, 228],
            fontSize: 5.5,
            fontStyle: 'bold',
            cellPadding: 2.5,
            halign: 'center'
        },
        columnStyles: {
            0: { cellWidth: 12, fontStyle: 'bold' },
            1: { cellWidth: 18, overflow: 'ellipsize' },
            2: { cellWidth: 17 },
            3: { cellWidth: 17 },
            4: { cellWidth: 16 },
            5: { cellWidth: 16 },
            6: { cellWidth: 16 },
            7: { cellWidth: 17 },
            8: { cellWidth: 16 },
            9: { cellWidth: 16 },
            10: { cellWidth: 20 },
        },
        alternateRowStyles: { fillColor: [250, 248, 244] },
        margin: { left: M, right: M },
        tableWidth: usW,
        didDrawPage: function(data) {
            if (data.pageNumber > 1) {
                drawHeader();
            }
            drawFooter(data.pageNumber);
            pageNum = data.pageNumber;
        }
    });

    y = doc.lastAutoTable.finalY + 6;

    // ============================================
    //  RESUMEN DE RESULTADOS
    // ============================================
    checkNewPage(70);

    y = drawSectionTitle('RESUMEN DE RESULTADOS', y);

    const d = calculatedData;

    doc.autoTable({
        startY: y,
        body: [
            [
                { content: 'Distancia Total', styles: { fontStyle: 'bold', textColor: [74,74,106] } },
                d.distAcum.toFixed(2) + ' m',
                { content: 'Cota Maxima', styles: { fontStyle: 'bold', textColor: [74,74,106] } },
                d.cotaMax.toFixed(3) + ' m'
            ],
            [
                { content: 'Desnivel Total', styles: { fontStyle: 'bold', textColor: [74,74,106] } },
                d.desnivelTotal.toFixed(3) + ' m',
                { content: 'Cota Minima', styles: { fontStyle: 'bold', textColor: [74,74,106] } },
                d.cotaMin.toFixed(3) + ' m'
            ],
            [
                { content: 'Cota Final', styles: { fontStyle: 'bold', textColor: [74,74,106] } },
                d.cotaActual.toFixed(3) + ' m',
                { content: 'Pend. Promedio', styles: { fontStyle: 'bold', textColor: [74,74,106] } },
                d.pendientePromedio.toFixed(2) + '%'
            ],
            [
                { content: 'SV.Atras', styles: { fontStyle: 'bold', textColor: [74,74,106] } },
                d.sumaVA.toFixed(3) + ' m',
                { content: 'SV.Adelante', styles: { fontStyle: 'bold', textColor: [74,74,106] } },
                d.sumaVD.toFixed(3) + ' m'
            ],
            [
                { content: 'N Est.', styles: { fontStyle: 'bold', textColor: [74,74,106] } },
                '' + d.numEstaciones,
                { content: 'Pend. Max Abs.', styles: { fontStyle: 'bold', textColor: [74,74,106] } },
                Math.max(Math.abs(d.pendMax), Math.abs(d.pendMin)).toFixed(2) + '%'
            ],
        ],
        theme: 'grid',
        styles: { fontSize: 6.5, cellPadding: 2, lineColor: [210,210,210], lineWidth: 0.15, overflow: 'ellipsize' },
        columnStyles: {
            0: { cellWidth: 32 },
            1: { cellWidth: usW/2 - 32, halign: 'center' },
            2: { cellWidth: 32 },
            3: { cellWidth: usW/2 - 32, halign: 'center' },
        },
        margin: { left: M, right: M },
        tableWidth: usW,
    });

    y = doc.lastAutoTable.finalY + 4;

    // --- Caja de tolerancia ---
    const tolColor = d.cumpleTol ? [58, 138, 92] : [196, 78, 78];
    const tolBg = d.cumpleTol ? [235, 250, 240] : [255, 238, 238];
    doc.setFillColor(...tolBg);
    doc.roundedRect(M, y, usW, 12, 1.5, 1.5, 'F');
    doc.setDrawColor(...tolColor);
    doc.setLineWidth(0.4);
    doc.roundedRect(M, y, usW, 12, 1.5, 1.5, 'S');

    doc.setFontSize(7);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...tolColor);
    const tolTitle = d.cumpleTol ? 'TOLERANCIA CUMPLIDA' : 'TOLERANCIA NO CUMPLIDA';
    doc.text(tolTitle, M + 4, y + 5);

    doc.setFont(undefined, 'normal');
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(6);
    const tolLine = 'Error: ' + d.errorCierre.toFixed(4) + ' m  |  Tolerancia: +/-' + d.tolerancia.toFixed(4) + ' m  |  Precision: +/-' + (d.precisionFactor*1000).toFixed(0) + 'mm*sqrtK';
    doc.text(truncText(tolLine, usW - 8, 6), M + 4, y + 10);

    y += 16;

    // ============================================
    //  GRÁFICOS
    // ============================================
    checkNewPage(95);

    y = drawSectionTitle('REPRESENTACION GRAFICA', y);

    if (perfilChart && pendientesChart) {
        const img1 = document.getElementById('perfilChart').toDataURL('image/png', 1.0);
        const img2 = document.getElementById('pendientesChart').toDataURL('image/png', 1.0);

        const spaceLeft = pageH - y - 15;
        const chartH = Math.min(80, (spaceLeft - 10) / 2);

        if (chartH >= 50) {
            doc.addImage(img1, 'PNG', M, y, usW, chartH);
            y += chartH + 5;
            doc.addImage(img2, 'PNG', M, y, usW, chartH);
            y += chartH + 8;
        } else {
            doc.addImage(img1, 'PNG', M, y, usW, 90);
            doc.addPage();
            pageNum++;
            y = drawHeader();
            drawFooter(pageNum);
            y = drawSectionTitle('REPRESENTACION GRAFICA (cont.)', y);
            doc.addImage(img2, 'PNG', M, y, usW, 90);
            y += 95;
        }
    }

    // ============================================
    //  OBSERVACIONES
    // ============================================
    checkNewPage(50);

    y = drawSectionTitle('OBSERVACIONES', y);
    doc.setFontSize(6.5);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(60, 60, 60);

    const obs = [
        'Nivelacion realizada con nivel de precision ' + document.getElementById('precisionNivel').selectedOptions[0].text.toLowerCase() + '.',
        'Cota de referencia BM: ' + d.cotaInicial.toFixed(3) + ' m.s.n.m.',
        'La pendiente promedio ponderada del terreno es ' + d.pendientePromedio.toFixed(2) + '%.',
        'Rango de cotas: ' + d.cotaMin.toFixed(3) + ' m (min.) a ' + d.cotaMax.toFixed(3) + ' m (max.). Desnivel total: ' + d.desnivelTotal.toFixed(3) + ' m.',
        d.cumpleTol 
            ? 'El error de cierre (' + d.errorCierre.toFixed(4) + ' m) se encuentra dentro de la tolerancia admisible (' + d.tolerancia.toFixed(4) + ' m).'
            : 'ATENCION: El error de cierre (' + d.errorCierre.toFixed(4) + ' m) excede la tolerancia admisible (' + d.tolerancia.toFixed(4) + ' m). Se recomienda repetir las observaciones.',
    ];

    obs.forEach(function(line) {
        const maxTxtW = usW - 10;
        const wrapped = doc.splitTextToSize('- ' + line, maxTxtW);
        wrapped.forEach(function(wLine) {
            doc.text(wLine, M + 3, y);
            y += 4;
        });
    });

    y += 4;

    // ============================================
    //  FIRMAS
    // ============================================
    const sigY = Math.max(y + 15, pageH - 30);
    if (sigY > pageH - 12) {
        doc.addPage();
        pageNum++;
        drawHeader();
        drawFooter(pageNum);
    }
    const finalSigY = Math.min(sigY, pageH - 18);

    doc.setDrawColor(26, 26, 46);
    doc.setLineWidth(0.3);

    const sigWidth = 55;
    const sigGap = 20;
    const totalSigW = sigWidth * 3 + sigGap * 2;
    const sigStartX = (pageW - totalSigW) / 2;

    const sigLabels = ['RESPONSABLE TECNICO', 'SUPERVISOR', 'VoBo DIRECTOR'];
    sigLabels.forEach(function(lbl, i) {
        const sx = sigStartX + i * (sigWidth + sigGap);
        doc.line(sx, finalSigY, sx + sigWidth, finalSigY);
        doc.setFontSize(5.5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(26, 26, 46);
        const lblW = doc.getTextWidth(lbl);
        doc.text(lbl, sx + (sigWidth - lblW) / 2, finalSigY + 4);
    });

    doc.save('Nivelacion_' + (document.getElementById('proyecto').value || 'Topografica').replace(/\s+/g, '_') + '.pdf');
}
