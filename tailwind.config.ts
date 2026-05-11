import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['var(--font-cormorant)', 'Georgia', 'serif'],
      },
      colors: {
        forest: {
          DEFAULT: '#354A20',
          dark: '#2a3b19',
          light: '#4a6530',
        },
      },
    },
  },
  plugins: [],
};

export default config;
