import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Vite v8 uses Rolldown by default. Its aggressive code-splitting reorders
  // module evaluation in a way that breaks viem's nested class hierarchy
  // ("Class extends value undefined is not a constructor"). Disabling code
  // splitting forces a single bundle so dependencies always evaluate in the
  // right order. The bundle is larger; for an MVP demo it's a fine tradeoff.
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: false,
      },
    },
    chunkSizeWarningLimit: 4000,
  },
})
