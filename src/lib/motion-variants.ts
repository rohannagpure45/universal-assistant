/**
 * Standardized Framer Motion Variants
 * Consistent animation patterns following design system principles
 */

import { Variants } from 'framer-motion';

// Base easing curves - consistent with design system
export const easings = {
  easeOut: [0.25, 1, 0.5, 1],
  easeIn: [0.4, 0, 1, 1],
  easeInOut: [0.4, 0, 0.2, 1],
  bounceOut: [0.34, 1.56, 0.64, 1],
  backOut: [0.175, 0.885, 0.32, 1.275],
  expo: [0.19, 1, 0.22, 1],
} as const;

// Duration constants - consistent timing
export const durations = {
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
  slower: 0.75,
} as const;

// Fade animations - opacity transitions
export const fadeVariants: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: durations.normal,
      ease: easings.easeOut,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: durations.fast,
      ease: easings.easeIn,
    },
  },
};

// Slide animations - directional movement
export const slideVariants = {
  up: {
    initial: {
      opacity: 0,
      y: 20,
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: durations.normal,
        ease: easings.easeOut,
      },
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: {
        duration: durations.fast,
        ease: easings.easeIn,
      },
    },
  },
  down: {
    initial: {
      opacity: 0,
      y: -20,
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: durations.normal,
        ease: easings.easeOut,
      },
    },
    exit: {
      opacity: 0,
      y: 10,
      transition: {
        duration: durations.fast,
        ease: easings.easeIn,
      },
    },
  },
  left: {
    initial: {
      opacity: 0,
      x: 20,
    },
    animate: {
      opacity: 1,
      x: 0,
      transition: {
        duration: durations.normal,
        ease: easings.easeOut,
      },
    },
    exit: {
      opacity: 0,
      x: -10,
      transition: {
        duration: durations.fast,
        ease: easings.easeIn,
      },
    },
  },
  right: {
    initial: {
      opacity: 0,
      x: -20,
    },
    animate: {
      opacity: 1,
      x: 0,
      transition: {
        duration: durations.normal,
        ease: easings.easeOut,
      },
    },
    exit: {
      opacity: 0,
      x: 10,
      transition: {
        duration: durations.fast,
        ease: easings.easeIn,
      },
    },
  },
} as const;

// Scale animations - size transitions
export const scaleVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: durations.normal,
      ease: easings.easeOut,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: durations.fast,
      ease: easings.easeIn,
    },
  },
};

// Bounce animation - playful entrance
export const bounceVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.3,
    rotate: -10,
  },
  animate: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      duration: durations.slow,
      ease: easings.bounceOut,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: {
      duration: durations.fast,
      ease: easings.easeIn,
    },
  },
};

// Stagger animations - sequential reveals
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

export const staggerItem: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.normal,
      ease: easings.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: durations.fast,
      ease: easings.easeIn,
    },
  },
};

// Button interaction variants
export const buttonVariants: Variants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.02,
    y: -1,
    transition: {
      duration: durations.fast,
      ease: easings.easeOut,
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: 0.1,
      ease: easings.easeOut,
    },
  },
  disabled: {
    scale: 1,
    opacity: 0.6,
    transition: {
      duration: durations.fast,
    },
  },
};

// Card interaction variants
export const cardVariants: Variants = {
  initial: { 
    scale: 1,
    y: 0,
  },
  hover: {
    scale: 1.01,
    y: -2,
    transition: {
      duration: durations.fast,
      ease: easings.easeOut,
    },
  },
  tap: {
    scale: 0.99,
    transition: {
      duration: 0.1,
    },
  },
};

// Loading states
export const loadingVariants: Variants = {
  initial: {
    opacity: 0.6,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 1,
      repeat: Infinity,
      repeatType: 'reverse',
      ease: 'easeInOut',
    },
  },
};

// Pulse animation - for live indicators
export const pulseVariants: Variants = {
  initial: { scale: 1, opacity: 1 },
  animate: {
    scale: [1, 1.1, 1],
    opacity: [1, 0.7, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Page transition variants
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: durations.normal,
      ease: easings.easeOut,
    },
  },
  exit: {
    opacity: 0,
    scale: 1.02,
    transition: {
      duration: durations.fast,
      ease: easings.easeIn,
    },
  },
};

