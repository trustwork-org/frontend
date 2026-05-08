import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 2000,
    // Vite's default behaviour is to emit <link rel="modulepreload"> tags
    // for every chunk reachable from the entry, including lazy ones. That
    // warms cache for snappy navigation but defeats the whole point of
    // lazy-loading the Privy bundle for visitors who only ever see the
    // landing page. Disable preload so lazy chunks fetch on demand.
    modulePreload: false,
    rollupOptions: {
      output: {
        // Keep each large dependency in its own self-contained chunk so its
        // internal module load order is preserved. Without this, Rolldown was
        // hoisting parts of viem's class hierarchy (errors/log.js extends
        // errors/base.js BaseError) before BaseError was defined, throwing
        // "Class extends value undefined" at runtime.
        manualChunks(id: string) {
          if (id.includes('node_modules/viem/')) return 'viem'
          if (id.includes('node_modules/@privy-io/')) return 'privy'
          if (id.includes('node_modules/@tanstack/')) return 'tanstack'
          if (id.includes('node_modules/wagmi/')) return 'wagmi'
        },
      },
    },
  },
})
