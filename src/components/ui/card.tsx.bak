'use client';

import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { presets } from '@/lib/motion-variants';
import { spacing, colors, shadows, borderRadius } from '@/lib/design-system';

// Base card configuration following design system
const cardConfig = {
  base: [
    // Layout and structure
    'relative',
    'overflow-hidden',
    
    // Background with proper opacity for accessibility
    'bg-white/90',
    'dark:bg-neutral-800/90',
    'backdrop-blur-sm',
    
    // Borders with design system colors
    'border',
    'border-neutral-200/60',
    'dark:border-neutral-700/60',
    
    // Shadow system
    'shadow-soft',
    
    // Border radius
    'rounded-xl',
    
    // Transitions
    'transition-all',
    'duration-300',
    'ease-out',
  ],
  
  // Hover states for interactive cards
  interactive: [
    'hover:bg-white/95',
    'dark:hover:bg-neutral-800/95',
    'hover:border-neutral-300/60',
    'dark:hover:border-neutral-600/60',
    'hover:shadow-lg',
    'cursor-pointer',
  ],
  
  // Focus states for accessibility
  focusable: [
    'focus-visible:outline',
    'focus-visible:outline-2',
    'focus-visible:outline-primary-600',
    'focus-visible:outline-offset-2',
    'focus-visible:ring-2',
    'focus-visible:ring-primary-600/20',
  ],
} as const;

// Card size variants following 8px grid system
export const cardSizes = {
  xs: { padding: spacing[3] },      // 12px
  sm: { padding: spacing[4] },      // 16px  
  md: { padding: spacing[6] },      // 24px (default)
  lg: { padding: spacing[8] },      // 32px
  xl: { padding: spacing[10] },     // 40px
} as const;

// Card appearance variants
export const cardVariants = {
  default: {
    background: 'bg-white/90 dark:bg-neutral-800/90',
    border: 'border-neutral-200/60 dark:border-neutral-700/60',
    shadow: 'shadow-soft',
  },
  elevated: {
    background: 'bg-white dark:bg-neutral-800',
    border: 'border-neutral-200 dark:border-neutral-700',
    shadow: 'shadow-lg',
  },
  flat: {
    background: 'bg-neutral-50/80 dark:bg-neutral-900/80',
    border: 'border-neutral-200/40 dark:border-neutral-700/40',
    shadow: 'shadow-none',
  },
  outlined: {
    background: 'bg-transparent',
    border: 'border-2 border-neutral-300 dark:border-neutral-600',
    shadow: 'shadow-none',
  },
  glass: {
    background: 'bg-white/20 dark:bg-neutral-800/20',
    border: 'border-white/30 dark:border-neutral-700/30',
    shadow: 'shadow-soft',
    extra: 'backdrop-blur-xl',
  },
} as const;

// Props interface following Interface Segregation Principle
interface BaseCardProps {
  /** Card content */
  children: React.ReactNode;
  
  /** Size variant - affects padding */
  size?: keyof typeof cardSizes;
  
  /** Visual variant - affects appearance */
  variant?: keyof typeof cardVariants;
  
  /** Whether the card is interactive (clickable) */
  interactive?: boolean;
  
  /** Whether the card can be focused (for keyboard navigation) */
  focusable?: boolean;
  
  /** Custom CSS classes */
  className?: string;
  
  /** ARIA label for accessibility */
  'aria-label'?: string;
  
  /** ARIA described by for accessibility */
  'aria-describedby'?: string;
  
  /** Role for semantic meaning */
  role?: string;
}

interface MotionCardProps extends BaseCardProps, Omit<HTMLMotionProps<'div'>, 'children' | 'className' | 'role' | keyof BaseCardProps> {
  /** Whether this is a static card (discriminant) */
  static?: false | undefined;
  
  /** Motion variants - defaults to card preset */
  variants?: any;
  
  /** Initial animation state */
  initial?: any;
  
  /** Animate to state */
  animate?: any;
  
  /** Exit animation state */
  exit?: any;
  
  /** Animation transition override */
  transition?: any;
  
  /** Whether to animate on hover */
  whileHover?: any;
  
  /** Whether to animate on tap/click */
  whileTap?: any;
  
  /** Whether to animate while in view */
  whileInView?: any;
}

interface StaticCardProps extends BaseCardProps, Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'className' | 'role' | keyof BaseCardProps> {
  /** Static card discriminant - required literal type */
  static: true;
  
  // Exclude motion-specific properties to ensure type safety
  variants?: never;
  initial?: never;
  animate?: never;
  exit?: never;
  transition?: never;
  whileHover?: never;
  whileTap?: never;
  whileInView?: never;
}

