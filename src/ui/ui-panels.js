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
  // DÜZELTME: bacteria-images.js kullan, yoksa fallback SVG
  if (window.updateMorphologyImage) {
    // morphology-panel.html entegrasyonu
    window.updateMorphologyImage(b.name);
  } else if (window.BACTERIA_IMAGES && window.BACTERIA_IMAGES[b.name]) {
    const imgData = window.BACTERIA_IMAGES[b.name];
    imgContainer.innerHTML = `
      <img src="${imgData.url}" alt="${b.name}"
           style="width:100%;height:100%;object-fit:cover;border-radius:5px;"
           onerror="this.parentElement.innerHTML='<div style=\"color:var(--text3);font-size:10px;text-align:center;padding:8px\">🔬</div>'" />
      <span style="position:absolute;bottom:4px;right:4px;font-size:9px;
                   background:rgba(0,0,0,0.6);color:#aaa;padding:2px 5px;border-radius:3px;">
        ${imgData.license}
      </span>`;
  } else {
    imgContainer.innerHTML = '<div style="color:var(--text3);font-size:24px;text-align:center;padding:16px">🔬</div>';
  }
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
  const libPanel = document.getElementById('panelModeLib');

  if (window._showLibrary && libPanel) {
    listPanel.style.display = 'none';
    splitPanel.style.display = 'none';
    libPanel.style.display = 'flex';
    renderLibrary();
    return;
  }
  // If library mode but no panel, reset flag
  if (window._showLibrary && !libPanel) window._showLibrary = false;

  // _forceSplitPanel: bakteri seçilince bilimsel bilgi göster
  if (window._forceSplitPanel && selectedBacteria) {
    listPanel.style.display = 'none';
    splitPanel.style.display = 'flex';
    if (libPanel) libPanel.style.display = 'none';
    renderInfoPanel(selectedBacteria);
    return;
  }

  if (hasEmptyPetri || activeDishes.length === 0 || window.isListModeForced) {
    listPanel.style.display = '';
    splitPanel.style.display = 'none';
    if (libPanel) libPanel.style.display = 'none';
  } else {
    listPanel.style.display = 'none';
    splitPanel.style.display = 'flex';
    if (libPanel) libPanel.style.display = 'none';
    if (selectedBacteria) renderInfoPanel(selectedBacteria);
  }
}

