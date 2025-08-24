'use client';

import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { presets } from '@/lib/motion-variants';
import { spacing, colors, typography, accessibility } from '@/lib/design-system';
import { processComponentProps } from '@/utils/propUtils';

// Button configuration following design system
const buttonConfig = {
  base: [
    // Layout and structure
    'inline-flex',
    'items-center',
    'justify-center',
    'relative',
    'overflow-hidden',
    
    // Typography
    'font-medium',
    'text-center',
    'whitespace-nowrap',
    
    // Interactions
    'transition-all',
    'duration-200',
    'ease-out',
    'cursor-pointer',
    'select-none',
    
    // Accessibility - minimum touch target
    'min-h-11', // 44px minimum touch target
    'min-w-11',
    
    // Focus states
    'focus-visible:outline',
    'focus-visible:outline-2',
    'focus-visible:outline-primary-600',
    'focus-visible:outline-offset-2',
    'focus-visible:ring-2',
    'focus-visible:ring-primary-600/20',
    
    // Disabled state - improved contrast for accessibility
    'disabled:opacity-70', // Increased from 60 to 70 for better contrast
    'disabled:cursor-not-allowed',
    'disabled:pointer-events-auto', // Allow focus for screen readers
    'disabled:bg-neutral-200', // Explicit disabled background
    'disabled:border-neutral-300', // Explicit disabled border
    'disabled:text-neutral-500', // Explicit disabled text color
    'dark:disabled:bg-neutral-700', // Dark mode disabled background
    'dark:disabled:border-neutral-600', // Dark mode disabled border
    'dark:disabled:text-neutral-400', // Dark mode disabled text
    // Enhanced focus for disabled buttons
    'disabled:focus-visible:ring-2',
    'disabled:focus-visible:ring-neutral-400',
    'disabled:focus-visible:ring-offset-2',
    'dark:disabled:focus-visible:ring-neutral-500'
  ],
  
  // Border radius
  rounded: [
    'rounded-lg',
  ],
} as const;

// Button size variants following 8px grid system
export const buttonSizes = {
  xs: {
    height: 'h-8',        // 32px
    padding: 'px-2 py-1', // 8px 4px
    text: 'text-label-sm',
    iconSize: 'w-3 h-3',  // 12px
    gap: 'gap-1',         // 4px
  },
  sm: {
    height: 'h-9',        // 36px
    padding: 'px-3 py-2', // 12px 8px
    text: 'text-label-sm',
    iconSize: 'w-4 h-4',  // 16px
    gap: 'gap-1.5',       // 6px
  },
  md: {
    height: 'h-10',       // 40px (default)
    padding: 'px-4 py-2', // 16px 8px
    text: 'text-label-base',
    iconSize: 'w-4 h-4',  // 16px
    gap: 'gap-2',         // 8px
  },
  lg: {
    height: 'h-11',       // 44px (minimum touch target)
    padding: 'px-6 py-3', // 24px 12px
    text: 'text-label-lg',
    iconSize: 'w-5 h-5',  // 20px
    gap: 'gap-2',         // 8px
  },
  xl: {
    height: 'h-12',       // 48px
    padding: 'px-8 py-3', // 32px 12px
    text: 'text-label-lg',
    iconSize: 'w-5 h-5',  // 20px
    gap: 'gap-2.5',       // 10px
  },
} as const;

