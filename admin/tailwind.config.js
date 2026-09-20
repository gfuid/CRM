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
        sans: ["'Plus Jakarta Sans'", '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
