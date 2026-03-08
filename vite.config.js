import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const appBuildId = String(Date.now())

export default defineConfig({
  define: {
    __APP_BUILD_ID__: JSON.stringify(appBuildId)
  },
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_CPANEL_API_BASE_URL || 'https://api-refresko.skf.edu.in',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
