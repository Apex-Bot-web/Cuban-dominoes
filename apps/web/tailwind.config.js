/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        felt: {
          DEFAULT: '#2c5f7a',
          dark:    '#1a3f54',
          mid:     '#234e65',
          light:   '#3a7a9c',
        },
        ivory: {
          DEFAULT: '#faf6ed',
          dark:    '#f0e8d0',
          border:  '#c8b99a',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        tile:      '0 2px 6px rgba(0,0,0,0.35)',
        'tile-lg': '0 4px 12px rgba(0,0,0,0.4)',
        playable:  '0 0 12px rgba(74,222,128,0.55)',
        selected:  '0 0 18px rgba(251,191,36,0.75)',
      },
      keyframes: {
        'pulse-ring': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(251,191,36,0.5)' },
          '50%':       { boxShadow: '0 0 0 6px rgba(251,191,36,0)' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
