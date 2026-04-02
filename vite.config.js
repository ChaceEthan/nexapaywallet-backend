import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Separate Stellar SDK into its own chunk
          if (id.includes('@stellar/stellar-sdk') || id.includes('@stellar/freighter-api')) {
            return 'stellar';
          }
          // Separate React and React DOM
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react';
          }
          // Group other node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
})
