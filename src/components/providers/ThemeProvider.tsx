'use client';

import React, { createContext, useContext, useEffect, useState, useLayoutEffect } from 'react';

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

// Theme script to prevent FOUC - this should be inlined in the document head
export const THEME_SCRIPT = `
  (function() {
    function getThemePreference() {
      const stored = localStorage.getItem('theme');
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        return stored;
      }
      return 'system';
    }
    
    function getEffectiveTheme(theme) {
      if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return theme;
    }
    
    function applyTheme(theme) {
      const effectiveTheme = getEffectiveTheme(theme);
      const root = document.documentElement;
      
      // Add transition class for smooth theme switching (but not on initial load)
      if (root.classList.contains('theme-loaded')) {
        root.style.setProperty('--theme-transition', 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)');
        root.style.transition = 'background-color 0.3s ease, color 0.3s ease';
      }
      
      root.classList.remove('light', 'dark');
      root.classList.add(effectiveTheme);
      
      // Update meta theme-color for mobile browsers
      const colors = {
        light: '#ffffff',
        dark: '#1f2937'
      };
      
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.setAttribute('name', 'theme-color');
        document.head.appendChild(metaThemeColor);
      }
      metaThemeColor.setAttribute('content', colors[effectiveTheme]);
      
      // Mark theme as loaded to enable transitions on subsequent changes
      if (!root.classList.contains('theme-loaded')) {
        root.classList.add('theme-loaded');
      }
    }
    
    // Apply initial theme immediately
    const theme = getThemePreference();
    applyTheme(theme);
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
      const currentTheme = getThemePreference();
      if (currentTheme === 'system') {
        applyTheme(currentTheme);
      }
    });
  })();
`;

/**
 * Enhanced Theme provider that manages dark/light mode with:
 * - FOUC prevention
 * - Smooth theme transitions
 * - System preference support
 * - Proper hydration handling
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'system',
}) => {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

  // Use useLayoutEffect to sync with DOM before first paint
  useLayoutEffect(() => {
    // Load theme from localStorage with fallback
    const savedTheme = localStorage.getItem('theme') as Theme;
    const initialTheme = savedTheme && ['light', 'dark', 'system'].includes(savedTheme) 
      ? savedTheme 
      : defaultTheme;
    
    setTheme(initialTheme);
    
    // Calculate initial actual theme
    const getEffectiveTheme = (themeValue: Theme): 'light' | 'dark' => {
      if (themeValue === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return themeValue;
    };
    
    setActualTheme(getEffectiveTheme(initialTheme));
    setIsThemeLoaded(true);
  }, [defaultTheme]);

  useEffect(() => {
    if (!isThemeLoaded) return;

    const root = window.document.documentElement;
    
    const updateTheme = () => {
      let effectiveTheme: 'light' | 'dark';
      
      if (theme === 'system') {
        effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      } else {
        effectiveTheme = theme;
      }
      
      setActualTheme(effectiveTheme);
      
      // Enable smooth transitions for theme changes (after initial load)
      root.style.setProperty('--theme-transition', 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)');
      root.style.transition = 'background-color 0.3s ease, color 0.3s ease';
      
      // Update DOM classes
      root.classList.remove('light', 'dark');
      root.classList.add(effectiveTheme);
      
      // Update meta theme-color for mobile browsers with enhanced colors
      const themeColors = {
        light: {
          primary: '#ffffff',
          statusBar: '#f8fafc', // Light gray for status bar
        },
        dark: {
          primary: '#1f2937',
          statusBar: '#111827', // Darker for status bar
        }
      };
      
      const colors = themeColors[effectiveTheme];
      
      // Main theme color
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.setAttribute('name', 'theme-color');
        document.head.appendChild(metaThemeColor);
      }
      metaThemeColor.setAttribute('content', colors.primary);
      
      // iOS status bar styling
      let statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      if (!statusBarMeta) {
        statusBarMeta = document.createElement('meta');
        statusBarMeta.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
        document.head.appendChild(statusBarMeta);
      }
      statusBarMeta.setAttribute('content', effectiveTheme === 'dark' ? 'black-translucent' : 'default');
      
      // Windows tile color
      let msTileColor = document.querySelector('meta[name="msapplication-TileColor"]');
      if (!msTileColor) {
        msTileColor = document.createElement('meta');
        msTileColor.setAttribute('name', 'msapplication-TileColor');
        document.head.appendChild(msTileColor);
      }
      msTileColor.setAttribute('content', colors.primary);
      
      // Remove transition after theme change is complete
      setTimeout(() => {
        root.style.removeProperty('transition');
      }, 300);
    };

    updateTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        updateTheme();
        
        // Dispatch custom event for other components to listen to theme changes
        window.dispatchEvent(new CustomEvent('themeChange', {
          detail: { 
            theme: 'system', 
            actualTheme: e.matches ? 'dark' : 'light' 
          }
        }));
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, isThemeLoaded]);

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Calculate new actual theme for the custom event
    const newActualTheme = newTheme === 'system' 
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : newTheme;
    
    // Dispatch custom event for theme change
    window.dispatchEvent(new CustomEvent('themeChange', {
      detail: { theme: newTheme, actualTheme: newActualTheme }
    }));
  };

  const value: ThemeContextType = {
    theme,
    setTheme: handleSetTheme,
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