import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Electron 39 embeds Chromium 142; targeting that runtime permits modern APIs used by noVNC without widening browser support beyond the packaged app.
export default defineConfig({ plugins: [react()], base: './', build: { target: 'chrome142' } });
