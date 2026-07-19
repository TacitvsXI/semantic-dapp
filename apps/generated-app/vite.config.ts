import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
  },
  build: {
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
