/** @type {import('tailwindcss').Config} */

/**
 * Tailwind CSS v3 config untuk AMAN Kasir
 * Design tokens — mendukung light & dark mode.
 */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          400: '#60a5fa',  // untuk teks/icon di dark mode
          500: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          DEFAULT: '#1e3a8a',
        },
        accent: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          500: '#14b8a6',
          700: '#0f766e',
          900: '#134e4a',
          DEFAULT: '#0f766e',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          700: '#15803d',
          DEFAULT: '#15803d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          DEFAULT: '#b45309',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          DEFAULT: '#b91c1c',
        },
        background: {
          DEFAULT: '#f1f5f9',
          subtle: '#f8fafc',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f8fafc',
          raised: '#ffffff',
        },
        neutral: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          500: '#64748b',
          700: '#334155',
          900: '#0f172a',
        },
        // ── Dark mode tokens ──────────────────────────────────────
        dark: {
          bg:       '#0c0f1a',   // background utama
          card:     '#131929',   // card / surface
          elevated: '#1a2236',   // modal, dropdown, elevated surface
          border:   '#1e2740',   // border halus
          muted:    '#8b9ab8',   // teks muted / placeholder
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['Roboto Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
}
