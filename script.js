// ===== FECHA =====
document.getElementById('current-date').innerText = new Date().toLocaleDateString('es-ES', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
});

let estacionCounter = 1;
let perfilChart = null;
let pendientesChart = null;
let calculatedData = null;

// ===== AGREGAR ESTACIÓN =====
function agregarEstacion() {
    const tbody = document.getElementById('cuerpoTabla');
    const emptyRow = document.getElementById('empty-row');
    if (emptyRow) emptyRow.remove();

    const numEst = estacionCounter;
    const tr1 = document.createElement('tr');
    tr1.className = 'fade-in';
    tr1.dataset.estacion = numEst;
    tr1.innerHTML = `
        <td rowspan="2" class="station-cell">E${numEst}</td>
        <td><input type="text" class="point-input pv-name" placeholder="Ej: BM-${numEst}"></td>
        <td><input type="number" class="table-input coord-x" step="0.001" placeholder="X"></td>
        <td><input type="number" class="table-input coord-y" step="0.001" placeholder="Y"></td>
        <td rowspan="2"><input type="number" class="table-input dist-val" step="0.01" placeholder="Dist."></td>
        <td><input type="number" class="table-input va" step="0.001" placeholder="0.000"></td>
        <td class="empty-cell"></td>
        <td class="calculated-cell pv">—</td>
        <td class="calculated-cell dh">—</td>
        <td rowspan="2" class="calculated-cell pendiente-val">—</td>
        <td class="calculated-cell cota-val">—</td>
        <td rowspan="2" class="no-print"><button class="btn-delete-row" onclick="eliminarEstacion(this)">✕</button></td>
    `;
    const tr2 = document.createElement('tr');
    tr2.className = 'fade-in';
    tr2.dataset.estacionSub = numEst;
    tr2.innerHTML = `
        <td><input type="text" class="point-input pv-name" placeholder="Ej: P-${numEst}"></td>
        <td><input type="number" class="table-input coord-x" step="0.001" placeholder="X"></td>
        <td><input type="number" class="table-input coord-y" step="0.001" placeholder="Y"></td>
        <td class="empty-cell"></td>
        <td><input type="number" class="table-input vd" step="0.001" placeholder="0.000"></td>
        <td class="empty-cell"></td>
        <td class="empty-cell"></td>
        <td class="calculated-cell cota-val">—</td>
    `;
    tbody.appendChild(tr1);
    tbody.appendChild(tr2);

    const coords = tr1.querySelectorAll('.coord-x, .coord-y');
    const coords2 = tr2.querySelectorAll('.coord-x, .coord-y');
    [...coords, ...coords2].forEach(inp => {
        inp.addEventListener('input', () => calcularDistanciaAuto(tr1, tr2));
    });

    estacionCounter++;
    tr1.querySelector('.pv-name').focus();
}

function eliminarEstacion(btn) {
    if (!confirm('¿Está seguro de eliminar esta estación? Esta acción no se puede deshacer.')) return;
    const tr1 = btn.closest('tr');
    const tr2 = tr1.nextElementSibling;
    if (tr2) tr2.remove();
    tr1.remove();
    if (document.getElementById('cuerpoTabla').children.length === 0) {
        document.getElementById('cuerpoTabla').innerHTML = `
            <tr id="empty-row"><td colspan="12">
                <div class="empty-state">
                    <div class="empty-state-icon">📐</div>
                    <div class="empty-state-text">No hay estaciones registradas</div>
                    <div class="empty-state-hint">Presione "Nueva Estación" para comenzar</div>
                </div>
            </td></tr>`;
    }
}

function calcularDistanciaAuto(tr1, tr2) {
    if (!document.getElementById('autoDistCheck').checked) return;
    const x1 = parseFloat(tr1.querySelector('.coord-x').value);
    const y1 = parseFloat(tr1.querySelector('.coord-y').value);
    const x2 = parseFloat(tr2.querySelector('.coord-x').value);
    const y2 = parseFloat(tr2.querySelector('.coord-y').value);
    if (!isNaN(x1) && !isNaN(y1) && !isNaN(x2) && !isNaN(y2)) {
        const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        tr1.querySelector('.dist-val').value = dist.toFixed(3);
    }
}

