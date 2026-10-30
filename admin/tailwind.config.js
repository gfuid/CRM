/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#F88F61',
          'primary-dark': '#E87440',
          'primary-light': '#FFF5F0',
          secondary: '#FDC64A',
          accent: '#58BA84',
          alert: '#EB4E55',
          dark: '#0B0F19',
          emerald: '#58BA84',
          'emerald-dark': '#42A46E',
        },
        coral: {
          50: '#FFF5F0',
          100: '#FFE8DF',
          500: '#F88F61',
          600: '#E87440',
          700: '#C75624',
        },
        gold: {
          50: '#FEFDF6',
          100: '#FEF9E3',
          500: '#FDC64A',
          600: '#EBB02A',
        },
        crimson: {
          50: '#FEF4F4',
          100: '#FDE6E7',
          500: '#EB4E55',
          600: '#D5353C',
        },
        mint: {
          50: '#F2F9F5',
          100: '#E2F3E9',
          500: '#58BA84',
          600: '#42A46E',
        },
      },
      fontFamily: {
        sans: ["'Inter'", 'ui-sans-serif', 'system-ui', '-apple-system', "'Segoe UI'", 'Roboto', 'Arial', 'sans-serif'],
        mono: ["'JetBrains Mono'", 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      // ---- Design system (clean, minimal) ----
      // Inter variable font: slightly lighter heavy weights read calmer and more professional
      fontWeight: {
        bold: '650',
        extrabold: '700',
        black: '750',
      },
      boxShadow: {
        '2xs': '0 1px 1px rgba(16, 24, 40, 0.03)',
        xs: '0 1px 2px rgba(16, 24, 40, 0.04)',
        sm: '0 1px 2px rgba(16, 24, 40, 0.05)',
        DEFAULT: '0 1px 3px rgba(16, 24, 40, 0.06), 0 1px 2px rgba(16, 24, 40, 0.04)',
        md: '0 2px 6px -1px rgba(16, 24, 40, 0.06), 0 1px 2px rgba(16, 24, 40, 0.04)',
        lg: '0 8px 16px -4px rgba(16, 24, 40, 0.08), 0 2px 4px -2px rgba(16, 24, 40, 0.04)',
        xl: '0 16px 32px -8px rgba(16, 24, 40, 0.12), 0 4px 8px -4px rgba(16, 24, 40, 0.05)',
        '2xl': '0 24px 48px -12px rgba(16, 24, 40, 0.18)',
        card: '0 1px 2px rgba(16, 24, 40, 0.04)',
        'card-hover': '0 6px 16px -6px rgba(16, 24, 40, 0.10)',
        float: '0 16px 32px -8px rgba(16, 24, 40, 0.14)',
      },
      borderRadius: {
        '2xl': '0.875rem',
        '3xl': '1.125rem',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-in-up': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(0.97)' }, to: { opacity: '1', transform: 'scale(1)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out backwards',
        'fade-in-up': 'fade-in-up 220ms cubic-bezier(.22,.61,.36,1) backwards',
        'scale-in': 'scale-in 160ms cubic-bezier(.22,.61,.36,1) backwards',
        shimmer: 'shimmer 1.4s infinite',
      },

    },
  },
  plugins: [],
}
