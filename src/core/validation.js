// ═══════════════════════════════════════════════════════════════════
//  VALIDATION ENGINE — Simülasyon Çıktılarını Literatür ile Karşılaştırma
//  Bağımlılıklar: bacteria-store.js (BacteriaStore),
//                 data/literature_benchmarks.json
// ═══════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
//  VERİ YÜKLEYİCİ — Benchmark verilerini yönetir
// ─────────────────────────────────────────────────────────

const ValidationData = {
  benchmarks: [],
  _loaded: false,

  async load() {
    if (this._loaded) return;

    // Önce BacteriaStore üzerinden dene
    if (typeof BacteriaStore !== 'undefined' && BacteriaStore.literatureBenchmarks && BacteriaStore.literatureBenchmarks.length > 0) {
      this.benchmarks = BacteriaStore.literatureBenchmarks;
      this._loaded = true;
      return;
    }

    // Fetch ile yükle
    try {
      const resp = await fetch('data/literature_benchmarks.json');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      this.benchmarks = await resp.json();
      this._loaded = true;
      console.log(`[ValidationData] ${this.benchmarks.length} benchmark yüklendi.`);
    } catch (e) {
      console.error('[ValidationData] Benchmark verisi yüklenemedi:', e.message);
      this.benchmarks = [];
    }
  },

  /** ID'ye göre benchmark getir */
  getById(benchmarkId) {
    return this.benchmarks.find(b => b.id === benchmarkId) || null;
  },

  /** Bakteri ve deney tipine göre benchmark ara */
  findByBacteria(bacteriaId, experimentType) {
    return this.benchmarks.filter(
      b => b.bacteria_a === bacteriaId &&
           (!experimentType || b.experiment_type === experimentType)
    );
  },

  /** Tüm benchmark ID'lerini listele */
  getAllIds() {
    return this.benchmarks.map(b => b.id);
  }
};


// ─────────────────────────────────────────────────────────
//  İSTATİSTİK YARDIMCILARI
// ─────────────────────────────────────────────────────────

/**
 * R² (determinasyon katsayısı) hesaplama
 *   ss_res = Σ(sim_i − ref_i)²
 *   ss_tot = Σ(ref_i − mean(ref))²
 *   R² = 1 − (ss_res / ss_tot)
 *
 * Tek değer çifti geldiğinde simulated/reference oranına dayalı
 * proxy R² döndürür.
 *
 * @param {number[]} simulated  — simülasyon değerleri
 * @param {number[]} reference  — referans (literatür) değerleri
 * @returns {number} R² (−∞, 1]
 */
function calcRSquared(simulated, reference) {
  const n = simulated.length;
  if (n === 0) return 0;

  // Tek veri noktasında ss_tot = 0 olur; oran tabanlı proxy kullan
  if (n === 1) {
    const sim = simulated[0];
    const ref = reference[0];
    if (ref === 0) return sim === 0 ? 1 : 0;
    const ratio = sim / ref;
    // Mükemmel örtüşme → 1, sapma arttıkça düşer
    return Math.max(0, 1 - Math.pow(ratio - 1, 2));
  }

  const meanRef = reference.reduce((s, v) => s + v, 0) / n;

  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    ssRes += Math.pow(simulated[i] - reference[i], 2);
    ssTot += Math.pow(reference[i] - meanRef, 2);
  }

  if (ssTot === 0) return ssRes === 0 ? 1 : 0;
  return 1 - (ssRes / ssTot);
}

/**
 * RMSE (Kök Ortalama Kare Hatası) hesaplama
 *   rmse = √(mean((sim_i − ref_i)²))
 *
 * @param {number[]} simulated
 * @param {number[]} reference
 * @returns {number}
 */
function calcRMSE(simulated, reference) {
  const n = simulated.length;
  if (n === 0) return 0;

  let sumSqErr = 0;
  for (let i = 0; i < n; i++) {
    sumSqErr += Math.pow(simulated[i] - reference[i], 2);
  }
  return Math.sqrt(sumSqErr / n);
}

/**
 * MAPE (Ortalama Mutlak Yüzde Hatası) hesaplama
 *   mape = mean(|sim_i − ref_i| / |ref_i|) × 100
 *
 * @param {number[]} simulated
 * @param {number[]} reference
 * @returns {number} yüzde olarak (ör. 15.3)
 */