function limpiarTabla() { 
    if (confirm('¿Está seguro de borrar todos los datos? Esta acción no se puede deshacer.')) { 
        location.reload(); 
    } 
}

// ===== CALCULAR =====
function calcular() {
    const cotaInicial = parseFloat(document.getElementById('cotaInicial').value);
    if (isNaN(cotaInicial)) { alert('⚠ Ingrese la Cota Inicial (BM)'); return; }

    const filas = document.getElementById('cuerpoTabla').querySelectorAll('tr');
    if (filas.length === 0 || document.getElementById('empty-row')) { 
        alert('⚠ Agregue al menos una estación'); return; 
    }

    let cotaActual = cotaInicial;
    let sumaVA = 0, sumaVD = 0, distAcum = 0;
    let pData = [], labelsArr = [], pC = [];
    let sumaPendPond = 0;
    let estAnnotations = [];
    let cotaMax = -Infinity, cotaMin = Infinity;
    let pendMax = -Infinity, pendMin = Infinity;
    let numEstaciones = 0;

    for (let i = 0; i < filas.length; i += 2) {
        const f1 = filas[i], f2 = filas[i + 1];
        if (!f2) break;

        const dist = parseFloat(f1.querySelector('.dist-val')?.value) || 0;
        const va = parseFloat(f1.querySelector('.va')?.value) || 0;
        const vd = parseFloat(f2.querySelector('.vd')?.value) || 0;
        const estName = f1.querySelector('.station-cell')?.innerText || `E${i/2+1}`;

        sumaVA += va;
        sumaVD += vd;
        const pv = cotaActual + va;
        const dh = va - vd;
        const cotaSig = pv - vd;
        const pendiente = dist > 0 ? (dh / dist) * 100 : 0;

        if (dist > 0) sumaPendPond += (pendiente * dist);

        if (i === 0) {
            const lbl = f1.querySelector('.pv-name')?.value || 'BM';
            pData.push({ x: 0, y: cotaInicial, label: lbl });
            cotaMax = Math.max(cotaMax, cotaInicial);
            cotaMin = Math.min(cotaMin, cotaInicial);
        }

        f1.querySelector('.pv').innerText = pv.toFixed(3);
        f1.querySelector('.dh').innerText = dh.toFixed(3);
        f1.querySelector('.pendiente-val').innerText = pendiente.toFixed(2) + '%';
        f1.querySelectorAll('.cota-val')[0].innerText = cotaActual.toFixed(3);
        f2.querySelector('.cota-val').innerText = cotaSig.toFixed(3);

        const pendCell = f1.querySelector('.pendiente-val');
        if (Math.abs(pendiente) > 10) {
            pendCell.style.color = 'var(--danger)';
        } else if (Math.abs(pendiente) > 5) {
            pendCell.style.color = 'var(--accent)';
        } else {
            pendCell.style.color = 'var(--success)';
        }

        estAnnotations.push({ name: estName, x: distAcum + (dist / 2) });
        distAcum += dist;

        const lbl2 = f2.querySelector('.pv-name')?.value || `P-${i/2+1}`;
        pData.push({ x: distAcum, y: cotaSig, label: lbl2 });
        labelsArr.push(estName);
        pC.push(pendiente);

        cotaMax = Math.max(cotaMax, cotaSig);
        cotaMin = Math.min(cotaMin, cotaSig);
        pendMax = Math.max(pendMax, pendiente);
        pendMin = Math.min(pendMin, pendiente);

        cotaActual = cotaSig;
        numEstaciones++;
    }

    const pendientePromedio = distAcum > 0 ? (sumaPendPond / distAcum) : 0;
    const desnivelTotal = cotaActual - cotaInicial;
    const errorCierre = sumaVA - sumaVD - desnivelTotal;

    const distKm = distAcum / 1000;
    const precisionFactor = parseFloat(document.getElementById('precisionNivel').value);
    const tolerancia = precisionFactor * Math.sqrt(distKm > 0 ? distKm : 0.001);
    const errorAbs = Math.abs(errorCierre);
    const cumpleTol = errorAbs <= tolerancia;

    document.getElementById('totalDist').innerText = distAcum.toFixed(2);
    document.getElementById('sumaVA').innerText = sumaVA.toFixed(3);
    document.getElementById('sumaVD').innerText = sumaVD.toFixed(3);
    document.getElementById('sumaDH').innerText = (sumaVA - sumaVD).toFixed(3);
    document.getElementById('pendPromedio').innerText = pendientePromedio.toFixed(2) + '%';
    document.getElementById('tablaFooter').style.display = 'table-footer-group';

    const resContainer = document.getElementById('results-container');
    resContainer.style.display = 'grid';
    resContainer.innerHTML = `
        <div class="result-card fade-in"><div class="result-label">Distancia Total</div><div class="result-value">${distAcum.toFixed(2)} m</div></div>
        <div class="result-card fade-in"><div class="result-label">Desnivel Total</div><div class="result-value">${desnivelTotal.toFixed(3)} m</div></div>
        <div class="result-card highlight fade-in"><div class="result-label">Cota Final</div><div class="result-value">${cotaActual.toFixed(3)} m</div></div>
        <div class="result-card fade-in"><div class="result-label">Cota Máxima</div><div class="result-value">${cotaMax.toFixed(3)} m</div></div>
        <div class="result-card fade-in"><div class="result-label">Cota Mínima</div><div class="result-value">${cotaMin.toFixed(3)} m</div></div>
        <div class="result-card fade-in"><div class="result-label">Pend. Máx Absoluta</div><div class="result-value">${Math.max(Math.abs(pendMax), Math.abs(pendMin)).toFixed(2)}%</div></div>
    `;

    const tolSection = document.getElementById('tolerance-section');
    tolSection.style.display = 'block';
    tolSection.className = `tolerance-section fade-in ${cumpleTol ? 'pass' : 'fail'}`;
    tolSection.innerHTML = `
        <div class="tolerance-header">
            <span class="tolerance-badge ${cumpleTol ? 'pass' : 'fail'}">${cumpleTol ? '✓ Cumple' : '✗ No Cumple'}</span>
            <span style="font-size:0.82rem; font-weight:600;">Verificación de Tolerancia</span>
        </div>
        <div class="tolerance-details">
            Error de cierre: ${errorAbs.toFixed(4)} m &nbsp;|&nbsp; 
            Tolerancia admisible (±${(precisionFactor*1000).toFixed(0)}mm√K): ${tolerancia.toFixed(4)} m &nbsp;|&nbsp;
            ΣV.Atrás − ΣV.Adelante = ${(sumaVA - sumaVD).toFixed(4)} m &nbsp;|&nbsp;
            Estaciones: ${numEstaciones}
        </div>
    `;

    calculatedData = {
        distAcum, sumaVA, sumaVD, desnivelTotal, cotaActual, cotaInicial,
        errorCierre: errorAbs, tolerancia, cumpleTol, pendientePromedio,
        cotaMax, cotaMin, pendMax, pendMin, numEstaciones, precisionFactor
    };

    generarGraficos(pData, pC, labelsArr, estAnnotations, pendientePromedio);
}

