import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',   // tu działa Twój json-server
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''), // /api/alerts -> /alerts
      },
    },
  },
})
