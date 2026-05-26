// ═══════════════════════════════════════════════════════
//  BACTERIA STORE — Global Veri Deposu
//  Tüm modüler verileri birleştirir ve kullanıma sunar
// ═══════════════════════════════════════════════════════

const BacteriaStore = {
  // Veri koleksiyonları
  master: null,
  growth: null,
  antibiotics: null,
  visuals: null,
  interactions: null,
  uiPanels: null,
  mutationRules: null,
  simulationRules: null,

  // Tümü birleştirilmiş hazır liste (Eski BACTERIA array'ine benzer yapı)
  all: [],

  init(data) {
    this.master = data.master;
    this.growth = data.growth;
    this.antibiotics = data.antibiotics;
    this.visuals = data.visuals;
    this.interactions = data.interactions;
    this.uiPanels = data.uiPanels;
    this.mutationRules = data.mutationRules;
    this.simulationRules = data.simulationRules;

    this.buildCombinedData();
    console.log(`BacteriaStore initialized with ${this.all.length} strains.`);
  },

  // Tüm dosyaları birleştirip simülasyon ve UI için kullanılabilir tek bir obje dizisi oluşturur
  buildCombinedData() {
    this.all = this.master.map((masterItem, index) => {
      const id = masterItem.id;
      const growth = this.growth[id] || {};
      const visual = this.visuals[id] || {};
      
      // Eski sisteme uyumluluk ve kolay erişim için birleştirilmiş obje
      return {
        _id: id,
        id: index + 1, // Eski sistemde 1'den başlayan ID'ler vardı
        name: masterItem.scientific_name,
        hex: visual.colony_color_hex || "#181818",
        gram: masterItem.gram_type === 'gram-pos' ? 'Gram Pozitif' : 'Gram Negatif',
        gramPos: masterItem.gram_type === 'gram-pos',
        gramNeg: masterItem.gram_type === 'gram-neg',
        
        tempMin: growth.temp_min || 20,
        tempMax: growth.temp_max || 40,
        tempOptimum: growth.temp_opt || 30,
        
        phMin: growth.ph_min || 5.0,
        phOptimum: growth.ph_opt || 7.0,
        phMax: growth.ph_max || 9.0,
        
        naclMin: growth.nacl_min || 0,
        naclOptimal: growth.nacl_opt || 0.5,
        naclMax: growth.nacl_max || 5.0,
        
        doublingTime: growth.doubling_time_h || 1.0,
        mu_max: growth.mu_max || 0.5,
        growthRate: Math.min(2.5, Math.max(0.5, (growth.colony_size_mm_day || 2.5) * (1 / (growth.doubling_time_h || 1.0)) * 0.3 + 0.5)),
        
        oxygenReq: masterItem.oxygen_type,
        colonySize: growth.colony_size_mm_day || 2.5,
        aggressiveness: masterItem.pathogenicity_level === 'high' ? 'Yüksek' : (masterItem.pathogenicity_level === 'medium' ? 'Orta' : 'Düşük'),
        toxin: masterItem.tags.includes('toxic') ? 'Var' : 'Yok',
        bioluminescent: masterItem.tags.includes('bioluminescent'),
        pigment: visual.pigment_name || 'Renksiz',
        
        colorStops: visual.color_stops || ["#CCCCCC", "#BBBBBB", "#AAAAAA", "#999999"],
        spreadPattern: visual.spread_pattern || 'circular',
        nutrientMedium: growth.growth_medium || 'Nutrient Agar',
        
        phStart: 7.0,
        phEnd: 6.5,
        maxTime: growth.max_time_h || 72,
        lagPhaseHours: (growth.lag_min_h + growth.lag_max_h) / 2 || 2,
        
        waterSoluble: visual.pigment_water_soluble || false,
        tempSensitivePigment: visual.pigment_temp_sensitive || false,
        
        // Yeniden yapılandırılmış UI bilgileri için referans
        info: this.uiPanels.bacteria_details[id]
      };
    });
  },

  getById(id) {
    return this.all.find(b => b.id === id || b._id === id);
  },

  // İsimle arama (eski BACTERIA_INFO tarzı kullanım için)
  getByName(name) {
    return this.all.find(b => b.name === name);
  },

  getAntibioticsFor(idStr) {
    return this.antibiotics[idStr] || [];
  },

  getInteractionsFor(idStr) {
    return this.interactions.filter(i => i.bacteria_a === idStr || i.bacteria_b === idStr);
  }
};

window.BacteriaStore = BacteriaStore;
