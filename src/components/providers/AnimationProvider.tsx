'use client';

import React, { createContext, useContext } from 'react';
import { motion, AnimatePresence, MotionConfig, Variants, Transition } from 'framer-motion';

interface AnimationProviderProps {
  children: React.ReactNode;
}

const AnimationContext = createContext({});

export const useAnimation = () => useContext(AnimationContext);

// Page transition variants
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  in: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  out: {
    opacity: 0,
    y: -20,
    scale: 1.02,
  },
};

export const pageTransition: Transition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.4,
};

// Stagger animations for lists
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
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
  },
};

// Button interaction variants
export const buttonVariants: Variants = {
  rest: {
    scale: 1,
  },
  hover: {
    scale: 1.02,
  },
  tap: {
    scale: 0.98,
  },
};

// Card hover effects
export const cardVariants: Variants = {
  rest: {
    scale: 1,
    y: 0,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  },
  hover: {
    scale: 1.02,
    y: -4,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
};

// Loading spinner variants
export const spinnerVariants = {
  start: {
    rotate: 0,
  },
  end: {
    rotate: 360,
    transition: {
      duration: 1,
      ease: 'linear',
      repeat: Infinity,
    },
  },
};

// Slide-in animations for modals/drawers
export const slideVariants = {
  hidden: {
    x: '100%',
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: {
      type: 'tween',
      ease: 'easeInOut',
      duration: 0.3,
    },
  },
};

// Fade variants
export const fadeVariants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

// Scale variants for modals
export const scaleVariants = {
  hidden: {
    scale: 0.8,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
  exit: {
    scale: 0.8,
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: 'easeInOut',
    },
  },
};

export const AnimationProvider: React.FC<AnimationProviderProps> = ({ children }) => {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{
        type: 'tween',
        ease: 'easeInOut',
        duration: 0.2,
      }}
    >
      <AnimationContext.Provider value={{}}>
        {children}
      </AnimationContext.Provider>
    </MotionConfig>
  );
};

// Animated page wrapper component
export const AnimatedPage: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Animated container for staggered children
export const StaggerContainer: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Animated item for staggered animations
export const StaggerItem: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
};

export default AnimationProvider;