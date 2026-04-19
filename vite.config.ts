import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  base: '/Culvert-Analyser/',
  plugins: [react()],
  worker: {
    format: 'es',
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        analyse: resolve(__dirname, 'analyse.html'),
      }
    }
  }
})