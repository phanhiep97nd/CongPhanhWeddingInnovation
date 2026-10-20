import tailwindcss from '@tailwindcss/vite';
import legacy from '@vitejs/plugin-legacy';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vitest/config';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      legacy({
        targets: ['Chrome >= 64', 'Safari >= 12', 'iOS >= 12', 'Firefox >= 67'],
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    build: {
      rollupOptions: {
        output: { manualChunks(id: string) { if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'react-vendor'; if (id.includes('node_modules/motion')) return 'motion'; } },
      },
    },
    test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'], exclude: ['api/**', 'node_modules/**', 'dist/**'] },
  };
});
