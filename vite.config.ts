import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    optimizeDeps: {
      include: ['gifler'],
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        ignored: ['**/uploads/**']
      }
    },
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('konva') || id.includes('react-konva') || id.includes('use-image')) {
                return 'vendor-konva';
              }
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('pdfjs-dist')) {
                return 'vendor-pdf';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-lucide';
              }
              if (id.includes('@google/genai')) {
                return 'vendor-genai';
              }
            }
          }
        }
      }
    },
  };
});
