// ═══════════════════════════════════════════════════════
//  BACTERIA STORE — Global Veri Deposu
// ═══════════════════════════════════════════════════════

const BacteriaStore = {
  master: null,
  growth: null,
  antibiotics: null,
  visuals: null,
  interactions: null,
  uiPanels: null,
  mutationRules: null,
  simulationRules: null,
  tissueModels: [],
  interactionMatrix: [],
  antibioticPK: [],
  literatureBenchmarks: [],
  all: [],

  init(data) {
    this.master         = data.master;
    this.growth         = data.growth;
    this.antibiotics    = data.antibiotics;
    this.visuals        = data.visuals;
    this.interactions   = data.interactions;
    this.uiPanels       = data.uiPanels;
    this.mutationRules  = data.mutationRules;
    this.simulationRules= data.simulationRules;
    this.tissueModels   = data.tissue_models        || [];
    this.interactionMatrix = data.interaction_matrix || [];
    this.antibioticPK   = data.antibiotic_pk        || [];
    this.literatureBenchmarks = data.literature_benchmarks || [];
    this.buildCombinedData();
    console.log(`BacteriaStore initialized with ${this.all.length} strains.`);
  },

  buildCombinedData() {
    this.all = this.master.map((masterItem, index) => {
      const id     = masterItem.id;
      const growth = this.growth[id]  || {};
      const visual = this.visuals[id] || {};

      return {
        _id:    id,
        id:     index + 1,
        name:   masterItem.scientific_name,
        hex:    visual.colony_color_hex || '#181818',
        gram:   masterItem.gram_type === 'gram-pos' ? 'Gram Pozitif' : 'Gram Negatif',
        gramPos: masterItem.gram_type === 'gram-pos',
        gramNeg: masterItem.gram_type === 'gram-neg',

        // Sıcaklık
        tempMin:      growth.temp_min  || 20,
        tempMax:      growth.temp_max  || 40,
        tempOptimum:  growth.temp_opt  || 30,

        // pH
        phMin:      growth.ph_min  || 5.0,
        phOptimum:  growth.ph_opt  || 7.0,
        phMax:      growth.ph_max  || 9.0,

        // NaCl
        naclMin:     growth.nacl_min || 0,
        naclOptimal: growth.nacl_opt || 0.5,
        naclMax:     growth.nacl_max || 5.0,

        // Büyüme
        doublingTime: growth.doubling_time_h || 1.0,
        mu_max:       growth.mu_max || 0.5,
        growthRate:   Math.min(2.5, Math.max(0.5,
          (growth.colony_size_mm_day || 2.5) *
          (1 / (growth.doubling_time_h || 1.0)) * 0.3 + 0.5)),

        oxygenReq:   masterItem.oxygen_type,
        colonySize:  growth.colony_size_mm_day || 2.5,
        aggressiveness: masterItem.pathogenicity_level === 'high' ? 'Yüksek'
                      : masterItem.pathogenicity_level === 'medium' ? 'Orta' : 'Düşük',
        toxin:         masterItem.tags.includes('toxic') ? 'Var' : 'Yok',
        bioluminescent: masterItem.tags.includes('bioluminescent'),
        pigment:       visual.pigment_name || 'Renksiz',

        colorStops:    visual.color_stops || ['#CCCCCC','#BBBBBB','#AAAAAA','#999999'],
        spreadPattern: visual.spread_pattern || 'circular',
        nutrientMedium: growth.growth_medium || 'Nutrient Agar',

        phStart:       7.0,
        phEnd:         6.5,
        maxTime:       growth.max_time_h || 72,
        lagPhaseHours: ((growth.lag_min_h || 1) + (growth.lag_max_h || 3)) / 2,

        waterSoluble:        visual.pigment_water_soluble  || false,
        tempSensitivePigment: visual.pigment_temp_sensitive || false,

        // --- DÜZELTME 1: morphology artık map'leniyor ---
        morphology:       masterItem.morphology        || 'bacillus',
        morphologyDetail: masterItem.morphology_detail || '',
        commonName:       masterItem.common_name_tr    || '',
        phylum:           masterItem.phylum            || '',
        bslLevel:         masterItem.bsl_level         || 1,
        discoveredBy:     masterItem.discovered_by     || '',
        discoveredYear:   masterItem.discovered_year   || null,
        clinicalSignificance: masterItem.clinical_significance || '',

        // --- DÜZELTME 2: tissue_affinity artık map'leniyor ---
        tissueAffinity: masterItem.tissue_affinity || 'dermis',

        info: this.uiPanels?.bacteria_details?.[id] ?? null
      };
    });
  },

  getById(id) {
    return this.all.find(b => b.id === id || b._id === id);
  },

  getByName(name) {
    return this.all.find(b => b.name === name);
  },

  // DÜZELTME 3: .drug → .name düzeltmesi burada da yapıldı
  getAntibioticsFor(idStr) {
    return this.antibiotics[idStr] || [];
  },

  getInteractionsFor(idStr) {
    return (this.interactions || []).filter(i =>
      i.bacteria_a === idStr || i.bacteria_b === idStr
    );
  },

  getTissueModel(tissueType) {
    return (this.tissueModels || []).find(t => t.id === tissueType) || null;
  },

  getInteractionCoefficient(bacteriaA_id, bacteriaB_id) {
    const match = (this.interactionMatrix || []).find(i =>
      (i.bacteria_a === bacteriaA_id && i.bacteria_b === bacteriaB_id) ||
      (i.bacteria_a === bacteriaB_id && i.bacteria_b === bacteriaA_id)
    );
    if (!match) return null;
    return { competitionAlpha: match.competition_alpha, synergyAlpha: match.synergy_alpha };
  },

  getAntibioticPK(drugId) {
    return (this.antibioticPK || []).find(d => d.id === drugId) || null;
  },

  getBenchmark(experimentType, bacteriaId) {
    return (this.literatureBenchmarks || []).find(b =>
      b.experiment_type === experimentType && b.bacteria_a === bacteriaId
    ) || null;
  },

  getAllBenchmarks() {
    return this.literatureBenchmarks || [];
  }
};

window.BacteriaStore = BacteriaStore;
