// Datei zum Laden und Instanziieren der .wasm-Datei
export const loadWasm = async () => {
    const wasmUrl = '/wasm/sql-wasm.wasm'; // Pfad zur .wasm-Datei im public-Ordner
  
    try {
      const response = await fetch(wasmUrl);
      if (!response.ok) {
        throw new Error('Fehler beim Laden der .wasm-Datei');
      }
      const buffer = await response.arrayBuffer();
      const wasmModule = await WebAssembly.instantiate(buffer);
      console.log('WebAssembly erfolgreich geladen und instanziiert');
      return wasmModule;
    } catch (error) {
      console.error('Fehler beim Laden der .wasm-Datei:', error);
    }
  };
  