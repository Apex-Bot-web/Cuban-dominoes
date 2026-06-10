/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        felt: {
          DEFAULT: '#14532d',
          dark: '#0a2e18',
          light: '#166534',
        },
        ivory: {
          DEFAULT: '#f5f0dc',
          dark: '#e8dfc0',
        },
      },
    },
  },
  plugins: [],
};
