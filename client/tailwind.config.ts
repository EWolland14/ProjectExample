/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        table: {
          felt: '#1B4D3E',
          'felt-dark': '#13392E',
          border: '#2C6856',
        },
        tile: {
          bg: '#FDFBF7',
          border: '#E2D9C8',
          shadow: '#C5BAA5',
          red: '#D92626',
          blue: '#1E64D4',
          yellow: '#DE8800',
          black: '#1F2421',
        },
        wood: {
          light: '#8B5A2B',
          DEFAULT: '#5C3817',
          dark: '#3E240D',
          border: '#2A1808',
        }
      },
      boxShadow: {
        'tile': '0 4px 6px -1px rgba(0, 0, 0, 0.25), 0 2px 4px -2px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
        'tile-drag': '0 12px 20px -2px rgba(0, 0, 0, 0.35), 0 6px 10px -4px rgba(0, 0, 0, 0.25)',
        'rack': 'inset 0 4px 8px rgba(0,0,0,0.5), 0 8px 16px rgba(0,0,0,0.4)',
      },
      fontFamily: {
        rummi: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
