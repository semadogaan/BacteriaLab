// ═══════════════════════════════════════════════════════════════════
//  OPTIMIZER ENGINE — Genetik & Gradyan Tabanlı Antibiyotik Optimizasyonu
//  Bağımlılıklar: simulation.js (seededRandom, randGauss, calcTempFactor,
//                 calcPhFactor), bacteria-store.js (BacteriaStore)
//  data/antibiotic_pk.json, data/interaction_matrix.json,
//  data/tissue_models.json, data/literature_benchmarks.json
// ═══════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
//  YARDIMCI FONKSİYONLAR — PK/PD Matematik Modelleri
// ─────────────────────────────────────────────────────────

/**
 * Hill denklemi — konsantrasyon–etki ilişkisi
 * E = Emax * (C^n) / (EC50^n + C^n)
 * @param {number} C   — antibiyotik konsantrasyonu (mg/L)
 * @param {number} mic — Minimum İnhibitör Konsantrasyon (mg/L)
 * @param {number} n   — Hill katsayısı
 * @returns {number} 0–1 arası kill oranı
 */
function _hillEquationLocal(C, mic, n) {
  if (C <= 0) return 0;
  const ec50 = mic;  // MIC ≈ EC50 yaklaşımı
  const cn = Math.pow(C, n);
  const ec50n = Math.pow(ec50, n);
  return cn / (ec50n + cn);
}

/**
 * Lotka-Volterra tek adım — iki tür arası rekabet/sinerji
 * dN1/dt = r1 * N1 * (1 - (N1 + α12*N2) / K1)
 * @param {number} N1  — tür 1 popülasyonu
 * @param {number} N2  — tür 2 popülasyonu
 * @param {number} r1  — tür 1 büyüme hızı
 * @param {number} K1  — tür 1 taşıma kapasitesi
 * @param {number} alpha12 — tür 2'nin tür 1 üzerindeki etkisi (competition_alpha)
 * @param {number} dt  — zaman adımı (saat)
 * @returns {number} yeni N1 popülasyonu
 */
function lotkaVolterraStep(N1, N2, r1, K1, alpha12, dt) {
  if (K1 <= 0) return N1;
  const dN1 = r1 * N1 * (1 - (N1 + alpha12 * N2) / K1) * dt;
  return Math.max(0, N1 + dN1);
}

/**
 * Doku difüzyon modeli — antibiyotiğin doku katmanından geçişi
 * C_tissue = C_serum * penetration * exp(-thickness / (D * scale))
 * @param {number} cSerum       — serum konsantrasyonu (mg/L)
 * @param {number} penetration  — doku penetrasyon katsayısı (0–1)
 * @param {number} thickness_um — katman kalınlığı (µm)
 * @param {number} diffCoeff    — difüzyon katsayısı (cm²/s)
 * @returns {number} doku konsantrasyonu (mg/L)
 */
function _tissueDiffusionLocal(cSerum, penetration, thickness_um, diffCoeff) {
  // Kalınlığı cm'ye çevir: 1 µm = 1e-4 cm
  const thickness_cm = thickness_um * 1e-4;
  // Difüzyon mesafe ölçekleme faktörü
  const scale = Math.sqrt(diffCoeff * 3600); // 1 saat için difüzyon mesafesi
  if (scale <= 0) return cSerum * penetration;
  const attenuation = Math.exp(-thickness_cm / scale);
  return cSerum * penetration * attenuation;
}

/**
 * Poisson mutasyon — direnç gelişim olasılığı
 * P(mutation) = 1 - e^(-rate * populationSize * generations)
 * @param {number} baseMutationRate — baz mutasyon oranı (per cell per division)
 * @param {number} popSize          — popülasyon büyüklüğü
 * @param {number} generations      — jenerasyon sayısı
 * @param {number} stressMultiplier — antibiyotik stres çarpanı
 * @returns {number} 0–1 arası direnç gelişme olasılığı
 */
function _poissonMutationLocal(baseMutationRate, popSize, generations, stressMultiplier) {
  const lambda = baseMutationRate * stressMultiplier * popSize * generations;
  return 1 - Math.exp(-lambda);
}


