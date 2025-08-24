'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X, Bell, Settings, LogOut, User, Home, Mic, Users, Volume2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/stores/appStore';
import { useMeetingStore } from '@/stores/meetingStore';
import { LoadingSpinner, SkeletonNavigation } from '@/components/ui';
import { isAdminUser } from '@/utils/adminUtils';

interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
}

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
  badge?: number;
  adminOnly?: boolean;
}

interface NavigationState {
  isNavigating: boolean;
  targetPath: string | null;
}

interface UserMenuProps {
  user: any;
  onSignOut: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ user, onSignOut }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Handle keyboard navigation for dropdown
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      buttonRef.current?.focus();
    } else if (event.key === 'ArrowDown' && isOpen) {
      const firstMenuItem = menuRef.current?.querySelector('button');
      firstMenuItem?.focus();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="group flex items-center space-x-3 p-2 rounded-xl hover:bg-gradient-to-r hover:from-neutral-100 hover:to-blue-50 dark:hover:from-neutral-700 dark:hover:to-blue-900/20 transition-all duration-200 button-press focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label={`User menu for ${user?.displayName || user?.email || 'User'}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <div className="relative w-9 h-9 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-soft group-hover:scale-105 transition-transform duration-200">
          <User className="w-4 h-4 text-white" />
          <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </div>
        <span className="hidden lg:block text-sm font-semibold text-neutral-800 dark:text-neutral-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
          {user?.displayName || user?.email?.split('@')[0] || 'User'}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div 
            ref={menuRef}
            className="absolute right-0 mt-3 w-52 glass-morphism dark:glass-morphism-dark rounded-xl shadow-glow border border-white/30 dark:border-neutral-700/30 z-20 backdrop-blur-xl animate-in slide-in-from-top-2 fade-in duration-200"
            role="menu"
            aria-labelledby="user-menu-button"
          >
            <div className="p-4 border-b border-white/20 dark:border-neutral-700/30">
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                {user?.displayName || 'User'}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {user?.email}
              </p>
            </div>
            <div className="py-2" role="none">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to settings
                }}
                className="group w-full px-4 py-3 text-left text-sm text-neutral-800 dark:text-neutral-300 hover:bg-white/30 dark:hover:bg-neutral-800/30 flex items-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                role="menuitem"
                tabIndex={0}
              >
                <Settings className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform duration-200" aria-hidden="true" />
                <span className="font-medium">Settings</span>
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onSignOut();
                }}
                className="group w-full px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/20 flex items-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                role="menuitem"
                tabIndex={0}
              >
                <LogOut className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform duration-200" aria-hidden="true" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const Header: React.FC<{
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}> = ({ onToggleSidebar, isSidebarOpen }) => {
  const { user, signOut } = useAuth();
  const { notifications } = useAppStore();
  const { isInMeeting, currentMeeting } = useMeetingStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    await signOut();
  };

  // Handle keyboard navigation for notifications dropdown
  const handleNotificationKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setShowNotifications(false);
      notificationButtonRef.current?.focus();
    }
  }, []);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(event.target as Node) &&
          notificationButtonRef.current && !notificationButtonRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showNotifications]);

  return (
    <header 
      className="glass-morphism dark:glass-morphism-dark border-b border-white/20 dark:border-neutral-700/30 px-6 py-4 backdrop-blur-xl"
      role="banner"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <button
            onClick={onToggleSidebar}
            className="p-2.5 rounded-xl hover:bg-white/30 dark:hover:bg-neutral-800/30 transition-all duration-200 lg:hidden button-press focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label={isSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isSidebarOpen}
          >
            <div className={`transform transition-transform duration-200 ${isSidebarOpen ? 'rotate-180' : 'rotate-0'}`}>
              {isSidebarOpen ? (
                <X className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
              ) : (
                <Menu className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
              )}
            </div>
          </button>
          
          <div className="flex items-center space-x-4">
            <h1 className="text-lg sm:text-xl lg:text-fluid-xl font-bold text-neutral-900 dark:text-white hidden sm:block">
              Universal Assistant
            </h1>
            {isInMeeting && currentMeeting && (
              <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 text-red-700 dark:text-red-400 rounded-full shadow-soft border border-red-200/50 dark:border-red-800/50">
                <Mic className="w-4 h-4 pulse-soft" />
                <span className="text-sm font-semibold">Live Meeting</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative">
            <button
              ref={notificationButtonRef}
              onClick={() => setShowNotifications(!showNotifications)}
              onKeyDown={handleNotificationKeyDown}
              className="group p-2.5 rounded-xl hover:bg-white/30 dark:hover:bg-neutral-800/30 transition-all duration-200 relative button-press focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label={`Notifications ${notifications.length > 0 ? `(${notifications.length} unread)` : ''}`}
              aria-expanded={showNotifications}
              aria-haspopup="menu"
            >
              <Bell className="w-5 h-5 text-neutral-600 dark:text-neutral-400 group-hover:scale-110 transition-transform duration-200" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-semibold rounded-full flex items-center justify-center shadow-glow pulse-soft">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowNotifications(false)}
                  aria-hidden="true"
                />
                <div 
                  ref={notificationMenuRef}
                  className="absolute right-0 mt-3 w-80 glass-morphism dark:glass-morphism-dark rounded-xl shadow-glow border border-white/30 dark:border-neutral-700/30 z-20 max-h-96 overflow-y-auto backdrop-blur-xl animate-in slide-in-from-top-2 fade-in duration-200"
                  role="menu"
                  aria-labelledby="notifications-button"
                >
                  <div className="p-4 border-b border-white/20 dark:border-neutral-700/30">
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                      Notifications
                    </h3>
                  </div>
                  <div className="py-1">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-neutral-500 dark:text-neutral-400 text-sm">
                        No notifications
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="group p-4 hover:bg-white/30 dark:hover:bg-neutral-800/30 border-b border-white/10 dark:border-neutral-700/30 last:border-b-0 transition-all duration-200"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1 mr-3">
                              <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                                {notification.title}
                              </p>
                              <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1 leading-relaxed">
                                {notification.message}
                              </p>
                              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2">
                                {new Date(notification.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                            <button
                              onClick={() => console.log('Clear notification:', notification.id)}
                              className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-200/50 dark:hover:bg-neutral-600/50 rounded-lg transition-all duration-200 button-press opacity-0 group-hover:opacity-100"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Menu */}
          {user && <UserMenu user={user} onSignOut={handleSignOut} />}
        </div>
      </div>
    </header>
  );
};

const Sidebar: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { isInMeeting } = useMeetingStore();
  const [navigationState, setNavigationState] = useState<NavigationState>({
    isNavigating: false,
    targetPath: null,
  });
  const [isLoading, setIsLoading] = useState(false);

  const isAdmin = isAdminUser(user);

  const allNavigationItems: NavigationItem[] = [
    {
      label: 'Meeting',
      href: '/meeting',
      icon: Mic,
      active: pathname === '/meeting',
    },
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      active: pathname === '/dashboard',
    },
    {
      label: 'Voice Library',
      href: '/voice-identification',
      icon: Volume2,
      active: pathname.startsWith('/voice-identification') && !pathname.startsWith('/admin'),
      adminOnly: true,
    },
    {
      label: 'Speaker Directory',
      href: '/admin/voice-identification/directory',
      icon: Users,
      active: pathname === '/admin/voice-identification/directory',
      adminOnly: true,
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: Settings,
      active: pathname === '/settings',
    },
  ];

  // Filter navigation items based on admin status
  const navigationItems = allNavigationItems.filter(item => !item.adminOnly || isAdmin);

  const handleNavigation = async (href: string) => {
    // Don't navigate if already on the target page
    if (pathname === href) {
      if (window.innerWidth < 1024) {
        onClose();
      }
      return;
    }

    setNavigationState({
      isNavigating: true,
      targetPath: href,
    });
    setIsLoading(true);

    try {
      // Add a small delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 150));
      router.push(href);
      
      if (window.innerWidth < 1024) {
        onClose();
      }
    } finally {
      // Reset navigation state after a delay to allow page to load
      setTimeout(() => {
        setNavigationState({
          isNavigating: false,
          targetPath: null,
        });
        setIsLoading(false);
      }, 500);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-30 h-full w-80 sm:w-72 md:w-64 glass-morphism dark:glass-morphism-dark border-r border-white/30 dark:border-neutral-700/30 backdrop-blur-xl transform transition-all duration-500 ease-out lg:translate-x-0 lg:static lg:inset-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full shadow-none'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-white/20 dark:border-neutral-700/30">
            <div className="group flex items-center space-x-4 cursor-pointer">
              <div className="relative w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform duration-200">
                <Mic className="w-5 h-5 text-white" />
                <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
              <span className="text-base sm:text-lg lg:text-fluid-lg font-bold text-neutral-900 dark:text-white">
                Universal Assistant
              </span>
            </div>
          </div>

          {/* Meeting Status */}
          {isInMeeting && (
            <div className="p-4 bg-gradient-to-r from-red-50/50 to-pink-50/50 dark:from-red-900/20 dark:to-pink-900/20 border-b border-white/20 dark:border-neutral-700/30">
              <div className="flex items-center space-x-3 text-red-700 dark:text-red-400">
                <div className="w-3 h-3 bg-red-500 rounded-full pulse-soft shadow-glow" />
                <span className="text-sm font-semibold">Meeting in Progress</span>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav 
            id="navigation"
            className="flex-1 p-4 space-y-2" 
            role="navigation" 
            aria-label="Main navigation"
          >
            {isLoading ? (
              <SkeletonNavigation />
            ) : (
              navigationItems.map((item, index) => {
                const isNavigatingToThisItem = navigationState.isNavigating && navigationState.targetPath === item.href;
                
                return (
                  <button
                    key={item.href}
                    onClick={() => handleNavigation(item.href)}
                    disabled={navigationState.isNavigating}
                    className={`group relative w-full flex items-center space-x-4 px-4 py-3.5 rounded-xl text-left transition-all duration-200 button-press focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed ${
                      item.active
                        ? 'bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-400 shadow-soft'
                        : 'text-neutral-800 dark:text-neutral-300 hover:bg-white/30 dark:hover:bg-neutral-800/30 hover:text-blue-600 dark:hover:text-blue-400'
                    } ${
                      isNavigatingToThisItem ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                    aria-current={item.active ? 'page' : undefined}
                    aria-label={`Navigate to ${item.label}${item.active ? ' (current page)' : ''}`}
                  >
                    {/* Active indicator pill */}
                    {item.active && (
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-r-full" />
                    )}
                    
                    {isNavigatingToThisItem ? (
                      <LoadingSpinner size="sm" color="primary" className="w-5 h-5" />
                    ) : (
                      <item.icon 
                        className={`w-5 h-5 transition-all duration-200 ${
                          item.active ? 'scale-110' : 'group-hover:scale-110'
                        }`} 
                        aria-hidden="true"
                      />
                    )}
                    
                    <span className="font-semibold text-sm sm:text-fluid-sm flex-1">
                      {isNavigatingToThisItem ? 'Loading...' : item.label}
                    </span>
                    
                    {item.badge && !isNavigatingToThisItem && (
                      <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-soft">
                        {item.badge}
                      </span>
                    )}
                    
                    {/* Hover gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl" />
                  </button>
                );
              })
            )}
          </nav>

          {/* Footer */}
          <div className="p-6 border-t border-white/20 dark:border-neutral-700/30">
            <div className="text-xs text-neutral-500 dark:text-neutral-400 text-center font-medium">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full pulse-soft" />
                <span>Universal Assistant v2.0</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  className = '',
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const router = useRouter();
  const pathname = usePathname();
  const [pageLoading, setPageLoading] = useState(false);
  
  // Track route changes for loading state
  useEffect(() => {
    const handleStart = () => setPageLoading(true);
    const handleComplete = () => setPageLoading(false);
    
    // Listen for route changes
    handleComplete(); // Reset on component mount
    
    return () => {
      handleComplete();
    };
  }, [pathname]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="animate-spin h-12 w-12 border-4 border-blue-200 dark:border-blue-800 border-t-blue-500 rounded-full" />
            <div className="absolute inset-0 animate-ping h-12 w-12 border-4 border-blue-400 rounded-full opacity-20" />
          </div>
          <p className="text-neutral-600 dark:text-neutral-300 font-medium">Loading Universal Assistant...</p>
        </div>
      </div>
    );
  }

  // Don't render layout if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={`min-h-screen bg-neutral-50 dark:bg-neutral-900 ${className}`}>
      {/* Skip Links for Screen Readers */}
      <div className="sr-only">
        <a 
          href="#main-content" 
          className="skip-link"
          tabIndex={0}
        >
          Skip to main content
        </a>
        <a 
          href="#navigation" 
          className="skip-link"
          tabIndex={0}
        >
          Skip to navigation
        </a>
      </div>

      <div className="flex h-screen">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={toggleSidebar} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
          {/* Header */}
          <Header onToggleSidebar={toggleSidebar} isSidebarOpen={sidebarOpen} />

          {/* Main Content Area */}
          <main 
            id="main-content"
            className="flex-1 overflow-auto relative bg-neutral-200 dark:bg-neutral-900"
            role="main"
            aria-label="Main content"
          >
            {pageLoading && (
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 z-10">
                <div className="h-full bg-gradient-to-r from-blue-400 to-purple-400 animate-pulse" />
              </div>
            )}
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl">
              <div className={`transition-all duration-300 ${
                pageLoading 
                  ? 'opacity-70 pointer-events-none' 
                  : 'animate-in fade-in slide-in-from-bottom-4 duration-500'
              }`}>
                {children}
              </div>
              {pageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/10 dark:bg-neutral-900/10 backdrop-blur-sm">
                  <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-4 flex items-center space-x-3">
                    <LoadingSpinner size="sm" color="primary" />
                    <span className="text-neutral-800 dark:text-neutral-300 font-medium">Loading page...</span>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

