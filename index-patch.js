// ═══════════════════════════════════════════════════════
//  INDEX-PATCH.JS
//  Bu dosyayı index.html'de tüm script'lerden SONRA yükle:
//  <script src="index-patch.js"></script>
//
//  Düzeltilen sorunlar:
//  1. addDishBtn görünür yapıldı (ikinci petri eklenebilir)
//  2. dish-btn CSS global olarak eklendi (+ ve × butonları çalışıyor)
//  3. dish-meta CSS eklendi (tval, phase, oxywarning)
//  4. populateDrugDropdown: d.drug → d.name
//  5. kcDrug change handler: a.drug → a.name
//  6. add-dish-card CSS eklendi
// ═══════════════════════════════════════════════════════

(function() {
  // ── 1. CSS düzeltmeleri ──────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    /* addDishBtn görünür */
    #addDishBtn {
      display: flex !important;
    }

    /* Yeni petri ekleme kartı */
    .add-dish-card {
      width: 200px;
      height: 200px;
      border-radius: 50%;
      border: 2px dashed var(--border2, #353b43);
      display: flex !important;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--text3, #5f6368);
      font-size: 36px;
      transition: border-color 0.2s, color 0.2s, transform 0.15s;
      flex-shrink: 0;
      user-select: none;
    }
    .add-dish-card:hover {
      border-color: var(--accent, #00e5a0);
      color: var(--accent, #00e5a0);
      transform: scale(1.04);
    }
    .add-dish-card::before {
      content: '+';
      font-family: var(--font-mono, monospace);
      font-weight: 700;
    }

    /* dish butonları global stil */
    .dish-btn {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 1px solid var(--border2, #353b43);
      background: var(--bg3, #181c1f);
      color: var(--text2, #9aa0a8);
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
      flex-shrink: 0;
      padding: 0;
    }
    .dish-btn:hover {
      border-color: var(--accent, #00e5a0);
      color: var(--accent, #00e5a0);
    }
    .dish-btn.delete:hover {
      border-color: #f87171;
      color: #f87171;
    }
    .dish-btns {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    /* dish-meta: zaman, faz, oksijen uyarısı */
    .dish-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      padding: 0 4px;
    }
    .dish-tval {
      font-family: var(--font-mono, monospace);
      font-size: 10px;
      color: var(--accent, #00e5a0);
      min-width: 36px;
    }
    .dish-phase-wrap {
      flex: 1;
    }
    .phase-bar {
      height: 3px;
      background: var(--bg2, #111417);
      border-radius: 2px;
      overflow: hidden;
    }
    .phase-fill {
      height: 100%;
      border-radius: 2px;
      transition: width 0.3s ease, background 0.3s ease;
    }
    .oxy-warning {
      font-size: 9px;
      color: #f59e0b;
      font-family: var(--font-mono, monospace);
      white-space: nowrap;
    }

    /* Petri seçili bakteri highlight */
    .bacteria-item.selected {
      background: rgba(0,229,160,0.08) !important;
      border-color: var(--accent, #00e5a0) !important;
    }
    .bacteria-item.selected .bac-dot {
      box-shadow: 0 0 10px currentColor !important;
    }
  `;
  document.head.appendChild(style);

  // ── 2. addDishBtn görünür yap ────────────────────────
  const addBtn = document.getElementById('addDishBtn');
  if (addBtn) {
    addBtn.style.display = 'flex';
    // İçeriği temizle ve + ikonunu ayarla (CSS ::before ile yapılıyor)
    addBtn.innerHTML = '';
  }

  // ── 3. KC panel: Drug dropdown ve MIC fix ───────────
  // DOMContentLoaded sonrasında çalıştır (index.html tamamen yüklendikten sonra)
  function patchKCPanel() {
    // populateDrugDropdown'u override et
    if (typeof window.populateDrugDropdown === 'function') {
      const _orig = window.populateDrugDropdown;
      window.populateDrugDropdown = function() {
        _orig.call(this);
        // d.drug undefined olduğunda dropdown boş kalıyor
        // Override: BacteriaStore antibiotics + PK'dan doldur
        const kcDrug = document.getElementById('kcDrug');
        if (!kcDrug) return;
        if (kcDrug.options.length > 1) return; // Zaten doluysa dokunma

        const pkData = (window.BacteriaStore && window.BacteriaStore.antibioticPK) || [];
        pkData.forEach(pk => {
          const opt = document.createElement('option');
          opt.value       = pk.id;
          opt.textContent = pk.id.charAt(0).toUpperCase() + pk.id.slice(1).replace(/-/g,' ');
          kcDrug.appendChild(opt);
        });
      };
    }

    // kcDrug change handler'ı patch et (a.drug → a.name)
    const kcDrug = document.getElementById('kcDrug');
    if (kcDrug) {
      kcDrug.addEventListener('change', function() {
        // Bu event index.html'deki handler'dan SONRA çalışır
        // Eğer MIC hâlâ 8 ise (default) gerçek değeri bul
        const state = typeof getActiveDish === 'function' ? getActiveDish() : null;
        if (!state || state.inoculations.length === 0) return;

        const drugId = this.value;
        const kcMicRef = document.getElementById('kcMicRef');

        // Aktif petrideki tüm bakterilerin bu ilaca karşı MIC değerlerini bul
        const mics = state.inoculations.map(inoc => {
          const abList = window.BacteriaStore.getAntibioticsFor(inoc.bacteria._id);
          // DÜZELTME: a.name ile karşılaştır
          const match = abList.find(a => a.name === drugId);
          return match ? match.mic : null;
        }).filter(v => v !== null);

        if (mics.length > 0 && kcMicRef) {
          const minMic = Math.min(...mics);
          kcMicRef.textContent = `MIC: ${minMic} mg/L`;
        }
      });
    }
  }

  // DOM hazır olduktan sonra çalıştır
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchKCPanel);
  } else {
    setTimeout(patchKCPanel, 500); // DataLoader'dan sonra
  }

  // ── 4. DataLoader sonrası populateDrugDropdown tekrar çağır ──
  const _origDataLoaderLoad = window.DataLoader ? window.DataLoader.load : null;
  if (window.DataLoader) {
    const __origLoad = window.DataLoader.load.bind(window.DataLoader);
    window.DataLoader.load = async function() {
      const result = await __origLoad();
      setTimeout(() => {
        if (typeof window.populateDrugDropdown === 'function') {
          window.populateDrugDropdown();
        }
        patchKCPanel();
      }, 200);
      return result;
    };
  }

  console.log('[index-patch.js] Tüm düzeltmeler uygulandı.');
})();

// ═══════════════════════════════════════
//  KAYDEDİLEN PETRİLER PANELİ
// ═══════════════════════════════════════
(function() {
  function initSavedDishesPanel() {
    const toggleBtn = document.getElementById('savedDishesToggleBtn');
    const panel     = document.getElementById('savedDishesPanel');
    const list      = document.getElementById('savedDishesPanelList');
    const countBadge = document.getElementById('savedDishesCount');
    if (!toggleBtn || !panel) return;

    // Toggle panel
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = panel.style.display === 'block';
      panel.style.display = isOpen ? 'none' : 'block';
      toggleBtn.classList.toggle('active', !isOpen);
      if (!isOpen) renderSavedPanel();
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!panel.contains(e.target) && e.target !== toggleBtn) {
        panel.style.display = 'none';
        toggleBtn.classList.remove('active');
      }
    });

    // Render saved dishes in panel
    function renderSavedPanel() {
      const saved = window.savedDishes || [];

      // Update count badge
      if (countBadge) {
        countBadge.textContent = saved.length;
        countBadge.style.display = saved.length > 0 ? 'inline' : 'none';
      }

      if (!list) return;

      if (saved.length === 0) {
        list.innerHTML = '<div style="color:var(--text3);font-size:11px;text-align:center;padding:16px 0;">Henüz kaydedilen deney yok</div>';
        return;
      }

      list.innerHTML = '';
      saved.forEach(state => {
        const item = document.createElement('div');
        item.style.cssText = `
          display:flex; align-items:center; gap:10px; padding:8px;
          border:1px solid var(--border); border-radius:7px; margin-bottom:6px;
          cursor:pointer; transition:border-color 0.15s; background:var(--bg3);
        `;
        item.onmouseenter = () => item.style.borderColor = 'var(--accent)';
        item.onmouseleave = () => item.style.borderColor = 'var(--border)';

        // Mini thumbnail canvas
        const miniCanvas = document.createElement('canvas');
        miniCanvas.width = 44; miniCanvas.height = 44;
        miniCanvas.style.cssText = 'border-radius:50%;border:1px solid var(--border2);flex-shrink:0;';
        if (typeof renderThumbnail === 'function') renderThumbnail(miniCanvas, state);

        const info = document.createElement('div');
        info.style.flex = '1';
        const bacteria = state.inoculations.map(i => i.bacteria.name).join(', ') || 'Boş';
        info.innerHTML = `
          <div style="font-size:10px;color:var(--text);font-weight:700;margin-bottom:2px;">
            ${state.inoculations.length > 1 ? 'Karma kültür' : (state.inoculations[0]?.bacteria.name || 'Boş')}
          </div>
          <div style="font-size:9px;color:var(--text3);">
            ${state.inoculations.length} tür · ${state.temp}°C · pH ${state.ph}
          </div>
        `;

        // Geri yükle butonu
        const restoreBtn = document.createElement('button');
        restoreBtn.textContent = '↩';
        restoreBtn.title = 'Geri yükle';
        restoreBtn.style.cssText = `
          background:transparent; border:1px solid var(--border2); color:var(--accent);
          border-radius:4px; padding:3px 7px; cursor:pointer; font-size:12px;
          flex-shrink:0;
        `;
        restoreBtn.onclick = (e) => {
          e.stopPropagation();
          // Restore dish to workspace
          state.element.style.display = '';
          const activeDishes = window.activeDishes || [];
          if (!activeDishes.find(d => d.id === state.id)) {
            activeDishes.push(state);
            window.activeDishes = activeDishes;
          }
          window.savedDishes = (window.savedDishes || []).filter(s => s.id !== state.id);
          if (typeof updateDishCount  === 'function') updateDishCount(activeDishes);
          if (typeof updatePanelMode  === 'function') updatePanelMode(activeDishes, window.selectedBacteria);
          if (typeof redraw === 'function') redraw(state);
          renderSavedPanel();
        };

        item.appendChild(miniCanvas);
        item.appendChild(info);
        item.appendChild(restoreBtn);
        list.appendChild(item);
      });
    }

    // Update badge count whenever savedDishes changes
    // Poll every second (simple approach)
    setInterval(() => {
      const saved = window.savedDishes || [];
      if (countBadge) {
        countBadge.textContent = saved.length;
        countBadge.style.display = saved.length > 0 ? 'inline' : 'none';
      }
    }, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSavedDishesPanel);
  } else {
    setTimeout(initSavedDishesPanel, 600);
  }
})();
