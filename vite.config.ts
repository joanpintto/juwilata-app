import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// La app se publica en https://joanpintto.github.io/juwilata-app/
export default defineConfig({
  base: '/juwilata-app/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'escudo.png'],
      manifest: {
        name: 'Juwilata United',
        short_name: 'Juwilata',
        description: 'Cartas evolutivas del Juwilata United',
        lang: 'es',
        theme_color: '#161617',
        background_color: '#161617',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // El recorte de fondo (modelo + motor, ~28 MB) no se descarga al instalar:
        // solo la primera vez que se usa, y luego queda guardado para usarlo sin conexión.
        globIgnores: ['**/recorte/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/recorte/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'recorte-fondo',
              expiration: { maxEntries: 10 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
