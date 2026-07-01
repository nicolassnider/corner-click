// @ts-check

import react from '@astrojs/react'
import { getPWAConfig } from '@corner-click/pwa-config'
import tailwindcss from '@tailwindcss/vite'
import AstroPWA from '@vite-pwa/astro'
import { defineConfig } from 'astro/config'

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    AstroPWA(
      getPWAConfig(
        'Corner Click Judges',
        'Judges App',
        'Offline-first judging app for Corner Click'
      )
    ),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
})
