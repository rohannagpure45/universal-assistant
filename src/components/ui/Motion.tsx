'use client';

import React from 'react';
import { motion, type HTMLMotionProps, type Variants } from 'framer-motion';

// Animation variants for common patterns
export const fadeInUpVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

export const fadeInVariants: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};

export const slideInFromRightVariants: Variants = {
  initial: {
    opacity: 0,
    x: 50,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    x: 50,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

export const scaleInVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

export const staggerChildrenVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

export const cardHoverVariants: Variants = {
  initial: { 
    scale: 1,
    y: 0,
    boxShadow: '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
  },
  hover: {
    scale: 1.02,
    y: -4,
    boxShadow: '0 10px 30px -3px rgba(0, 0, 0, 0.15), 0 20px 40px -2px rgba(0, 0, 0, 0.08)',
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: 0.1,
      ease: 'easeInOut',
    },
  },
};

export const buttonVariants: Variants = {
  initial: { 
    scale: 1,
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  },
  hover: {
    scale: 1.05,
    boxShadow: '0 4px 12px 0 rgba(0, 0, 0, 0.15), 0 2px 4px 0 rgba(0, 0, 0, 0.08)',
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
  tap: {
    scale: 0.95,
    transition: {
      duration: 0.1,
      ease: 'easeInOut',
    },
  },
};

export const pulseVariants: Variants = {
  initial: { scale: 1, opacity: 1 },
  animate: {
    scale: [1, 1.1, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const countUpVariants: Variants = {
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
      duration: 0.8,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

// Reusable Motion Components
interface MotionCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  hover?: boolean;
  className?: string;
}

export const MotionCard: React.FC<MotionCardProps> = ({ 
  children, 
  hover = true, 
  className = '', 
  ...props 
}) => (
  <motion.div
    variants={hover ? cardHoverVariants : fadeInUpVariants}
    initial="initial"
    animate="animate"
    whileHover={hover ? "hover" : undefined}
    whileTap={hover ? "tap" : undefined}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

interface MotionButtonProps extends HTMLMotionProps<'button'> {
  children: React.ReactNode;
  className?: string;
}

export const MotionButton: React.FC<MotionButtonProps> = ({ 
  children, 
  className = '', 
  ...props 
}) => (
  <motion.button
    variants={buttonVariants}
    initial="initial"
    whileHover="hover"
    whileTap="tap"
    className={className}
    {...props}
  >
    {children}
  </motion.button>
);

interface MotionListProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  stagger?: boolean;
}

export const MotionList: React.FC<MotionListProps> = ({ 
  children, 
  className = '', 
  stagger = true,
  ...props 
}) => (
  <motion.div
    variants={stagger ? staggerChildrenVariants : fadeInVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

interface MotionCounterProps {
  value: number;
  duration?: number;
  className?: string;
  formatter?: (value: number) => string;
}

export const MotionCounter: React.FC<MotionCounterProps> = ({
  value,
  duration = 1.5,
  className = '',
  formatter = (v) => v.toString(),
}) => {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    let start = 0;
    const end = value;
    const incrementTime = (duration * 1000) / Math.abs(end - start);
    
    if (start === end) return;

    const timer = setInterval(() => {
      start += Math.ceil((end - start) * 0.1);
      setDisplayValue(start);
      
      if (start >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return (
    <motion.span
      variants={countUpVariants}
      initial="initial"
      animate="animate"
      className={className}
    >
      {formatter(displayValue)}
    </motion.span>
  );
};

// Loading spinner with smooth animations
export const MotionSpinner: React.FC<{ className?: string; size?: 'sm' | 'md' | 'lg' }> = ({ 
  className = '', 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <motion.div
      className={`${sizeClasses[size]} ${className}`}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      <div className="w-full h-full border-2 border-primary-200 border-t-primary-500 rounded-full" />
    </motion.div>
  );
};

// Page transition wrapper
interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    }}
    className={className}
  >
    {children}
  </motion.div>
);

export default {
  MotionCard,
  MotionButton,
  MotionList,
  MotionCounter,
  MotionSpinner,
  PageTransition,
  fadeInUpVariants,
  fadeInVariants,
  slideInFromRightVariants,
  scaleInVariants,
  staggerChildrenVariants,
  cardHoverVariants,
  buttonVariants,
  pulseVariants,
  countUpVariants,
};