// Button variants with WCAG AA compliant colors
export const buttonVariants = {
  primary: {
    base: [
      'bg-primary-600',        // 7:1 contrast
      'text-white',
      'border-primary-600',
      'shadow-soft',
    ],
    hover: [
      'hover:bg-primary-700',
      'hover:border-primary-700',
      'hover:shadow-lg',
      'hover:-translate-y-0.5',
    ],
    active: [
      'active:bg-primary-800',
      'active:border-primary-800',
      'active:translate-y-0',
    ],
    focus: [
      'focus-visible:ring-primary-600/30',
    ],
  },
  secondary: {
    base: [
      'bg-white',
      'text-neutral-700',     // 10.4:1 contrast
      'border-2',
      'border-neutral-300',
      'shadow-soft',
    ],
    hover: [
      'hover:bg-neutral-50',
      'hover:border-neutral-400',
      'hover:text-neutral-800',
      'hover:shadow-md',
      'hover:-translate-y-0.5',
    ],
    active: [
      'active:bg-neutral-100',
      'active:border-neutral-500',
      'active:translate-y-0',
    ],
    focus: [
      'focus-visible:ring-neutral-600/20',
    ],
  },
  outline: {
    base: [
      'bg-transparent',
      'text-primary-600',     // 7:1 contrast
      'border-2',
      'border-primary-600',
    ],
    hover: [
      'hover:bg-primary-50',
      'hover:text-primary-700',
      'hover:border-primary-700',
      'hover:-translate-y-0.5',
    ],
    active: [
      'active:bg-primary-100',
      'active:translate-y-0',
    ],
    focus: [
      'focus-visible:ring-primary-600/30',
    ],
  },
  ghost: {
    base: [
      'bg-transparent',
      'text-neutral-700',     // 10.4:1 contrast
      'border-transparent',
    ],
    hover: [
      'hover:bg-neutral-100',
      'hover:text-neutral-800',
      'hover:-translate-y-0.5',
    ],
    active: [
      'active:bg-neutral-200',
      'active:translate-y-0',
    ],
    focus: [
      'focus-visible:ring-neutral-600/20',
    ],
  },
  success: {
    base: [
      'bg-success-600',       // 7:1 contrast
      'text-white',
      'border-success-600',
      'shadow-soft',
    ],
    hover: [
      'hover:bg-success-700',
      'hover:border-success-700',
      'hover:shadow-lg',
      'hover:-translate-y-0.5',
    ],
    active: [
      'active:bg-success-800',
      'active:translate-y-0',
    ],
    focus: [
      'focus-visible:ring-success-600/30',
    ],
  },
  warning: {
    base: [
      'bg-warning-600',       // 7:1 contrast
      'text-white',
      'border-warning-600',
      'shadow-soft',
    ],
    hover: [
      'hover:bg-warning-700',
      'hover:border-warning-700',
      'hover:shadow-lg',
      'hover:-translate-y-0.5',
    ],
    active: [
      'active:bg-warning-800',
      'active:translate-y-0',
    ],
    focus: [
      'focus-visible:ring-warning-600/30',
    ],
  },
  danger: {
    base: [
      'bg-danger-600',        // 7:1 contrast
      'text-white',
      'border-danger-600',
      'shadow-soft',
    ],
    hover: [
      'hover:bg-danger-700',
      'hover:border-danger-700',
      'hover:shadow-lg',
      'hover:-translate-y-0.5',
    ],
    active: [
      'active:bg-danger-800',
      'active:translate-y-0',
    ],
    focus: [
      'focus-visible:ring-danger-600/30',
    ],
  },
} as const;

// Dark mode variants
const darkModeOverrides = {
  secondary: {
    base: [
      'dark:bg-neutral-800',
      'dark:text-neutral-200',
      'dark:border-neutral-600',
    ],
    hover: [
      'dark:hover:bg-neutral-700',
      'dark:hover:border-neutral-500',
      'dark:hover:text-neutral-100',
    ],
    active: [
      'dark:active:bg-neutral-600',
    ],
  },
  ghost: {
    base: [
      'dark:text-neutral-200',
    ],
    hover: [
      'dark:hover:bg-neutral-800',
      'dark:hover:text-neutral-100',
    ],
    active: [
      'dark:active:bg-neutral-700',
    ],
  },
} as const;

// Props interface following Interface Segregation Principle
interface BaseButtonProps {
  /** Button content */
  children: React.ReactNode;
  
  /** Size variant */
  size?: keyof typeof buttonSizes;
  