function renderLibrary() {
  const list = document.getElementById('savedDishesList');
  if (!list) return;
  const saved = window.savedDishes || [];
  if (saved.length === 0) {
    list.innerHTML = '<div class="saved-dishes-empty">Henüz kaydedilmiş petri kabı yok.<br>Bir petriyi kaydetmek için üstündeki <b>+</b> butonuna tıklayın.</div>';
    return;
  }
  list.innerHTML = '';
  saved.forEach(d => {
    const item = document.createElement('div');
    item.className = 'saved-dish-item';
    const miniCanvas = document.createElement('canvas');
    miniCanvas.width = 40;
    miniCanvas.height = 40;
    renderThumbnail(miniCanvas, d);
    const info = document.createElement('div');
    info.className = 'saved-dish-info';
    const name = document.createElement('div');
    name.className = 'saved-dish-name';
    name.textContent = d._savedName || d.dishNum || 'İsimsiz';
    const meta = document.createElement('div');
    meta.className = 'saved-dish-meta';
    const bacNames = d.inoculations.map(inoc => inoc.bacteria ? inoc.bacteria.name : '?').join(', ');
    meta.textContent = bacNames || 'Boş';
    info.appendChild(name);
    info.appendChild(meta);
    item.appendChild(miniCanvas);
    item.appendChild(info);
    item.addEventListener('click', () => {
      if (!window.activeDishes.find(a => a.id === d.id)) {
        window.activeDishes.push(d);
      }
      d.element.style.display = '';
      window._showLibrary = false;
      window.isListModeForced = false;
      window.savedDishes = window.savedDishes.filter(s => s.id !== d.id);
      updateDishCount(window.activeDishes);
      updatePanelMode(window.activeDishes, window.selectedBacteria);
      if (typeof redraw === 'function') redraw(d);
    });
    list.appendChild(item);
  });
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

  // Action type renkleri
  const actionColor = {
    'Bakteri Eklendi':   '#00e5a0',
    'Sıcaklık':          '#f59e0b',
    'pH':                '#60a5fa',
    'NaCl':              '#a78bfa',
    'Zaman':             '#94a3b8',
    'Antibiyotik':       '#f87171',
    'O₂':               '#34d399',
  };

  tbody.innerHTML = experimentLog.map((e, i) => {
    const color = Object.entries(actionColor).find(([k]) => e.action.includes(k))?.[1] || '#9aa0a8';
    const abInfo = e.antibiotic && e.antibiotic !== '—'
      ? `<span style="color:#f87171;font-size:9px;">${e.antibiotic} ${e.abConc}</span>` : '';
    const tissueIcon = { 'skin-wound':'🩹','burn-wound':'🔥','chronic-wound':'⏳',
      'lung':'🫁','gut':'🧬','urinary':'💧','bloodstream':'🩸','bone':'🦴' };
    const tIcon = tissueIcon[e.tissueType] || '🧫';
    return `<tr style="border-left:2px solid ${color}">
      <td style="color:var(--accent);font-weight:700">#${e.petri}</td>
      <td style="color:var(--text3);font-size:9px">${e.time}</td>
      <td style="color:var(--accent2);font-size:9px;font-weight:700">${e.simTime||'0h'}</td>
      <td style="color:${color};font-weight:600">${e.action}</td>
      <td style="font-size:9px">${e.temp}</td>
      <td style="font-size:9px">${e.ph}</td>
      <td style="font-size:9px">${tIcon} ${e.tissueType||'—'}</td>
      <td style="font-size:9px">${e.bacteria||'—'}${abInfo ? '<br>'+abInfo : ''}</td>
    </tr>`;
  }).join('');

  const wrap = document.getElementById('logTableWrap');
  if (wrap) wrap.scrollTop = wrap.scrollHeight;

  // Log sayacı güncelle
  const counter = document.getElementById('logEntryCount');
  if (counter) counter.textContent = experimentLog.length;
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

  // ═══════════════════════════════════════════════════════
  //  GRAFİK FONKSİYONLARI — Veri setine tam bağlı
  // ═══════════════════════════════════════════════════════

  // Yardımcı: aktif dokuyu al
  _getTissueId() {
    const dishes = window.activeDishes || [];
    const state  = dishes.length > 0 ? dishes[dishes.length-1] : null;
    return state ? (state.tissueType || 'skin-wound') : 'skin-wound';
  },

  _getActiveDish() {
    const dishes = window.activeDishes || [];
    return dishes.length > 0 ? dishes[dishes.length-1] : null;
  },

  _chartDefaults(ctx) {
    return {
      plugins: { legend: { labels: { color: '#9aa0a8', font: { family: 'Space Mono' } } } },
      scales: {
        x: { ticks: { color: '#5f6368' }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#5f6368' }, grid: { color: 'rgba(255,255,255,0.04)' } }
      }
    };
  },

  // 1. BÜYÜME EĞRİSİ — doku tipine göre envFactor ile
  // ═══════════════════════════════════════════════════════
  //  GRAFİK FONKSİYONLARI — Veri setine tam bağlı
  // ═══════════════════════════════════════════════════════

  // Yardımcı: aktif dokuyu al
  _getTissueId() {
    const dishes = window.activeDishes || [];
    const state  = dishes.length > 0 ? dishes[dishes.length-1] : null;
    return state ? (state.tissueType || 'skin-wound') : 'skin-wound';
  },

  _getActiveDish() {
    const dishes = window.activeDishes || [];
    return dishes.length > 0 ? dishes[dishes.length-1] : null;
  },

  _chartDefaults(ctx) {
    return {
      plugins: { legend: { labels: { color: '#9aa0a8', font: { family: 'Space Mono' } } } },
      scales: {
        x: { ticks: { color: '#5f6368' }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#5f6368' }, grid: { color: 'rgba(255,255,255,0.04)' } }
      }
    };
  },

  // 1. BÜYÜME EĞRİSİ — doku tipine göre envFactor ile
  renderGrowthCurve(b, env) {
    this.destroyChart('chart-growth');
    const canvas = document.getElementById('chart-growth');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const tissueId = this._getTissueId();
    const tissueM  = BacteriaStore.getTissueModel(tissueId);
    const penMod   = tissueM ? (tissueM.antibiotic_penetration_modifier || 1.0) : 1.0;

    const tF = window.calcTempFactor ? window.calcTempFactor(env.temp, b.tempMin, b.tempOptimum, b.tempMax) : 0.9;
    const pF = window.calcPhFactor   ? window.calcPhFactor(env.ph, b.phMin, b.phOptimum, b.phMax) : 0.9;
    // Doku faktörü: vaskülarite düşük → büyüme yavaş
    const avgVasc = tissueM ? (tissueM.layers.reduce((s,l) => s + l.vascularity, 0) / tissueM.layers.length) : 0.5;
    const envFactor = tF * pF * (0.5 + avgVasc * 0.5);

    const K   = 1.0;
    const r   = b.mu_max * envFactor;
    const lag = b.lagPhaseHours || 2;
    const maxT = b.maxTime || 72;
    const pts = [], labels = [];

    for (let t = 0; t <= maxT; t += maxT / 48) {
      labels.push(t.toFixed(1) + 'h');
      if (t < lag) { pts.push(0.001); continue; }
      const N = K / (1 + 999 * Math.exp(-r * (t - lag)));
      pts.push(parseFloat(N.toFixed(4)));
    }

    // Antibiyotik varsa etkisini göster
    const state = this._getActiveDish();
    let abPts = null;
    if (state && state.antibiotic && state.antibiotic.concentration > 0) {
      const pkList = BacteriaStore.antibioticPK || [];
      const pkM    = pkList.find(p => p.id === state.antibiotic.drugId);
      const abList = BacteriaStore.getAntibioticsFor(b._id);
      const abMatch= abList.find(a => a.name === state.antibiotic.drugId);
      const mic    = abMatch ? abMatch.mic : 8;
      const rawPen = pkM ? (pkM.tissue_penetration[tissueId] || 0.5) : 0.5;
      const C      = state.antibiotic.concentration * rawPen * penMod;
      const kill   = C / (mic + C);
      const abR    = r * (1 - kill);
      abPts = pts.map((_, i) => {
        const t = (i / 48) * maxT;
        if (t < lag) return 0.001;
        return parseFloat((K / (1 + 999 * Math.exp(-abR * (t - lag)))).toFixed(4));
      });
    }

    const datasets = [{
      label: `${b.name} (${tissueId})`,
      data: pts,
      borderColor: b.hex || '#00e5a0',
      backgroundColor: (b.hex || '#00e5a0') + '22',
      tension: 0.4, fill: true, pointRadius: 0, borderWidth: 2
    }];

    if (abPts) {
      datasets.push({
        label: `+ ${state.antibiotic.drugName || 'AB'}`,
        data: abPts,
        borderColor: '#f87171',
        backgroundColor: '#f8717122',
        tension: 0.4, fill: false, pointRadius: 0,
        borderWidth: 2, borderDash: [4,3]
      });
    }

    this.charts['chart-growth'] = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        ...this._chartDefaults(ctx),
        plugins: {
          ...this._chartDefaults(ctx).plugins,
          title: { display: true, text: `Büyüme — ${tissueId} | env: ${(envFactor*100).toFixed(0)}%`, color: '#9aa0a8', font: { size: 10 } }
        },
        scales: {
          x: { ...this._chartDefaults(ctx).scales.x, title: { display: true, text: 'Zaman (h)', color: '#5f6368' } },
          y: { ...this._chartDefaults(ctx).scales.y, title: { display: true, text: 'OD₆₀₀ (norm.)', color: '#5f6368' }, min: 0, max: 1.1 }
        }
      }
    });
  },

  // 2. ÇEVRESEL TOLERANS — gerçek min/opt/max verisinden
  renderHeatmap(b, env) {
    const container = document.getElementById('chart-heatmap-container');
    if (!container) return;

    const params = [
      { name: 'Sıcaklık', unit: '°C', min: b.tempMin, opt: b.tempOptimum, max: b.tempMax, current: env.temp, calcFn: window.calcTempFactor },
      { name: 'pH',       unit: '',   min: b.phMin,   opt: b.phOptimum,   max: b.phMax,   current: env.ph,   calcFn: window.calcPhFactor   },
      { name: 'NaCl',     unit: '%',  min: b.naclMin,  opt: b.naclOptimal, max: b.naclMax,  current: env.nacl, calcFn: window.calcNaClFactor  },
    ];

    container.innerHTML = params.map(p => {
      const factor = p.calcFn ? p.calcFn(p.current, p.min, p.opt, p.max) : 0.5;
      const pct    = Math.round(factor * 100);
      const color  = pct > 70 ? '#00e5a0' : pct > 40 ? '#f59e0b' : '#f87171';
      const barW   = Math.max(2, pct);
      return `
        <div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;font-size:10px;font-family:Space Mono,monospace;margin-bottom:4px;">
            <span style="color:var(--text2)">${p.name}</span>
            <span style="color:var(--text3)">${p.min}${p.unit} → <b style="color:var(--text)">${p.opt}${p.unit}</b> → ${p.max}${p.unit}</span>
            <span style="color:${color};font-weight:700">${pct}%</span>
          </div>
          <div style="background:var(--bg3);border-radius:3px;height:6px;overflow:hidden;">
            <div style="width:${barW}%;height:100%;background:${color};border-radius:3px;transition:width 0.3s;"></div>
          </div>
          <div style="font-size:9px;color:var(--text3);margin-top:2px;">Mevcut: ${p.current}${p.unit}</div>
        </div>`;
    }).join('');
  },

  // 3. ANTİBİYOTİK DİRENÇ RADARI — gerçek resistance_score verisinden
  renderRadar(b, env) {
    this.destroyChart('chart-radar');
    const canvas = document.getElementById('chart-radar');
    if (!canvas) return;
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');

    const abData = BacteriaStore.getAntibioticsFor(b._id);
    if (!abData || abData.length === 0) {
      canvas.style.display = 'none'; return;
    }

    const tissueId = this._getTissueId();
    const pkAll    = BacteriaStore.antibioticPK || [];

    // Her antibiyotik için etkinlik skoru: (1-resistance_score) × tissue_penetration
    const labels = abData.map(a => a.name);
    const resistData = abData.map(a => {
      const pk  = pkAll.find(p => p.id === a.name);
      const pen = pk ? (pk.tissue_penetration[tissueId] || pk.tissue_penetration['skin-wound'] || 0.5) : 0.5;
      return parseFloat(((1 - (a.resistance_score || 0.5)) * pen).toFixed(3));
    });

    this.charts['chart-radar'] = new Chart(ctx, {
      type: 'radar',
      data: {
        labels,
        datasets: [{
          label: `${b.name} — ${tissueId}`,
          data: resistData,
          backgroundColor: (b.hex || '#00e5a0') + '33',
          borderColor: b.hex || '#00e5a0',
          pointBackgroundColor: b.hex || '#00e5a0',
          borderWidth: 2, pointRadius: 3
        }]
      },
      options: {
        scales: { r: { min: 0, max: 1, ticks: { color: '#5f6368', stepSize: 0.2 }, grid: { color: 'rgba(255,255,255,0.06)' }, pointLabels: { color: '#9aa0a8', font: { size: 8 } } } },
        plugins: { legend: { labels: { color: '#9aa0a8', font: { size: 10 } } } }
      }
    });
  },

  // 4. MIC PROFİLİ — gerçek MIC + tissue_penetration + ROA
  renderMICProfile(b, env) {
    const container = document.getElementById('chart-mic-table');
    if (!container) return;

    const abData   = BacteriaStore.getAntibioticsFor(b._id);
    const tissueId = this._getTissueId();
    const pkAll    = BacteriaStore.antibioticPK || [];
    const state    = this._getActiveDish();

    if (!abData || abData.length === 0) {
      container.innerHTML = '<div style="color:var(--text3);font-size:11px;padding:16px;font-family:Space Mono">Veri yok</div>';
      return;
    }

    const tissueM  = BacteriaStore.getTissueModel(tissueId);
    const penMod   = tissueM ? (tissueM.antibiotic_penetration_modifier || 1.0) : 1.0;
    const compatRoutes = tissueM ? (tissueM.compatible_routes || []) : ['iv'];

    const rows = abData.map(a => {
      const pk      = pkAll.find(p => p.id === a.name);
      const rawPen  = pk ? (pk.tissue_penetration[tissueId] || pk.tissue_penetration['skin-wound'] || 0.5) : 0.5;
      const effPen  = rawPen * penMod;
      const routes  = pk ? Object.entries(pk.routes_of_administration || {}).filter(([,v]) => v).map(([k]) => k) : ['iv'];
      const compatible = routes.some(r => compatRoutes.includes(r));
      const routeLabels = { iv:'💉IV', oral:'💊Oral', topical:'🩹Top', inhaled:'🫁İnh', im:'💉IM' };
      const routeStr = routes.map(r => routeLabels[r] || r).join(' ');

      // Etkin konsantrasyon hesabı
      const effMIC = a.mic / effPen;

      let interpColor = 'var(--text2)';
      if (a.interpretation === 'R') interpColor = '#f87171';
      if (a.interpretation === 'S') interpColor = '#00e5a0';
      if (a.interpretation === 'I') interpColor = '#f59e0b';

      return { a, effMIC, effPen, routeStr, compatible, interpColor };
    }).sort((x, y) => x.effMIC - y.effMIC);  // En etkili üstte

    container.innerHTML = `
      <div style="font-size:9px;color:var(--text3);font-family:Space Mono,monospace;padding:4px 6px;border-bottom:1px solid var(--border);margin-bottom:4px;">
        Doku: <b style="color:var(--accent)">${tissueId}</b> · Penetrasyon mod: ${(penMod*100).toFixed(0)}% · Sıralama: en etkili üstte
      </div>
      <table style="width:100%;border-collapse:collapse;font-family:Space Mono,monospace;font-size:10px;color:var(--text2);">
        <thead><tr style="color:var(--text3);border-bottom:1px solid var(--border);">
          <th style="padding:5px;text-align:left">İlaç</th>
          <th style="padding:5px;text-align:right">MIC</th>
          <th style="padding:5px;text-align:right">Eff.MIC*</th>
          <th style="padding:5px;text-align:center">Pen%</th>
          <th style="padding:5px;text-align:center">Yol</th>
          <th style="padding:5px;text-align:center">S/I/R</th>
        </tr></thead>
        <tbody>
          ${rows.map(r => `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.02);${!r.compatible ? 'opacity:0.45;' : ''}">
              <td style="padding:5px">${r.a.name}${!r.compatible ? ' ⚠️' : ''}</td>
              <td style="padding:5px;text-align:right">${r.a.mic}</td>
              <td style="padding:5px;text-align:right;color:${r.interpColor}">${r.effMIC.toFixed(2)}</td>
              <td style="padding:5px;text-align:center">${(r.effPen*100).toFixed(0)}%</td>
              <td style="padding:5px;text-align:center;font-size:8px">${r.routeStr}</td>
              <td style="padding:5px;text-align:center;color:${r.interpColor};font-weight:700">${r.a.interpretation}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      <div style="font-size:8px;color:var(--text3);padding:4px 6px;font-family:Space Mono">*Eff.MIC = MIC ÷ doku penetrasyonu · ⚠️ = bu doku için uygun ROA yok</div>`;
  },

  // 5. POPÜLASYON DİNAMİKLERİ — birden fazla bakteri Lotka-Volterra
  renderPopulationDynamics(b, env) {
    this.destroyChart('chart-population');
    const canvas = document.getElementById('chart-population');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const state    = this._getActiveDish();
    const bacteria = state ? state.inoculations.map(i => i.bacteria) : [b];
    const maxT     = b.maxTime || 72;
    const steps    = 48;
    const dt       = maxT / steps;

    const datasets = bacteria.map((bac, bi) => {
      const r1 = bac.mu_max || 0.5;
      const pts = [];
      let N = 0.01;
      for (let t = 0; t <= maxT; t += dt) {
        if (t < (bac.lagPhaseHours || 2)) { pts.push(0.001); continue; }
        const dN = r1 * N * (1 - N);
        N = Math.max(0.001, Math.min(1, N + dN * dt));
        pts.push(parseFloat(N.toFixed(4)));
      }
      return {
        label: bac.name,
        data: pts,
        borderColor: bac.hex || '#00e5a0',
        backgroundColor: 'transparent',
        tension: 0.4, pointRadius: 0, borderWidth: 2
      };
    });

    const labels = Array.from({length: steps+1}, (_, i) => (i * dt).toFixed(0) + 'h');

    this.charts['chart-population'] = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        ...this._chartDefaults(ctx),
        plugins: {
          ...this._chartDefaults(ctx).plugins,
          title: { display: true, text: `Popülasyon Dinamikleri (${bacteria.length} tür)`, color: '#9aa0a8', font: { size: 10 } }
        },
        scales: {
          x: { ...this._chartDefaults(ctx).scales.x, title: { display: true, text: 'Zaman (h)', color: '#5f6368' } },
          y: { ...this._chartDefaults(ctx).scales.y, min: 0, max: 1.05, title: { display: true, text: 'Bağıl Yoğunluk', color: '#5f6368' } }
        }
      }
    });
  },

  // 6. DOKU PENETRASYON KARŞILAŞTIRMASI — yeni grafik
  renderNutrientDepletion(b, env) {
    this.destroyChart('chart-nutrient');
    const canvas = document.getElementById('chart-nutrient');
    if (!canvas) return;
    const ctx    = canvas.getContext('2d');
    const tissueId = this._getTissueId();
    const pkAll  = BacteriaStore.antibioticPK || [];
    const abData = BacteriaStore.getAntibioticsFor(b._id);

    if (!pkAll.length || !abData.length) return;

    // Sadece bu bakteri için listelenen antibiyotikler
    const abIds = abData.map(a => a.name);
    const pkFiltered = pkAll.filter(p => abIds.includes(p.id));

    const labels = pkFiltered.map(p => p.id);
    const penValues = pkFiltered.map(p => parseFloat(((p.tissue_penetration[tissueId] || p.tissue_penetration['skin-wound'] || 0.3) * 100).toFixed(1)));
    const colors = pkFiltered.map(p => {
      const v = p.tissue_penetration[tissueId] || 0.3;
      return v >= 0.8 ? '#00e5a0' : v >= 0.5 ? '#f59e0b' : '#f87171';
    });

    this.charts['chart-nutrient'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: `Doku Penetrasyonu — ${tissueId}`,
          data: penValues,
          backgroundColor: colors,
          borderRadius: 4
        }]
      },
      options: {
        ...this._chartDefaults(ctx),
        plugins: {
          ...this._chartDefaults(ctx).plugins,
          title: { display: true, text: `Antibiyotik Penetrasyon: ${tissueId}`, color: '#9aa0a8', font: { size: 10 } },
          legend: { display: false }
        },
        scales: {
          x: { ...this._chartDefaults(ctx).scales.x, ticks: { color: '#5f6368', font: { size: 8 } } },
          y: { ...this._chartDefaults(ctx).scales.y, min: 0, max: 150, title: { display: true, text: 'Penetrasyon (%)', color: '#5f6368' } }
        }
      }
    });
  },

  // 7. HÜCRE CANLILIK — antibiyotik Kill rate hesabı
  renderSurvivalCurve(b, env) {
    this.destroyChart('chart-survival');
    const canvas = document.getElementById('chart-survival');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const tissueId = this._getTissueId();
    const state    = this._getActiveDish();
    const pkAll    = BacteriaStore.antibioticPK || [];
    const abData   = BacteriaStore.getAntibioticsFor(b._id);
    const maxT     = b.maxTime || 72;

    // Antibiyotiksiz baseline
    const baselinePts = [];
    for (let t = 0; t <= maxT; t += maxT/48) {
      baselinePts.push(parseFloat(Math.exp(-0.01 * t).toFixed(4)));
    }

    const datasets = [{
      label: 'Antibiyotiksiz',
      data: baselinePts,
      borderColor: '#9aa0a8',
      backgroundColor: 'transparent',
      tension: 0.4, pointRadius: 0, borderWidth: 1, borderDash: [4,3]
    }];

    if (abData && abData.length > 0) {
      abData.slice(0, 4).forEach(ab => {
        const pk     = pkAll.find(p => p.id === ab.name);
        const rawPen = pk ? (pk.tissue_penetration[tissueId] || 0.5) : 0.5;
        const mic    = ab.mic || 8;
        const n      = pk ? (pk.hill_coefficient_n || 1) : 1;

        // Farklı konsantrasyonlar için hayatta kalma
        const conc = mic * 4; // 4× MIC
        const C    = conc * rawPen;
        const Cn   = Math.pow(C, n);
        const EC50n = Math.pow(mic, n);
        const kill  = Cn / (EC50n + Cn);

        const pts = baselinePts.map((base, i) => {
          const t = (i / 48) * maxT;
          return parseFloat(Math.max(0, base * (1 - kill * Math.min(1, t/24))).toFixed(4));
        });

        const color = ab.interpretation === 'S' ? '#00e5a0' : ab.interpretation === 'R' ? '#f87171' : '#f59e0b';
        datasets.push({
          label: `${ab.name} (4×MIC)`,
          data: pts,
          borderColor: color,
          backgroundColor: 'transparent',
          tension: 0.4, pointRadius: 0, borderWidth: 2
        });
      });
    }

    const labels = Array.from({length: 49}, (_, i) => ((i/48)*maxT).toFixed(0) + 'h');

    this.charts['chart-survival'] = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        ...this._chartDefaults(ctx),
        plugins: { ...this._chartDefaults(ctx).plugins,
          title: { display: true, text: `Hücre Canlılık — Hill denklemi | ${tissueId}`, color: '#9aa0a8', font: { size: 10 } }
        },
        scales: {
          x: { ...this._chartDefaults(ctx).scales.x, title: { display: true, text: 'Zaman (h)', color: '#5f6368' } },
          y: { ...this._chartDefaults(ctx).scales.y, min: 0, max: 1.05, title: { display: true, text: 'Canlılık Oranı', color: '#5f6368' } }
        }
      }
    });
  },

  // 8. MUTASYON FREKANSI — Poisson modelinden
  renderMutationFreq(b, env) {
    this.destroyChart('chart-mutation');
    const canvas = document.getElementById('chart-mutation');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const maxT = b.maxTime || 72;
    const mu   = b.mu_max  || 0.5;
    const BASE_RATE = 1e-9;

    // Antibiyotik stresi mutation rate'i artırır
    const state    = this._getActiveDish();
    const tissueId = this._getTissueId();
    const pkAll    = BacteriaStore.antibioticPK || [];

    let stressMult = 1.0;
    if (state && state.antibiotic && state.antibiotic.concentration > 0) {
      const pk    = pkAll.find(p => p.id === state.antibiotic.drugId);
      const pen   = pk ? (pk.tissue_penetration[tissueId] || 0.5) : 0.5;
      const abData= BacteriaStore.getAntibioticsFor(b._id);
      const match = abData.find(a => a.name === state.antibiotic.drugId);
      const mic   = match ? match.mic : 8;
      const C     = state.antibiotic.concentration * pen;
      // Sub-MIC konsantrasyon → mutasyon artışı
      if (C < mic * 2) stressMult = 1 + (C / mic) * 3;
    }

    const labels = [], pts1 = [], pts2 = [];
    for (let t = 0; t <= maxT; t += maxT/48) {
      labels.push(t.toFixed(0) + 'h');
      const lambda = mu * BASE_RATE * t;
      pts1.push(parseFloat((1 - Math.exp(-lambda)).toExponential(2)));
      pts2.push(parseFloat((1 - Math.exp(-lambda * stressMult)).toExponential(2)));
    }

    const datasets = [{
      label: 'Baseline mutasyon',
      data: pts1, borderColor: '#60a5fa', tension: 0.4, pointRadius: 0, borderWidth: 2, fill: false
    }];

    if (stressMult > 1.05) {
      datasets.push({
        label: `+ AB baskısı (×${stressMult.toFixed(1)})`,
        data: pts2, borderColor: '#f87171', tension: 0.4, pointRadius: 0,
        borderWidth: 2, fill: false, borderDash: [4,3]
      });
    }

    this.charts['chart-mutation'] = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        ...this._chartDefaults(ctx),
        plugins: { ...this._chartDefaults(ctx).plugins,
          title: { display: true, text: `Mutasyon Frekansı | µmax=${mu} h⁻¹`, color: '#9aa0a8', font: { size: 10 } }
        },
        scales: {
          x: { ...this._chartDefaults(ctx).scales.x, title: { display: true, text: 'Zaman (h)', color: '#5f6368' } },
          y: { ...this._chartDefaults(ctx).scales.y, title: { display: true, text: 'P(mutasyon)', color: '#5f6368' } }
        }
      }
    });
  },

  // 9. BİYOFİLM KALINLIĞI — doku direnci × zaman
  renderBiofilmThickness(b, env) {
    this.destroyChart('chart-biofilm');
    const canvas = document.getElementById('chart-biofilm');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const tissueId = this._getTissueId();
    const tissueM  = BacteriaStore.getTissueModel(tissueId);
    // Biyofilm penetrasyon direnci: yüksek → biyofilm hızlı büyür
    const avgBiofilmPen = tissueM
      ? tissueM.layers.reduce((s,l) => s + l.biofilm_penetration_factor, 0) / tissueM.layers.length
      : 0.3;

    const maxT  = b.maxTime || 72;
    const growR = b.growthRate || 1.0;
    const labels = [], pts = [], abPts = [];

    const state    = this._getActiveDish();
    const tissueId2 = tissueId;
    const pkAll    = BacteriaStore.antibioticPK || [];
    let killPen = 0;
    if (state && state.antibiotic && state.antibiotic.concentration > 0) {
      const pk  = pkAll.find(p => p.id === state.antibiotic.drugId);
      const pen = pk ? (pk.tissue_penetration[tissueId2] || 0.5) : 0.5;
      // Biyofilm antibiyotiği bloke eder → effPen azalır
      killPen = pen * (1 - avgBiofilmPen * 0.8);
    }

    for (let t = 0; t <= maxT; t += maxT/48) {
      labels.push(t.toFixed(0) + 'h');
      const thick = growR * avgBiofilmPen * 200 * (1 - Math.exp(-0.06 * t));
      pts.push(parseFloat(thick.toFixed(1)));
      if (killPen > 0) {
        const abData = BacteriaStore.getAntibioticsFor(b._id);
        const match  = abData.find(a => a.name === state.antibiotic.drugId);
        const mic    = match ? match.mic : 8;
        const C      = state.antibiotic.concentration * killPen;
        const kill   = C / (mic + C);
        abPts.push(parseFloat((thick * (1 - kill * 0.5)).toFixed(1)));
      }
    }

    const datasets = [{
      label: `${b.name} — biyofilm`,
      data: pts, borderColor: '#a78bfa', backgroundColor: '#a78bfa22',
      tension: 0.4, fill: true, pointRadius: 0, borderWidth: 2
    }];
    if (abPts.length) {
      datasets.push({
        label: `+ ${state.antibiotic.drugName || 'AB'}`,
        data: abPts, borderColor: '#f87171',
        tension: 0.4, fill: false, pointRadius: 0, borderWidth: 2, borderDash: [4,3]
      });
    }

    this.charts['chart-biofilm'] = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        ...this._chartDefaults(ctx),
        plugins: { ...this._chartDefaults(ctx).plugins,
          title: { display: true, text: `Biyofilm — doku dir: ${(avgBiofilmPen*100).toFixed(0)}%`, color: '#9aa0a8', font: { size: 10 } }
        },
        scales: {
          x: { ...this._chartDefaults(ctx).scales.x, title: { display: true, text: 'Zaman (h)', color: '#5f6368' } },
          y: { ...this._chartDefaults(ctx).scales.y, title: { display: true, text: 'Kalınlık (µm)', color: '#5f6368' } }
        }
      }
    });
  },

  // 10. ÇEVRESEL STRES İNDEKSİ — tüm faktörler birleşik
  renderStressIndex(b, env) {
    this.destroyChart('chart-stress');
    const canvas = document.getElementById('chart-stress');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const tissueId = this._getTissueId();
    const tissueM  = BacteriaStore.getTissueModel(tissueId);
    const avgVasc  = tissueM ? tissueM.layers.reduce((s,l)=>s+l.vascularity,0)/tissueM.layers.length : 0.5;

    const tF = window.calcTempFactor ? window.calcTempFactor(env.temp, b.tempMin, b.tempOptimum, b.tempMax) : 0.9;
    const pF = window.calcPhFactor   ? window.calcPhFactor(env.ph, b.phMin, b.phOptimum, b.phMax) : 0.9;
    const nF = window.calcNaClFactor ? window.calcNaClFactor(env.nacl||0.5, b.naclMin, b.naclOptimal, b.naclMax) : 0.9;
    const docuF = 0.5 + avgVasc * 0.5;

    const factors = [
      { name: 'Sıcaklık', value: tF * 100 },
      { name: 'pH',        value: pF * 100 },
      { name: 'NaCl',      value: nF * 100 },
      { name: 'Doku',      value: docuF * 100 },
    ];

    // AB varsa etki faktörü ekle
    const state    = this._getActiveDish();
    const pkAll    = BacteriaStore.antibioticPK || [];
    if (state && state.antibiotic && state.antibiotic.concentration > 0) {
      const pk    = pkAll.find(p => p.id === state.antibiotic.drugId);
      const pen   = pk ? (pk.tissue_penetration[tissueId] || 0.5) : 0.5;
      const abData= BacteriaStore.getAntibioticsFor(b._id);
      const match = abData.find(a => a.name === state.antibiotic.drugId);
      const mic   = match ? match.mic : 8;
      const C     = state.antibiotic.concentration * pen;
      const kill  = C / (mic + C);
      factors.push({ name: 'AB Etkisi', value: kill * 100 });
    }

    const colors = factors.map(f => f.value > 70 ? '#00e5a0' : f.value > 40 ? '#f59e0b' : '#f87171');

    this.charts['chart-stress'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: factors.map(f => f.name),
        datasets: [{
          label: 'Faktör Etkisi (%)',
          data: factors.map(f => parseFloat(f.value.toFixed(1))),
          backgroundColor: colors,
          borderRadius: 5
        }]
      },
      options: {
        indexAxis: 'y',
        ...this._chartDefaults(ctx),
        plugins: { ...this._chartDefaults(ctx).plugins,
          legend: { display: false },
          title: { display: true, text: `Çevresel & Doku Stres İndeksi — ${tissueId}`, color: '#9aa0a8', font: { size: 10 } }
        },
        scales: {
          x: { ...this._chartDefaults(ctx).scales.x, min: 0, max: 105, title: { display: true, text: 'Etki (%)', color: '#5f6368' } },
          y: { ...this._chartDefaults(ctx).scales.y }
        }
      }
    });
  },


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
      case 'growth_curve': {
        // Lojistik büyüme formülü — renderGrowthCurve ile birebir aynı
        const K = 1.0;
        const r = bacteria.growthRate * 2;
        const lag = bacteria.lagPhaseHours;
        const A = (K - 0.01) / 0.01; // 99
        for (let t = 0; t <= 24; t++) {
          let y;
          if (t < lag) {
            y = 0.01;
          } else {
            const shiftedT = t - lag;
            y = K / (1 + A * Math.exp(-r * shiftedT));
          }
          data.push({ x: t, y: parseFloat(y.toFixed(4)) });
        }
        break;
      }
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
      case 'antibiotic_mic': {
        const abData = BacteriaStore.getAntibioticsFor ? BacteriaStore.getAntibioticsFor(bacteria._id) : [];
        if (abData && abData.length > 0) {
          abData.forEach(a => {
            data.push({ x: a.name, y: a.mic });
          });
        } else {
          data.push({ x: 'Veri yok', y: 0 });
        }
        break;
      }
      
      case 'mic_profile': {
        const abData = BacteriaStore.getAntibioticsFor(bacteria._id) || [];
        if (abData.length > 0) {
          abData.forEach(a => data.push({ x: a.name, y: a.mic || 0 }));
        } else {
          data.push({ x: 'Veri yok', y: 0 });
        }
        break;
      }
      case 'population_dynamics': {
        for (let t = 0; t <= 48; t += 2) {
          const lag = bacteria.lagPhaseHours || 2;
          const N = t < lag ? 0.001
            : 1 / (1 + 999 * Math.exp(-bacteria.mu_max * (t - lag)));
          data.push({ x: t, y: parseFloat(N.toFixed(4)) });
        }
        break;
      }
      case 'mutation_freq': {
        const rate = 1e-9;
        for (let t = 0; t <= (bacteria.maxTime || 72); t += 4) {
          const lambda = bacteria.mu_max * rate * t;
          data.push({ x: t, y: parseFloat((1 - Math.exp(-lambda)).toExponential(3)) });
        }
        break;
      }
      case 'biofilm_thickness': {
        const score = bacteria.growthRate * 0.5;
        for (let t = 0; t <= 72; t += 4) {
          const thick = score * 100 * (1 - Math.exp(-0.05 * t));
          data.push({ x: t, y: parseFloat(thick.toFixed(2)) });
        }
        break;
      }
      case 'survival_curve': {
        for (let t = 0; t <= 24; t++) {
          data.push({ x: t, y: parseFloat(Math.exp(-0.1 * t * bacteria.mu_max).toFixed(4)) });
        }
        break;
      }
      case 'stress_index': {
        for (let t = 0; t <= (bacteria.maxTime || 72); t += 4) {
          const tf = typeof calcTempFactor === 'function'
            ? calcTempFactor(37, bacteria.tempMin, bacteria.tempOptimum, bacteria.tempMax) : 0.8;
          const pf = typeof calcPhFactor === 'function'
            ? calcPhFactor(7, bacteria.phMin, bacteria.phOptimum, bacteria.phMax) : 0.8;
          data.push({ x: t, y: parseFloat((1 - tf * pf).toFixed(3)) });
        }
        break;
      }
default:
        // Desteklenmeyen grafik tipi — rastgele veri üretmek yerine bilgilendirici mesaj
        data.push({ x: 'Bu grafik tipi için dışa aktarma desteklenmiyor', y: null });
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
