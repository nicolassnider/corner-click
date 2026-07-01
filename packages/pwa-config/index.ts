/**
 * PWA configuration for Corner Click apps
 * @param appName - Full name of the application
 * @param shortName - Short name for the application (used in some contexts)
 * @param description - Description of the application
 * @returns PWA configuration object for @vite-pwa/astro
 */
export function getPWAConfig(appName: string, shortName: string, description: string): unknown {
  return {
    registerType: 'autoUpdate',
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
      // Increase limit to 3MB for larger assets
      maximumFileSizeToCacheInBytes: 3000000,

      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-cache',
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24 * 365, // <== 365 days
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'gstatic-fonts-cache',
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24 * 365, // <== 365 days
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
        {
          // API endpoints - NetworkFirst with background sync for offline support
          urlPattern: /\/api\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            networkTimeoutSeconds: 10,
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60 * 24, // 24 hours
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
            backgroundSync: {
              name: 'score-queue',
              options: {
                maxRetentionTime: 24 * 60, // Retry for up to 24 hours
              },
            },
          },
        },
        {
          // Firebase Realtime Database - NetworkFirst for real-time data
          urlPattern: /.*firebaseio\.com.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'firebase-cache',
            networkTimeoutSeconds: 5,
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 5, // 5 minutes for real-time data
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
        {
          // Socket.io connections - NetworkOnly (no caching for websockets)
          urlPattern: /\/socket\.io\/.*/i,
          handler: 'NetworkOnly',
        },
      ],
    },
    manifest: {
      name: appName,
      short_name: shortName,
      description: description,
      theme_color: '#000000',
      background_color: '#ffffff',
      display: 'standalone',
      icons: [
        {
          src: '/favicon.svg',
          sizes: 'any',
          type: 'image/svg+xml',
        },
        {
          src: '/favicon.svg',
          sizes: '192x192',
          type: 'image/svg+xml',
        },
        {
          src: '/favicon.svg',
          sizes: '512x512',
          type: 'image/svg+xml',
          purpose: 'any maskable',
        },
      ],
    },
  }
}
