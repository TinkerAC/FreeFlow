import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// Keep only native modules external so pure JS packages are bundled into main.js.
const nativeDeps = ['sharp', 'sqlite3', 'lzma-native', 'canvas'];

export default defineConfig({
  plugins: [tsconfigPaths()],
  build: {
    rollupOptions: {
      external: nativeDeps
    }
  }
});
