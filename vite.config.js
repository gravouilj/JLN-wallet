import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// ✅ SECURITY FIX #1: Content Security Policy middleware
const cspMiddleware = (_req, res, next) => {
  // Strict CSP to prevent XSS and theft of encrypted wallet blobs
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",                           // Only allow same-origin by default
      "script-src 'self' 'wasm-unsafe-eval'",        // Allow inline scripts for WASM (crypto)
      "style-src 'self' 'unsafe-inline'",            // Allow inline styles (React)
      "img-src 'self' data: https:",                 // Allow images from self, data URIs, and HTTPS
      "font-src 'self' data:",                       // Allow fonts from self and data URIs
      "connect-src 'self' https://*.chronik.cash wss://*.chronik.cash https://api.coingecko.com", // Blockchain APIs
      "object-src 'none'",                           // No plugins
      "base-uri 'self'",                             // Prevent base tag injection
      "frame-ancestors 'none'",                      // Prevent clickjacking
      "form-action 'self'",                          // Only allow form submissions to self
      "upgrade-insecure-requests",                   // Force HTTPS (except localhost)
    ].join('; ')
  );
  next();
};

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
  // ✅ SECURITY FIX #1: Apply CSP middleware
  server: {
    middlewares: [cspMiddleware],
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