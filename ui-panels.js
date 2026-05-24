// ═══════════════════════════════════════════════════════
//  UI PANELS ENGINE
//  Sağ panel, bilgi paneli, log tablosu, modallar
// ═══════════════════════════════════════════════════════

function renderMicroscopyPanel(b) {
  const card = document.getElementById('microscopyCard');
  if (!b) {
    card.style.display = 'none';
    return;
  }
  card.style.display = 'block';

  document.getElementById('microscopyName').textContent = b.name;
  
  const gramEl = document.getElementById('microscopyGram');
  gramEl.textContent = b.gram;
  gramEl.className = 'microscopy-gram ' + (b.gramPos ? 'gram-pos' : 'gram-neg');
  
  const descEl = document.getElementById('microscopyDesc');
  descEl.textContent = b.info ? b.info.morphology_desc : 'Bilgi yok';
  descEl.title = descEl.textContent;

  const imgContainer = document.getElementById('microscopyImgContainer');
  const imgPath = `assets/images/${b._id}.jpg`;
  
  // Create an image object to test if it exists
  const img = new Image();
  img.onload = () => {
    imgContainer.innerHTML = `<img src="${imgPath}" alt="${b.name}" style="width:100%;height:100%;object-fit:cover;border-radius:5px;">`;
  };
  img.onerror = () => {
    // Fallback SVG
    imgContainer.innerHTML = `
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--text3)">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <circle cx="12" cy="13" r="3"></circle>
      </svg>
    `;
  };
  img.src = imgPath;
}

function renderInfoPanel(b) {
  const el = document.getElementById('infoContent');
  const info = b.info;
  if (!info) {
    el.innerHTML = `<div class="info-name">${b.name}</div><div class="info-placeholder">Bu tür için bilgi mevcut değil</div>`;
    return;
  }
  el.innerHTML = `
    <div class="info-name">${b.name}</div>
    <div class="info-row"><span class="info-icon">🔬</span><span class="info-label">Morfoloji</span><span class="info-val">${info.morphology_desc}</span></div>
    <div class="info-row"><span class="info-icon">🌍</span><span class="info-label">Habitat</span><span class="info-val">${info.habitat_desc}</span></div>
    <div class="info-row"><span class="info-icon">⚕</span><span class="info-label">Klinik</span><span class="info-val">${info.clinical_desc}</span></div>
    <div class="info-row"><span class="info-icon">📅</span><span class="info-label">Keşif</span><span class="info-val">${info.discovery_desc}</span></div>
    <div class="info-row"><span class="info-icon">🏭</span><span class="info-label">Kullanım</span><span class="info-val">${info.industrial_use}</span></div>
    <div class="info-divider"></div>
    <div class="info-row"><span class="info-icon">🌡</span><span class="info-label">Sıcaklık</span><span class="info-val">${b.tempMin}–${b.tempMax}°C (Opt: ${b.tempOptimum}°C)</span></div>
    <div class="info-row"><span class="info-icon">⚗</span><span class="info-label">pH</span><span class="info-val">${b.phMin}–${b.phMax} (Opt: ${b.phOptimum})</span></div>
    <div class="info-row"><span class="info-icon">🧂</span><span class="info-label">NaCl</span><span class="info-val">${b.naclMin}–${b.naclMax}% (Opt: ${b.naclOptimal}%)</span></div>
    <div class="info-row"><span class="info-icon">🧫</span><span class="info-label">Ortam</span><span class="info-val">${b.nutrientMedium}</span></div>
    <div class="info-fact">💡 ${info.fun_fact}</div>
  `;
}

function showSelectedBadge(b) {
  const badge = document.getElementById('selectedBadge');
  const dot = document.getElementById('selectedBadgeDot');
  const nameEl = document.getElementById('selectedBadgeName');
  nameEl.textContent = b.name;
  dot.style.background = b.hex;
  badge.classList.add('visible');
}

