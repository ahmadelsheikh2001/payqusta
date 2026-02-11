import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // SSE notifications stream - special handling
      '/api/v1/notifications/stream': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: false,
        // Important for SSE
        headers: {
          'Accept': 'text/event-stream',
        },
      },
      // Regular API requests
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
