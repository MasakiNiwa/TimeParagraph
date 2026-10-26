/// <reference types="vitest/config" />
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string;
};

function commitSha(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'unknown';
  }
}

export default defineConfig({
  // GitHub Pages ではリポジトリ名のサブパスで公開される
  base: process.env.NODE_ENV === 'production' ? '/TimeParagraph/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'TimeParagraph',
        short_name: 'TimeParagraph',
        description: 'パラグラフ単位で話す時間と内容を考えるエディタ',
        lang: 'ja',
        start_url: './',
        scope: './',
        display: 'standalone',
        theme_color: '#22252b',
        background_color: '#22252b',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,txt}'],
        // 形態素解析の辞書(約 18MB)は事前キャッシュせず、使ったときにキャッシュする
        globIgnores: ['dict/**'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/dict/kuromoji/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'kuromoji-dict',
              expiration: { maxEntries: 20 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      // kuromoji が require('path') するため、ブラウザ用の最小実装に置き換える
      {
        find: /^path$/,
        replacement: fileURLToPath(new URL('./src/shims/path.ts', import.meta.url)),
      },
    ],
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __COMMIT_SHA__: JSON.stringify(commitSha()),
  },
  worker: { format: 'es' },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router', 'react-router-dom'],
          mantine: ['@mantine/core', '@mantine/hooks', '@mantine/modals', '@mantine/notifications'],
          data: ['dexie', 'dexie-react-hooks', 'zod', 'zustand', 'zundo'],
          dnd: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/modifiers', '@dnd-kit/utilities'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
