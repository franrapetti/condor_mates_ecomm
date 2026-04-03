/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          900: '#0f1e12',
          800: '#1a3d24',
          700: '#234A2E',
          600: '#2d6040',
          500: '#3d8055',
          400: '#4ae577',
        },
        bone: {
          50: '#FFFDF7',
          100: '#F4F0E8',
          200: '#ddd5c0',
          300: '#c4b99a',
        }
      },
      fontFamily: {
        display: ['Montserrat', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