  /** Visual variant */
  variant?: keyof typeof buttonVariants;
  
  /** Whether button is disabled */
  disabled?: boolean;
  
  /** Loading state - shows spinner and disables interaction */
  loading?: boolean;
  
  /** Icon to display before text */
  leftIcon?: React.ReactNode;
  
  /** Icon to display after text */
  rightIcon?: React.ReactNode;
  
  /** Whether button should take full width */
  fullWidth?: boolean;
  
  /** Custom CSS classes */
  className?: string;
  
  /** ARIA label for accessibility */
  'aria-label'?: string;
  
  /** ARIA described by for accessibility */
  'aria-describedby'?: string;
  
  /** Button type for forms */
  type?: 'button' | 'submit' | 'reset';
  
  /** Optional tooltip text for accessibility */
  title?: string;
  
  /** Custom tab index for focus management */
  tabIndex?: number;
}

interface MotionButtonProps extends BaseButtonProps, Omit<HTMLMotionProps<'button'>, 'children' | 'className' | 'disabled'> {
  /** Motion variants - defaults to button preset */
  variants?: any;
  
  /** Whether to animate on hover */
  whileHover?: any;
  
  /** Whether to animate on tap/click */
  whileTap?: any;
  
  /** Discriminant property - explicitly false for motion buttons */
  static?: false | undefined;
}

interface StaticButtonProps extends BaseButtonProps, Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className' | 'disabled'> {
  /** Discriminant property - must be true for static buttons */
  static: true;
  
  /** Explicitly exclude motion-specific properties using never */
  variants?: never;
  whileHover?: never;
  whileTap?: never;
  viewport?: never;
  initial?: never;
  animate?: never;
  exit?: never;
  transition?: never;
  drag?: never;
  dragConstraints?: never;
  dragElastic?: never;
  dragMomentum?: never;
  onAnimationComplete?: never;
  onAnimationStart?: never;
  onDrag?: never;
  onDragEnd?: never;
  onDragStart?: never;
  onHoverEnd?: never;
  onHoverStart?: never;
  onPan?: never;
  onPanEnd?: never;
  onPanStart?: never;
  onTap?: never;
  onTapCancel?: never;
  onTapStart?: never;
  onUpdate?: never;
  style?: React.CSSProperties; // Override to ensure it's not MotionStyle
}

export type ButtonProps = MotionButtonProps | StaticButtonProps;

// Type guards using precise literal type checking (TypeScript best practice)
const isStaticButtonProps = (props: ButtonProps): props is StaticButtonProps => {
  return props.static === true;
};

const isMotionButtonProps = (props: ButtonProps): props is MotionButtonProps => {
  return props.static !== true;
};

