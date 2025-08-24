/**
 * usePerformanceOptimization - React Performance Optimization Hook
 * 
 * Provides comprehensive React rendering optimizations including memoization,
 * debouncing, virtualization, and intelligent re-render prevention.
 */

import * as React from 'react';
import { 
  useCallback, 
  useMemo, 
  useRef, 
  useEffect, 
  useState,
  DependencyList,
  EffectCallback
} from 'react';
import { debounce } from 'lodash-es';

// Debounced state hook
export function useDebouncedState<T>(
  initialValue: T, 
  delay: number = 300
): [T, T, (value: T) => void] {
  const [immediateValue, setImmediateValue] = useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);
  
  const debouncedSetValue = useMemo(
    () => debounce((value: T) => setDebouncedValue(value), delay),
    [delay]
  );
  
  useEffect(() => {
    debouncedSetValue(immediateValue);
    return () => debouncedSetValue.cancel();
  }, [immediateValue, debouncedSetValue]);
  
  const setValue = useCallback((value: T) => {
    setImmediateValue(value);
  }, []);
  
  return [immediateValue, debouncedValue, setValue];
}

// Optimized callback with stable reference
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: DependencyList
): T {
  const callbackRef = useRef<T>(callback);
  const depsRef = useRef(deps);
  
  // Only update if dependencies actually changed
  if (!depsRef.current || deps.some((dep, index) => dep !== depsRef.current[index])) {
    callbackRef.current = callback;
    depsRef.current = deps;
  }
  
  return useCallback((...args: Parameters<T>) => {
    return callbackRef.current(...args);
  }, []) as T;
}

// Memoized value with deep comparison
export function useDeepMemo<T>(
  factory: () => T,
  deps: DependencyList
): T {
  const prevDepsRef = useRef<DependencyList>();
  const memoizedValueRef = useRef<T>();
  
  const depsChanged = !prevDepsRef.current || 
    deps.length !== prevDepsRef.current.length ||
    deps.some((dep, index) => {
      const prevDep = prevDepsRef.current![index];
      return !deepEqual(dep, prevDep);
    });
  
  if (depsChanged || !memoizedValueRef.current) {
    memoizedValueRef.current = factory();
    prevDepsRef.current = deps;
  }
  
  return memoizedValueRef.current!;
}

// Throttled effect hook
export function useThrottledEffect(
  effect: EffectCallback,
  deps: DependencyList,
  delay: number = 100
): void {
  const throttledEffect = useMemo(
    () => debounce(effect, delay, { leading: true, trailing: false }),
    [delay]
  );
  
  useEffect(() => {
    throttledEffect();
    return () => throttledEffect.cancel();
  }, deps);
}

// Virtual scrolling hook for large lists
export function useVirtualScrolling<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5
}: {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return {
      startIndex,
      endIndex,
      items: items.slice(startIndex, endIndex + 1),
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight
    };
  }, [items, itemHeight, containerHeight, scrollTop, overscan]);
  
  const onScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);
  
  return {
    visibleItems,
    onScroll,
    scrollTop
  };
}

// Performance monitoring hook
export function usePerformanceMonitoring(componentName: string) {
  const renderCountRef = useRef(0);
  const lastRenderTime = useRef(Date.now());
  const [performanceData, setPerformanceData] = useState({
    renderCount: 0,
    averageRenderTime: 0,
    slowRenders: 0
  });
  
  useEffect(() => {
    const renderTime = Date.now() - lastRenderTime.current;
    renderCountRef.current += 1;
    
    setPerformanceData(prev => {
      const newAverageRenderTime = (prev.averageRenderTime * (renderCountRef.current - 1) + renderTime) / renderCountRef.current;
      const slowRenders = renderTime > 16 ? prev.slowRenders + 1 : prev.slowRenders;
      
      return {
        renderCount: renderCountRef.current,
        averageRenderTime: newAverageRenderTime,
        slowRenders
      };
    });
    
    // Warn about slow renders in development
    if (process.env.NODE_ENV === 'development' && renderTime > 16) {
      console.warn(`Slow render in ${componentName}: ${renderTime}ms`);
    }
    
    lastRenderTime.current = Date.now();
  });
  
  return performanceData;
}

// Intersection observer hook for lazy loading
export function useIntersectionObserver(
  targetRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  
  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;
    
    const observer = new IntersectionObserver(([entry]) => {
      const isIntersecting = entry.isIntersecting;
      setIsIntersecting(isIntersecting);
      
      if (isIntersecting && !hasBeenVisible) {
        setHasBeenVisible(true);
      }
    }, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options
    });
    
    observer.observe(target);
    
    return () => observer.disconnect();
  }, [hasBeenVisible, options]);
  
  return { isIntersecting, hasBeenVisible };
}

