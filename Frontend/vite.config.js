import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: {
    outDir: 'dist',
    // Switch between library mode and app mode based on environment variable
    ...(process.env.BUILD_WIDGET === 'true' ? {
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
    } : {
      // Standard App Build
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        }
      }
    })
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  }
}))