function calcMAPE(simulated, reference) {
  const n = simulated.length;
  if (n === 0) return 0;

  let sumAPE = 0;
  let validCount = 0;
  for (let i = 0; i < n; i++) {
    if (reference[i] === 0) {
      // Referans sıfırsa ve simülasyon da sıfırsa hata 0, değilse %100 say
      if (simulated[i] !== 0) sumAPE += 1;
      validCount++;
      continue;
    }
    sumAPE += Math.abs(simulated[i] - reference[i]) / Math.abs(reference[i]);
    validCount++;
  }

  if (validCount === 0) return 0;
  return (sumAPE / validCount) * 100;
}


// ─────────────────────────────────────────────────────────
//  ANA FONKSİYONLAR
// ─────────────────────────────────────────────────────────

/**
 * Simülasyon sonucunu referans değer ile karşılaştır
 *
 * Eşleşme mantığı (benchmark value_type → simResult alanı):
 *   "mic"          → simResult.micCalculated
 *   "mbc"          → simResult.mbcCalculated
 *   "mbec"         → simResult.biofilmThickness proxy
 *   "fic_index"    → simResult.micCalculated (ko-kültür MIC değişimi)
 *   "biofilm_kill" → simResult.finalPopulation → log10 kill hesabı
 *
 * @param {SimulationResult} simResult    — simülasyon çıktısı
 * @param {string}           benchmarkId  — karşılaştırılacak benchmark ID'si
 * @returns {Promise<ValidationResult>}
 */
async function compareToLiterature(simResult, benchmarkId) {
  await ValidationData.load();

  const benchmark = ValidationData.getById(benchmarkId);
  if (!benchmark) {
    return _errorResult(benchmarkId, `Benchmark '${benchmarkId}' bulunamadı.`);
  }

  // Simülasyon değerini benchmark tipine göre seç
  const simValue = _extractSimValue(simResult, benchmark);
  if (simValue === null) {
    return _errorResult(benchmarkId,
      `SimulationResult'ta '${benchmark.value_type}' için uygun alan bulunamadı.`);
  }

  const refValue = benchmark.reference_value;

  // Dizi olarak istatistikleri hesapla
  const simArr = [simValue];
  const refArr = [refValue];

  const rSquared = calcRSquared(simArr, refArr);
  const rmse     = calcRMSE(simArr, refArr);
  const mape     = calcMAPE(simArr, refArr);

  // <%20 sapma = pass
  const passThreshold = mape < 20;

  return {
    benchmarkId,
    simulatedValue: _round(simValue, 6),
    referenceValue: _round(refValue, 6),
    rSquared:       _round(rSquared, 6),
    rmse:           _round(rmse, 6),
    mape:           _round(mape, 4),
    passThreshold,
    errorMessage:   ''
  };
}

/**
 * Toplu validasyon — birden fazla simülasyon sonucunu otomatik
 * eşleşen benchmark'larla karşılaştır
 *
 * @param {SimulationResult[]} simResults
 * @returns {Promise<ValidationSummary>}
 */
async function batchValidate(simResults) {
  await ValidationData.load();

  const validationResults = [];

  for (const sim of simResults) {
    // Bu simülasyona uygun benchmark'ları bul
    const matchingBenchmarks = _findMatchingBenchmarks(sim);

    for (const bm of matchingBenchmarks) {
      const result = await compareToLiterature(sim, bm.id);
      validationResults.push(result);
    }
  }

  // Eğer hiç eşleşme bulunamadıysa boş sonuç dön
  if (validationResults.length === 0) {
    return {
      totalTests:      0,
      passedTests:     0,
      averageRSquared: 0,
      averageRMSE:     0,
      grade:           'D',
      reportCSV:       _generateEmptyCSV()
    };
  }

  // İstatistikleri hesapla (hatalı sonuçları hariç tut)
  const validResults = validationResults.filter(r => r.errorMessage === '');
  const passedTests  = validResults.filter(r => r.passThreshold).length;

  const avgRSquared = validResults.length > 0
    ? validResults.reduce((s, r) => s + r.rSquared, 0) / validResults.length
    : 0;

  const avgRMSE = validResults.length > 0
    ? validResults.reduce((s, r) => s + r.rmse, 0) / validResults.length
    : 0;

  const avgMAPE = validResults.length > 0
    ? validResults.reduce((s, r) => s + r.mape, 0) / validResults.length
    : 0;

  // Not verme
  const grade = _calculateGrade(passedTests, validResults.length, avgRSquared, avgMAPE);

  // CSV rapor oluştur
  const reportCSV = generateReport(validationResults, 'csv');

  return {
    totalTests:      validationResults.length,
    passedTests,
    averageRSquared: _round(avgRSquared, 6),
    averageRMSE:     _round(avgRMSE, 6),
    grade,
    reportCSV
  };
}

