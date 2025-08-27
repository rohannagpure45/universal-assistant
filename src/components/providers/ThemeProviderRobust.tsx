'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: 'light' | 'dark';
  isThemeLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

/**
 * Robust Theme Provider that handles theme switching without FOUC
 * Works entirely client-side to avoid hydration issues
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'system',
}) => {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

  // Calculate the effective theme based on system preference
  const getEffectiveTheme = useCallback((themeValue: Theme): 'light' | 'dark' => {
    if (themeValue === 'system') {
      if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'light';
    }
    return themeValue;
  }, []);

  // Apply theme to DOM
  const applyTheme = useCallback((themeValue: Theme) => {
    if (typeof window === 'undefined') return;
    
    const effectiveTheme = getEffectiveTheme(themeValue);
    const root = document.documentElement;
    
    // Update DOM classes
    root.classList.remove('light', 'dark');
    root.classList.add(effectiveTheme);
    
    // Update actual theme state
    setActualTheme(effectiveTheme);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', effectiveTheme === 'dark' ? '#1f2937' : '#ffffff');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = effectiveTheme === 'dark' ? '#1f2937' : '#ffffff';
      document.head.appendChild(meta);
    }
  }, [getEffectiveTheme]);

  // Initialize theme on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const initialTheme = savedTheme && ['light', 'dark', 'system'].includes(savedTheme) 
      ? savedTheme 
      : defaultTheme;
    
    // Apply theme immediately
    applyTheme(initialTheme);
    setThemeState(initialTheme);
    setIsThemeLoaded(true);
    
    // Mark document as theme-ready
    document.documentElement.classList.add('theme-loaded');
  }, [defaultTheme, applyTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined' || theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      applyTheme('system');
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    
    // Legacy browsers
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [theme, applyTheme]);

  // Theme setter with localStorage persistence
  const setTheme = useCallback((newTheme: Theme) => {
    if (typeof window === 'undefined') return;
    
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
    
    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('themeChange', {
      detail: { 
        theme: newTheme, 
        actualTheme: getEffectiveTheme(newTheme) 
      }
    }));
  }, [applyTheme, getEffectiveTheme]);

  const value: ThemeContextType = {
    theme,
    setTheme,
    actualTheme,
    isThemeLoaded,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Optional: Theme toggle component
export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, setTheme, actualTheme } = useTheme();

  const toggleTheme = () => {
    const themes: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg transition-colors ${className}`}
      aria-label={`Switch theme (current: ${theme})`}
    >
      {actualTheme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
};