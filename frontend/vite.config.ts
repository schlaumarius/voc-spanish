import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    {
      name: 'custom-mime-type',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.endsWith('.wasm')) {
            // Setze den richtigen MIME-Typ für .wasm-Dateien
            res.setHeader('Content-Type', 'application/wasm');
          }
          next(); // Weiter zum nächsten Middleware
        });
      },
    },
  ],
  build: {
    outDir: 'frontend/dist',  // Set the correct output directory
  },
});