/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // CAREQ_NO_PWA=1 builds without the service worker, for hosts that don't allow one.
      disable: process.env.CAREQ_NO_PWA === '1',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'CareQ — সিট, রক্ত, আইসিইউ, অক্সিজেন',
        short_name: 'CareQ',
        description: 'ওয়ার্ডে সিট আছে কি না, রক্ত, আইসিইউ ও অক্সিজেনের নম্বর — এক জায়গায়।',
        lang: 'bn',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f3f8fd',
        theme_color: '#ffffff',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  test: {
    include: ['tests/*.test.ts'],
  },
});
