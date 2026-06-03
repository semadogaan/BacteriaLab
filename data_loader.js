class DataLoader {
  /**
   * Tek bir JSON dosyası yüklemek için yardımcı metod.
   * Özel veri yükleme ihtiyacı olan sayfalar kullanabilir.
   */
  static async loadSingle(path) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn(`Failed to load ${path}:`, error.message);
      return null;
    }
  }

  /**
   * Ana uygulama için tüm veri setlerini paralel yükler ve birleştirir.
   */
  static async load() {
    try {
      const promises = [
        this.loadSingle('bacteria_dataset.json'),        // Ana dataset
        this.loadSingle('data/tissue_models.json'),      // Doku modelleri
        this.loadSingle('data/interaction_matrix.json'), // Etkileşim matrisi
        this.loadSingle('data/antibiotic_pk.json'),      // PK verileri
        this.loadSingle('data/literature_benchmarks.json') // Literatür benchmarkları
      ];

      // Promise.allSettled ile tümünü bekle (tek hata tüm süreci durdurmaz)
      const results = await Promise.allSettled(promises);

      // Yüklenen verileri ayıkla
      const getVal = (result, fallback) => (result.status === 'fulfilled' && result.value) ? result.value : fallback;

      const bacteriaData = getVal(results[0], null);
      const tissueModels = getVal(results[1], []);
      const interactionMatrix = getVal(results[2], []);
      const antibioticPK = getVal(results[3], []);
      const benchmarks = getVal(results[4], []);

      // Ana veri yoksa uygulamayı durdur
      if (!bacteriaData) {
        console.error('Critical Error: Core bacteria dataset is missing. Cannot initialize application.');
        return false;
      }

      // Tek bir unified object'te birleştir
      const mergedData = {
        master: bacteriaData.master,
        growth: bacteriaData.growth,
        antibiotics: bacteriaData.antibiotics,
        visuals: bacteriaData.visuals,
        interactions: bacteriaData.interactions,
        uiPanels: bacteriaData.uiPanels,
        mutationRules: bacteriaData.mutationRules,
        simulationRules: bacteriaData.simulationRules,
        tissue_models: tissueModels,
        interaction_matrix: interactionMatrix,
        antibiotic_pk: antibioticPK,
        literature_benchmarks: benchmarks
      };

      // BacteriaStore'u tekil obje ile başlat
      BacteriaStore.init(mergedData);
      
      return true;
    } catch (error) {
      console.error('Unexpected error during data loading:', error);
      return false;
    }
  }
}

window.DataLoader = DataLoader;
