// ═══════════════════════════════════════════════════════
//  APP.JS — Main Application Logic
//  Bağımlılıklar: bacteria-store.js, simulation.js, 
//  renderer.js, ui-panels.js
// ═══════════════════════════════════════════════════════

let selectedBacteria = null;
let activeDishes = [];
let savedDishes = [];
let dishCounter = 0;
let activeFilter = 'all';
let searchQuery = '';
let experimentLog = []; // global log for all petri dishes
let pendingSaveState = null; // for save modal

// ═══════════════════════════════════════
//  RENDER BACTERIA LIST
// ═══════════════════════════════════════
function getFilteredBacteria() {
  return BacteriaStore.all.filter(b => {
    const matchSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase())
      || b.pigment.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;
    if (activeFilter === 'all') return true;
    if (activeFilter === 'gram-pos') return b.gramPos;
    if (activeFilter === 'gram-neg') return b.gramNeg;
    if (activeFilter === 'bioluminescent') return b.bioluminescent;
    if (activeFilter === 'toxic') return b.toxin !== 'Yok';
    if (activeFilter === 'aerobic') return b.oxygenReq === 'aerobic';
    if (activeFilter === 'anaerobic') return b.oxygenReq === 'anaerobic';
    return true;
  });
}

function renderBacteriaList() {
  const list = document.getElementById('bacteriaList');
  const filtered = getFilteredBacteria();
  list.innerHTML = '';

  if (filtered.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:12px;font-family:Space Mono,monospace;">No results</div>';
    return;
  }

  filtered.forEach(b => {
    const item = document.createElement('div');
    item.className = 'bacteria-item' + (selectedBacteria?.id === b.id ? ' selected' : '');
    item.innerHTML = `
      <div class="bac-dot" style="background-color: ${b.colorStops[1]}; box-shadow: 0 0 6px ${b.colorStops[1]}40"></div>
      <div class="bac-info">
        <div class="bac-name">${b.name}</div>
        <div class="bac-taxonomy">${b.gramPos ? 'gram-pos' : 'gram-neg'} · ${b.morphology || 'bacillus'} · ${b.oxygenReq}</div>
      </div>
    `;

    item.addEventListener('click', () => {
      selectedBacteria = b;
      renderBacteriaList();
      showSelectedBadge(b);
      showDetailPanel(b);
      renderInfoPanel(b);
      renderMicroscopyPanel(b);
      if (window.updateMorphologyImage) window.updateMorphologyImage(b.name);
      
      const lastDish = activeDishes.length > 0 ? activeDishes[activeDishes.length - 1] : null;
      if (window.ChartManager) {
        window.ChartManager.updateAll(b, lastDish);
      }
    });

    list.appendChild(item);
  });
}