/**
 * Validasyon sonuçlarından rapor oluştur
 *
 * @param {ValidationResult[]} results
 * @param {'csv'|'pdf'} format — 'csv' veya 'pdf'
 * @returns {string}
 */
function generateReport(results, format) {
  if (format === 'csv') {
    return _generateCSV(results);
  }
  if (format === 'pdf') {
    return _generatePDFMarkup(results);
  }
  throw new Error(`[generateReport] Desteklenmeyen format: '${format}'`);
}


// ─────────────────────────────────────────────────────────
//  DAHİLİ YARDIMCI FONKSİYONLAR
// ─────────────────────────────────────────────────────────

/**
 * Simülasyon sonucundan benchmark tipine göre değer çıkar
 */
function _extractSimValue(simResult, benchmark) {
  switch (benchmark.value_type) {
    case 'mic':
      return simResult.micCalculated != null ? simResult.micCalculated : null;

    case 'mbc':
      return simResult.mbcCalculated != null ? simResult.mbcCalculated : null;

    case 'mbec':
      // MBEC → biyofilm kalınlığı ile ilişkili MIC proxy
      // Biyofilm varsa: MIC × (1 + biofilmThickness/100) yaklaşımı
      if (simResult.micCalculated != null && simResult.biofilmThickness != null) {
        return simResult.micCalculated * (1 + simResult.biofilmThickness / 100);
      }
      return simResult.micCalculated || null;

    case 'fic_index':
      // FIC index: ko-kültürdeki MIC değişiminin oranı
      // simResult.micCalculated = ko-kültür MIC
      // benchmark.reference_value = referans FIC
      if (simResult.micCalculated != null && simResult.concentration > 0) {
        // FIC = (MIC_combination / MIC_alone)_A + (MIC_combination / MIC_alone)_B
        // Basitleştirilmiş: simüle edilen MIC / referans MIC oranı
        return simResult.micCalculated;
      }
      return null;

    case 'biofilm_kill':
      // Biyofilm kill: log10 azalma veya yüzde
      if (benchmark.unit === 'log10_CFU' && simResult.finalPopulation != null) {
        // Başlangıç popülasyonu 10^6 varsayımı
        const initialPop = 1e6;
        if (simResult.finalPopulation <= 0) return 6; // tam eradikasyon
        return Math.max(0, Math.log10(initialPop) - Math.log10(simResult.finalPopulation));
      }
      if (benchmark.unit === '%' && simResult.finalPopulation != null) {
        const initialPop = 1e6;
        const killPct = Math.max(0, (1 - simResult.finalPopulation / initialPop)) * 100;
        return Math.min(100, killPct);
      }
      return null;

    default:
      return null;
  }
}

/**
 * Simülasyon sonucuna uygun benchmark'ları bul
 */
function _findMatchingBenchmarks(simResult) {
  const allBenchmarks = ValidationData.benchmarks;

  return allBenchmarks.filter(bm => {
    // Bakteri ID eşleşmesi
    if (bm.bacteria_a !== simResult.bacteriaId) return false;

    // İlaç eşleşmesi (notes alanında aranır)
    if (simResult.drug) {
      const drugLower = simResult.drug.toLowerCase();
      const notesLower = (bm.notes || '').toLowerCase();
      const reportedLower = (bm.reported_by || '').toLowerCase();
      // İlaç adı benchmark notlarında veya deney açıklamasında geçmeli
      if (!notesLower.includes(drugLower) && !reportedLower.includes(drugLower)) {
        return false;
      }
    }

    // Değer tipi eşleşmesi — simülasyonda karşılığı olan benchmark'lar
    const hasMatch = _extractSimValue(simResult, bm) !== null;
    return hasMatch;
  });
}

