import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const enable3DFlag = env.VITE_ENABLE_3D === 'true' || process.env.VITE_ENABLE_3D === 'true';
  const addon3DDir = path.resolve(__dirname, '../Mistwalker 3D');
  const addon3DEntry = path.join(addon3DDir, 'src/index.ts');
  const use3DAddon = enable3DFlag && fs.existsSync(addon3DEntry);
  const stub3DEntry = path.resolve(__dirname, 'src/integrations/mistwalker3d/stub.ts');

  if (enable3DFlag && !use3DAddon) {
    console.warn(`[MistWalker 3D] VITE_ENABLE_3D=true but ${addon3DEntry} was not found. Falling back to 2D stub.`);
  }

  return {
    plugins: [react(), tailwindcss()],
    optimizeDeps: {
      include: ['gifler'],
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      '__MISTWALKER_3D_ENABLED__': JSON.stringify(use3DAddon),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@mistwalker/3d': use3DAddon ? addon3DEntry : stub3DEntry,
      },
      dedupe: ['react', 'react-dom', 'three'],
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      fs: use3DAddon ? { allow: [path.resolve(__dirname, '.'), addon3DDir] } : undefined,
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
              if (id.includes('three') || id.includes('cannon-es')) {
                return 'vendor-three-dice';
              }
              if (
                id.includes('yuka') ||
                id.includes('xstate') ||
                id.includes('rot-js') ||
                id.includes('pathfinding') ||
                id.includes('mistreevous')
              ) {
                return 'vendor-arena-ai';
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
            } else {
              if (
                id.includes('src/data/srdMonstersCatalog') ||
                id.includes('src\\data\\srdMonstersCatalog')
              ) {
                return 'data-monsters';
              }
              if (
                id.includes('src/data/dndRulesCompendium') ||
                id.includes('src\\data\\dndRulesCompendium') ||
                id.includes('src/data/criticalHitsTables') ||
                id.includes('src\\data\\criticalHitsTables') ||
                id.includes('src/types/wildShape') ||
                id.includes('src\\types\\wildShape')
              ) {
                return 'data-rules';
              }
              if (id.includes('src/effects/') || id.includes('src\\effects\\')) {
                return 'app-effects';
              }
              if (id.includes('src/components/PlayerView') || id.includes('src\\components\\PlayerView')) {
                return 'app-player-view';
              }
              if (id.includes('src/components/PlayerArenaMode') || id.includes('src\\components\\PlayerArenaMode')) {
                return 'app-player-arena';
              }
              if (id.includes('src/components/CampaignBuilderModal') || id.includes('src\\components\\CampaignBuilderModal')) {
                return 'app-campaign-builder';
              }
            }
          }
        }
      }
    },
  };
});
