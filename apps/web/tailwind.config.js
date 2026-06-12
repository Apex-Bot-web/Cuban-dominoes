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
        'pegao': {
          '0%':   { transform: 'scale(0.3) rotate(-4deg)', opacity: '0' },
          '12%':  { transform: 'scale(1.15) rotate(2deg)', opacity: '1' },
          '70%':  { transform: 'scale(1) rotate(0deg)',    opacity: '1' },
          '100%': { transform: 'scale(1.08) rotate(0deg)', opacity: '0' },
        },
        'chat-bubble': {
          '0%':   { opacity: '0', transform: 'scale(0.6) translateY(8px)' },
          '14%':  { opacity: '1', transform: 'scale(1.1) translateY(0)' },
          '22%':  { opacity: '1', transform: 'scale(1) translateY(0)' },
          '78%':  { opacity: '1', transform: 'scale(1) translateY(0)' },
          '100%': { opacity: '0', transform: 'scale(0.9) translateY(-6px)' },
        },
        'slide-up': {
          '0%':   { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-ring':  'pulse-ring 1.2s ease-in-out infinite',
        'pegao':       'pegao 1.6s cubic-bezier(0.22,1,0.36,1) forwards',
        'chat-bubble': 'chat-bubble 3.5s ease-out forwards',
        'slide-up':    'slide-up 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
