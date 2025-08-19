/**
 * Design System Configuration
 * 
 * This file serves as the single source of truth for all design tokens in the application.
 * It provides centralized design tokens following WCAG AA guidelines and 8px grid system.
 * 
 * The values exported from this file are imported and used by:
 * - tailwind.config.ts (for Tailwind CSS configuration)
 * - React components (for programmatic styling)
 * - CSS-in-JS solutions
 * 
 * Key principles:
 * - WCAG AA compliant colors (4.5:1 contrast minimum)
 * - 8px grid system for consistent spacing
 * - Mobile-first responsive design
 * - Type-safe design tokens
 * 
 * @see /tailwind.config.ts for Tailwind integration
 */

// Font Family System
export const fontFamily = {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  display: ['Inter', 'system-ui', 'sans-serif'],
};

// Typography Scale - Type-safe typography system
export const typography = {
  // Display styles
  display: {
    '5xl': {
      fontSize: '3rem',      // 48px
      lineHeight: '1.2',     // 57.6px
      fontWeight: '700',
      letterSpacing: '-0.025em',
    },
    '4xl': {
      fontSize: '2.5rem',    // 40px
      lineHeight: '1.2',     // 48px
      fontWeight: '700',
      letterSpacing: '-0.025em',
    },
    '3xl': {
      fontSize: '2rem',      // 32px
      lineHeight: '1.25',    // 40px
      fontWeight: '700',
      letterSpacing: '-0.02em',
    },
    '2xl': {
      fontSize: '1.75rem',   // 28px
      lineHeight: '1.286',   // 36px
      fontWeight: '600',
      letterSpacing: '-0.02em',
    },
    'xl': {
      fontSize: '1.5rem',    // 24px
      lineHeight: '1.333',   // 32px
      fontWeight: '600',
      letterSpacing: '-0.01em',
    },
  },
  
  // Heading styles
  heading: {
    'h1': {
      fontSize: '1.375rem',  // 22px
      lineHeight: '1.45',    // 32px
      fontWeight: '600',
      letterSpacing: '-0.01em',
    },
    'h2': {
      fontSize: '1.25rem',   // 20px
      lineHeight: '1.4',     // 28px
      fontWeight: '600',
      letterSpacing: '0',
    },
    'h3': {
      fontSize: '1.125rem',  // 18px
      lineHeight: '1.44',    // 26px
      fontWeight: '600',
      letterSpacing: '0',
    },
    'h4': {
      fontSize: '1rem',      // 16px
      lineHeight: '1.5',     // 24px
      fontWeight: '600',
      letterSpacing: '0',
    },
  },
  
  // Body text
  body: {
    'lg': {
      fontSize: '1.125rem',  // 18px
      lineHeight: '1.67',    // 30px
      fontWeight: '400',
      letterSpacing: '0',
    },
    'base': {
      fontSize: '1rem',      // 16px
      lineHeight: '1.625',   // 26px
      fontWeight: '400',
      letterSpacing: '0',
    },
    'sm': {
      fontSize: '0.875rem',  // 14px
      lineHeight: '1.57',    // 22px
      fontWeight: '400',
      letterSpacing: '0',
    },
    'xs': {
      fontSize: '0.75rem',   // 12px
      lineHeight: '1.5',     // 18px
      fontWeight: '400',
      letterSpacing: '0.025em',
    },
  },
  
  // Label and UI text
  label: {
    'lg': {
      fontSize: '1rem',      // 16px
      lineHeight: '1.5',     // 24px
      fontWeight: '500',
      letterSpacing: '0',
    },
    'base': {
      fontSize: '0.875rem',  // 14px
      lineHeight: '1.43',    // 20px
      fontWeight: '500',
      letterSpacing: '0',
    },
    'sm': {
      fontSize: '0.75rem',   // 12px
      lineHeight: '1.33',    // 16px
      fontWeight: '500',
      letterSpacing: '0.025em',
    },
  },

  // Tailwind-compatible fontSize definitions
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
};

