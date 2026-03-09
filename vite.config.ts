import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';

export default defineConfig({server: {
  host: true,
  port: 5173,
  strictPort: false,
  open: true,
  allowedHosts: true,
  watch: { usePolling: true }
},  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  // Let Vite pre-bundle deps (default). Excluding lucide-react caused /node_modules/... requests
  // that ad blockers block → white screen. With pre-bundling, assets use hashed URLs instead.
}) 