import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('leaflet')) return 'vendor-leaflet';
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('react-router') || id.includes('react-dom') || id.includes('react')) {
              return 'vendor-react';
            }
            return 'vendor-common';
          }
        }
      }
    }
  }
})
