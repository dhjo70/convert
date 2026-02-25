let data = null;
let playing = false;
let currentEpoch = 0;
let totalEpochs = 0;
let interval = null;
let speed = 40;
let fittingChart, lossChart, weightChart, biasChart;

const milestones = [
    { epoch: 1, label: 'START', major: true },
    { epoch: 100, label: '100' },
    { epoch: 200, label: '200' },
    { epoch: 300, label: '300' },
    { epoch: 500, label: '500', major: true },
    { epoch: 700, label: '700' },
    { epoch: 800, label: '800' },
    { epoch: 1000, label: 'END', major: true },
];

function init() {
    fetch('./training_history.json?t=' + Date.now())
        .then(r => r.json())
        .then(d => {
            data = d;
            totalEpochs = data.history.length;
            initTimeline();
            initCharts();
            updateView(0);
        })
        .catch(err => {
            document.querySelector('.app').innerHTML = `
        <div style="text-align:center;padding:60px;color:var(--accent-red);">
            <h2>⚠️ training_history.json을 불러올 수 없습니다</h2>
            <p style="margin-top:12px;color:var(--text-secondary);">
                먼저 <code>uv run python export_training.py</code>를 실행하세요.
            </p>
        </div>`;
        });
}

function initTimeline() {
    const container = document.getElementById('timelineMilestones');
    milestones.forEach(m => {
        const el = document.createElement('div');
        el.className = 'milestone' + (m.major ? ' major' : '');
        const pct = ((m.epoch - 1) / (totalEpochs - 1)) * 100;
        el.style.left = pct + '%';
        el.innerHTML = `<div class="milestone-tick"></div><span class="milestone-label">${m.label}</span>`;
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = Math.min(m.epoch - 1, totalEpochs - 1);
            if (playing) togglePlay();
            updateView(idx);
        });
        container.appendChild(el);
    });

    const timeline = document.getElementById('spacexTimeline');
    let isDragging = false;

    function seekToPosition(e) {
        const rect = timeline.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const pct = x / rect.width;
        const idx = Math.round(pct * (totalEpochs - 1));
        updateView(idx);
    }

    timeline.addEventListener('mousedown', (e) => {
        isDragging = true;
        if (playing) togglePlay();
        seekToPosition(e);
    });
    document.addEventListener('mousemove', (e) => { if (isDragging) seekToPosition(e); });
    document.addEventListener('mouseup', () => { isDragging = false; });
}

function updateTimeline(epochIdx) {
    const pct = (epochIdx / (totalEpochs - 1)) * 100;
    document.getElementById('timelineProgress').style.width = pct + '%';
    document.getElementById('timelineGlow').style.width = pct + '%';
    document.getElementById('timelineIndicator').style.left = `calc(${pct}% - 7px)`;

    const epoch = epochIdx + 1;
    document.querySelectorAll('.milestone').forEach((el, i) => {
        el.classList.toggle('passed', milestones[i].epoch <= epoch);
    });

    document.getElementById('phaseRapid').classList.toggle('active-phase', epoch <= 350);
    document.getElementById('phaseConverge').classList.toggle('active-phase', epoch > 350 && epoch <= 700);
    document.getElementById('phaseFine').classList.toggle('active-phase', epoch > 700);

    document.getElementById('telemetryEpoch').innerHTML =
        `${epoch} <span class="unit">/ ${totalEpochs}</span>`;
    document.getElementById('timelineIndicator').classList.toggle('active', playing);
}

