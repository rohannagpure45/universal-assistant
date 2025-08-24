'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

type AuthMode = 'login' | 'signup';

const AuthPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeParam = searchParams.get('mode') as AuthMode | null;
  const [mode, setMode] = useState<AuthMode>(modeParam || 'login');
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated } = useAuth();

  // Ensure client-side hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // SECURITY: Clear any credentials from URL parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('email') || url.searchParams.has('password')) {
        // Remove sensitive parameters and update URL without reload
        url.searchParams.delete('email');
        url.searchParams.delete('password');
        const cleanUrl = url.pathname + (url.searchParams.has('mode') ? `?mode=${url.searchParams.get('mode')}` : '');
        window.history.replaceState({}, '', cleanUrl);
      }
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleAuthSuccess = () => {
    router.push('/dashboard');
  };

  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    // Also update URL for better UX
    router.push(`/auth?mode=${newMode}`, { scroll: false });
  };
  
  // Sync mode with URL param
  useEffect(() => {
    if (modeParam && modeParam !== mode) {
      setMode(modeParam);
    }
  }, [modeParam]);

  // Auth configuration
  const getAuthConfig = () => {
    if (mode === 'signup') {
      return {
        title: 'Get started today',
        subtitle: 'Create your account and transform your meetings with AI',
      };
    }
    return {
      title: 'Welcome back',
      subtitle: 'Sign in to your account to continue your meeting journey',
    };
  };

  const currentAuth = getAuthConfig();

  return (
    <AuthLayout
      title={currentAuth.title}
      subtitle={currentAuth.subtitle}
      showBackButton={false}
    >
      <div className="w-full max-w-md mx-auto">
        {/* Mode Toggle - Using Links as workaround for hydration issue */}
        <div className="flex p-1 mb-8 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <Link
            href="/auth?mode=login"
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all duration-200 text-center ${
              mode === 'login'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Sign In
          </Link>
          <Link
            href="/auth?mode=signup"
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all duration-200 text-center ${
              mode === 'signup'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Sign Up
          </Link>
        </div>

        {/* Auth Form */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 1, x: 0 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: mode === 'signup' ? -50 : 50 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {mode === 'signup' ? (
              <SignupForm
                onSuccess={handleAuthSuccess}
                onSwitchToLogin={() => handleModeChange('login')}
                redirectTo="/dashboard"
              />
            ) : (
              <LoginForm
                onSuccess={handleAuthSuccess}
                onSwitchToSignup={() => handleModeChange('signup')}
                redirectTo="/dashboard"
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Demo Access */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Want to explore without signing up?
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/demo')}
              className="w-full"
            >
              Try Demo Mode
            </Button>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default AuthPage;