// ═══════════════════════════════════════
//  DISH CREATION
// ═══════════════════════════════════════
function addDish() {
  dishCounter++;
  const id = `dish-${dishCounter}`;
  const dishNum = dishCounter;

  const wrap = document.createElement('div');
  wrap.className = 'petri-wrap';
  wrap.id = id;

  wrap.innerHTML = `
    <div class="dish-top">
      <div class="dish-name-tag" id="${id}-nametag">Empty dish</div>
      <div class="dish-btns">
        <button class="dish-btn save" title="Save to library">+</button>
        <button class="dish-btn delete" title="Delete">×</button>
      </div>
    </div>
    <div class="dish-circle-wrapper">
      <div class="dish-glass">
        <canvas class="petri-canvas" id="${id}-canvas" width="260" height="260"></canvas>
        <div class="dish-hint" id="${id}-hint">Select a strain<br>then click here</div>
      </div>
    </div>
    <div class="controls-panel">
      <div class="ctrl-row">
        <div class="ctrl-icon">⏱</div>
        <div class="ctrl-track">
          <div class="ctrl-header">
            <span class="ctrl-label">Time</span>
            <span class="ctrl-value" id="${id}-tval">0.0h</span>
          </div>
          <input type="range" class="ctrl-slider time-slider" min="0" max="100" step="0.1" value="0" id="${id}-tslider">
          <div class="phase-bar"><div class="phase-fill" id="${id}-phase" style="width:0%;background:var(--accent)"></div></div>
        </div>
      </div>
      <div class="ctrl-row">
        <div class="ctrl-icon">🌡</div>
        <div class="ctrl-track">
          <div class="ctrl-header">
            <span class="ctrl-label">Temperature</span>
            <span class="ctrl-value" id="${id}-tempval">37.0°C</span>
          </div>
          <input type="range" class="ctrl-slider temp-slider" min="0" max="100" step="0.1" value="37" id="${id}-tempslider">
        </div>
      </div>
      <div class="ctrl-row">
        <div class="ctrl-icon">⚗</div>
        <div class="ctrl-track">
          <div class="ctrl-header">
            <span class="ctrl-label">pH</span>
            <span class="ctrl-value" id="${id}-phval">7.0</span>
          </div>
          <input type="range" class="ctrl-slider ph-slider" min="0" max="14" step="0.1" value="7.0" id="${id}-phslider">
        </div>
      </div>
      <div class="ctrl-row">
        <div class="ctrl-icon">🧂</div>
        <div class="ctrl-track">
          <div class="ctrl-header">
            <span class="ctrl-label">NaCl</span>
            <span class="ctrl-value" id="${id}-naclval">0.5%</span>
          </div>
          <input type="range" class="ctrl-slider nacl-slider" min="0" max="25" step="0.1" value="0.5" id="${id}-naclslider">
        </div>
      </div>
      <div class="ctrl-row">
        <div class="ctrl-icon">💨</div>
        <div class="ctrl-track">
          <div class="ctrl-header">
            <span class="ctrl-label">Oxygen</span>
            <span class="ctrl-value oxy-warning" id="${id}-oxywarning" style="display:none">⚠ Incompatible</span>
          </div>
          <div class="oxy-row">
            <button class="oxy-btn active" data-oxy="aerobic">Aerobic</button>
            <button class="oxy-btn" data-oxy="microaerophilic">Micro</button>
            <button class="oxy-btn" data-oxy="anaerobic">Anaerobic</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const workspace = document.getElementById('workspace');
  const addBtn = document.getElementById('addDishBtn');
  if (addBtn) {
    workspace.insertBefore(wrap, addBtn);
  } else {
    workspace.appendChild(wrap);
  }
  
  // Workspace alanı otomatik olarak en alta kaydırılsın
  const workspaceArea = document.querySelector('.workspace-area');
  if (workspaceArea) {
    workspaceArea.scrollTop = workspaceArea.scrollHeight;
  } else {
    workspace.scrollTop = workspace.scrollHeight;
  }

  const canvas = document.getElementById(`${id}-canvas`);
  const ctx = canvas.getContext('2d');

  const state = {
    id, dishCounter: dishNum, dishNum,
    canvas, ctx,
    inoculations: [],
    inocIdx: 0,
    time: 0, temp: 37, ph: 7.0, nacl: 0.5, oxy: 'aerobic',
    element: wrap,
  };

  activeDishes.push(state);
  updateDishCount(activeDishes);
  updatePanelMode(activeDishes, selectedBacteria);

  // Canvas click → inoculate
  canvas.addEventListener('click', e => {
    if (!selectedBacteria) {
      showFlash('Select a strain from the left panel first');
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * sx;
    const y = (e.clientY - rect.top) * sy;

    const seed = state.dishNum * 1000 + state.inocIdx++;
    state.inoculations.push(new CFU(x, y, selectedBacteria, seed));

    const nametag = document.getElementById(`${id}-nametag`);
    nametag.textContent = state.inoculations.length > 1
      ? `Mixed culture (${state.inoculations.length} strains)`
      : selectedBacteria.name;

    document.getElementById(`${id}-hint`).style.display = 'none';
    addLogEntry(state.dishNum, 'Bakteri Eklendi', state, selectedBacteria.name);
    redraw(state);
    window.isListModeForced = false;
    updatePanelMode(activeDishes, selectedBacteria);
  });

  // Controls - live update display on input
  const tslider = document.getElementById(`${id}-tslider`);
  const tempslider = document.getElementById(`${id}-tempslider`);
  const phslider = document.getElementById(`${id}-phslider`);
  const naclslider = document.getElementById(`${id}-naclslider`);
  const oxyBtns = wrap.querySelectorAll('.oxy-btn');

  tslider.addEventListener('input', e => {
    state.time = +e.target.value;
    document.getElementById(`${id}-tval`).textContent = state.inoculations.length > 0
      ? `${(state.time/100 * (state.inoculations[0].bacteria.maxTime)).toFixed(1)}h`
      : `${(state.time*0.72).toFixed(1)}h`;
    redraw(state);
  });
  tslider.addEventListener('change', () => addLogEntry(state.dishNum, 'Zaman Değiştirildi', state));

  tempslider.addEventListener('input', e => {
    state.temp = +e.target.value;
    document.getElementById(`${id}-tempval`).textContent = `${state.temp.toFixed(1)}°C`;
    redraw(state);
  });
  tempslider.addEventListener('change', () => addLogEntry(state.dishNum, 'Sıcaklık Değiştirildi', state));

  phslider.addEventListener('input', e => {
    state.ph = parseFloat(e.target.value);
    document.getElementById(`${id}-phval`).textContent = state.ph.toFixed(1);
    redraw(state);
  });
  phslider.addEventListener('change', () => addLogEntry(state.dishNum, 'pH Değiştirildi', state));

  naclslider.addEventListener('input', e => {
    state.nacl = parseFloat(e.target.value);
    document.getElementById(`${id}-naclval`).textContent = `${state.nacl.toFixed(1)}%`;
    redraw(state);
  });
  naclslider.addEventListener('change', () => addLogEntry(state.dishNum, 'NaCl Değiştirildi', state));

  oxyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      oxyBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.oxy = btn.dataset.oxy;
      addLogEntry(state.dishNum, 'O₂ Değiştirildi', state);
      redraw(state);
    });
  });

  // Save / Delete
  wrap.querySelector('.dish-btn.save').addEventListener('click', () => showSaveModal(state));
  wrap.querySelector('.dish-btn.delete').addEventListener('click', () => deleteDish(state));
}

function deleteDish(state) {
  state.element.style.animation = 'dishIn 0.3s cubic-bezier(0.34,1.56,0.64,1) reverse';
  setTimeout(() => {
    state.element.remove();
    activeDishes = activeDishes.filter(d => d.id !== state.id);
    updateDishCount(activeDishes);
    updatePanelMode(activeDishes, selectedBacteria);
  }, 280);
}

// ═══════════════════════════════════════
//  EXPERIMENT LOG
// ═══════════════════════════════════════
function addLogEntry(dishNum, action, state, bacteriaName) {
  const now = new Date();
  const entry = {
    petri: dishNum,
    date: now.toLocaleDateString('tr-TR'),
    time: now.toLocaleTimeString('tr-TR'),
    action: action,
    temp: `${state.temp.toFixed(1)}°C`,
    ph: state.ph.toFixed(1),
    oxy: state.oxy,
    nacl: `${state.nacl.toFixed(1)}%`,
    bacteria: bacteriaName || '—'
  };
  experimentLog.push(entry);
  renderLogTable(experimentLog);
}

// ═══════════════════════════════════════
//  SAVE MODAL
// ═══════════════════════════════════════
function showSaveModal(state) {
  if (state.inoculations.length === 0) {
    showFlash('Inoculate at least one strain before saving');
    return;
  }
  pendingSaveState = state;
  const modal = document.getElementById('saveModal');
  const input = document.getElementById('saveModalInput');
  input.value = '';
  modal.style.display = 'flex';
  setTimeout(() => input.focus(), 100);
}

function commitSave(name) {
  const state = pendingSaveState;
  if (!state) return;
  pendingSaveState = null;
  document.getElementById('saveModal').style.display = 'none';

  const lib = document.getElementById('library');
  const emptyEl = document.getElementById('libraryEmpty');
  if (emptyEl) emptyEl.style.display = 'none';

  const item = document.createElement('div');
  item.className = 'lib-item';

  const miniCanvas = document.createElement('canvas');
  miniCanvas.className = 'lib-canvas';
  miniCanvas.width = 50;
  miniCanvas.height = 50;

  const libDish = document.createElement('div');
  libDish.className = 'lib-dish';
  libDish.appendChild(miniCanvas);

  item.appendChild(libDish);
  const lbl = document.createElement('div');
  lbl.className = 'lib-label';
  lbl.textContent = name;
  item.appendChild(lbl);

  renderThumbnail(miniCanvas, state);

  item.addEventListener('click', () => {
    state.element.style.display = '';
    activeDishes.push(state);
    item.remove();
    updateDishCount(activeDishes);
    updatePanelMode(activeDishes, selectedBacteria);
    if (!lib.querySelector('.lib-item')) {
      const e2 = document.getElementById('libraryEmpty');
      if (e2) e2.style.display = '';
    }
    savedDishes = savedDishes.filter(d => d.id !== state.id);
  });

  lib.appendChild(item);
  state.element.style.display = 'none';
  activeDishes = activeDishes.filter(d => d.id !== state.id);
  savedDishes.push(state);
  updateDishCount(activeDishes);
  updatePanelMode(activeDishes, selectedBacteria);
}

// ═══════════════════════════════════════
//  CSV DOWNLOAD
// ═══════════════════════════════════════
function downloadCSV(content, filename) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadBacteriaCSV() {
  // Eski veri formatına uygun veya yeni formata uygun CSV oluşturulabilir
  const header = 'Bakteri Adı,Gram Türü,Üreme Sıcaklığı (°C),Opt. Sıcaklık,Üreme Hızı,Oksijen Req,Koloni Büyüklüğü\n';
  const rows = BacteriaStore.all.map(b => `${b.name},${b.gram},${b.tempMin}-${b.tempMax},${b.tempOptimum},${b.growthRate},${b.oxygenReq},${b.colonySize}`).join('\n');
  downloadCSV(header + rows, 'bacteria_dataset.csv');
}

function getLogCSVForPetri(petriNum) {
  const rows = petriNum === 'all' ? experimentLog : experimentLog.filter(e => e.petri === petriNum);
  const header = 'Petri,Tarih,Saat,İşlem,Sıcaklık,pH,O₂,NaCl,Bakteri';
  const lines = rows.map(e => `${e.petri},${e.date},${e.time},${e.action},${e.temp},${e.ph},${e.oxy},${e.nacl},${e.bacteria}`);
  return header + '\n' + lines.join('\n');
}

function showLogDownloadModal() {
  const modal = document.getElementById('logDownloadModal');
  const list = document.getElementById('modalPetriList');
  const usedPetris = [...new Set(experimentLog.map(e => e.petri))].sort((a,b) => a-b);

  if (usedPetris.length === 0) {
    showFlash('Henüz kayıtlı işlem yok');
    return;
  }

  list.innerHTML = usedPetris.map(p => `
    <div class="modal-petri-item" data-petri="${p}">
      <span>🧫</span>
      <span>${p}. Petri Kabı</span>
    </div>
  `).join('');

  list.querySelectorAll('.modal-petri-item').forEach(item => {
    item.addEventListener('click', () => {
      const pNum = parseInt(item.dataset.petri);
      downloadCSV(getLogCSVForPetri(pNum), `petri_${pNum}_log.csv`);
    });
  });

  modal.style.display = 'flex';
}

function downloadBacteriaJSON() {
  // Tarayıcıda doğrudan klasör indirme desteklenmediği için,
  // data klasöründeki dosyaların adlarını bu diziye ekleyerek tek tek indirilmelerini sağlayabilirsiniz.
  const files = [
    'bacteria_dataset.json',
    // 'diger_dosya.csv' vb. 
  ];

  files.forEach(fileName => {
    const a = document.createElement('a');
    a.href = `./data/${fileName}`;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
}

// ═══════════════════════════════════════
//  EVENT LISTENERS
// ═══════════════════════════════════════
document.getElementById('searchInput').addEventListener('input', e => {
  searchQuery = e.target.value;
  renderBacteriaList();
});

document.querySelectorAll('.filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeFilter = chip.dataset.filter;
    renderBacteriaList();
  });
});

document.getElementById('addDishBtn').addEventListener('click', addDish);

// Close detail panel on outside click
document.addEventListener('click', e => {
  const panel = document.getElementById('detailPanel');
  if (!e.target.closest('.bacteria-item') && !e.target.closest('.bac-detail-panel')) {
    panel.style.display = 'none';
  }
});

// Dataset download button in header
document.getElementById('datasetDownloadBtn').addEventListener('click', downloadBacteriaJSON);

// Back to list button
const backBtn = document.getElementById('backToListBtn');
if (backBtn) {
  backBtn.addEventListener('click', () => {
    window.isListModeForced = true;
    updatePanelMode(activeDishes, selectedBacteria);
  });
}

// Save modal buttons
document.getElementById('saveModalConfirm').addEventListener('click', () => {
  const name = document.getElementById('saveModalInput').value.trim();
  if (!name) {
    showFlash('İsim girin veya iptal edin');
    return;
  }
  commitSave(name);
});
document.getElementById('saveModalCancel').addEventListener('click', () => {
  pendingSaveState = null;
  document.getElementById('saveModal').style.display = 'none';
});
document.getElementById('saveModalInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const name = e.target.value.trim();
    if (!name) return;
    commitSave(name);
  }
  if (e.key === 'Escape') {
    pendingSaveState = null;
    document.getElementById('saveModal').style.display = 'none';
  }
});

// Log download modal
document.getElementById('logDownloadBtn').addEventListener('click', showLogDownloadModal);
document.getElementById('logModalDownloadAll').addEventListener('click', () => {
  downloadCSV(getLogCSVForPetri('all'), 'tum_petri_log.csv');
  document.getElementById('logDownloadModal').style.display = 'none';
});
document.getElementById('logModalCancel').addEventListener('click', () => {
  document.getElementById('logDownloadModal').style.display = 'none';
});

// ═══════════════════════════════════════
//  INIT
// ═══════════════════════════════════════

// Initial data load and render
DataLoader.load().then((success) => {
  if (success) {
    renderBacteriaList();
    addDish(); // Start with one dish
    updatePanelMode(activeDishes, selectedBacteria);
  } else {
    alert("Failed to load bacteria dataset.");
  }
});

// Attach event listener to initial New Dish button, to fix the old bug
document.getElementById('addDishBtn').addEventListener('click', addDish);
