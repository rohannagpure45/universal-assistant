/**
 * Voice Library Layout Component
 * 
 * Responsive layout wrapper for voice identification components with
 * mobile-first design, accessibility features, and adaptive UI patterns.
 * Provides consistent layout, navigation, and responsive behavior across
 * different screen sizes and devices.
 * 
 * Features:
 * - Mobile-first responsive design
 * - Accessible navigation and keyboard support
 * - Adaptive layouts for different screen sizes
 * - Touch-friendly interactions
 * - Screen reader compatibility
 * - High contrast and reduced motion support
 * - Consistent spacing and typography scales
 * 
 * @component
 * @example
 * ```tsx
 * <VoiceLibraryLayout>
 *   <VoiceLibraryDashboard />
 * </VoiceLibraryLayout>
 * ```
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { 
  Menu, 
  X, 
  Settings, 
  Accessibility,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
  Contrast,
  Maximize2,
  Minimize2
} from 'lucide-react';

/**
 * Layout configuration options
 */
interface VoiceLibraryLayoutProps {
  /** Child components to render */
  children: React.ReactNode;
  /** Whether to show navigation sidebar */
  showSidebar?: boolean;
  /** Whether to enable accessibility toolbar */
  showAccessibilityToolbar?: boolean;
  /** Custom CSS class name */
  className?: string;
  /** Page title for screen readers */
  pageTitle?: string;
  /** Additional navigation items */
  navigationItems?: NavigationItem[];
}

/**
 * Navigation item configuration
 */
interface NavigationItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}

/**
 * Accessibility settings
 */
interface AccessibilitySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  soundEnabled: boolean;
  keyboardNavigation: boolean;
  screenReaderMode: boolean;
}

/**
 * Responsive breakpoints
 */
const BREAKPOINTS = {
  mobile: 640,    // sm
  tablet: 768,    // md  
  laptop: 1024,   // lg
  desktop: 1280,  // xl
  wide: 1536      // 2xl
} as const;

