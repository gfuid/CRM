/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic tokens: values live in src/index.css and switch for dark mode
        canvas: token('canvas'),
        surface: token('surface'),
        subtle: token('subtle'),
        line: token('line'),
        ink: token('ink'),
        muted: token('muted'),
        faint: token('faint'),
        primary: {
          DEFAULT: token('primary'),
          strong: token('primary-strong'),
          soft: token('primary-soft'),
          ink: token('primary-ink'),
        },
        danger: { DEFAULT: token('danger'), soft: token('danger-soft'), ink: token('danger-ink') },
        warning: { DEFAULT: token('warning'), soft: token('warning-soft'), ink: token('warning-ink') },
        info: { DEFAULT: token('info'), soft: token('info-soft'), ink: token('info-ink') },
        brand: { coral: '#F88F61', gold: '#FDC64A', red: '#EB4E55', mint: '#58BA84' },
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.04), 0 1px 3px rgb(15 23 42 / 0.06)',
        pop: '0 10px 30px -10px rgb(15 23 42 / 0.25), 0 4px 10px -4px rgb(15 23 42 / 0.1)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'pop-in': { from: { opacity: '0', transform: 'scale(0.97) translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
        'slide-in': { from: { transform: 'translateX(24px)', opacity: '0' }, to: { transform: 'none', opacity: '1' } },
        'toast-in': { from: { transform: 'translateY(8px)', opacity: '0' }, to: { transform: 'none', opacity: '1' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'pop-in': 'pop-in 160ms cubic-bezier(.22,.61,.36,1)',
        'slide-in': 'slide-in 200ms cubic-bezier(.22,.61,.36,1)',
        'toast-in': 'toast-in 180ms ease-out',
      },
    },
  },
  plugins: [],
};