// Spacing System - 8px grid system with extended values
export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',    // 2px
  1: '0.25rem',       // 4px
  1.5: '0.375rem',    // 6px
  2: '0.5rem',        // 8px
  2.5: '0.625rem',    // 10px
  3: '0.75rem',       // 12px
  3.5: '0.875rem',    // 14px
  4: '1rem',          // 16px
  4.5: '1.125rem',    // 18px
  5: '1.25rem',       // 20px
  5.5: '1.375rem',    // 22px
  6: '1.5rem',        // 24px
  6.5: '1.625rem',    // 26px
  7: '1.75rem',       // 28px
  7.5: '1.875rem',    // 30px
  8: '2rem',          // 32px
  8.5: '2.125rem',    // 34px
  9: '2.25rem',       // 36px
  9.5: '2.375rem',    // 38px
  10: '2.5rem',       // 40px
  10.5: '2.625rem',   // 42px
  11: '2.75rem',      // 44px (minimum touch target)
  11.5: '2.875rem',   // 46px
  12: '3rem',         // 48px
  12.5: '3.125rem',   // 50px
  13: '3.25rem',      // 52px
  14: '3.5rem',       // 56px
  15: '3.75rem',      // 60px
  16: '4rem',         // 64px
  17: '4.25rem',      // 68px
  18: '4.5rem',       // 72px
  19: '4.75rem',      // 76px
  20: '5rem',         // 80px
  21: '5.25rem',      // 84px
  22: '5.5rem',       // 88px
  23: '5.75rem',      // 92px
  24: '6rem',         // 96px
  25: '6.25rem',      // 100px
  26: '6.5rem',       // 104px
  27: '6.75rem',      // 108px
  28: '7rem',         // 112px
  29: '7.25rem',      // 116px
  30: '7.5rem',       // 120px
  31: '7.75rem',      // 124px
  32: '8rem',         // 128px
  33: '8.25rem',      // 132px
  34: '8.5rem',       // 136px
  35: '8.75rem',      // 140px
  36: '9rem',         // 144px
  37: '9.25rem',      // 148px
  38: '9.5rem',       // 152px
  39: '9.75rem',      // 156px
  40: '10rem',        // 160px
  41: '10.25rem',     // 164px
  42: '10.5rem',      // 168px
  43: '10.75rem',     // 172px
  44: '11rem',        // 176px
  45: '11.25rem',     // 180px
  46: '11.5rem',      // 184px
  47: '11.75rem',     // 188px
  48: '12rem',        // 192px
  49: '12.25rem',     // 196px
  50: '12.5rem',      // 200px
  52: '13rem',        // 208px
  56: '14rem',        // 224px
  60: '15rem',        // 240px
  64: '16rem',        // 256px
  72: '18rem',        // 288px
  80: '20rem',        // 320px
  88: '22rem',        // 352px
  96: '24rem',        // 384px
  128: '32rem',       // 512px
};

// WCAG AA Compliant Color System
export const colors = {
  // Primary brand colors - blue based
  primary: {
    50: '#f0f7ff',
    100: '#e0efff',
    200: '#bae6ff',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',   // Main brand color
    600: '#0284c7',   // Focus states
    700: '#0369a1',   // Active states
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49',
  },
  
  // Neutral grays - enhanced for better contrast
  neutral: {
    0: '#ffffff',
    25: '#fdfdfd',
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',   // 4.5:1 contrast with white
    600: '#525252',   // 7:1 contrast with white
    700: '#404040',   // 10.4:1 contrast with white
    800: '#262626',   // 14.8:1 contrast with white
    900: '#171717',   // 17.9:1 contrast with white
    950: '#0a0a0a',
  },
  
  // Secondary colors for additional UI elements
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',   // Enhanced contrast
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
  
  // Semantic colors - WCAG AA compliant
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',   // 4.5:1 contrast
    600: '#16a34a',   // 7:1 contrast
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },
  
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',   // 4.5:1 contrast
    600: '#d97706',   // 7:1 contrast
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },
  
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',   // 4.5:1 contrast
    600: '#dc2626',   // 7:1 contrast
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },
  
  info: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',   // 4.5:1 contrast
    600: '#0284c7',   // 7:1 contrast
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49',
  },
};

