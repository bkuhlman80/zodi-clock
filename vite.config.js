// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // GitHub Pages base path for bkuhlman80.github.io/helio-geo-zodiac/
  base: '/helio-geo-zodiac/',
  build: {
    outDir: 'docs',     // Pages can publish from /docs on main
    assetsDir: '',      // keep files flat (nice for Pages)
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        embed: resolve(__dirname, 'embed.html'),
      },
    },
  },
});
