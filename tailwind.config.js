/** @type {import('tailwindcss').Config} */

/**
 * Tailwind CSS v3 config untuk AMAN Kasir
 * Design tokens — modern "fintech" indigo–violet, mendukung light & dark mode.
 *
 * Struktur token (primary/accent/success/...) dipertahankan agar seluruh layar
 * yang memakai utility seperti `bg-primary` / `text-accent` otomatis ikut tema baru.
 */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Brand utama: Indigo ───────────────────────────────────
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8', // teks/ikon di dark mode
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          DEFAULT: '#4f46e5',
        },
        // ── Aksen: Violet ─────────────────────────────────────────
        accent: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          900: '#4c1d95',
          DEFAULT: '#7c3aed',
        },
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          DEFAULT: '#059669',
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
          300: '#fca5a5',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          DEFAULT: '#dc2626',
        },
        background: {
          DEFAULT: '#f6f7fb',
          subtle: '#fbfbfe',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f6f7fb',
          raised: '#ffffff',
        },
        neutral: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        // ── Dark mode tokens (sedikit ber-tint indigo) ────────────
        dark: {
          bg: '#0a0c18', // background utama
          card: '#12162a', // card / surface
          elevated: '#1a2038', // modal, dropdown, elevated surface
          border: '#252c47', // border halus
          muted: '#94a3c7', // teks muted / placeholder
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Roboto Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      backgroundImage: {
        // Gradien brand siap pakai
        'brand-gradient': 'linear-gradient(135deg, #4f46e5 0%, #6366f1 45%, #7c3aed 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, #6366f1 0%, #818cf8 50%, #a78bfa 100%)',
        'brand-mesh':
          'radial-gradient(120% 120% at 0% 0%, #6366f1 0%, transparent 55%), radial-gradient(120% 120% at 100% 100%, #7c3aed 0%, transparent 55%), linear-gradient(135deg, #4f46e5, #4f46e5)',
      },
      boxShadow: {
        // Bayangan lembut & elevasi modern
        soft: '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.06)',
        card: '0 1px 3px rgba(15, 23, 42, 0.05), 0 8px 24px -8px rgba(15, 23, 42, 0.10)',
        lifted: '0 12px 32px -8px rgba(79, 70, 229, 0.28)',
        glow: '0 8px 28px -6px rgba(99, 102, 241, 0.45)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out both',
        'scale-in': 'scale-in 0.18s ease-out both',
      },
    },
  },
  plugins: [],
}
