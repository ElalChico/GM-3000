import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: false,
    outDir: '.vite/build',
    lib: {
      entry: 'src/electron-preload.js',
      formats: ['cjs'],
      fileName: () => 'preload.js',
    },
    rollupOptions: {
      external: [
        'electron',
        'os',
        'path',
        'fs',
      ],
    },
  },
});