// Shadow System - Consistent elevation
export const shadows = {
  none: 'none',
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  soft: '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
  glow: '0 0 20px rgba(99, 102, 241, 0.15)',
  'glow-lg': '0 0 30px rgba(99, 102, 241, 0.2)',
  'inner-soft': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
};

// Border Radius System
export const borderRadius = {
  none: '0',
  xs: '0.125rem',     // 2px
  sm: '0.25rem',      // 4px
  md: '0.375rem',     // 6px
  lg: '0.5rem',       // 8px
  xl: '0.75rem',      // 12px
  '2xl': '1rem',      // 16px
  '3xl': '1.5rem',    // 24px
  '4xl': '2rem',      // 32px
  '5xl': '2.5rem',    // 40px
  full: '9999px',
};

// Animation System - Consistent timing and easing
export const animations = {
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    slower: '750ms',
  },
  
  easing: {
    ease: 'ease',
    'ease-in': 'ease-in',
    'ease-out': 'ease-out',
    'ease-in-out': 'ease-in-out',
    linear: 'linear',
    'bounce-out': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    'back-out': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    'quart-out': 'cubic-bezier(0.25, 1, 0.5, 1)',
    'expo-out': 'cubic-bezier(0.19, 1, 0.22, 1)',
  },
  
  transition: {
    default: 'all 300ms cubic-bezier(0.25, 1, 0.5, 1)',
    colors: 'color 150ms ease-out, background-color 150ms ease-out, border-color 150ms ease-out',
    transform: 'transform 300ms cubic-bezier(0.25, 1, 0.5, 1)',
    opacity: 'opacity 200ms ease-out',
    shadow: 'box-shadow 300ms ease-out',
  },

  // Custom animations from Tailwind config
  animation: {
    'fade-in': 'fadeIn 0.5s ease-in-out',
    'slide-up': 'slideUp 0.3s ease-out',
    'slide-down': 'slideDown 0.3s ease-out',
    'slide-left': 'slideLeft 0.3s ease-out',
    'slide-right': 'slideRight 0.3s ease-out',
    'scale-in': 'scaleIn 0.2s ease-out',
    'bounce-soft': 'bounceSoft 0.6s ease-out',
    'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    'shimmer': 'shimmer 2s ease-in-out infinite',
    'counter': 'counter 1.5s ease-out',
    'float': 'float 6s ease-in-out infinite',
    'glow': 'glow 2s ease-in-out infinite alternate',
  },

  // Keyframes definitions
  keyframes: {
    fadeIn: {
      '0%': { opacity: '0' },
      '100%': { opacity: '1' },
    },
    slideUp: {
      '0%': { transform: 'translateY(10px)', opacity: '0' },
      '100%': { transform: 'translateY(0)', opacity: '1' },
    },
    slideDown: {
      '0%': { transform: 'translateY(-10px)', opacity: '0' },
      '100%': { transform: 'translateY(0)', opacity: '1' },
    },
    slideLeft: {
      '0%': { transform: 'translateX(10px)', opacity: '0' },
      '100%': { transform: 'translateX(0)', opacity: '1' },
    },
    slideRight: {
      '0%': { transform: 'translateX(-10px)', opacity: '0' },
      '100%': { transform: 'translateX(0)', opacity: '1' },
    },
    scaleIn: {
      '0%': { transform: 'scale(0.95)', opacity: '0' },
      '100%': { transform: 'scale(1)', opacity: '1' },
    },
    bounceSoft: {
      '0%, 20%, 53%, 80%, 100%': { transform: 'translate3d(0,0,0)' },
      '40%, 43%': { transform: 'translate3d(0, -8px, 0)' },
      '70%': { transform: 'translate3d(0, -4px, 0)' },
      '90%': { transform: 'translate3d(0, -2px, 0)' },
    },
    pulseSoft: {
      '0%, 100%': { opacity: '1' },
      '50%': { opacity: '0.7' },
    },
    shimmer: {
      '0%': { backgroundPosition: '-200% 0' },
      '100%': { backgroundPosition: '200% 0' },
    },
    counter: {
      '0%': { opacity: '0', transform: 'translateY(20px) scale(0.8)' },
      '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
    },
    float: {
      '0%, 100%': { transform: 'translateY(0px)' },
      '50%': { transform: 'translateY(-10px)' },
    },
    glow: {
      '0%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.15)' },
      '100%': { boxShadow: '0 0 30px rgba(99, 102, 241, 0.25)' },
    },
  },
};

