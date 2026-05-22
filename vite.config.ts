import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

/**
 * Konfigurasi Vite untuk AMAN Kasir
 * - Menggunakan vitest/config agar 'test' property tersedia
 * - Path alias @/ → src/ untuk import yang bersih
 */
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      // Contoh: import { formatCurrency } from '@/lib/currency'
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  test: {
    // Global API (describe, test, expect, vi) tanpa perlu import
    globals: true,
    // Simulasi browser DOM untuk test React components
    environment: 'jsdom',
    // Setup @testing-library/jest-dom matchers
    setupFiles: ['./src/tests/setup.ts'],
    // Proses CSS dalam test
    css: true,
  },
})
