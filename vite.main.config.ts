import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    target: 'node16',
    rollupOptions: {
      // Solo se externalizan módulos nativos de Node y electron
      // (todos ya vienen incluidos en el runtime de Electron)
      external: [
        'electron',
        'path',
        'os',
        'http',
        'https',
        'fs',
        'crypto',
        'url',
        'net',
        'stream',
        'events',
        'buffer',
        'util',
        'child_process',
      ],
    },
  },
});