export const VoiceLibraryLayout: React.FC<VoiceLibraryLayoutProps> = ({
  children,
  showSidebar = false,
  showAccessibilityToolbar = true,
  className = '',
  pageTitle = 'Voice Library',
  navigationItems = []
}) => {
  // Responsive state
  const [screenSize, setScreenSize] = useState<keyof typeof BREAKPOINTS>('desktop');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Accessibility state
  const [accessibilitySettings, setAccessibilitySettings] = useState<AccessibilitySettings>({
    highContrast: false,
    reducedMotion: false,
    largeText: false,
    soundEnabled: true,
    keyboardNavigation: true,
    screenReaderMode: false
  });

  // Theme state
  const [darkMode, setDarkMode] = useState(false);

  /**
   * Detect screen size and set responsive states
   */
  const handleResize = useCallback(() => {
    const width = window.innerWidth;
    
    let currentSize: keyof typeof BREAKPOINTS = 'mobile';
    if (width >= BREAKPOINTS.wide) currentSize = 'wide';
    else if (width >= BREAKPOINTS.desktop) currentSize = 'desktop';
    else if (width >= BREAKPOINTS.laptop) currentSize = 'laptop';
    else if (width >= BREAKPOINTS.tablet) currentSize = 'tablet';
    
    setScreenSize(currentSize);
    setIsMobile(width < BREAKPOINTS.tablet);
    
    // Auto-close sidebar on mobile when switching to larger screen
    if (width >= BREAKPOINTS.tablet && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [sidebarOpen]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!accessibilitySettings.keyboardNavigation) return;

    // ESC to close sidebar
    if (event.key === 'Escape' && sidebarOpen) {
      setSidebarOpen(false);
      return;
    }

    // Alt + M to toggle sidebar
    if (event.altKey && event.key === 'm') {
      event.preventDefault();
      setSidebarOpen(prev => !prev);
      return;
    }

    // Alt + A to toggle accessibility toolbar
    if (event.altKey && event.key === 'a') {
      event.preventDefault();
      // Focus accessibility toolbar
      const toolbar = document.getElementById('accessibility-toolbar');
      toolbar?.focus();
      return;
    }
  }, [sidebarOpen, accessibilitySettings.keyboardNavigation]);

  /**
   * Update accessibility setting
   */
  const updateAccessibilitySetting = useCallback(
    <K extends keyof AccessibilitySettings>(
      setting: K, 
      value: AccessibilitySettings[K]
    ) => {
      setAccessibilitySettings(prev => ({
        ...prev,
        [setting]: value
      }));

      // Apply setting to document
      switch (setting) {
        case 'highContrast':
          document.documentElement.classList.toggle('high-contrast', value as boolean);
          break;
        case 'reducedMotion':
          document.documentElement.classList.toggle('reduced-motion', value as boolean);
          break;
        case 'largeText':
          document.documentElement.classList.toggle('large-text', value as boolean);
          break;
        case 'screenReaderMode':
          document.documentElement.classList.toggle('screen-reader-mode', value as boolean);
          break;
      }
    }, 
    []
  );

  /**
   * Toggle dark mode
   */
  const toggleDarkMode = useCallback(() => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    document.documentElement.classList.toggle('dark', newDarkMode);
    localStorage.setItem('dark-mode', newDarkMode.toString());
  }, [darkMode]);

  // Initialize responsive behavior
  useEffect(() => {
    // Initial resize
    handleResize();
    
    // Add event listeners
    window.addEventListener('resize', handleResize);
    document.addEventListener('keydown', handleKeyDown);
    
    // Check for saved dark mode preference
    const savedDarkMode = localStorage.getItem('dark-mode') === 'true';
    if (savedDarkMode !== darkMode) {
      toggleDarkMode();
    }

    // Check for system preferences
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;

    if (prefersReducedMotion) {
      updateAccessibilitySetting('reducedMotion', true);
    }
    if (prefersHighContrast) {
      updateAccessibilitySetting('highContrast', true);
    }
    if (prefersDark && !localStorage.getItem('dark-mode')) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleResize, handleKeyDown, toggleDarkMode, updateAccessibilitySetting, darkMode]);

  // Generate responsive classes
  const containerClasses = [
    'min-h-screen bg-background transition-colors duration-200',
    accessibilitySettings.highContrast && 'high-contrast',
    accessibilitySettings.reducedMotion && 'reduced-motion',
    accessibilitySettings.largeText && 'large-text',
    accessibilitySettings.screenReaderMode && 'screen-reader-mode',
    className
  ].filter(Boolean).join(' ');

  const mainClasses = [
    'flex-1 transition-all duration-200 ease-in-out',
    showSidebar && !isMobile ? 'ml-64' : '',
    'p-4 sm:p-6 lg:p-8'
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {/* Skip to content link for screen readers */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium"
      >
        Skip to main content
      </a>

      {/* Page title for screen readers */}
      <h1 className="sr-only">{pageTitle}</h1>

      {/* Mobile header */}
      {isMobile && (
        <header className="bg-background border-b border-border p-4 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            {showSidebar && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={sidebarOpen}
                aria-controls="navigation-sidebar"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            )}
            <h2 className="font-semibold text-foreground">{pageTitle}</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDarkMode}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </header>
      )}

      {/* Sidebar */}
      {showSidebar && (
        <>
          {/* Sidebar overlay for mobile */}
          {isMobile && sidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-200"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* Sidebar content */}
          <aside
            id="navigation-sidebar"
            className={[
              'fixed top-0 left-0 h-full bg-background border-r border-border transition-transform duration-200 z-50',
              isMobile ? 'w-80' : 'w-64',
              sidebarOpen || !isMobile ? 'translate-x-0' : '-translate-x-full'
            ].join(' ')}
            role="navigation"
            aria-label="Main navigation"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-lg text-foreground">Voice Library</h3>
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close navigation"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                )}
              </div>

              {/* Navigation items */}
              {navigationItems.length > 0 && (
                <nav className="space-y-2">
                  {navigationItems.map(item => (
                    <button
                      key={item.id}
                      onClick={item.onClick}
                      disabled={item.disabled}
                      className={[
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                        item.active 
                          ? 'bg-primary text-primary-foreground' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                        item.disabled && 'opacity-50 cursor-not-allowed'
                      ].join(' ')}
                      aria-current={item.active ? 'page' : undefined}
                    >
                      {item.icon && <item.icon className="h-4 w-4 flex-shrink-0" />}
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </nav>
              )}
            </div>
          </aside>
        </>
      )}

      {/* Accessibility toolbar */}
      {showAccessibilityToolbar && (
        <div
          id="accessibility-toolbar"
          className="fixed top-4 right-4 z-50 bg-background border border-border rounded-lg shadow-lg p-3"
          role="toolbar"
          aria-label="Accessibility options"
          tabIndex={0}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDarkMode}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={darkMode}
              className="h-8 w-8 p-0"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateAccessibilitySetting('highContrast', !accessibilitySettings.highContrast)}
              aria-label="Toggle high contrast"
              aria-pressed={accessibilitySettings.highContrast}
              className="h-8 w-8 p-0"
            >
              <Contrast className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateAccessibilitySetting('largeText', !accessibilitySettings.largeText)}
              aria-label="Toggle large text"
              aria-pressed={accessibilitySettings.largeText}
              className="h-8 w-8 p-0"
            >
              {accessibilitySettings.largeText ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateAccessibilitySetting('soundEnabled', !accessibilitySettings.soundEnabled)}
              aria-label={accessibilitySettings.soundEnabled ? 'Disable sounds' : 'Enable sounds'}
              aria-pressed={accessibilitySettings.soundEnabled}
              className="h-8 w-8 p-0"
            >
              {accessibilitySettings.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateAccessibilitySetting('reducedMotion', !accessibilitySettings.reducedMotion)}
              aria-label="Toggle reduced motion"
              aria-pressed={accessibilitySettings.reducedMotion}
              className="h-8 w-8 p-0"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          {/* Screen reader announcement */}
          <div
            className="sr-only"
            aria-live="polite"
            aria-atomic="true"
            role="status"
          >
            {/* Announcements for accessibility changes would go here */}
          </div>
        </div>
      )}

      {/* Main content area */}
      <main
        id="main-content"
        className={mainClasses}
        role="main"
        aria-label="Voice library content"
        tabIndex={-1}
      >
        {children}
      </main>

      {/* Focus trap for modal dialogs */}
      <div
        className="sr-only"
        tabIndex={0}
        onFocus={() => {
          // Return focus to first focusable element when tabbing out of content
          const firstFocusable = document.querySelector<HTMLElement>('[tabindex="0"], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]');
          firstFocusable?.focus();
        }}
      />
    </div>
  );
};