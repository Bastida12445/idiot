/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ink: '#090a0f', panel: '#12141d', violet: '#8b75ff', mint: '#a4f3d0' },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui'] },
      boxShadow: { glow: '0 0 80px rgba(139,117,255,.15)' },
    },
  },
  plugins: [],
};