/**
 * Button Component following SOLID principles
 * 
 * Single Responsibility: Renders a styled, accessible button
 * Open/Closed: Extensible through variants and props, closed for modification
 * Liskov Substitution: Can be used anywhere a button is expected
 * Interface Segregation: Clean props interface with optional features
 * Dependency Inversion: Depends on design system abstractions
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => {
    // Extract common props
    const {
      children,
      size = 'md',
      variant = 'primary',
      disabled = false,
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      type = 'button',
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      title,
      tabIndex,
    } = props;

    // Build class names using design system
    const sizeConfig = buttonSizes[size] || buttonSizes.md;
    const variantConfig = buttonVariants[variant] || buttonVariants.primary;
    const darkOverrides = darkModeOverrides[variant as keyof typeof darkModeOverrides];
    
    const isDisabled = disabled || loading;
    
    const classes = cn(
      // Base styles
      buttonConfig.base,
      buttonConfig.rounded,
      
      // Size styles
      sizeConfig.height,
      sizeConfig.padding,
      sizeConfig.text,
      sizeConfig.gap,
      
      // Variant styles
      variantConfig?.base,
      !isDisabled && variantConfig?.hover,
      !isDisabled && variantConfig?.active,
      variantConfig?.focus,
      
      // Dark mode overrides
      darkOverrides?.base,
      !isDisabled && darkOverrides?.hover,
      !isDisabled && darkOverrides?.active,
      
      // Full width
      fullWidth && 'w-full',
      
      // Custom classes
      className
    );

    // Button content with loading state
    const buttonContent = (
      <>
        {/* Left icon or loading spinner */}
        {loading ? (
          <Loader2 className={cn(sizeConfig.iconSize, 'animate-spin')} aria-hidden="true" />
        ) : (
          leftIcon && (
            <span className={sizeConfig.iconSize} aria-hidden="true">
              {leftIcon}
            </span>
          )
        )}
        
        {/* Button text */}
        <span className={loading ? 'opacity-70' : undefined}>
          {children}
        </span>
        
        {/* Right icon (hidden during loading) */}
        {!loading && rightIcon && (
          <span className={sizeConfig.iconSize} aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </>
    );

    // Common accessibility props with enhanced ARIA support
    const accessibilityProps = {
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      'aria-disabled': isDisabled,
      'aria-busy': loading,
      'aria-live': loading ? 'polite' as const : undefined,
      disabled: isDisabled,
      type,
      title: title || (loading ? `Loading ${children}...` : undefined),
      tabIndex: isDisabled ? -1 : tabIndex,
    };

    // Use type discrimination with proper type guards (TypeScript best practice)
    if (isStaticButtonProps(props)) {
      // TypeScript now knows this is StaticButtonProps - no motion properties available
      const { 
        static: _, 
        children: _children,
        size: _size,
        variant: _variant,
        disabled: _disabled,
        loading: _loading,
        leftIcon: _leftIcon,
        rightIcon: _rightIcon,
        fullWidth: _fullWidth,
        className: _className,
        'aria-label': _ariaLabel,
        'aria-describedby': _ariaDescribedBy,
        title: _title,
        tabIndex: _tabIndex,
        ...cleanStaticProps 
      } = props;
      
      // Process props to filter out custom props for DOM safety
      const { filteredProps: domSafeProps } = processComponentProps(cleanStaticProps);
      
      return (
        <button
          ref={ref}
          className={classes}
          {...accessibilityProps}
          {...domSafeProps}
        >
          {buttonContent}
        </button>
      );
    }

    // TypeScript now knows this is MotionButtonProps - all motion properties available
    const { 
      variants = presets.button, 
      whileHover, 
      whileTap, 
      static: _,
      children: _children,
      size: _size,
      variant: _variant,
      disabled: _disabled,
      loading: _loading,
      leftIcon: _leftIcon,
      rightIcon: _rightIcon,
      fullWidth: _fullWidth,
      className: _className,
      'aria-label': _ariaLabel,
      'aria-describedby': _ariaDescribedBy,
      title: _title,
      tabIndex: _tabIndex,
      ...restMotionProps 
    } = props;

    // Process props to filter out custom props for DOM safety
    const { filteredProps: domSafeMotionProps } = processComponentProps(restMotionProps);

    return (
      <motion.button
        ref={ref}
        className={classes}
        variants={variants}
        whileHover={whileHover ?? (!isDisabled ? 'hover' : undefined)}
        whileTap={whileTap ?? (!isDisabled ? 'tap' : undefined)}
        {...accessibilityProps}
        {...domSafeMotionProps}
      >
        {buttonContent}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

// Define specialized button prop types that preserve discriminated union
type SpecializedMotionButtonProps = Omit<MotionButtonProps, 'variant'>;
type SpecializedStaticButtonProps = Omit<StaticButtonProps, 'variant'>;
type SpecializedButtonProps = SpecializedMotionButtonProps | SpecializedStaticButtonProps;

// Specialized button components following Single Responsibility
export const PrimaryButton = forwardRef<HTMLButtonElement, SpecializedButtonProps>(
  (props, ref) => <Button ref={ref} variant="primary" {...props} />
);

PrimaryButton.displayName = 'PrimaryButton';

export const SecondaryButton = forwardRef<HTMLButtonElement, SpecializedButtonProps>(
  (props, ref) => <Button ref={ref} variant="secondary" {...props} />
);

SecondaryButton.displayName = 'SecondaryButton';

export const OutlineButton = forwardRef<HTMLButtonElement, SpecializedButtonProps>(
  (props, ref) => <Button ref={ref} variant="outline" {...props} />
);

OutlineButton.displayName = 'OutlineButton';

export const GhostButton = forwardRef<HTMLButtonElement, SpecializedButtonProps>(
  (props, ref) => <Button ref={ref} variant="ghost" {...props} />
);

GhostButton.displayName = 'GhostButton';

export const SuccessButton = forwardRef<HTMLButtonElement, SpecializedButtonProps>(
  (props, ref) => <Button ref={ref} variant="success" {...props} />
);

SuccessButton.displayName = 'SuccessButton';

export const WarningButton = forwardRef<HTMLButtonElement, SpecializedButtonProps>(
  (props, ref) => <Button ref={ref} variant="warning" {...props} />
);

WarningButton.displayName = 'WarningButton';

export const DangerButton = forwardRef<HTMLButtonElement, SpecializedButtonProps>(
  (props, ref) => <Button ref={ref} variant="danger" {...props} />
);

DangerButton.displayName = 'DangerButton';

// Icon-only button variant with proper discriminated union handling
type IconMotionButtonProps = Omit<MotionButtonProps, 'children' | 'leftIcon' | 'rightIcon'>;
type IconStaticButtonProps = Omit<StaticButtonProps, 'children' | 'leftIcon' | 'rightIcon'>;
type IconButtonProps = (IconMotionButtonProps | IconStaticButtonProps) & {
  icon: React.ReactNode;
  'aria-label': string; // Required for icon-only buttons
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, className, size = 'md', ...props }, ref) => {
    const sizeConfig = buttonSizes[size];
    
    return (
      <Button
        ref={ref}
        size={size}
        className={cn(
          // Square shape for icon-only
          'aspect-square',
          sizeConfig.height,
          'px-0', // Remove horizontal padding
          className
        )}
        {...props}
      >
        <span className={sizeConfig.iconSize} aria-hidden="true">
          {icon}
        </span>
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';

// Loading button - button that's always in loading state
type LoadingMotionButtonProps = Omit<MotionButtonProps, 'loading'>;
type LoadingStaticButtonProps = Omit<StaticButtonProps, 'loading'>;
type LoadingButtonProps = LoadingMotionButtonProps | LoadingStaticButtonProps;

export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  (props, ref) => <Button ref={ref} loading {...props} />
);

LoadingButton.displayName = 'LoadingButton';

// Utility function for creating custom button classes
export const createButtonClasses = (
  size: keyof typeof buttonSizes = 'md',
  variant: keyof typeof buttonVariants = 'primary',
  options: {
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    customClasses?: string;
  } = {}
) => {
  const { disabled = false, loading = false, fullWidth = false, customClasses } = options;
  const isDisabled = disabled || loading;
  
  const sizeConfig = buttonSizes[size] || buttonSizes.md;
  const variantConfig = buttonVariants[variant] || buttonVariants.primary;
  const darkOverrides = darkModeOverrides[variant as keyof typeof darkModeOverrides];
  
  return cn(
    buttonConfig.base,
    buttonConfig.rounded,
    sizeConfig.height,
    sizeConfig.padding,
    sizeConfig.text,
    sizeConfig.gap,
    variantConfig?.base,
    !isDisabled && variantConfig?.hover,
    !isDisabled && variantConfig?.active,
    variantConfig?.focus,
    darkOverrides?.base,
    !isDisabled && darkOverrides?.hover,
    !isDisabled && darkOverrides?.active,
    fullWidth && 'w-full',
    customClasses
  );
};

// Export types for external use
export type { MotionButtonProps, StaticButtonProps, BaseButtonProps };