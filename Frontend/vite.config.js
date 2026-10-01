import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = Number(env.PORT || process.env.PORT || 3000)
  const frontendPort = Number(env.FRONTEND_PORT || process.env.FRONTEND_PORT || 5173)
  if (![port, frontendPort].every(value => Number.isInteger(value) && value >= 1024 && value <= 65535)) throw new Error('Porta inválida.')
  return {
  plugins: [react()],
  server: { host: '127.0.0.1', port: frontendPort, strictPort: true, proxy: { '/api': { target: `http://127.0.0.1:${port}`, changeOrigin: true } } },
  preview: { host: '127.0.0.1' },
  }
})
