import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    // The web3 + wallet stack is inherently large. Split the eagerly-used cores
    // into cacheable vendor chunks; RainbowKit still lazy-loads its per-wallet
    // and per-locale chunks on demand (only when the connect modal is opened).
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          web3: ['viem', 'wagmi', '@tanstack/react-query'],
          rainbowkit: ['@rainbow-me/rainbowkit'],
        },
      },
    },
  },
});