// Modal/Dialog variants
export const modalVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: durations.normal,
      ease: easings.easeOut,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: {
      duration: durations.fast,
      ease: easings.easeIn,
    },
  },
};

// Backdrop variants for modals/overlays
export const backdropVariants: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: durations.fast,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: durations.fast,
      ease: 'easeIn',
    },
  },
};

// Counter animation variants
export const counterVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.8,
    y: 20,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: durations.slow,
      ease: easings.backOut,
    },
  },
};

// Toast notification variants
export const toastVariants: Variants = {
  initial: {
    opacity: 0,
    x: 300,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: durations.normal,
      ease: easings.easeOut,
    },
  },
  exit: {
    opacity: 0,
    x: 300,
    scale: 0.95,
    transition: {
      duration: durations.fast,
      ease: easings.easeIn,
    },
  },
};

// Drawer/Sidebar variants
export const drawerVariants: Variants = {
  initial: {
    x: '-100%',
  },
  animate: {
    x: 0,
    transition: {
      duration: durations.normal,
      ease: easings.easeOut,
    },
  },
  exit: {
    x: '-100%',
    transition: {
      duration: durations.fast,
      ease: easings.easeIn,
    },
  },
};

// Accordion/Collapsible variants
export const collapseVariants: Variants = {
  initial: {
    height: 0,
    opacity: 0,
  },
  animate: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: {
        duration: durations.normal,
        ease: easings.easeOut,
      },
      opacity: {
        duration: durations.fast,
        delay: 0.1,
      },
    },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: {
      height: {
        duration: durations.fast,
        ease: easings.easeIn,
      },
      opacity: {
        duration: durations.fast,
      },
    },
  },
};

// Utility functions for creating custom variants
export const createStaggerVariants = (staggerDelay: number = 0.1): Variants => ({
  initial: {},
  animate: {
    transition: {
      staggerChildren: staggerDelay,
      delayChildren: staggerDelay,
    },
  },
  exit: {
    transition: {
      staggerChildren: staggerDelay / 2,
      staggerDirection: -1,
    },
  },
});

export const createSlideVariants = (direction: 'up' | 'down' | 'left' | 'right', distance: number = 20) => {
  const axis = direction === 'up' || direction === 'down' ? 'y' : 'x';
  const initialValue = direction === 'up' || direction === 'left' ? distance : -distance;
  const exitValue = direction === 'up' || direction === 'left' ? -distance/2 : distance/2;

  return {
    initial: {
      opacity: 0,
      [axis]: initialValue,
    },
    animate: {
      opacity: 1,
      [axis]: 0,
      transition: {
        duration: durations.normal,
        ease: easings.easeOut,
      },
    },
    exit: {
      opacity: 0,
      [axis]: exitValue,
      transition: {
        duration: durations.fast,
        ease: easings.easeIn,
      },
    },
  };
};

export const createScaleVariants = (initialScale: number = 0.95, exitScale?: number) => ({
  initial: {
    opacity: 0,
    scale: initialScale,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: durations.normal,
      ease: easings.easeOut,
    },
  },
  exit: {
    opacity: 0,
    scale: exitScale ?? initialScale,
    transition: {
      duration: durations.fast,
      ease: easings.easeIn,
    },
  },
});

// Presets for common use cases
export const presets = {
  // Quick fade in/out
  fade: fadeVariants,
  
  // Standard slide up (most common)
  slideUp: slideVariants.up,
  
  // Gentle scale
  scale: scaleVariants,
  
  // List animations
  list: staggerContainer,
  listItem: staggerItem,
  
  // Interactive elements
  button: buttonVariants,
  card: cardVariants,
  
  // Page transitions
  page: pageVariants,
  
  // Modals and overlays
  modal: modalVariants,
  backdrop: backdropVariants,
  
  // Special animations
  bounce: bounceVariants,
  pulse: pulseVariants,
  loading: loadingVariants,
  counter: counterVariants,
  
  // Layout animations
  toast: toastVariants,
  drawer: drawerVariants,
  collapse: collapseVariants,
} as const;

// Type exports for better TypeScript support
export type PresetKey = keyof typeof presets;
export type SlideDirection = 'up' | 'down' | 'left' | 'right';

// Default export for common usage
export default presets;