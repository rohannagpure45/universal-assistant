'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';
import { Mic, Shield, Zap, Users, ArrowRight } from 'lucide-react';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Redirect to dashboard if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Don't render landing page if authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="flex">
        {/* Left side - Hero Content */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 flex-col justify-center px-12 xl:px-20">
          <div className="max-w-xl">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Universal Assistant
              </h1>
            </div>

            <h2 className="text-4xl xl:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              AI-Powered Meeting
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                {" "}Intelligence
              </span>
            </h2>

            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              Transform your meetings with real-time transcription, intelligent responses, 
              and comprehensive analytics. Never miss important details again.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Mic className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-gray-900 dark:text-white font-medium">
                  Real-time speech transcription
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-gray-900 dark:text-white font-medium">
                  AI-powered meeting insights
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-gray-900 dark:text-white font-medium">
                  Speaker identification & analytics
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Shield className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <span className="text-gray-900 dark:text-white font-medium">
                  Enterprise-grade security
                </span>
              </div>
            </div>

            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <span>Trusted by leading teams worldwide</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </div>
        </div>

        {/* Right side - Authentication Forms */}
        <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-8 lg:p-12">
          <div className="w-full max-w-md">
            {/* Mobile header */}
            <div className="lg:hidden text-center mb-8">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Mic className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Universal Assistant
                </h1>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                AI-powered meeting intelligence
              </p>
            </div>

            {/* Auth Forms */}
            {authMode === 'login' ? (
              <LoginForm
                onSwitchToSignup={() => setAuthMode('signup')}
                redirectTo="/dashboard"
              />
            ) : (
              <SignupForm
                onSwitchToLogin={() => setAuthMode('login')}
                redirectTo="/dashboard"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
