import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
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