// Optimized async data fetching
export function useOptimizedAsyncData<T>(
  asyncFn: () => Promise<T>,
  deps: DependencyList,
  options: {
    cacheTime?: number;
    staleTime?: number;
    retryCount?: number;
    retryDelay?: number;
  } = {}
) {
  const {
    cacheTime = 300000, // 5 minutes
    staleTime = 60000,  // 1 minute
    retryCount = 3,
    retryDelay = 1000
  } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const cacheRef = useRef<{
    data: T;
    timestamp: number;
    cacheKey: string;
  } | null>(null);
  
  const cacheKey = useMemo(() => JSON.stringify(deps), deps);
  
  const fetchData = useCallback(async () => {
    // Check if we have fresh cached data
    if (cacheRef.current && 
        cacheRef.current.cacheKey === cacheKey &&
        Date.now() - cacheRef.current.timestamp < staleTime) {
      setData(cacheRef.current.data);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    let attempt = 0;
    while (attempt < retryCount) {
      try {
        const result = await asyncFn();
        setData(result);
        
        // Cache the result
        cacheRef.current = {
          data: result,
          timestamp: Date.now(),
          cacheKey
        };
        
        setLoading(false);
        return;
      } catch (err) {
        attempt++;
        if (attempt >= retryCount) {
          setError(err as Error);
          setLoading(false);
        } else {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }
  }, [asyncFn, cacheKey, staleTime, retryCount, retryDelay]);
  
  useEffect(() => {
    fetchData();
  }, deps);
  
  const refetch = useCallback(() => {
    cacheRef.current = null; // Clear cache
    fetchData();
  }, [fetchData]);
  
  return { data, loading, error, refetch };
}

// Batch updates hook
export function useBatchedUpdates<T>(
  initialState: T,
  batchDelay: number = 16
): [T, (updates: Partial<T>) => void] {
  const [state, setState] = useState<T>(initialState);
  const pendingUpdatesRef = useRef<Partial<T>>({});
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const batchUpdate = useCallback((updates: Partial<T>) => {
    // Accumulate updates
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Schedule batched update
    timeoutRef.current = setTimeout(() => {
      setState(prevState => ({ ...prevState, ...pendingUpdatesRef.current }));
      pendingUpdatesRef.current = {};
    }, batchDelay);
  }, [batchDelay]);
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return [state, batchUpdate];
}

// Web Worker hook for heavy computations
export function useWebWorker<T, R>(
  workerScript: string,
  dependencies: DependencyList = []
) {
  const workerRef = useRef<Worker>();
  const [result, setResult] = useState<R | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    if (typeof Worker !== 'undefined') {
      try {
        workerRef.current = new Worker(workerScript);
        
        workerRef.current.onmessage = (event) => {
          if (event.data.error) {
            setError(new Error(event.data.error));
          } else {
            setResult(event.data.result);
          }
          setLoading(false);
        };
        
        workerRef.current.onerror = (error) => {
          setError(new Error(error.message));
          setLoading(false);
        };
      } catch (err) {
        setError(err as Error);
      }
    }
    
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, dependencies);
  
  const execute = useCallback((data: T) => {
    if (workerRef.current) {
      setLoading(true);
      setError(null);
      workerRef.current.postMessage(data);
    }
  }, []);
  
  return { result, loading, error, execute };
}

// Utility functions
function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  
  if (obj1 == null || obj2 == null) return obj1 === obj2;
  
  if (typeof obj1 !== typeof obj2) return false;
  
  if (typeof obj1 !== 'object') return obj1 === obj2;
  
  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }
  
  return true;
}

// Export performance optimization utilities
export const PerformanceUtils = {
  // Component performance decorator
  withPerformanceMonitoring: function<P extends object>(
    Component: React.ComponentType<P>,
    componentName: string
  ) {
    return React.memo((props: P) => {
      const performance = usePerformanceMonitoring(componentName);
      
      useEffect(() => {
        if (performance.slowRenders > 5) {
          console.warn(`Component ${componentName} has ${performance.slowRenders} slow renders`);
        }
      }, [performance.slowRenders]);
      
      return React.createElement(Component, props);
    });
  },
  
  // Render optimization checker
  checkRenderOptimization: (componentName: string, renderCount: number) => {
    if (process.env.NODE_ENV === 'development' && renderCount > 10) {
      console.warn(`${componentName} rendered ${renderCount} times - consider optimization`);
    }
  }
};

export default {
  useDebouncedState,
  useStableCallback,
  useDeepMemo,
  useThrottledEffect,
  useVirtualScrolling,
  usePerformanceMonitoring,
  useIntersectionObserver,
  useOptimizedAsyncData,
  useBatchedUpdates,
  useWebWorker,
  PerformanceUtils
};