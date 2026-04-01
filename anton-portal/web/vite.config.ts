import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/auth': {
        target: 'http://127.0.0.1:3005',
        changeOrigin: true,
      },
    },
  },
  /** Same proxy as dev — without this, `vite preview` returns 404 for /api/auth/*. */
  preview: {
    proxy: {
      '/api/auth': {
        target: 'http://127.0.0.1:3005',
        changeOrigin: true,
      },
    },
  },
})