let detailTimeout;
function showDetailPanel(b) {
  const panel = document.getElementById('detailPanel');
  document.getElementById('detailName').textContent = b.name;

  const gridData = [
    { label: 'Opt. Temp', val: b.tempOptimum + '°C' },
    { label: 'Doubling', val: b.doublingTime + 'h' },
    { label: 'Temp Range', val: `${b.tempMin}–${b.tempMax}°C` },
    { label: 'Colony/Day', val: b.colonySize + 'mm' },
  ];

  document.getElementById('detailGrid').innerHTML = gridData.map(d => `
    <div class="detail-cell">
      <div class="detail-cell-label">${d.label}</div>
      <div class="detail-cell-val">${d.val}</div>
    </div>
  `).join('');

  const badges = [];
  if (b.aggressiveness === 'Yüksek') badges.push('<span class="detail-badge hi">High Aggr.</span>');
  if (b.bioluminescent) badges.push('<span class="detail-badge glow">Bioluminescent</span>');
  if (b.toxin !== 'Yok') badges.push('<span class="detail-badge hi">Toxigenic</span>');
  if (b.pigment !== 'Renksiz' && b.pigment !== 'Beyaz') badges.push(`<span class="detail-badge">${b.pigment.split('(')[0].trim()}</span>`);

  document.getElementById('detailBadges').innerHTML = badges.join('');
  panel.style.display = 'block';

  clearTimeout(detailTimeout);
  detailTimeout = setTimeout(() => { panel.style.display = 'none'; }, 4000);
}

function updateDishCount(activeDishes) {
  document.getElementById('dishCountLabel').textContent = `${activeDishes.length} dish${activeDishes.length !== 1 ? 'es' : ''} active`;
  document.getElementById('bacteriaCountLabel').textContent = `${BacteriaStore.all.length} strain loaded`;
}

function updatePanelMode(activeDishes, selectedBacteria) {
  const hasEmptyPetri = activeDishes.some(d => d.inoculations.length === 0);
  const listPanel = document.getElementById('panelModeList');
  const splitPanel = document.getElementById('panelModeSplit');

  if (hasEmptyPetri || activeDishes.length === 0 || window.isListModeForced) {
    listPanel.style.display = '';
    splitPanel.style.display = 'none';
  } else {
    listPanel.style.display = 'none';
    splitPanel.style.display = 'flex';
    if (selectedBacteria) renderInfoPanel(selectedBacteria);
  }
}

