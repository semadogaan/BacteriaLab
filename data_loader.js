class DataLoader {
  static async load() {
    try {
      const response = await fetch('bacteria_dataset.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Initialize the BacteriaStore with the loaded data
      BacteriaStore.init(data);
      
      return true;
    } catch (error) {
      console.error('Failed to load bacteria dataset:', error);
      return false;
    }
  }
}