function initCharts() {
    const baseOpts = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        plugins: { legend: { display: false } },
        scales: {
            x: { grid: { color: 'rgba(148,163,184,0.06)' }, ticks: { color: '#64748b', font: { size: 11 } } },
            y: { grid: { color: 'rgba(148,163,184,0.06)' }, ticks: { color: '#64748b', font: { size: 11 } } }
        }
    };

    fittingChart = new Chart(document.getElementById('fittingChart'), {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: '정답',
                    data: data.celsius.map((c, i) => ({ x: c, y: data.fahrenheit[i] })),
                    backgroundColor: 'rgba(34, 211, 238, 0.8)',
                    borderColor: '#22d3ee',
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    borderWidth: 2,
                    order: 1,
                },
                {
                    label: '예측 라인',
                    data: [],
                    type: 'line',
                    borderColor: '#818cf8',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                    order: 2,
                },
                {
                    label: '예측',
                    data: [],
                    backgroundColor: 'rgba(244, 114, 182, 0.8)',
                    borderColor: '#f472b6',
                    pointRadius: 4,
                    pointStyle: 'rectRot',
                    borderWidth: 1.5,
                    order: 0,
                }
            ]
        },
        options: {
            ...baseOpts,
            plugins: {
                ...baseOpts.plugins,
                legend: {
                    display: true,
                    labels: { color: '#94a3b8', font: { size: 11 }, usePointStyle: true, padding: 10 }
                }
            },
            scales: {
                ...baseOpts.scales,
                x: { ...baseOpts.scales.x, title: { display: true, text: '섭씨 (°C)', color: '#64748b', font: { size: 11 } } },
                y: { ...baseOpts.scales.y, title: { display: true, text: '화씨 (°F)', color: '#64748b', font: { size: 11 } }, min: -80, max: 140 }
            }
        }
    });

    lossChart = new Chart(document.getElementById('lossChart'), {
        type: 'line',
        data: {
            labels: [], datasets: [{
                data: [],
                borderColor: '#fb923c',
                backgroundColor: 'rgba(251, 146, 60, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                fill: true,
                tension: 0.3,
            }]
        },
        options: {
            ...baseOpts,
            scales: {
                ...baseOpts.scales,
                x: { ...baseOpts.scales.x, title: { display: true, text: 'Epoch', color: '#64748b', font: { size: 11 } } },
                y: { ...baseOpts.scales.y, title: { display: true, text: 'Loss (MSE)', color: '#64748b', font: { size: 11 } }, type: 'logarithmic' }
            }
        }
    });

    weightChart = new Chart(document.getElementById('weightChart'), {
        type: 'line',
        data: {
            labels: [], datasets: [
                { data: [], borderColor: '#34d399', backgroundColor: 'rgba(52, 211, 153, 0.1)', borderWidth: 2, pointRadius: 0, fill: true, tension: 0.3 },
                { label: '목표 (1.8)', data: [], borderColor: 'rgba(52, 211, 153, 0.3)', borderWidth: 1.5, borderDash: [6, 4], pointRadius: 0, fill: false }
            ]
        },
        options: {
            ...baseOpts,
            scales: {
                ...baseOpts.scales,
                x: { ...baseOpts.scales.x, title: { display: true, text: 'Epoch', color: '#64748b', font: { size: 11 } } },
                y: { ...baseOpts.scales.y, title: { display: true, text: 'Weight', color: '#64748b', font: { size: 11 } } }
            }
        }
    });

    biasChart = new Chart(document.getElementById('biasChart'), {
        type: 'line',
        data: {
            labels: [], datasets: [
                { data: [], borderColor: '#f472b6', backgroundColor: 'rgba(244, 114, 182, 0.1)', borderWidth: 2, pointRadius: 0, fill: true, tension: 0.3 },
                { label: '목표 (32.0)', data: [], borderColor: 'rgba(244, 114, 182, 0.3)', borderWidth: 1.5, borderDash: [6, 4], pointRadius: 0, fill: false }
            ]
        },
        options: {
            ...baseOpts,
            scales: {
                ...baseOpts.scales,
                x: { ...baseOpts.scales.x, title: { display: true, text: 'Epoch', color: '#64748b', font: { size: 11 } } },
                y: { ...baseOpts.scales.y, title: { display: true, text: 'Bias', color: '#64748b', font: { size: 11 } } }
            }
        }
    });
}

function updateView(epochIdx) {
    if (!data) return;
    currentEpoch = epochIdx;
    const h = data.history[epochIdx];

    document.getElementById('statEpoch').textContent = h.epoch;
    document.getElementById('statWeight').textContent = h.weight.toFixed(4);
    document.getElementById('statBias').textContent = h.bias.toFixed(4);
    document.getElementById('statLoss').textContent = h.loss < 10 ? h.loss.toFixed(4) : h.loss.toFixed(1);

    updateTimeline(epochIdx);

    fittingChart.data.datasets[1].data = h.line_x.map((x, i) => ({ x, y: h.line_y[i] }));
    fittingChart.data.datasets[2].data = data.celsius.map((c, i) => ({ x: c, y: h.predictions[i] }));
    fittingChart.update();

    const labels = data.history.slice(0, epochIdx + 1).map(d => d.epoch);
    const losses = data.history.slice(0, epochIdx + 1).map(d => d.loss);
    const weights = data.history.slice(0, epochIdx + 1).map(d => d.weight);
    const biases = data.history.slice(0, epochIdx + 1).map(d => d.bias);

    lossChart.data.labels = labels;
    lossChart.data.datasets[0].data = losses;
    lossChart.update();

    weightChart.data.labels = labels;
    weightChart.data.datasets[0].data = weights;
    weightChart.data.datasets[1].data = labels.map(() => 1.8);
    weightChart.update();

    biasChart.data.labels = labels;
    biasChart.data.datasets[0].data = biases;
    biasChart.data.datasets[1].data = labels.map(() => 32.0);
    biasChart.update();

    const tbody = document.getElementById('predTableBody');
    tbody.innerHTML = data.celsius.map((c, i) => {
        const actual = data.fahrenheit[i];
        const pred = h.predictions[i];
        const error = Math.abs(actual - pred);
        const errorColor = error < 1 ? 'var(--accent-green)' : error < 5 ? 'var(--accent-orange)' : 'var(--accent-red)';
        return `<tr>
    <td>${c}°C</td>
    <td>${actual}°F</td>
    <td>${pred.toFixed(2)}°F</td>
    <td class="error-cell" style="color:${errorColor}">${error.toFixed(2)}</td>
</tr>`;
    }).join('');
}

export function togglePlay() {
    playing = !playing;
    const btn = document.getElementById('playBtn');
    btn.textContent = playing ? '⏸' : '▶';
    btn.classList.toggle('playing', playing);
    document.getElementById('timelineIndicator').classList.toggle('active', playing);

    if (playing) {
        if (currentEpoch >= totalEpochs - 1) currentEpoch = 0;
        interval = setInterval(() => {
            if (currentEpoch >= totalEpochs - 1) { togglePlay(); return; }
            currentEpoch++;
            updateView(currentEpoch);
        }, speed);
    } else {
        clearInterval(interval);
    }
}

export function setSpeed(ms) {
    speed = ms;
    document.querySelectorAll('.speed-btn').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.speed) === ms);
    });
    if (playing) {
        clearInterval(interval);
        interval = setInterval(() => {
            if (currentEpoch >= totalEpochs - 1) { togglePlay(); return; }
            currentEpoch++;
            updateView(currentEpoch);
        }, speed);
    }
}

// Attach export functions to window so inline event handlers in HTML work
window.togglePlay = togglePlay;
window.setSpeed = setSpeed;

document.addEventListener("DOMContentLoaded", init);
