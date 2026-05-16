import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,   // necesario para que funcione dentro de Docker
    port: 5173,
    proxy: {
      // Proxy para que las llamadas /api vayan al backend sin problemas de CORS
      '/api': {
        target: 'http://backend:4000',
        changeOrigin: true,
      },
    },
  },
})