// ─────────────────────────────────────────────────────────
//  VERİ YÖNETİCİSİ — PK/Doku/Etkileşim verilerini yükler
// ─────────────────────────────────────────────────────────

class OptimizerDataManager {
  constructor() {
    this.antibioticPK = [];
    this.interactionMatrix = [];
    this.tissueModels = [];
    this.benchmarks = [];
    this._loaded = false;
  }

  /**
   * Tüm veri dosyalarını yükler. Eğer window üzerinde zaten
   * yüklenmişse onu kullanır, değilse fetch ile çeker.
   */
  async load() {
    if (this._loaded) return;

    const fetchJSON = async (path) => {
      try {
        const resp = await fetch(path);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${path}`);
        return resp.json();
      } catch (e) {
        console.warn(`[OptimizerDataManager] ${path} yüklenemedi:`, e.message);
        return [];
      }
    };

    const [pk, im, tm, bm] = await Promise.all([
      fetchJSON('data/antibiotic_pk.json'),
      fetchJSON('data/interaction_matrix.json'),
      fetchJSON('data/tissue_models.json'),
      fetchJSON('data/literature_benchmarks.json')
    ]);

    this.antibioticPK = pk;
    this.interactionMatrix = im;
    this.tissueModels = tm;
    this.benchmarks = bm;
    this._loaded = true;
    console.log('[OptimizerDataManager] Veriler yüklendi —',
      `${pk.length} antibiyotik, ${im.length} etkileşim, ${tm.length} doku, ${bm.length} benchmark`);
  }

  /** Antibiyotik PK verisini ID'ye göre getir */
  getDrugPK(drugId) {
    return this.antibioticPK.find(d => d.id === drugId) || null;
  }

  /** Doku modelini ID'ye göre getir */
  getTissueModel(tissueId) {
    return this.tissueModels.find(t => t.id === tissueId) || null;
  }

  /** İki tür arasındaki etkileşim katsayılarını getir */
  getInteraction(idA, idB) {
    return this.interactionMatrix.find(
      i => (i.bacteria_a === idA && i.bacteria_b === idB) ||
           (i.bacteria_a === idB && i.bacteria_b === idA)
    ) || null;
  }

  /** Belirli bir bakteri–antibiyotik çifti için benchmark MIC değeri */
  getBenchmarkMIC(bacteriaId, drugId) {
    const entry = this.benchmarks.find(
      b => b.bacteria_a === bacteriaId &&
           b.value_type === 'mic' &&
           b.notes.toLowerCase().includes(drugId.toLowerCase())
    );
    return entry ? entry.reference_value : null;
  }
}


// ─────────────────────────────────────────────────────────
//  GENETİK OPTİMİZER — Ana Sınıf
// ─────────────────────────────────────────────────────────

class GeneticOptimizer {
  /**
   * @param {Object} config
   * @param {number} [config.populationSize=100]
   * @param {number} [config.generations=50]
   * @param {number} [config.mutationRate=0.1]
   * @param {number} [config.crossoverRate=0.7]
   * @param {number} [config.seed=42]
   */
  constructor(config = {}) {
    this.populationSize = config.populationSize || 100;
    this.generations = config.generations || 50;
    this.mutationRate = config.mutationRate || 0.1;
    this.crossoverRate = config.crossoverRate || 0.7;
    this.seed = config.seed || 42;

    // Elitizm: en iyi %10 direkt taşınır
    this.eliteCount = Math.max(1, Math.floor(this.populationSize * 0.10));
    // Turnuva boyutu
    this.tournamentSize = 3;
    // Erken durma: N jenerasyon boyunca gelişme yoksa dur
    this.earlyStopPatience = 10;

    this.dataManager = new OptimizerDataManager();
    this.rng = null;
  }

  /**
   * Optimizasyon çalıştır
   * @param {Object} conditions
   * @param {string[]} conditions.targetSpecies     — yok edilecek türler
   * @param {string[]} conditions.protectSpecies     — korunacak türler
   * @param {string}   conditions.tissueType         — doku modeli ID'si
   * @param {number}   conditions.maxDuration_h      — maks tedavi süresi (saat)
   * @param {string[]} conditions.availableDrugs     — kullanılabilir antibiyotikler
   * @param {number}   conditions.minConcentration   — min konsantrasyon (mg/L)
   * @param {number}   conditions.maxConcentration   — max konsantrasyon (mg/L)
   * @returns {Promise<Object>} Optimizasyon sonucu
   */
  async run(conditions) {
    // Veri yükleme
    await this.dataManager.load();
    this.rng = seededRandom(this.seed);

    // Koşulları doğrula
    this._validateConditions(conditions);

    // Arama uzayını hazırla
    const drugCount = conditions.availableDrugs.length;
    const bounds = {
      drugIndex:     { min: 0,                           max: drugCount - 1 },
      concentration: { min: conditions.minConcentration,  max: conditions.maxConcentration },
      duration:      { min: 1,                           max: conditions.maxDuration_h }
    };

    // Başlangıç popülasyonu oluştur
    let population = this._initPopulation(bounds, drugCount);

    // Fitness değerlendirmesi
    population = population.map(ind => {
      ind.fitness = this._evaluateFitness(ind, conditions, bounds);
      return ind;
    });

    // Jenerasyon döngüsü
    const convergenceHistory = [];
    let bestFitness = Infinity;
    let bestIndividual = null;
    let stagnationCounter = 0;
    let generationsRun = 0;

    for (let gen = 0; gen < this.generations; gen++) {
      generationsRun = gen + 1;

      // Sırala (düşük fitness = daha iyi, minimize ediyoruz)
      population.sort((a, b) => a.fitness - b.fitness);

      // En iyi bireyi kaydet
      const currentBest = population[0].fitness;
      convergenceHistory.push(currentBest);

      if (currentBest < bestFitness) {
        bestFitness = currentBest;
        bestIndividual = { ...population[0] };
        stagnationCounter = 0;
      } else {
        stagnationCounter++;
      }

      // Erken durma kontrolü
      if (stagnationCounter >= this.earlyStopPatience) {
        console.log(`[GeneticOptimizer] Erken durma — ${gen + 1}. jenerasyonda (${this.earlyStopPatience} jenerasyon gelişme yok)`);
        break;
      }

      // Yeni jenerasyon oluştur
      const newPopulation = [];

      // Elitizm: en iyi bireyleri doğrudan taşı
      for (let i = 0; i < this.eliteCount; i++) {
        newPopulation.push({ ...population[i] });
      }

      // Gerisi için seçim, çaprazlama, mutasyon
      while (newPopulation.length < this.populationSize) {
        const parent1 = this._tournamentSelect(population);
        const parent2 = this._tournamentSelect(population);

        let child1, child2;
        if (this.rng() < this.crossoverRate) {
          [child1, child2] = this._crossover(parent1, parent2);
        } else {
          child1 = { ...parent1 };
          child2 = { ...parent2 };
        }

        child1 = this._mutate(child1, bounds, drugCount);
        child2 = this._mutate(child2, bounds, drugCount);

        child1.fitness = this._evaluateFitness(child1, conditions, bounds);
        child2.fitness = this._evaluateFitness(child2, conditions, bounds);

        newPopulation.push(child1);
        if (newPopulation.length < this.populationSize) {
          newPopulation.push(child2);
        }
      }

      population = newPopulation;
    }

    // Son sıralama
    population.sort((a, b) => a.fitness - b.fitness);
    if (population[0].fitness < bestFitness) {
      bestIndividual = { ...population[0] };
      bestFitness = population[0].fitness;
    }

    // Sonuçları hazırla
    const selectedDrug = conditions.availableDrugs[bestIndividual.drugIndex];
    const eradication = this._calcEradication(bestIndividual, conditions);

    return {
      optimalDrug: selectedDrug,
      optimalConcentration: Math.round(bestIndividual.concentration * 1000) / 1000,
      optimalDuration: Math.round(bestIndividual.duration * 10) / 10,
      estimatedEradication: Math.round(eradication * 10000) / 10000,
      fitnessScore: Math.round(bestFitness * 10000) / 10000,
      convergenceHistory: convergenceHistory.map(v => Math.round(v * 10000) / 10000),
      generationsRun
    };
  }

  // ── Koşul doğrulama ──
  _validateConditions(cond) {
    if (!cond.targetSpecies || cond.targetSpecies.length === 0) {
      throw new Error('[GeneticOptimizer] targetSpecies boş olamaz');
    }
    if (!cond.availableDrugs || cond.availableDrugs.length === 0) {
      throw new Error('[GeneticOptimizer] availableDrugs boş olamaz');
    }
    if (cond.minConcentration >= cond.maxConcentration) {
      throw new Error('[GeneticOptimizer] minConcentration < maxConcentration olmalı');
    }
  }

  // ── Başlangıç popülasyonu ──
  _initPopulation(bounds, drugCount) {
    const pop = [];
    for (let i = 0; i < this.populationSize; i++) {
      pop.push({
        drugIndex: Math.floor(this.rng() * drugCount),
        concentration: bounds.concentration.min +
          this.rng() * (bounds.concentration.max - bounds.concentration.min),
        duration: bounds.duration.min +
          this.rng() * (bounds.duration.max - bounds.duration.min),
        fitness: Infinity
      });
    }
    return pop;
  }

  // ── Turnuva seçimi ──
  _tournamentSelect(population) {
    let best = null;
    for (let i = 0; i < this.tournamentSize; i++) {
      const idx = Math.floor(this.rng() * population.length);
      const candidate = population[idx];
      if (!best || candidate.fitness < best.fitness) {
        best = candidate;
      }
    }
    return { ...best };
  }

  // ── Tek nokta çaprazlama ──
  _crossover(p1, p2) {
    const genes = ['drugIndex', 'concentration', 'duration'];
    const point = Math.floor(this.rng() * genes.length);

    const child1 = { fitness: Infinity };
    const child2 = { fitness: Infinity };

    for (let i = 0; i < genes.length; i++) {
      const g = genes[i];
      if (i < point) {
        child1[g] = p1[g];
        child2[g] = p2[g];
      } else {
        child1[g] = p2[g];
        child2[g] = p1[g];
      }
    }

    return [child1, child2];
  }

  // ── Gauss mutasyon ──
  _mutate(individual, bounds, drugCount) {
    const mutated = { ...individual };

    // İlaç indeksi mutasyonu (rastgele yeni ilaç)
    if (this.rng() < this.mutationRate) {
      mutated.drugIndex = Math.floor(this.rng() * drugCount);
    }

    // Konsantrasyon mutasyonu — Gauss(0, σ), σ = (max-min) * 0.1
    if (this.rng() < this.mutationRate) {
      const sigma = (bounds.concentration.max - bounds.concentration.min) * 0.1;
      mutated.concentration += randGauss(this.rng) * sigma;
      mutated.concentration = Math.max(
        bounds.concentration.min,
        Math.min(bounds.concentration.max, mutated.concentration)
      );
    }

    // Süre mutasyonu — Gauss
    if (this.rng() < this.mutationRate) {
      const sigma = (bounds.duration.max - bounds.duration.min) * 0.1;
      mutated.duration += randGauss(this.rng) * sigma;
      mutated.duration = Math.max(
        bounds.duration.min,
        Math.min(bounds.duration.max, mutated.duration)
      );
    }

    return mutated;
  }

  // ── FITNESS FONKSİYONU ──
  // minimize: hedef türlerin popülasyonu + antibiyotik maliyeti + süre
  // penalize: korunan türlerin zarar görmesi, direnç riski
  _evaluateFitness(individual, conditions, bounds) {
    const drugId = conditions.availableDrugs[individual.drugIndex];
    const C = individual.concentration;
    const duration = individual.duration;

    const drugPK = this.dataManager.getDrugPK(drugId);
    const tissue = this.dataManager.getTissueModel(conditions.tissueType);

    // ── 1. Hedef türleri öldürme skoru ──
    let targetKillScore = 0;
    for (const speciesId of conditions.targetSpecies) {
      const mic = this._getMIC(speciesId, drugId);
      const hillN = drugPK ? drugPK.hill_coefficient_n : 1.0;

      // Doku penetrasyonu hesapla
      let effectiveC = C;
      if (drugPK && tissue) {
        const penetration = drugPK.tissue_penetration[conditions.tissueType] || 0.5;
        // Tüm katmanlardan difüzyon atenuasyonu
        let totalAttenuation = penetration;
        for (const layer of tissue.layers) {
          totalAttenuation *= Math.exp(-layer.thickness_um * 1e-4 /
            Math.max(1e-8, Math.sqrt(layer.diffusion_coefficient * 3600)));
        }
        // Biyofilm penetrasyon bariyeri
        const avgBiofilmBarrier = tissue.layers.reduce(
          (sum, l) => sum + l.biofilm_penetration_factor, 0
        ) / tissue.layers.length;
        totalAttenuation *= (1 - avgBiofilmBarrier * 0.5);
        effectiveC = C * totalAttenuation;
      }

      // Hill denklemi ile kill oranı
      const killRate = _hillEquationLocal(effectiveC, mic, hillN);

      // Zaman bağımlılık düzeltmesi
      let timeAdjustedKill;
      if (drugPK && drugPK.concentration_dependent) {
        // Konsantrasyon bağımlı: Cmax/MIC oranı önemli
        timeAdjustedKill = killRate;
      } else {
        // Zaman bağımlı: T>MIC süresi önemli — yarılanma süresiyle modüle et
        const tHalf = drugPK ? drugPK.t_half_h : 2.0;
        const effectiveTime = duration * (1 - Math.exp(-0.693 * duration / tHalf));
        const timeRatio = Math.min(1, effectiveTime / conditions.maxDuration_h);
        timeAdjustedKill = killRate * (0.3 + 0.7 * timeRatio);
      }

      // PAE (Post-Antibiotic Effect) bonusu
      const pae = drugPK ? drugPK.post_antibiotic_effect_h : 1.0;
      const paeBonus = Math.min(0.1, pae / 50);

      const speciesScore = 1 - Math.min(1, timeAdjustedKill + paeBonus);
      targetKillScore += speciesScore;
    }
    targetKillScore /= conditions.targetSpecies.length;  // normalize

    // ── 2. Korunan türlere zarar penaltisi ──
    let protectPenalty = 0;
    if (conditions.protectSpecies && conditions.protectSpecies.length > 0) {
      for (const speciesId of conditions.protectSpecies) {
        const mic = this._getMIC(speciesId, drugId);
        const hillN = drugPK ? drugPK.hill_coefficient_n : 1.0;
        const killRate = _hillEquationLocal(C, mic, hillN);
        // Korunan türe zarar veriyorsa büyük penaltı
        protectPenalty += killRate * 2.0;
      }
      protectPenalty /= conditions.protectSpecies.length;
    }

    // ── 3. Direnç riski penaltisi ──
    let resistancePenalty = 0;
    const mutRules = (typeof BacteriaStore !== 'undefined' && BacteriaStore.mutationRules)
      ? BacteriaStore.mutationRules
      : null;
    if (mutRules) {
      const baseRate = mutRules.global_settings.base_mutation_rate_per_cell_div;
      const stressMult = mutRules.global_settings.antibiotic_pressure_multiplier;
      // Subdeki popülasyon tahmini (10^6 hücre, ~generation sayısı ≈ duration/doublingTime)
      const estimatedPop = 1e6;
      const estimatedGens = duration / 1.0;  // ortalama 1 saat doubling time varsayımı
      const resistProb = _poissonMutationLocal(baseRate, estimatedPop, estimatedGens, stressMult);
      resistancePenalty = resistProb * 1.5;
    } else {
      // Basit direnç tahmini: uzun süre + yüksek konsantrasyon = yüksek risk
      const normDuration = duration / conditions.maxDuration_h;
      const normConc = C / conditions.maxConcentration;
      resistancePenalty = normDuration * normConc * 0.3;
    }

    // ── 4. Maliyet skoru (konsantrasyon + süre) ──
    const normConc = (C - conditions.minConcentration) /
      (conditions.maxConcentration - conditions.minConcentration);
    const normDuration = (duration - 1) / (conditions.maxDuration_h - 1);
    const costScore = normConc * 0.3 + normDuration * 0.2;

    // ── 5. Türler arası etkileşim bonusu/penaltısı ──
    let interactionScore = 0;
    if (conditions.targetSpecies.length > 1) {
      for (let i = 0; i < conditions.targetSpecies.length; i++) {
        for (let j = i + 1; j < conditions.targetSpecies.length; j++) {
          const interaction = this.dataManager.getInteraction(
            conditions.targetSpecies[i],
            conditions.targetSpecies[j]
          );
          if (interaction) {
            // Eğer hedef türler birbirleriyle sinerjik ise → daha zor = penaltı
            interactionScore += interaction.synergy_alpha * 0.2;
            // Eğer rekabet varsa → doğal olarak birbirlerini bastırır = bonus
            interactionScore -= interaction.competition_alpha * 0.1;
          }
        }
      }
    }

    // ── Toplam fitness (minimize edilecek) ──
    const fitness =
      targetKillScore * 3.0 +      // ağırlık: hedef eradikasyon (en önemli)
      protectPenalty * 2.0 +        // ağırlık: koruma ihlali
      resistancePenalty * 1.5 +     // ağırlık: direnç riski
      costScore * 1.0 +            // ağırlık: maliyet
      interactionScore;            // ağırlık: etkileşim

    return fitness;
  }

  // ── MIC değeri getirme (benchmark → store → tahmin sırası) ──
  _getMIC(speciesId, drugId) {
    // Önce benchmark verisine bak
    const benchmarkMIC = this.dataManager.getBenchmarkMIC(speciesId, drugId);
    if (benchmarkMIC !== null) return benchmarkMIC;

    // Store'daki antibiyotik verisine bak
    if (typeof BacteriaStore !== 'undefined') {
      const abData = BacteriaStore.getAntibioticsFor(speciesId);
      if (abData && Array.isArray(abData)) {
        const match = abData.find(a =>
          a.name && a.name.toLowerCase().includes(drugId.toLowerCase())
        );
        if (match && match.mic) return match.mic;
      }
    }

    // Varsayılan MIC tahminleri (sınıf bazında)
    const drugPK = this.dataManager.getDrugPK(drugId);
    if (drugPK) {
      const classLower = drugPK.class.toLowerCase();
      if (classLower.includes('karbapenem')) return 0.5;
      if (classLower.includes('florokinolon')) return 1.0;
      if (classLower.includes('aminoglikozid')) return 2.0;
      if (classLower.includes('beta-laktam')) return 4.0;
      if (classLower.includes('glikopeptid')) return 1.0;
      if (classLower.includes('polimiksin')) return 2.0;
    }

    return 4.0;  // genel varsayılan
  }

  // ── Eradikasyon oranı hesaplama ──
  _calcEradication(individual, conditions) {
    const drugId = conditions.availableDrugs[individual.drugIndex];
    const C = individual.concentration;
    const drugPK = this.dataManager.getDrugPK(drugId);

    let totalEradication = 0;
    for (const speciesId of conditions.targetSpecies) {
      const mic = this._getMIC(speciesId, drugId);
      const hillN = drugPK ? drugPK.hill_coefficient_n : 1.0;
      const killRate = _hillEquationLocal(C, mic, hillN);
      totalEradication += killRate;
    }

    return Math.min(1, totalEradication / conditions.targetSpecies.length);
  }
}


// ─────────────────────────────────────────────────────────
//  GRADYAN OPTİMİZER — Sayısal gradyan iniş
// ─────────────────────────────────────────────────────────

class GradientOptimizer {
  /**
   * @param {Object} [config]
   * @param {number} [config.learningRate=0.01]
   * @param {number} [config.maxIterations=500]
   * @param {number} [config.epsilon=1e-8]    — sayısal türev delta
   * @param {number} [config.tolerance=1e-6]  — yakınsama toleransı
   * @param {number} [config.seed=42]
   */
  constructor(config = {}) {
    this.learningRate = config.learningRate || 0.01;
    this.maxIterations = config.maxIterations || 500;
    this.epsilon = config.epsilon || 1e-8;
    this.tolerance = config.tolerance || 1e-6;
    this.seed = config.seed || 42;
  }

  /**
   * Sayısal gradyan iniş ile optimizasyon
   * @param {Function} objectiveFn     — minimize edilecek fonksiyon f(params) → number
   * @param {number[]} initialGuess    — başlangıç parametreleri
   * @param {Array<{min:number,max:number}>} bounds — parametre sınırları
   * @returns {Object} { optimalParams, optimalValue, iterations, convergenceHistory }
   */
  run(objectiveFn, initialGuess, bounds) {
    const rng = seededRandom(this.seed);
    const n = initialGuess.length;
    let params = [...initialGuess];
    let bestValue = objectiveFn(params);
    let bestParams = [...params];
    const convergenceHistory = [bestValue];

    // Adam optimizer parametreleri
    const beta1 = 0.9;
    const beta2 = 0.999;
    let m = new Array(n).fill(0);  // 1. moment (ortalama)
    let v = new Array(n).fill(0);  // 2. moment (varyans)

    let stagnation = 0;
    let iteration = 0;

    for (iteration = 0; iteration < this.maxIterations; iteration++) {
      // Sayısal gradyan hesapla (merkezi fark)
      const gradient = new Array(n);
      for (let i = 0; i < n; i++) {
        const h = Math.max(this.epsilon, Math.abs(params[i]) * this.epsilon);

        const paramsPlus = [...params];
        const paramsMinus = [...params];
        paramsPlus[i] = Math.min(bounds[i].max, params[i] + h);
        paramsMinus[i] = Math.max(bounds[i].min, params[i] - h);

        gradient[i] = (objectiveFn(paramsPlus) - objectiveFn(paramsMinus)) / (2 * h);
      }

      // Adam güncelleme
      const t = iteration + 1;
      for (let i = 0; i < n; i++) {
        m[i] = beta1 * m[i] + (1 - beta1) * gradient[i];
        v[i] = beta2 * v[i] + (1 - beta2) * gradient[i] * gradient[i];

        const mHat = m[i] / (1 - Math.pow(beta1, t));
        const vHat = v[i] / (1 - Math.pow(beta2, t));

        params[i] -= this.learningRate * mHat / (Math.sqrt(vHat) + this.epsilon);

        // Sınır kontrolü
        params[i] = Math.max(bounds[i].min, Math.min(bounds[i].max, params[i]));
      }

      const currentValue = objectiveFn(params);
      convergenceHistory.push(currentValue);

      if (currentValue < bestValue) {
        bestValue = currentValue;
        bestParams = [...params];
        stagnation = 0;
      } else {
        stagnation++;
      }

      // Yakınsama kontrolü
      if (convergenceHistory.length >= 2) {
        const prev = convergenceHistory[convergenceHistory.length - 2];
        if (Math.abs(currentValue - prev) < this.tolerance) {
          stagnation++;
        }
      }

      // Erken durma
      if (stagnation >= 20) {
        break;
      }
    }

    return {
      optimalParams: bestParams.map(p => Math.round(p * 10000) / 10000),
      optimalValue: Math.round(bestValue * 10000) / 10000,
      iterations: iteration + 1,
      convergenceHistory: convergenceHistory.map(v => Math.round(v * 10000) / 10000)
    };
  }
}


// ─────────────────────────────────────────────────────────
//  GLOBAL EXPORTS
// ─────────────────────────────────────────────────────────

// Matematik fonksiyonları
// NOT: lotkaVolterraStep simulation.js'de tanımlı (full 2-tür modeli), burada overwrite edilmez

// Sınıflar
window.GeneticOptimizer = GeneticOptimizer;
window.GradientOptimizer = GradientOptimizer;
window.OptimizerDataManager = OptimizerDataManager;