export type CardProps = MotionCardProps | StaticCardProps;

// Type guards for discriminated union
const isStaticCard = (props: CardProps): props is StaticCardProps => {
  return 'static' in props && props.static === true;
};

const isMotionCard = (props: CardProps): props is MotionCardProps => {
  return !isStaticCard(props);
};

/**
 * Card Component following SOLID principles
 * 
 * Single Responsibility: Renders a styled card container
 * Open/Closed: Extensible through variants and props, closed for modification
 * Liskov Substitution: Can be used anywhere a div is expected
 * Interface Segregation: Clean props interface with optional features
 * Dependency Inversion: Depends on design system abstractions
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  (allProps, ref) => {
    const { 
      children,
      size = 'md',
      variant = 'default',
      interactive = false,
      focusable = false,
      className,
      ...props
    } = allProps;
    // Build class names using design system
    const sizeStyles = `p-${cardSizes[size].padding.replace('rem', '').replace('.', '-')}`;
    const variantConfig = cardVariants[variant];
    
    const classes = cn(
      cardConfig.base,
      sizeStyles,
      variantConfig.background,
      variantConfig.border,
      variantConfig.shadow,
      'extra' in variantConfig ? variantConfig.extra : '',
      interactive && cardConfig.interactive,
      focusable && cardConfig.focusable,
      className
    );

    // For motion cards, use motion.div
    if (isMotionCard(allProps)) {
      const {
        variants = presets.card,
        initial = 'initial',
        animate = 'animate',
        whileHover = interactive ? 'hover' : undefined,
        whileTap = interactive ? 'tap' : undefined,
        transition = { duration: 0.2 },
        ...motionProps
      } = props as MotionCardProps;

      return (
        <motion.div
          ref={ref}
          className={classes}
          variants={variants}
          initial={initial}
          animate={animate}
          whileHover={whileHover}
          whileTap={whileTap}
          transition={transition}
          {...motionProps}
        >
          {children}
        </motion.div>
      );
    }

    // For static cards, use regular div
    const { static: _, ...staticProps } = allProps as StaticCardProps;
    return (
      <div
        ref={ref}
        className={classes}
        {...staticProps}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Type for InteractiveCard - force it to be static to avoid motion/HTML event conflicts
type InteractiveCardProps = Omit<StaticCardProps, 'interactive' | 'focusable' | 'static'>;

// Specialized card components following Single Responsibility
export const InteractiveCard = forwardRef<HTMLDivElement, InteractiveCardProps>(
  (props, ref) => (
    <Card 
      ref={ref} 
      static
      interactive 
      focusable 
      role="button"
      tabIndex={0}
      {...props} 
    />
  )
);

InteractiveCard.displayName = 'InteractiveCard';

export const StaticCard = forwardRef<HTMLDivElement, Omit<StaticCardProps, 'static'>>(
  (props, ref) => (
    <Card 
      ref={ref} 
      static 
      {...props} 
    />
  )
);

StaticCard.displayName = 'StaticCard';

// Header, Body, Footer components for consistent card structure
export const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col space-y-1.5',
        'pb-4 mb-4',
        'border-b border-neutral-200/50 dark:border-neutral-700/50',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'text-h3',
        'text-neutral-900 dark:text-neutral-100',
        'leading-tight',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  )
);

CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => (
    <p
      ref={ref}
      className={cn(
        'text-body-sm',
        'text-contrast-accessible',
        className
      )}
      {...props}
    >
      {children}
    </p>
  )
);

CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex-1', className)}
      {...props}
    >
      {children}
    </div>
  )
);

CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-between',
        'pt-4 mt-4',
        'border-t border-neutral-200/50 dark:border-neutral-700/50',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

CardFooter.displayName = 'CardFooter';

// Utility function for creating custom card classes
export const createCardClasses = (
  size: keyof typeof cardSizes = 'md',
  variant: keyof typeof cardVariants = 'default',
  interactive: boolean = false,
  focusable: boolean = false,
  customClasses?: string
) => {
  const sizeStyles = `p-${cardSizes[size].padding.replace('rem', '').replace('.', '-')}`;
  const variantConfig = cardVariants[variant];
  
  return cn(
    cardConfig.base,
    sizeStyles,
    variantConfig.background,
    variantConfig.border,
    variantConfig.shadow,
    'extra' in variantConfig ? variantConfig.extra : '',
    interactive && cardConfig.interactive,
    focusable && cardConfig.focusable,
    customClasses
  );
};

// Export types for external use
export type { MotionCardProps, StaticCardProps, BaseCardProps };