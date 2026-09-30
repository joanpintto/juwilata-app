import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// La app se publica en https://joanpintto.github.io/juwilata-app/
export default defineConfig({
  base: '/juwilata-app/',
  define: { __VERSION__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'escudo.png'],
      // El manifiesto es un archivo propio (public/manifest.webmanifest) SIN start_url:
      // así la app de la pantalla de inicio arranca en la dirección desde la que se
      // añadió. Un compañero la añade desde su enlace (…/?ver=<código>) y queda en
      // modo lectura; el administrador, desde la dirección normal.
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,jpg,svg,woff2,webp}'],
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
