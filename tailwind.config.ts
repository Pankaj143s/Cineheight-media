import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './content/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        blue: {
          '050': 'var(--blue-050)',
          '200': 'var(--blue-200)',
          '400': 'var(--blue-400)',
          '500': 'var(--blue-500)',
          '600': 'var(--blue-600)',
          '700': 'var(--blue-700)',
        },
        bg: {
          '950': 'var(--bg-950)',
          '900': 'var(--bg-900)',
          '800': 'var(--bg-800)',
          '700': 'var(--bg-700)',
        },
        text: {
          '100': 'var(--text-100)',
          '200': 'var(--text-200)',
          '300': 'var(--text-300)',
          '500': 'var(--text-500)',
        },
      },
      borderColor: {
        DEFAULT: 'var(--border)',
        strong: 'var(--border-strong)',
      },
      fontFamily: {
        hero: ['var(--font-bebas)', 'League Gothic', 'Arial Narrow', 'sans-serif'],
        display: ['var(--font-satoshi)', 'system-ui', 'sans-serif'],
        body: ['var(--font-poppins)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
