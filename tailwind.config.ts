import type { Config } from "tailwindcss";
// Import design tokens from our single source of truth
import { 
  colors, 
  fontFamily, 
  typography, 
  spacing, 
  borderRadius, 
  shadows, 
  breakpoints, 
  animations,
  backgroundImage,
  backdropBlur
} from './src/lib/design-system';

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    screens: breakpoints,
    extend: {
      colors,
      fontFamily,
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
      },
      spacing,
      borderRadius,
      boxShadow: shadows,
      backgroundImage,
      animation: animations.animation,
      keyframes: animations.keyframes,
      backdropBlur,
    },
  },
  plugins: [],
};
export default config;
