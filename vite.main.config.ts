import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: false,
    outDir: '.vite/build',
    lib: {
      entry: 'src/electron-main.js',
      formats: ['cjs'],
      fileName: () => 'main.js',
    },
    rollupOptions: {
      external: [
        'electron',
        'express',
        'os',
        'http',
        'https',
        'path',
        'fs',
        'url',
        'net',
        'tls',
        'crypto',
        'child_process',
        '@andresaya/edge-tts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': __dirname,
    },
  },
});
