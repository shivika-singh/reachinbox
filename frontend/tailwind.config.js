/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'] },
      colors: {
        brand: { DEFAULT: '#12A150', dark: '#0E8541', tint: '#E8F6EE' },
        ink: { DEFAULT: '#1F2937', soft: '#6B7280', faint: '#9CA3AF' },
        line: '#E5E7EB',
      },
    },
  },
  plugins: [],
};
