import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/widget-main.jsx'),
      name: 'GrowAIWidget',
      fileName: () => 'widget.js',
      formats: ['iife'], 
    },
    rollupOptions: {
      output: {
        extend: true,
      }
    }
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  }
})
