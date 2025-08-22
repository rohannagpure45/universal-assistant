'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, LogIn, Chrome } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner, LinearProgress } from '@/components/ui';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToSignup?: () => void;
  redirectTo?: string;
  className?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onSwitchToSignup,
  redirectTo = '/dashboard',
  className = '',
}) => {
  const router = useRouter();
  const {
    signIn,
    signInWithGoogle,
    resetPassword,
    isSigningIn,
    isResettingPassword,
    error,
    clearError,
    isAuthenticated,
  } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleSignInProgress, setGoogleSignInProgress] = useState(false);
  const [authProgress, setAuthProgress] = useState(0);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(redirectTo);
      }
    }
  }, [isAuthenticated, onSuccess, redirectTo, router]);

  // Clear form errors when auth error changes
  useEffect(() => {
    if (error) {
      setFormErrors({});
    }
  }, [error]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting || isSigningIn) return;
    
    clearError();
    setIsSubmitting(true);
    setAuthProgress(0);

    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    try {
      // Simulate auth progress
      setAuthProgress(25);
      
      const success = await signIn(formData);
      
      setAuthProgress(75);
      
      if (success) {
        setAuthProgress(100);
        if (onSuccess) {
          onSuccess();
        }
      }
    } finally {
      setIsSubmitting(false);
      setAuthProgress(0);
    }
  };

  const handleGoogleSignIn = async () => {
    if (googleSignInProgress || isSigningIn) return;
    
    clearError();
    setGoogleSignInProgress(true);
    setAuthProgress(0);
    
    try {
      setAuthProgress(25);
      
      const success = await signInWithGoogle();
      
      setAuthProgress(75);
      
      if (success) {
        setAuthProgress(100);
        if (onSuccess) {
          onSuccess();
        }
      }
    } finally {
      setGoogleSignInProgress(false);
      setAuthProgress(0);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isResettingPassword) return;
    
    clearError();

    if (!resetEmail) {
      setFormErrors({ resetEmail: 'Email is required' });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
      setFormErrors({ resetEmail: 'Please enter a valid email address' });
      return;
    }

    try {
      const success = await resetPassword(resetEmail);
      if (success) {
        setResetSuccess(true);
        setFormErrors({});
      }
    } catch (error) {
      // Error is handled by the auth hook
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear field-specific error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <ErrorBoundary
      fallbackType="card"
      severity="warning"
      componentName="LoginForm"
      className={className}
      fallback={
        <div className={`w-full max-w-md mx-auto ${className}`}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Login Unavailable
            </h3>
            <p className="text-gray-700 dark:text-gray-400 mb-4">
              The login form encountered an error. Please refresh the page or try again later.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      }
    >
      {showResetForm ? (
        <div className={`w-full max-w-md mx-auto ${className}`}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              Reset Password
            </h2>

            {resetSuccess ? (
              <div className="text-center">
                <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-green-700 dark:text-green-400">
                    Password reset email sent! Check your inbox for instructions.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowResetForm(false);
                    setResetSuccess(false);
                    setResetEmail('');
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} method="post" className="space-y-4">
                <div>
                  <label htmlFor="resetEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      id="resetEmail"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                        formErrors.resetEmail ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your email address"
                    />
                  </div>
                  {formErrors.resetEmail && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.resetEmail}</p>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-red-700 dark:text-red-400 text-sm">{error.message}</p>
                  </div>
                )}

                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowResetForm(false);
                      setResetEmail('');
                      setFormErrors({});
                      clearError();
                    }}
                    className="flex-1"
                    disabled={isResettingPassword}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={isResettingPassword}
                    disabled={isResettingPassword}
                    className="flex-1"
                  >
                    Send Reset Email
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : (
        <div className={`w-full max-w-md mx-auto ${className}`}>
          <div className={`${className.includes('bg-transparent') ? '' : 'bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6'}`}>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              Sign In
            </h2>

            <form onSubmit={handleSubmit} method="post" className="space-y-4">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      formErrors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your email"
                  />
                </div>
                {formErrors.email && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.email}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-12 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      formErrors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.password}</p>
                )}
              </div>

              {/* Forgot Password Link */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setShowResetForm(true)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Forgot your password?
                </button>
              </div>

              {/* Progress Bar */}
              {(isSubmitting || isSigningIn) && (
                <div className="space-y-2">
                  <LinearProgress
                    progress={authProgress}
                    indeterminate={authProgress === 0}
                    size="sm"
                    color="primary"
                    label="Signing in"
                  />
                  <p className="text-xs text-center text-neutral-600 dark:text-neutral-400">
                    {authProgress === 0 ? 'Initiating sign in...' :
                     authProgress < 50 ? 'Verifying credentials...' :
                     authProgress < 90 ? 'Authenticating...' :
                     'Completing sign in...'}
                  </p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-700 dark:text-red-400 text-sm">{error.message}</p>
                </div>
              )}

              {/* Sign In Button */}
              <Button
                type="submit"
                variant="primary"
                loading={isSubmitting || isSigningIn}
                disabled={isSubmitting || isSigningIn}
                className="w-full"
                leftIcon={!isSubmitting && !isSigningIn ? <LogIn className="h-5 w-5" /> : undefined}
              >
                {isSubmitting || isSigningIn ? 'Signing In...' : 'Sign In'}
              </Button>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Google Sign In Button */}
              <Button
                type="button"
                variant="secondary"
                onClick={handleGoogleSignIn}
                loading={googleSignInProgress}
                disabled={isSubmitting || isSigningIn || googleSignInProgress}
                className="w-full"
                leftIcon={!googleSignInProgress ? <Chrome className="h-5 w-5" /> : undefined}
              >
                {googleSignInProgress ? 'Connecting to Google...' : 'Sign in with Google'}
              </Button>
            </form>

            {/* Switch to Sign Up */}
            {onSwitchToSignup && (
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-700 dark:text-gray-400">
                  Don't have an account?{' '}
                  <button
                    onClick={onSwitchToSignup}
                    disabled={isSubmitting || isSigningIn || googleSignInProgress}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sign up
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
};

export default LoginForm;