import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    // Split heavy vendors so the web3 stack doesn't inflate the main chunk.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          web3: ['viem', 'wagmi', '@tanstack/react-query'],
        },
      },
    },
  },
});
