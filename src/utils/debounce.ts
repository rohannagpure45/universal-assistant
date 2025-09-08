/**
 * Minimal debounce utility to replace lodash-es dependency
 * 
 * Surgical fix for bundle size optimization - native implementation
 * to avoid heavy lodash-es dependency.
 */

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 * 
 * @param func The function to debounce
 * @param wait The number of milliseconds to delay
 * @param options Optional configuration for leading/trailing calls
 * @returns The debounced function with cancel method
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options?: { leading?: boolean; trailing?: boolean }
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;
  let lastCallTime: number | null = null;
  
  const leading = options?.leading ?? false;
  const trailing = options?.trailing ?? true;
  
  const invokeFunc = () => {
    if (lastArgs && lastThis) {
      func.apply(lastThis, lastArgs);
      lastArgs = null;
      lastThis = null;
    }
  };
  
  const debounced = function(this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const isFirstCall = !lastCallTime;
    
    lastArgs = args;
    lastThis = this;
    lastCallTime = now;
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    if (isFirstCall && leading) {
      invokeFunc();
    }
    
    timeoutId = setTimeout(() => {
      if (trailing && lastArgs) {
        invokeFunc();
      }
      timeoutId = null;
      lastCallTime = null;
    }, wait);
  };
  
  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastArgs = null;
    lastThis = null;
    lastCallTime = null;
  };
  
  return debounced;
}