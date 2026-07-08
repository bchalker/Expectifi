import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const devFontPreviewEntry = path.resolve(__dirname, 'src/dev/fontPreview/index.tsx')
const devFontPreviewStub = path.resolve(__dirname, 'src/dev/fontPreview/empty.tsx')

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [tailwindcss(), react()],
  optimizeDeps: {
    include: [
      'recharts',
      'overlayscrollbars',
      'overlayscrollbars-react',
      'maplibre-gl',
    ],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  css: {
    devSourcemap: true,
  },
  server: {
    port: 5173,
    strictPort: false,
    /** Listen on all interfaces so phones on the same Wi‑Fi can hit the dev server. */
    host: true,
    /** Allow ngrok / Cloudflare tunnel hostnames when testing OAuth on a phone. */
    allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.io', '.trycloudflare.com'],
    watch: {
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '#dev-font-preview': mode === 'production' ? devFontPreviewStub : devFontPreviewEntry,
      shared: path.resolve(__dirname, '../shared'),
    },
  },
}))