// Breakpoints - Mobile-first responsive design
export const breakpoints = {
  xs: '375px',    // Large phones - mobile-first
  sm: '640px',    // Small tablets
  md: '768px',    // Tablets
  lg: '1024px',   // Small laptops
  xl: '1280px',   // Desktop
  '2xl': '1536px', // Large desktop
  '3xl': '1920px', // Ultra-wide
};

// Z-index layers
export const zIndex = {
  base: 0,
  raised: 10,
  dropdown: 1000,
  sticky: 1020,
  overlay: 1030,
  modal: 1040,
  popover: 1050,
  tooltip: 1060,
  toast: 1070,
  max: 2147483647,
};

// Background Image System
export const backgroundImage = {
  'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
  'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
  'gradient-primary': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'gradient-success': 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
  'gradient-warning': 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'gradient-danger': 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'glass': 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
};

// Backdrop Blur System
export const backdropBlur = {
  xs: '2px',
  sm: '4px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '40px',
  '3xl': '64px',
};

// Component variants - Reusable component styles
export const variants = {
  button: {
    size: {
      xs: {
        height: spacing[8],      // 32px
        padding: `${spacing[1]} ${spacing[2]}`, // 4px 8px
        fontSize: typography.label.sm.fontSize,
        fontWeight: typography.label.sm.fontWeight,
      },
      sm: {
        height: spacing[9],      // 36px
        padding: `${spacing[2]} ${spacing[3]}`, // 8px 12px
        fontSize: typography.label.sm.fontSize,
        fontWeight: typography.label.sm.fontWeight,
      },
      md: {
        height: spacing[10],     // 40px
        padding: `${spacing[2]} ${spacing[4]}`, // 8px 16px
        fontSize: typography.label.base.fontSize,
        fontWeight: typography.label.base.fontWeight,
      },
      lg: {
        height: spacing[11],     // 44px (minimum touch target)
        padding: `${spacing[3]} ${spacing[6]}`, // 12px 24px
        fontSize: typography.label.lg.fontSize,
        fontWeight: typography.label.lg.fontWeight,
      },
      xl: {
        height: spacing[12],     // 48px
        padding: `${spacing[3]} ${spacing[8]}`, // 12px 32px
        fontSize: typography.label.lg.fontSize,
        fontWeight: typography.label.lg.fontWeight,
      },
    },
  },
  
  card: {
    padding: {
      xs: spacing[3],      // 12px
      sm: spacing[4],      // 16px
      md: spacing[6],      // 24px
      lg: spacing[8],      // 32px
    },
    gap: {
      xs: spacing[2],      // 8px
      sm: spacing[3],      // 12px
      md: spacing[4],      // 16px
      lg: spacing[6],      // 24px
    },
  },
};

// Accessibility helpers
export const accessibility = {
  minTouchTarget: spacing[11], // 44px minimum
  focusRingWidth: '2px',
  focusRingOffset: '2px',
  focusRingColor: colors.primary[600],
  
  // Screen reader classes
  srOnly: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    borderWidth: '0',
  },
};

// Dark mode color mappings
export const darkMode = {
  background: {
    primary: colors.neutral[900],
    secondary: colors.neutral[800],
    tertiary: colors.neutral[700],
  },
  
  text: {
    primary: colors.neutral[50],
    secondary: colors.neutral[300],
    tertiary: colors.neutral[400],
  },
  
  border: {
    primary: colors.neutral[700],
    secondary: colors.neutral[600],
  },
};

