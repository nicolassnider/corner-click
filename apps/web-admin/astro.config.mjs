// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';
import AstroPWA from '@vite-pwa/astro';
import { getPWAConfig } from '@corner-click/pwa-config';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    AstroPWA(getPWAConfig('Corner Click Admin', 'Admin Dashboard', 'Admin dashboard for Corner Click'))
  ],

  vite: {
    plugins: [tailwindcss()],
    build: {
      target: ['es2015', 'chrome58', 'safari11'],
      cssTarget: ['chrome58']
    }
  }
});