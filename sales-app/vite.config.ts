import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

/**
 * The Sai Brundavan Grand sales app is served from /sales/ on the existing
 * portfolio site, so every asset URL is prefixed and the build lands in the
 * repo-root `sales/` folder that Netlify publishes.
 */
export default defineConfig({
  base: '/sales/',
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  build: {
    outDir: path.resolve(import.meta.dirname, '../sales'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Keep the heavy, rarely-changing libraries in their own chunks so the
        // dashboard shell loads fast and stays cached between releases.
        manualChunks(id) {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-'))
            return 'charts'
          if (id.includes('node_modules/@firebase') || id.includes('node_modules/firebase'))
            return 'firebase'
          if (id.includes('node_modules/html-to-image')) return 'report'
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Sai Brundavan Grand — Sales',
        short_name: 'Brundavan',
        description: 'Daily sales reporting for Sai Brundavan Grand, Siddipet.',
        start_url: '/sales/',
        scope: '/sales/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#faf8f5',
        theme_color: '#8f1d2c',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/sales/index.html',
        navigateFallbackDenylist: [/^\/(?!sales)/],
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
      },
    }),
  ],
})