/**
 * Not hesaplama
 *   A: >%90 geçme + R² >0.9
 *   B: >%75 geçme + R² >0.7
 *   C: >%50 geçme + R² >0.5
 *   D: geri kalan
 */
function _calculateGrade(passed, total, avgR2, avgMAPE) {
  if (total === 0) return 'D';

  const passRate = passed / total;

  if (passRate >= 0.90 && avgR2 >= 0.90 && avgMAPE < 10) return 'A';
  if (passRate >= 0.75 && avgR2 >= 0.70 && avgMAPE < 20) return 'B';
  if (passRate >= 0.50 && avgR2 >= 0.50 && avgMAPE < 35) return 'C';
  return 'D';
}

/**
 * CSV rapor oluştur
 */
function _generateCSV(results) {
  const header = 'benchmark_id,simulated,reference,r_squared,rmse,mape,pass';
  const rows = results.map(r =>
    [
      r.benchmarkId,
      r.simulatedValue,
      r.referenceValue,
      r.rSquared,
      r.rmse,
      r.mape,
      r.passThreshold ? 'PASS' : 'FAIL'
    ].join(',')
  );

  // Ortalama satırı
  const validResults = results.filter(r => r.errorMessage === '');
  if (validResults.length > 0) {
    const avgSim  = _round(validResults.reduce((s, r) => s + r.simulatedValue, 0) / validResults.length, 6);
    const avgRef  = _round(validResults.reduce((s, r) => s + r.referenceValue, 0) / validResults.length, 6);
    const avgR2   = _round(validResults.reduce((s, r) => s + r.rSquared, 0) / validResults.length, 6);
    const avgRMSE = _round(validResults.reduce((s, r) => s + r.rmse, 0) / validResults.length, 6);
    const avgMAPE = _round(validResults.reduce((s, r) => s + r.mape, 0) / validResults.length, 4);
    const passCount = validResults.filter(r => r.passThreshold).length;

    rows.push(
      `AVERAGE,${avgSim},${avgRef},${avgR2},${avgRMSE},${avgMAPE},${passCount}/${validResults.length}`
    );
  }

  return [header, ...rows].join('\n');
}

/**
 * PDF-uyumlu HTML/markup rapor oluştur
 * (Tarayıcıda window.print() ile PDF'e dönüştürülebilir)
 */
