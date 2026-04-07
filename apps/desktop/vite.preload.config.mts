import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const nativeDeps = ['sharp', 'sqlite3', 'sequelize', 'sequelize-typescript', 'electron-store', 'lzma-native', 'canvas', 'jsdom'];

export default defineConfig({
  plugins: [tsconfigPaths()],
  build: {
    rollupOptions: {
      external: nativeDeps,
    },
  },
});
