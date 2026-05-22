import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

/**
 * Konfigurasi ESLint untuk AMAN Kasir
 * Menggunakan ESLint v9 flat config format
 */
export default tseslint.config(
  // Folder/file yang di-skip saat linting
  {
    ignores: ['dist/**', 'android/**', 'ios/**'],
  },

  // Aturan utama untuk semua file TypeScript & TSX di src/
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // React Hooks: pastikan rules of hooks diikuti
      ...reactHooks.configs.recommended.rules,

      // HMR: hanya export components dari file React (dev experience)
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // TypeScript: variabel dengan prefix _ boleh unused (convention)
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // any boleh ada tapi harus disadari
      '@typescript-eslint/no-explicit-any': 'warn',

      // Return type tidak wajib — TypeScript inference sudah kuat
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },

  // Prettier: matikan semua ESLint rules yang bentrok dengan Prettier formatting
  // Harus di-taruh PALING AKHIR agar override semua rules sebelumnya
  prettier,
)
