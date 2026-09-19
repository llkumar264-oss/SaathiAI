/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Senior-friendly warm palette
        cream: {
          50: '#FDFCF7',
          100: '#FAF7F2',
          200: '#F3EDE2',
          300: '#E8DEC9',
        },
        teal: {
          deep: '#0F4C5C',
          dark: '#0A343F',
          light: '#E2F1F3',
          border: '#2C7A7B',
        },
        saffron: {
          DEFAULT: '#E36414',
          hover: '#C8530C',
          light: '#FDEEE4',
        },
        sos: {
          DEFAULT: '#D90429',
          hover: '#BA0323',
          active: '#8D0801',
          bg: '#FDF0F0',
        },
        // High-contrast accessibility tokens
        hc: {
          bg: '#000000',
          text: '#FFFF00', // yellow on black
          border: '#FFFF00',
          card: '#121212',
          accent: '#00FFFF',
        }
      },
      fontFamily: {
        sans: ['Atkinson Hyperlegible', 'Noto Sans', 'system-ui', 'sans-serif'],
        devanagari: ['Noto Sans Devanagari', 'sans-serif'],
      },
      fontSize: {
        // Minimum senior base font is 18px (text-lg)
        'base-senior': ['1.125rem', { lineHeight: '1.7' }], // 18px
        'large-senior': ['1.375rem', { lineHeight: '1.7' }], // 22px
        'xl-senior': ['1.75rem', { lineHeight: '1.6' }],    // 28px
      },
      minHeight: {
        'touch': '48px',
      },
      minWidth: {
        'touch': '48px',
      },
      boxShadow: {
        'senior': '0 4px 16px -2px rgba(15, 76, 92, 0.08), 0 2px 6px -2px rgba(15, 76, 92, 0.04)',
        'senior-hover': '0 8px 24px -4px rgba(15, 76, 92, 0.12), 0 4px 8px -2px rgba(15, 76, 92, 0.06)',
        'sos': '0 6px 20px rgba(217, 4, 41, 0.35)',
      },
    },
  },
  plugins: [],
}
