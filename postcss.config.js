/** @type {import('postcss').ProcessOptions} */

/**
 * PostCSS config untuk AMAN Kasir
 * - tailwindcss: proses utility classes
 * - autoprefixer: tambah vendor prefix otomatis untuk kompatibilitas Android
 */
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
