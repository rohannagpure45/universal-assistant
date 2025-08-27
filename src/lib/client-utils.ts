/**
 * Client-side utility functions that prevent hydration mismatches
 */

/**
 * Safe way to check if code is running on client-side
 * Prevents hydration mismatches
 */
export const isClient = (): boolean => {
  return typeof window !== 'undefined';
};

/**
 * Safe way to check if code is running on server-side
 */
export const isServer = (): boolean => {
  return typeof window === 'undefined';
};

/**
 * Safe localStorage accessor that won't cause hydration mismatches
 */
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (!isClient()) return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  
  setItem: (key: string, value: string): boolean => {
    if (!isClient()) return false;
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  
  removeItem: (key: string): boolean => {
    if (!isClient()) return false;
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * Safe sessionStorage accessor
 */
export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    if (!isClient()) return null;
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  
  setItem: (key: string, value: string): boolean => {
    if (!isClient()) return false;
    try {
      sessionStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  
  removeItem: (key: string): boolean => {
    if (!isClient()) return false;
    try {
      sessionStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * Safe way to access navigator API
 */
export const safeNavigator = {
  isOnline: (): boolean => {
    if (!isClient() || !navigator) return true;
    return navigator.onLine;
  },
  
  getUserMedia: async (constraints: MediaStreamConstraints): Promise<MediaStream | null> => {
    if (!isClient() || !navigator.mediaDevices) return null;
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch {
      return null;
    }
  },
  
  enumerateDevices: async (): Promise<MediaDeviceInfo[]> => {
    if (!isClient() || !navigator.mediaDevices) return [];
    try {
      return await navigator.mediaDevices.enumerateDevices();
    } catch {
      return [];
    }
  },
};

/**
 * Safe way to check media query matches
 * Prevents hydration mismatches with theme detection
 */
export const safeMatchMedia = (query: string): boolean => {
  if (!isClient() || !window.matchMedia) return false;
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
};

/**
 * Debounced function that only runs on client-side
 */
export const debounceClient = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T => {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return ((...args: Parameters<T>) => {
    if (!isClient()) return;
    
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
};