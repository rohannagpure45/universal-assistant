'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X, Bell, Settings, LogOut, User, Home, BarChart3, Mic } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/stores/appStore';
import { useMeetingStore } from '@/stores/meetingStore';

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
}

interface UserMenuProps {
  user: any;
  onSignOut: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ user, onSignOut }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center space-x-3 p-2 rounded-xl hover:bg-gradient-to-r hover:from-gray-100 hover:to-blue-50 dark:hover:from-gray-700 dark:hover:to-blue-900/20 transition-all duration-200 button-press focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Open user menu"
        aria-expanded={isOpen}
      >
        <div className="relative w-9 h-9 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-soft group-hover:scale-105 transition-transform duration-200">
          <User className="w-4 h-4 text-white" />
          <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </div>
        <span className="hidden md:block text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
          {user?.displayName || user?.email?.split('@')[0] || 'User'}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-3 w-52 glass-morphism dark:glass-morphism-dark rounded-xl shadow-glow border border-white/30 dark:border-gray-700/30 z-20 backdrop-blur-xl animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="p-4 border-b border-white/20 dark:border-gray-700/30">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {user?.displayName || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {user?.email}
              </p>
            </div>
            <div className="py-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to settings
                }}
                className="group w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-gray-800/30 flex items-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
              >
                <Settings className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform duration-200" />
                <span className="font-medium">Settings</span>
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onSignOut();
                }}
                className="group w-full px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/20 flex items-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
              >
                <LogOut className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform duration-200" />
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

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="glass-morphism dark:glass-morphism-dark border-b border-white/20 dark:border-gray-700/30 px-6 py-4 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <button
            onClick={onToggleSidebar}
            className="p-2.5 rounded-xl hover:bg-white/30 dark:hover:bg-gray-800/30 transition-all duration-200 lg:hidden button-press focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label={isSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isSidebarOpen}
          >
            <div className={`transform transition-transform duration-200 ${isSidebarOpen ? 'rotate-180' : 'rotate-0'}`}>
              {isSidebarOpen ? (
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              )}
            </div>
          </button>
          
          <div className="flex items-center space-x-4">
            <h1 className="text-fluid-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
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
              onClick={() => setShowNotifications(!showNotifications)}
              className="group p-2.5 rounded-xl hover:bg-white/30 dark:hover:bg-gray-800/30 transition-all duration-200 relative button-press focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:scale-110 transition-transform duration-200" />
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
                />
                <div className="absolute right-0 mt-3 w-80 glass-morphism dark:glass-morphism-dark rounded-xl shadow-glow border border-white/30 dark:border-gray-700/30 z-20 max-h-96 overflow-y-auto backdrop-blur-xl animate-in slide-in-from-top-2 fade-in duration-200">
                  <div className="p-4 border-b border-white/20 dark:border-gray-700/30">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Notifications
                    </h3>
                  </div>
                  <div className="py-1">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                        No notifications
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="group p-4 hover:bg-white/30 dark:hover:bg-gray-800/30 border-b border-white/10 dark:border-gray-700/30 last:border-b-0 transition-all duration-200"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1 mr-3">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                {notification.title}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                {new Date(notification.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                            <button
                              onClick={() => console.log('Clear notification:', notification.id)}
                              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-600/50 rounded-lg transition-all duration-200 button-press opacity-0 group-hover:opacity-100"
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
  const { isInMeeting } = useMeetingStore();

  const navigationItems: NavigationItem[] = [
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
      label: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
      active: pathname === '/analytics',
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: Settings,
      active: pathname === '/settings',
    },
  ];

  const handleNavigation = (href: string) => {
    router.push(href);
    if (window.innerWidth < 1024) {
      onClose();
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
        className={`fixed left-0 top-0 z-30 h-full w-72 sm:w-64 glass-morphism dark:glass-morphism-dark border-r border-white/30 dark:border-gray-700/30 backdrop-blur-xl transform transition-all duration-500 ease-out lg:translate-x-0 lg:static lg:inset-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full shadow-none'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-white/20 dark:border-gray-700/30">
            <div className="group flex items-center space-x-4 cursor-pointer">
              <div className="relative w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform duration-200">
                <Mic className="w-5 h-5 text-white" />
                <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
              <span className="text-fluid-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Universal Assistant
              </span>
            </div>
          </div>

          {/* Meeting Status */}
          {isInMeeting && (
            <div className="p-4 bg-gradient-to-r from-red-50/50 to-pink-50/50 dark:from-red-900/20 dark:to-pink-900/20 border-b border-white/20 dark:border-gray-700/30">
              <div className="flex items-center space-x-3 text-red-700 dark:text-red-400">
                <div className="w-3 h-3 bg-red-500 rounded-full pulse-soft shadow-glow" />
                <span className="text-sm font-semibold">Meeting in Progress</span>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2" role="navigation" aria-label="Main navigation">
            {navigationItems.map((item, index) => (
              <button
                key={item.href}
                onClick={() => handleNavigation(item.href)}
                className={`group relative w-full flex items-center space-x-4 px-4 py-3.5 rounded-xl text-left transition-all duration-200 button-press focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset overflow-hidden ${
                  item.active
                    ? 'bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-400 shadow-soft'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-gray-800/30 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Active indicator pill */}
                {item.active && (
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-r-full" />
                )}
                
                <item.icon className={`w-5 h-5 transition-all duration-200 ${
                  item.active ? 'scale-110' : 'group-hover:scale-110'
                }`} />
                <span className="font-semibold text-fluid-sm flex-1">{item.label}</span>
                {item.badge && (
                  <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-soft">
                    {item.badge}
                  </span>
                )}
                
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl" />
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-6 border-t border-white/20 dark:border-gray-700/30">
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center font-medium">
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

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-blue-900/10 dark:to-purple-900/10">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="animate-spin h-12 w-12 border-4 border-blue-200 dark:border-blue-800 border-t-blue-500 rounded-full" />
            <div className="absolute inset-0 animate-ping h-12 w-12 border-4 border-blue-400 rounded-full opacity-20" />
          </div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">Loading Universal Assistant...</p>
        </div>
      </div>
    );
  }

  // Don't render layout if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-blue-900/10 dark:to-purple-900/10 ${className}`}>
      <div className="flex h-screen">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={toggleSidebar} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
          {/* Header */}
          <Header onToggleSidebar={toggleSidebar} isSidebarOpen={sidebarOpen} />

          {/* Main Content Area */}
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-7xl">
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