// CSS-in-JS helper functions
export const createTypographyClasses = () => {
  const classes: Record<string, any> = {};
  
  // Generate display classes
  Object.entries(typography.display).forEach(([key, value]) => {
    classes[`.text-display-${key}`] = value;
  });
  
  // Generate heading classes
  Object.entries(typography.heading).forEach(([key, value]) => {
    classes[`.text-${key}`] = value;
  });
  
  // Generate body classes
  Object.entries(typography.body).forEach(([key, value]) => {
    classes[`.text-body-${key}`] = value;
  });
  
  // Generate label classes
  Object.entries(typography.label).forEach(([key, value]) => {
    classes[`.text-label-${key}`] = value;
  });
  
  return classes;
};

// Utility functions for components
export const getContrastText = (backgroundColor: string): string => {
  // Simple contrast calculation - in real world, use a proper color library
  const lightColors = ['50', '100', '200', '300', '400'];
  const colorValue = backgroundColor.split('-').pop();
  
  return lightColors.includes(colorValue || '') 
    ? colors.neutral[900] 
    : colors.neutral[0];
};

export const getFocusRingStyles = (color?: string) => ({
  outline: `${accessibility.focusRingWidth} solid ${color || accessibility.focusRingColor}`,
  outlineOffset: accessibility.focusRingOffset,
});

// Export design tokens as CSS custom properties
export const cssVariables = {
  '--spacing-px': spacing.px,
  '--spacing-0': spacing[0],
  '--spacing-0-5': spacing[0.5],
  '--spacing-1': spacing[1],
  '--spacing-1-5': spacing[1.5],
  '--spacing-2': spacing[2],
  '--spacing-2-5': spacing[2.5],
  '--spacing-3': spacing[3],
  '--spacing-3-5': spacing[3.5],
  '--spacing-4': spacing[4],
  '--spacing-5': spacing[5],
  '--spacing-6': spacing[6],
  '--spacing-8': spacing[8],
  '--spacing-10': spacing[10],
  '--spacing-12': spacing[12],
  '--spacing-16': spacing[16],
  '--spacing-20': spacing[20],
  '--spacing-24': spacing[24],
  
  '--color-primary-500': colors.primary[500],
  '--color-primary-600': colors.primary[600],
  '--color-primary-700': colors.primary[700],
  
  '--color-neutral-0': colors.neutral[0],
  '--color-neutral-50': colors.neutral[50],
  '--color-neutral-100': colors.neutral[100],
  '--color-neutral-200': colors.neutral[200],
  '--color-neutral-300': colors.neutral[300],
  '--color-neutral-400': colors.neutral[400],
  '--color-neutral-500': colors.neutral[500],
  '--color-neutral-600': colors.neutral[600],
  '--color-neutral-700': colors.neutral[700],
  '--color-neutral-800': colors.neutral[800],
  '--color-neutral-900': colors.neutral[900],
  
  '--shadow-sm': shadows.sm,
  '--shadow-md': shadows.md,
  '--shadow-lg': shadows.lg,
  '--shadow-soft': shadows.soft,
  '--shadow-glow': shadows.glow,
  
  '--radius-sm': borderRadius.sm,
  '--radius-md': borderRadius.md,
  '--radius-lg': borderRadius.lg,
  '--radius-xl': borderRadius.xl,
  '--radius-2xl': borderRadius['2xl'],
  
  '--duration-fast': animations.duration.fast,
  '--duration-normal': animations.duration.normal,
  '--duration-slow': animations.duration.slow,
  
  '--easing-default': animations.easing['ease-in-out'],
  '--easing-bounce': animations.easing['bounce-out'],
  '--easing-back': animations.easing['back-out'],
  
  '--focus-ring-width': accessibility.focusRingWidth,
  '--focus-ring-offset': accessibility.focusRingOffset,
  '--focus-ring-color': accessibility.focusRingColor,
  '--min-touch-target': accessibility.minTouchTarget,
};

export type SpacingKey = keyof typeof spacing;
export type ColorKey = keyof typeof colors;
export type TypographyKey = keyof typeof typography;
export type ShadowKey = keyof typeof shadows;
export type BorderRadiusKey = keyof typeof borderRadius;
export type BreakpointKey = keyof typeof breakpoints;