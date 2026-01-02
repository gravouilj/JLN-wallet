import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // CRITIQUE : Garder les polyfills pour la crypto (Buffer, etc.)
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: [
      'buffer',
      'crypto-browserify',
      'stream-browserify',
      'util',
      'url',
      'assert'
    ],
  },
  // --- OPTIMISATION DU BUILD ---
  build: {
    target: 'esnext', // Optimisation pour les navigateurs modernes (BigInt support)
    chunkSizeWarningLimit: 1000, // On augmente la limite d'alerte à 1MB pour réduire le bruit
    rollupOptions: {
      // Suppression des warnings non-critiques (protobufjs eval)
      onwarn(warning, warn) {
        if (warning.code === 'EVAL' || warning.id?.includes('@protobufjs')) {
          return; // Ignorer silencieusement les warnings d'eval dans les dépendances externes
        }
        warn(warning);
      },
      output: {
        // Découpage intelligent du code (Code Splitting)
        manualChunks: {
          // 1. Cœur React (UI)
          'vendor-react': ['react', 'react-dom', 'react-router-dom', 'jotai'],
          
          // 2. Blockchain & Crypto (Le plus lourd)
          // On isole ça pour ne pas bloquer le chargement initial de l'interface
          'vendor-blockchain': [
            'ecash-lib', 
            'chronik-client', 
            'ecashaddrjs', 
            '@scure/bip39', 
            '@scure/bip32'
          ],
          
          // 3. Backend & Utils
          'vendor-utils': ['@supabase/supabase-js', 'i18next', 'react-i18next', 'qrcode.react']
        }
      }
    }
  }
});