// ===== GRÁFICOS (ORIGINAL) =====
function generarGraficos(pData, pC, labels, estAnnotations, pendientePromedio) {
    document.getElementById('charts-wrapper').style.display = 'grid';
    document.getElementById('charts-title').style.display = 'flex';
    
    const ctx1 = document.getElementById('perfilChart').getContext('2d');
    if (perfilChart) perfilChart.destroy();

    const annotations = {};
    
    // Líneas verticales de estaciones intermedias
    estAnnotations.forEach((est, i) => {
        annotations['line' + i] = {
            type: 'line',
            xMin: est.x,
            xMax: est.x,
            borderColor: '#ffadad',
            borderWidth: 1.5,
            borderDash: [5, 5],
            label: {
                display: true,
                content: est.name,
                position: 'start',
                backgroundColor: 'rgba(255, 173, 173, 0.85)',
                font: { size: 9, weight: 'bold' }
            }
        };
    });

    // Etiquetas de puntos con alineación inteligente
    pData.forEach((punto, i) => {
        let xAdjustValue = 0;
        if (i === 0) {
            xAdjustValue = 0;
        } else if (i === pData.length - 1) {
            xAdjustValue = 0;
        }

        annotations['punto_label_' + i] = {
            type: 'label',
            xValue: punto.x,
            yValue: punto.y,
            backgroundColor: 'rgba(212, 197, 185, 0.95)',
            borderColor: '#4a4a4a',
            borderWidth: 1,
            borderRadius: 4,
            content: [punto.label, `${punto.y.toFixed(2)} m`],
            font: { size: 9, weight: 'bold' },
            padding: 4,
            yAdjust: -35,
            xAdjust: xAdjustValue,
            callout: { enabled: true, side: 5, margin: 0 }
        };
    });

    perfilChart = new Chart(ctx1, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Perfil (m)',
                data: pData,
                borderColor: '#2d2d2d',
                backgroundColor: 'rgba(212, 197, 185, 0.3)',
                fill: true,
                tension: 0.1,
                pointRadius: 6,
                pointBackgroundColor: '#4a4a4a'
            }]
        },
        options: { 
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { top: 60, right: 40, bottom: 15, left: 15 }
            },
            plugins: {
                annotation: { annotations: annotations },
                legend: { display: false },
                title: { 
                    display: true, 
                    text: 'PERFIL LONGITUDINAL DEL TERRENO', 
                    font: { size: 14, weight: 'bold' },
                    color: '#2d2d2d',
                    padding: 10
                }
            },
            scales: { 
                x: { 
                    type: 'linear',
                    grace: '10%',
                    title: { display: true, text: 'Distancia (m)', font: { size: 11 } },
                    ticks: { font: { size: 9 } }
                },
                y: { 
                    grace: '50%',
                    title: { display: true, text: 'Cota (m)', font: { size: 11 } },
                    ticks: { font: { size: 9 } }
                }
            }
        }
    });

    // === GRÁFICO DE PENDIENTES (ORIGINAL) ===
    const ctx2 = document.getElementById('pendientesChart').getContext('2d');
    if (pendientesChart) pendientesChart.destroy();
    
    pendientesChart = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Pendiente (%)',
                data: pC,
                backgroundColor: 'rgba(74, 74, 74, 0.8)',
                borderColor: '#2d2d2d',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { top: 30, right: 20, bottom: 10, left: 10 }
            },
            plugins: {
                legend: { display: false },
                title: { 
                    display: true, 
                    text: 'PENDIENTES POR TRAMO', 
                    font: { size: 14, weight: 'bold' },
                    color: '#2d2d2d',
                    padding: 10
                },
                annotation: {
                    annotations: {
                        prom: {
                            type: 'line',
                            yMin: pendientePromedio,
                            yMax: pendientePromedio,
                            borderColor: '#ff6b6b',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            label: { 
                                display: true, 
                                content: 'Prom: ' + pendientePromedio.toFixed(2) + '%',
                                position: 'end',
                                backgroundColor: 'rgba(255, 107, 107, 0.9)',
                                font: { size: 9, weight: 'bold' }
                            }
                        }
                    }
                }
            },
            scales: {
                y: { 
                    ticks: { 
                        font: { size: 9 }, 
                        callback: function(v) { return Number(v).toFixed(1) + '%'; }
                    } 
                },
                x: { ticks: { font: { size: 9 } } }
            }
        }
    });
}
