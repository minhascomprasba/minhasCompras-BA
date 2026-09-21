import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Permite NEXT_PUBLIC_* (padrao Next) alem de VITE_* no browser.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  server: {
    proxy: {
      '/api': {
        target: 'https://minhascompras-api.onrender.com',
        changeOrigin: true,
      },
    },
  },
})
