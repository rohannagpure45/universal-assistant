/**
 * PropUtils - Utility for filtering DOM-safe props following SOLID principles
 * 
 * Single Responsibility: Only handles prop filtering and sanitization
 * Open/Closed: Extensible for new custom props without modification
 * Interface Segregation: Focused interfaces for specific prop types
 */

// Define custom prop keys that should be filtered out from DOM elements
const CUSTOM_PROP_KEYS = [
  // Button-specific props
  'fullWidth',
  'leftIcon', 
  'rightIcon',
  'loading',
  'variant',
  'size',
  // Motion-specific props  
  'animate',
  'initial',
  'exit',
  'variants',
  'transition',
  'whileHover',
  'whileTap',
  'whileInView',
  // Component-specific props
  'asChild',
  'as',
] as const;

export type CustomPropKey = (typeof CUSTOM_PROP_KEYS)[number];

const CUSTOM_PROP_KEYS_SET = new Set<string>(CUSTOM_PROP_KEYS);

/**
 * Interface Segregation Principle - Separate concerns for different prop types
 */
export interface DOMProps {
  [key: string]: any;
}

export interface CustomProps {
  [key: string]: any;
}

export interface PropFilterResult<T = Record<string, any>> {
  domProps: DOMProps;
  customProps: CustomProps;
  filteredProps: T;
}

/**
 * Single Responsibility: Filter custom props from DOM props
 * @param props - All component props
 * @returns Object containing separated DOM and custom props
 */
export function filterDOMProps<T extends Record<string, any>>(
  props: T
): PropFilterResult<T> {
  const domProps: DOMProps = {};
  const customProps: CustomProps = {};
  const filteredProps = { ...props } as T;

  Object.keys(props).forEach((key) => {
    if (CUSTOM_PROP_KEYS_SET.has(key)) {
      customProps[key] = props[key];
      delete filteredProps[key as keyof T];
    } else {
      domProps[key] = props[key];
    }
  });

  return {
    domProps,
    customProps,
    filteredProps,
  };
}

/**
 * Open/Closed Principle: Extensible prop sanitization
 * Sanitizes boolean props that React expects as strings
 */
export function sanitizeBooleanProps<T extends Record<string, any>>(
  props: T
): T {
  const sanitized = { ...props };
  
  Object.keys(sanitized).forEach((key) => {
    const value = sanitized[key];
    
    // Convert boolean false to undefined for DOM attributes
    if (typeof value === 'boolean' && !value) {
      delete sanitized[key as keyof T];
    }
    // Convert boolean true to empty string for DOM attributes like "disabled"
    else if (typeof value === 'boolean' && value) {
      // For specific attributes that expect boolean strings
      const booleanStringAttrs = ['disabled', 'readonly', 'required', 'autofocus'];
      if (booleanStringAttrs.includes(key.toLowerCase())) {
        (sanitized as any)[key] = '';
      }
    }
  });

  return sanitized;
}

/**
 * Dependency Inversion: High-level prop processing that depends on abstractions
 * Combines filtering and sanitization for complete prop processing
 */
export function processComponentProps<T extends Record<string, any>>(
  props: T
): PropFilterResult<T> {
  const { domProps, customProps, filteredProps } = filterDOMProps(props);
  const sanitizedDOMProps = sanitizeBooleanProps(domProps);
  
  return {
    domProps: sanitizedDOMProps,
    customProps,
    filteredProps: sanitizeBooleanProps(filteredProps),
  };
}

/**
 * Utility for filtering prop keys to only allowed ones
 */
export function filterAllowedProps<P extends Record<string, any>>(
  props: P,
  allowedDOMProps: string[]
): Record<string, any> {
  return Object.keys(props).reduce((acc, key) => {
    if (allowedDOMProps.includes(key) || !CUSTOM_PROP_KEYS_SET.has(key)) {
      acc[key] = props[key as keyof P];
    }
    return acc;
  }, {} as Record<string, any>);
}