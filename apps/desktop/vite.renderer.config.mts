import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
    plugins: [react(), tsconfigPaths()],
    build: {
        rollupOptions: {
            input: {
                app_window: 'app_window.html',
                music_workshop_window: 'music_workshop_window.html'
            }
        }
    }
});
