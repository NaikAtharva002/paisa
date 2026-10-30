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
        // Warm Cream / Sand Canvas (Reference 2)
        cream: {
          50: '#FCFBF9',
          100: '#FAF8F5',
          200: '#F5F2EB',
          300: '#ECE6DA',
          400: '#DFD7C7',
          500: '#C9BEA8',
        },
        // Deep Charcoal / Obsidian Sidebar & Elements (Reference 2)
        sidebar: {
          DEFAULT: '#141820',
          dark: '#0E1117',
          surface: '#1B212C',
          hover: '#222936',
          border: 'rgba(255, 255, 255, 0.08)',
        },
        // Editorial Text / Ink Colors
        ink: {
          950: '#0F1218',
          900: '#181D26',
          800: '#262D3B',
          700: '#3D4658',
          600: '#5E687D',
          500: '#7F899F',
          400: '#A4ADC0',
          300: '#CBD2E0',
        },
        // Warm Fintech Accent Palette (Reference 2)
        paisa: {
          gold: '#D4952B',
          goldLight: '#FFF6E6',
          goldBorder: '#F0D49C',
          sage: '#2E8B57',
          sageLight: '#EBF7EE',
          coral: '#E06D53',
          coralLight: '#FDF1EE',
          lavender: '#8B5CF6',
          lavenderLight: '#F4EEFF',
          blue: '#3B82F6',
          blueLight: '#EEF5FF',
          amber: '#F59E0B',
          amberLight: '#FEF8EA',
        },
        card: {
          bg: '#FFFFFF',
          border: '#EDE8E0',
          muted: '#F8F6F1',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        editorial: ['Plus Jakarta Sans', 'serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'card': '0 2px 14px rgba(24, 29, 38, 0.03), 0 1px 3px rgba(24, 29, 38, 0.02)',
        'card-hover': '0 10px 28px rgba(24, 29, 38, 0.06), 0 2px 8px rgba(24, 29, 38, 0.03)',
        'floating': '0 16px 40px rgba(18, 24, 34, 0.08)',
        'gold-glow': '0 4px 18px rgba(212, 149, 43, 0.25)',
      },
    },
  },
  plugins: [],
}