function showFlash(msg) {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed;bottom:150px;left:50%;transform:translateX(-50%);
    background:var(--surface);border:1px solid var(--border);
    border-radius:20px;padding:8px 18px;font-size:12px;
    font-family:Space Mono,monospace;color:var(--text-muted);
    z-index:300;animation:fadeUp 0.2s ease;
  `;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

function renderLogTable(experimentLog) {
  const tbody = document.getElementById('logTableBody');
  if (!tbody) return;
  tbody.innerHTML = experimentLog.map(e => `
    <tr>
      <td>${e.petri}</td>
      <td>${e.date}</td>
      <td>${e.time}</td>
      <td>${e.action}</td>
      <td>${e.temp}</td>
      <td>${e.ph}</td>
      <td>${e.oxy}</td>
      <td>${e.nacl}</td>
    </tr>
  `).join('');
  const wrap = document.getElementById('logTableWrap');
  if (wrap) wrap.scrollTop = wrap.scrollHeight;
}

window.renderInfoPanel = renderInfoPanel;

// ═══════════════════════════════════════════════════════
//  CHART MANAGER & ACCORDION
// ═══════════════════════════════════════════════════════

Chart.defaults.color = '#9aa0a8';
Chart.defaults.font.family = '"Space Mono", monospace';
Chart.defaults.borderColor = '#2a2f35';

const ChartManager = {
  charts: {},
  
  init() {},

  destroyChart(id) {
    if (this.charts[id]) {
      this.charts[id].destroy();
      delete this.charts[id];
    }
  },

  updateAll(bacteria, dishParams) {
    if (!bacteria) return;
    // Default env fallback if no dish is active
    const env = dishParams || { temp: 37, ph: 7.0, nacl: 0.5, inoculations: [] };
    
    // Phase 1
    this.renderGrowthCurve(bacteria, env);
    this.renderHeatmap(bacteria, env);
    this.renderRadar(bacteria, env);
    
    // Phase 2
    this.renderMICProfile(bacteria, env);
    this.renderPopulationDynamics(bacteria, env);
    this.renderNutrientDepletion(bacteria, env);

    // Phase 3
    this.renderSurvivalCurve(bacteria, env);
    this.renderMutationFreq(bacteria, env);
    this.renderBiofilmThickness(bacteria, env);
    this.renderStressIndex(bacteria, env);
  },

  renderGrowthCurve(b, env) {
    this.destroyChart('chart-growth');
    const canvas = document.getElementById('chart-growth');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const K = 1.0;
    const r = b.growthRate * 2; 
    const lag = b.lagPhaseHours;
    const maxT = 24;
    const A = (K - 0.01) / 0.01; 
    
    const tF = window.calcTempFactor ? window.calcTempFactor(env.temp, b.tempMin, b.tempOptimum, b.tempMax) : 1;
    const pF = window.calcPhFactor ? window.calcPhFactor(env.ph, b.phMin, b.phOptimum, b.phMax) : 1;
    const envStress = tF * pF;
    const effectiveR = r * envStress;
    
    const labels = [];
    const data = [];
    for (let t = 0; t <= maxT; t++) {
      labels.push(t + 'h');
      if (t < lag) {
        data.push(0.01);
      } else {
        const shiftedT = t - lag;
        const nt = K / (1 + A * Math.exp(-effectiveR * shiftedT));
        data.push(nt);
      }
    }
    
    this.charts['chart-growth'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'OD600 (Biyokütle)',
          data,
          borderColor: '#00e5a0',
          backgroundColor: 'rgba(0, 229, 160, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { min: 0, max: 1.2, grid: { color: 'rgba(255,255,255,0.05)' } },
          x: { grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  },

  renderHeatmap(b, env) {
    const container = document.getElementById('chart-heatmap-container');
    if (!container) return;
    container.innerHTML = '';
    
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(15, 1fr)';
    grid.style.gap = '1px';
    grid.style.background = 'var(--border)';
    grid.style.border = '1px solid var(--border)';
    grid.style.padding = '1px';
    
    for (let temp = 100; temp >= 0; temp -= 5) {
      for (let ph = 0; ph <= 14; ph++) {
        const cell = document.createElement('div');
        cell.style.aspectRatio = '1';
        cell.style.position = 'relative';
        
        const tempSigma = (b.tempMax - b.tempMin) / 4 || 1;
        const phSigma = (b.phMax - b.phMin) / 4 || 1;
        
        const tempScore = Math.exp(-Math.pow(temp - b.tempOptimum, 2) / (2 * Math.pow(tempSigma, 2)));
        const phScore = Math.exp(-Math.pow(ph - b.phOptimum, 2) / (2 * Math.pow(phSigma, 2)));
        const score = tempScore * phScore;
        
        let finalScore = score;
        if (temp < b.tempMin || temp > b.tempMax || ph < b.phMin || ph > b.phMax) {
          finalScore = 0;
        }
        
        cell.style.backgroundColor = `rgba(0, 229, 160, ${finalScore})`;
        
        if (Math.abs(temp - env.temp) <= 2.5 && Math.abs(ph - env.ph) <= 0.5) {
          cell.style.border = '1px solid #fff';
        }
        
        cell.title = `Temp: ${temp}°C, pH: ${ph} | Score: ${(finalScore*100).toFixed(0)}%`;
        grid.appendChild(cell);
      }
    }
    
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '8px';
    wrapper.style.fontSize = '9px';
    wrapper.style.color = 'var(--text3)';
    wrapper.style.fontFamily = 'var(--font-mono)';
    
    const xLabel = document.createElement('div');
    xLabel.style.display = 'flex';
    xLabel.style.justifyContent = 'space-between';
    xLabel.style.marginLeft = '20px';
    xLabel.innerHTML = `<span>pH 0</span><span>pH 14</span>`;
    
    const yWrap = document.createElement('div');
    yWrap.style.display = 'flex';
    yWrap.style.gap = '4px';
    
    const yLabel = document.createElement('div');
    yLabel.style.display = 'flex';
    yLabel.style.flexDirection = 'column';
    yLabel.style.justifyContent = 'space-between';
    yLabel.innerHTML = `<span>100°C</span><span>0°C</span>`;
    
    grid.style.flex = '1';
    yWrap.appendChild(yLabel);
    yWrap.appendChild(grid);
    wrapper.appendChild(yWrap);
    wrapper.appendChild(xLabel);
    
    container.appendChild(wrapper);
  },

  renderRadar(b, env) {
    this.destroyChart('chart-radar');
    const canvas = document.getElementById('chart-radar');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const labels = ['Penisilin', 'Tetrasiklin', 'Vankomisin', 'Siprofloksasin', 'Meropenem'];
    const data = [10, 10, 10, 10, 10]; 
    
    if (b.gramPos) {
      data[0] = 20; 
      data[2] = 5;  
      data[4] = 30; 
    } else {
      data[0] = 85; 
      data[2] = 95; 
      data[4] = 45;
    }
    
    this.charts['chart-radar'] = new Chart(ctx, {
      type: 'radar',
      data: {
        labels,
        datasets: [{
          label: 'Direnç Skoru (0-100)',
          data,
          backgroundColor: 'rgba(255, 60, 60, 0.2)',
          borderColor: '#ff3c3c',
          borderWidth: 2,
          pointBackgroundColor: '#ff3c3c',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#ff3c3c'
        }]
      },
      options: {
        responsive: true,
        scales: {
          r: {
            angleLines: { color: 'rgba(255, 255, 255, 0.05)' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            pointLabels: { color: '#9aa0a8', font: { family: '"Space Mono", monospace', size: 9 } },
            ticks: { display: false, min: 0, max: 100 }
          }
        },
        plugins: { legend: { display: false } }
      }
    });
  },

  renderMICProfile(b, env) {
    const container = document.getElementById('chart-mic-table');
    if (!container) return;
    
    let html = `
      <table style="width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 10px; color: var(--text2);">
        <thead>
          <tr style="border-bottom: 1px solid var(--border); color: var(--text3); text-align: left;">
            <th style="padding: 6px;">Antibiyotik</th>
            <th style="padding: 6px;">MIC (mg/L)</th>
            <th style="padding: 6px;">Sınıf</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    const antibiotics = [
      { name: 'Penisilin', mic: b.gramPos ? 0.05 : 32, type: b.gramPos ? 'S' : 'R' },
      { name: 'Tetrasiklin', mic: 4, type: 'I' },
      { name: 'Vankomisin', mic: b.gramPos ? 1 : 64, type: b.gramPos ? 'S' : 'R' },
      { name: 'Siprofloksasin', mic: 0.5, type: 'S' },
      { name: 'Meropenem', mic: b.gramPos ? 2 : 8, type: b.gramPos ? 'S' : 'I' }
    ];
    
    antibiotics.forEach(a => {
      let color = 'var(--text2)';
      if (a.type === 'R') color = 'var(--red)';
      if (a.type === 'S') color = 'var(--accent)';
      if (a.type === 'I') color = 'var(--amber)';
      
      html += `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.02);">
          <td style="padding: 6px;">${a.name}</td>
          <td style="padding: 6px;">${a.mic}</td>
          <td style="padding: 6px; color: ${color}; font-weight: bold;">${a.type}</td>
        </tr>
      `;
    });
    
    html += `</tbody></table>`;
    container.innerHTML = html;
  },

  renderPopulationDynamics(b, env) {
    this.destroyChart('chart-population');
    const canvas = document.getElementById('chart-population');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const labels = [];
    const datasets = [];
    const maxT = 24;
    for (let t = 0; t <= maxT; t++) labels.push(t + 'h');
    
    const inocs = env.inoculations || [];
    let strains = [];
    if (inocs.length > 1) {
      const uniqueIds = new Set();
      inocs.forEach(cfu => {
        if (!uniqueIds.has(cfu.bacteria._id)) {
          uniqueIds.add(cfu.bacteria._id);
          strains.push(cfu.bacteria);
        }
      });
    } else {
      strains.push(b);
    }
    
    strains.forEach((strain, index) => {
      const K = 1.0;
      let effectiveR = strain.growthRate * 2;
      
      let competitionFactor = 0;
      if (strains.length > 1) {
        strains.forEach(other => {
          if (other._id !== strain._id) {
            if (other.toxin !== 'Yok' && strain.toxin === 'Yok') competitionFactor += 0.2;
            if (other.growthRate > strain.growthRate) competitionFactor += 0.1;
          }
        });
      }
      
      const data = [];
      let N = 0.01;
      for (let t = 0; t <= maxT; t++) {
        if (t < strain.lagPhaseHours) {
          data.push(N);
        } else {
          let dN = effectiveR * N * (1 - (N / K)) - (competitionFactor * N * (t / maxT));
          N = N + dN;
          if (N < 0) N = 0;
          data.push(N);
        }
      }
      
      const colors = ['#00e5a0', '#4fc3f7', '#ce93d8', '#ff4d4d'];
      datasets.push({
        label: strain.name,
        data,
        borderColor: colors[index % colors.length],
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2
      });
    });
    
    this.charts['chart-population'] = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        plugins: { 
          legend: { 
            display: true, 
            labels: { color: 'rgba(255,255,255,0.7)', font: { family: '"Space Mono", monospace', size: 9 } }
          }
        },
        scales: {
          y: { min: 0, max: 1.2, grid: { color: 'rgba(255,255,255,0.05)' } },
          x: { grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  },

  renderNutrientDepletion(b, env) {
    this.destroyChart('chart-nutrient');
    const canvas = document.getElementById('chart-nutrient');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const labels = [];
    const popData = [];
    const nutData = [];
    const maxT = 24;
    
    let N = 0.01;
    let nutrient = 100;
    const r = b.growthRate * 2;
    
    for (let t = 0; t <= maxT; t++) {
      labels.push(t + 'h');
      if (t < b.lagPhaseHours) {
        popData.push(N);
        nutData.push(nutrient);
      } else {
        let growthMult = nutrient > 10 ? 1 : 0.1;
        let dN = r * N * (1 - N) * growthMult;
        N += dN;
        if (N > 1) N = 1;
        popData.push(N);
        
        nutrient -= (N * 5); 
        if (nutrient < 0) nutrient = 0;
        nutData.push(nutrient);
      }
    }
    
    this.charts['chart-nutrient'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Popülasyon (OD)',
            data: popData,
            borderColor: '#00e5a0',
            backgroundColor: 'rgba(0, 229, 160, 0.1)',
            fill: true,
            yAxisID: 'y',
            tension: 0.4,
            pointRadius: 0
          },
          {
            label: 'Besin (%)',
            data: nutData,
            borderColor: '#f9a825',
            backgroundColor: 'rgba(249, 168, 37, 0.1)',
            fill: true,
            yAxisID: 'y1',
            tension: 0.4,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { 
          legend: { 
            display: true,
            labels: { color: 'rgba(255,255,255,0.7)', font: { family: '"Space Mono", monospace', size: 9 } }
          }
        },
        scales: {
          y: { 
            type: 'linear', display: true, position: 'left', min: 0, max: 1.2,
            grid: { color: 'rgba(255,255,255,0.05)' }
          },
          y1: { 
            type: 'linear', display: true, position: 'right', min: 0, max: 100,
            grid: { drawOnChartArea: false }
          },
          x: { grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  },

  renderSurvivalCurve(b, env) {
    this.destroyChart('chart-survival');
    const canvas = document.getElementById('chart-survival');
    if (!canvas) return;
    
    const tF = window.calcTempFactor ? window.calcTempFactor(env.temp, b.tempMin, b.tempOptimum, b.tempMax) : 1;
    const pF = window.calcPhFactor ? window.calcPhFactor(env.ph, b.phMin, b.phOptimum, b.phMax) : 1;
    const stress = Math.max(0, 1 - (tF * pF));
    
    const labels = [];
    const live = [];
    const dead = [];
    for(let t=0; t<=24; t++) {
      labels.push(t+'h');
      const k = stress * 0.15;
      const livePct = 100 * Math.exp(-k * t);
      live.push(livePct.toFixed(1));
      dead.push((100 - livePct).toFixed(1));
    }
    
    this.charts['chart-survival'] = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Canlı Hücre %', data: live, borderColor: '#00e5a0', backgroundColor: 'rgba(0,229,160,0.1)', fill: true, tension: 0.4 },
          { label: 'Ölü Hücre %', data: dead, borderColor: '#ff3c3c', backgroundColor: 'rgba(255,60,60,0.1)', fill: true, tension: 0.4 }
        ]
      },
      options: { responsive: true, plugins: { legend: { labels: { color: '#9aa0a8' } } }, scales: { y: { max: 100, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { color: 'rgba(255,255,255,0.05)' } } } }
    });
  },

  renderMutationFreq(b, env) {
    this.destroyChart('chart-mutation');
    const canvas = document.getElementById('chart-mutation');
    if (!canvas) return;
    
    const tF = window.calcTempFactor ? window.calcTempFactor(env.temp, b.tempMin, b.tempOptimum, b.tempMax) : 1;
    const pF = window.calcPhFactor ? window.calcPhFactor(env.ph, b.phMin, b.phOptimum, b.phMax) : 1;
    const stress = Math.max(0, 1 - (tF * pF));
    
    const labels = [];
    const data = [];
    let cumulative = 0;
    const baseRate = b.growthRate * 0.5;
    
    for(let t=0; t<=24; t+=2) {
      labels.push(t+'h');
      const rate = baseRate * (1 + stress * 5); 
      cumulative += rate * (0.8 + (Math.sin(t) * 0.2)); // pseudo random but deterministic looking
      data.push(cumulative.toFixed(2));
    }
    
    this.charts['chart-mutation'] = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Mutasyon İhtimali (x10^-6)',
          data,
          backgroundColor: 'rgba(156, 39, 176, 0.4)',
          borderColor: '#d05ce3',
          borderWidth: 1
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } } }
    });
  },

  renderBiofilmThickness(b, env) {
    this.destroyChart('chart-biofilm');
    const canvas = document.getElementById('chart-biofilm');
    if (!canvas) return;
    
    const labels = [];
    const data = [];
    const maxThickness = b.gramPos ? 20 : 60; 
    const tF = window.calcTempFactor ? window.calcTempFactor(env.temp, b.tempMin, b.tempOptimum, b.tempMax) : 1;
    
    for(let t=0; t<=24; t++) {
      labels.push(t+'h');
      const lag = 8;
      const beta = 0.5 * tF;
      let val = maxThickness / (1 + Math.exp(-beta * (t - lag)));
      if (t < lag/2) val = 0.1;
      data.push(val.toFixed(1));
    }
    
    this.charts['chart-biofilm'] = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Biyofilm Kalınlığı (µm)',
          data,
          borderColor: '#4db8ff',
          backgroundColor: 'rgba(77, 184, 255, 0.2)',
          fill: true,
          stepped: true
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { color: 'rgba(255,255,255,0.05)' } } } }
    });
  },

  renderStressIndex(b, env) {
    this.destroyChart('chart-stress');
    const canvas = document.getElementById('chart-stress');
    if (!canvas) return;
    
    const tF = window.calcTempFactor ? window.calcTempFactor(env.temp, b.tempMin, b.tempOptimum, b.tempMax) : 1;
    const pF = window.calcPhFactor ? window.calcPhFactor(env.ph, b.phMin, b.phOptimum, b.phMax) : 1;
    const tempStress = (1 - tF) * 100;
    const phStress = (1 - pF) * 100;
    const saltStress = (Math.abs(env.nacl - 0.5) / 2) * 100;
    const compStress = env.inoculations.length > 1 ? 50 : 0;
    
    this.charts['chart-stress'] = new Chart(canvas.getContext('2d'), {
      type: 'polarArea',
      data: {
        labels: ['Sıcaklık', 'pH', 'Tuzluluk', 'Rekabet'],
        datasets: [{
          data: [Math.max(0, tempStress), Math.max(0, phStress), Math.min(100, saltStress), compStress],
          backgroundColor: [
            'rgba(255, 99, 132, 0.5)',
            'rgba(255, 159, 64, 0.5)',
            'rgba(255, 205, 86, 0.5)',
            'rgba(75, 192, 192, 0.5)'
          ]
        }]
      },
      options: { responsive: true, scales: { r: { min: 0, max: 100, ticks: {display: false}, grid: {color: 'rgba(255,255,255,0.05)'} } }, plugins: { legend: { position: 'right', labels: {color: '#9aa0a8'} } } }
    });
  }
};
window.ChartManager = ChartManager;