function _generatePDFMarkup(results) {
  const validResults = results.filter(r => r.errorMessage === '');
  const passedCount  = validResults.filter(r => r.passThreshold).length;
  const avgR2   = validResults.length > 0
    ? _round(validResults.reduce((s, r) => s + r.rSquared, 0) / validResults.length, 4) : 0;
  const avgRMSE = validResults.length > 0
    ? _round(validResults.reduce((s, r) => s + r.rmse, 0) / validResults.length, 4) : 0;
  const avgMAPE = validResults.length > 0
    ? _round(validResults.reduce((s, r) => s + r.mape, 0) / validResults.length, 2) : 0;
  const grade = _calculateGrade(passedCount, validResults.length, avgR2, avgMAPE);

  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

  let html = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Validasyon Raporu — ${timestamp}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      background: #0d1117;
      color: #c9d1d9;
      padding: 40px;
      line-height: 1.6;
    }
    h1 {
      font-size: 1.8rem;
      color: #58a6ff;
      border-bottom: 2px solid #21262d;
      padding-bottom: 12px;
      margin-bottom: 24px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .summary-card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }
    .summary-card .label {
      font-size: 0.75rem;
      color: #8b949e;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .summary-card .value {
      font-size: 1.8rem;
      font-weight: 700;
      margin-top: 4px;
    }
    .grade-A { color: #3fb950; }
    .grade-B { color: #58a6ff; }
    .grade-C { color: #d29922; }
    .grade-D { color: #f85149; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    th {
      background: #161b22;
      color: #58a6ff;
      padding: 10px 12px;
      text-align: left;
      border-bottom: 2px solid #30363d;
      font-weight: 600;
    }
    td {
      padding: 8px 12px;
      border-bottom: 1px solid #21262d;
    }
    tr:hover td { background: #161b22; }
    .pass { color: #3fb950; font-weight: 600; }
    .fail { color: #f85149; font-weight: 600; }
    .footer {
      margin-top: 32px;
      font-size: 0.75rem;
      color: #484f58;
      text-align: center;
    }
    @media print {
      body { background: #fff; color: #1a1a1a; padding: 20px; }
      .summary-card { border-color: #ddd; background: #f6f8fa; }
      th { background: #f6f8fa; color: #0969da; border-color: #d0d7de; }
      td { border-color: #d0d7de; }
      tr:hover td { background: transparent; }
      .grade-A { color: #1a7f37; }
      .grade-B { color: #0969da; }
      .grade-C { color: #9a6700; }
      .grade-D { color: #cf222e; }
      .pass { color: #1a7f37; }
      .fail { color: #cf222e; }
    }
  </style>
</head>
<body>
  <h1>🧬 Simülasyon Validasyon Raporu</h1>

  <div class="summary">
    <div class="summary-card">
      <div class="label">Toplam Test</div>
      <div class="value">${results.length}</div>
    </div>
    <div class="summary-card">
      <div class="label">Geçen / Toplam</div>
      <div class="value">${passedCount}/${validResults.length}</div>
    </div>
    <div class="summary-card">
      <div class="label">Ort. R²</div>
      <div class="value">${avgR2}</div>
    </div>
    <div class="summary-card">
      <div class="label">Ort. RMSE</div>
      <div class="value">${avgRMSE}</div>
    </div>
    <div class="summary-card">
      <div class="label">Ort. MAPE</div>
      <div class="value">${avgMAPE}%</div>
    </div>
    <div class="summary-card">
      <div class="label">Not</div>
      <div class="value grade-${grade}">${grade}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Benchmark ID</th>
        <th>Simüle Edilen</th>
        <th>Referans</th>
        <th>R²</th>
        <th>RMSE</th>
        <th>MAPE (%)</th>
        <th>Sonuç</th>
      </tr>
    </thead>
    <tbody>`;

  for (const r of results) {
    const statusClass = r.errorMessage ? 'fail' : (r.passThreshold ? 'pass' : 'fail');
    const statusText  = r.errorMessage ? 'HATA' : (r.passThreshold ? 'PASS' : 'FAIL');
    html += `
      <tr>
        <td>${r.benchmarkId}</td>
        <td>${r.simulatedValue}</td>
        <td>${r.referenceValue}</td>
        <td>${r.rSquared}</td>
        <td>${r.rmse}</td>
        <td>${r.mape}</td>
        <td class="${statusClass}">${statusText}</td>
      </tr>`;
  }

  html += `
    </tbody>
  </table>

  <div class="footer">
    Rapor oluşturma: ${timestamp} | Validasyon Motoru v1.0<br>
    <%20 sapma = PASS | ≥%20 sapma = FAIL
  </div>
</body>
</html>`;

  return html;
}

/**
 * Boş CSV oluştur (eşleşme bulunamadığında)
 */
function _generateEmptyCSV() {
  return 'benchmark_id,simulated,reference,r_squared,rmse,mape,pass\nNO_MATCHES,0,0,0,0,0,N/A';
}

/**
 * Hatalı sonuç nesnesi oluştur
 */
function _errorResult(benchmarkId, errorMessage) {
  return {
    benchmarkId,
    simulatedValue: 0,
    referenceValue: 0,
    rSquared: 0,
    rmse: 0,
    mape: 100,
    passThreshold: false,
    errorMessage
  };
}

/**
 * Sayıyı belirli ondalık basamağa yuvarla
 */
function _round(value, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}


// ─────────────────────────────────────────────────────────
//  GLOBAL EXPORTS
// ─────────────────────────────────────────────────────────

window.compareToLiterature = compareToLiterature;
window.generateReport      = generateReport;
window.batchValidate       = batchValidate;
window.ValidationData      = ValidationData;

// İstatistik fonksiyonları (test ve dış kullanım için)
window.calcRSquared = calcRSquared;
window.calcRMSE     = calcRMSE;
window.calcMAPE     = calcMAPE;
