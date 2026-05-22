/** @type {import('tailwindcss').Config} */

/**
 * Tailwind CSS v3 config untuk AMAN Kasir
 * Design tokens (warna, font) akan ditambahkan di Langkah 3 (Design Tokens & Fonts)
 * File ini hanya setup content path agar purging CSS bekerja benar
 */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // Design tokens akan ditambahkan di Langkah 3
      // Referensi: Blueprint Bab 14.1
    },
  },
  plugins: [],
}