function selectChart(chartId, element) {
  // Remove active styling from all items
  document.querySelectorAll('.accordion-item').forEach(el => {
    el.style.background = 'transparent';
    el.style.borderLeft = 'none';
  });
  
  // Add active styling to the clicked item
  if (element) {
    element.style.background = 'rgba(0, 229, 160, 0.08)';
    element.style.borderLeft = '2px solid var(--accent)';
  }

  // Hide placeholder
  const placeholder = document.getElementById('chart-placeholder');
  if (placeholder) placeholder.style.display = 'none';

  // Hide all chart views
  document.querySelectorAll('.chart-view-container').forEach(el => {
    el.classList.remove('active');
  });

  // Show the target chart view
  const target = document.getElementById('cv-' + chartId);
  if (target) {
    target.classList.add('active');
  }
}
window.selectChart = selectChart;

const DataExportEngine = {
  getChartData(chartType, bacteria) {
    let data = [];
    if (!bacteria) return [{ x: 0, y: 0 }];
    
    switch(chartType) {
      case 'growth_curve':
        // Generate simulated growth curve data
        for (let i = 0; i <= 24; i += 2) {
          data.push({ x: i, y: (Math.random() * i * bacteria.growthRate).toFixed(2) });
        }
        break;
      case 'growth_phase':
        data.push({ x: 'Lag Phase', y: bacteria.lagPhaseHours });
        data.push({ x: 'Log Phase', y: bacteria.maxTime - bacteria.lagPhaseHours });
        break;
      case 'tolerance':
        data = [
          { x: 'Min Temp', y: bacteria.tempMin },
          { x: 'Opt Temp', y: bacteria.tempOptimum },
          { x: 'Max Temp', y: bacteria.tempMax },
          { x: 'Min pH', y: bacteria.phMin },
          { x: 'Max pH', y: bacteria.phMax }
        ];
        break;
      case 'antibiotic_mic':
        const antibiotics = BacteriaStore.getAntibioticsFor ? BacteriaStore.getAntibioticsFor(bacteria._id) : {};
        if (antibiotics && Object.keys(antibiotics).length > 0) {
          for (const [anti, mic] of Object.entries(antibiotics)) {
            data.push({ x: anti, y: mic });
          }
        } else {
          data.push({ x: 'Amoxicillin', y: 4 }, { x: 'Ciprofloxacin', y: 1 });
        }
        break;
      default:
        // Placeholder data for new unimplemented charts
        for (let i = 1; i <= 5; i++) {
          data.push({ x: `Point ${i}`, y: Math.floor(Math.random() * 100) });
        }
        break;
    }
    return data;
  }
};
window.DataExportEngine = DataExportEngine;
window.showSelectedBadge = showSelectedBadge;
window.showDetailPanel = showDetailPanel;
window.updateDishCount = updateDishCount;
window.updatePanelMode = updatePanelMode;
window.showFlash = showFlash;
window.renderLogTable = renderLogTable;
