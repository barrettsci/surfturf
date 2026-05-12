import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/surfturf/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'SurfTurf',
        short_name: 'SurfTurf',
        description: 'Offline-capable map for hunting, fishing, and diving POIs',
        theme_color: '#2c3e50',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'any',
        start_url: '/surfturf/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Don't cache map tiles through service worker — handled via Cache API in offline.js
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [],
      },
    }),
  ],
  resolve: {
    alias: { leaflet: 'leaflet' },
  },
});
