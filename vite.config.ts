import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: 'src/renderer',
  plugins: [react()],
  build: {
    outDir: '../../web-dist',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@renderer': '/src'
    }
  }
})
