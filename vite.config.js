import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/zodi-clock/',
  build: {
    outDir: 'docs',
    assetsDir: '',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        embed: resolve(__dirname, 'embed.html'),
      },
    },
  },
});
