import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    // Permite NEXT_PUBLIC_* (padrao Next) alem de VITE_* no browser.
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    server: {
      proxy: {
        '/api': {
          target: env.API_PROXY_TARGET?.trim() || 'https://minhascompras-api.onrender.com',
          changeOrigin: true,
        },
      },
    },
  }
})
