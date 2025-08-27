'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';
import { Mic, Shield, Zap, Users, ArrowRight, Star, Play } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StaggerContainer, StaggerItem } from '@/components/providers/AnimationProvider';
import Link from 'next/link';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // SECURITY: Clear any credentials from URL parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('email') || url.searchParams.has('password')) {
        // Remove sensitive parameters and update URL without reload
        url.searchParams.delete('email');
        url.searchParams.delete('password');
        window.history.replaceState({}, '', url.pathname);
      }
    }
  }, []);

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

  const features = [
    {
      icon: Mic,
      title: 'Real-time speech transcription',
      gradient: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      icon: Zap,
      title: 'AI-powered meeting insights',
      gradient: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      icon: Users,
      title: 'Speaker identification & analytics',
      gradient: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      icon: Shield,
      title: 'Enterprise-grade security',
      gradient: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      iconColor: 'text-orange-600 dark:text-orange-400',
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Modern Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-float" />
        <div className="absolute top-1/3 -left-32 w-64 h-64 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="flex flex-col lg:flex-row relative z-10 min-h-screen">
        {/* Left side - Hero Content */}
        <div className="flex lg:w-1/2 xl:w-3/5 flex-col justify-center px-6 sm:px-8 md:px-12 xl:px-20 py-8 lg:py-0">
          <div className="max-w-xl">
            {/* Brand Header */}
            <motion.div
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="flex items-center space-x-3 mb-8"
            >
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Universal Assistant
              </h1>
            </motion.div>

            {/* Main Headline */}
            <motion.h2
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
              className="text-2xl sm:text-3xl md:text-4xl xl:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight"
            >
              AI-Powered Meeting
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                {" "}Intelligence
              </span>
            </motion.h2>

            {/* Description */}
            <motion.p
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
              className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed"
            >
              Transform your meetings with real-time transcription, intelligent responses, 
              and comprehensive analytics. Never miss important details again.
            </motion.p>

            {/* Features List */}
            <StaggerContainer className="space-y-4 mb-8">
              {features.map((feature, index) => (
                <StaggerItem key={feature.title}>
                  <motion.div
                    className="flex items-center space-x-3 group cursor-pointer"
                    whileHover={{ x: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className={`p-2 ${feature.bgColor} rounded-lg transition-all duration-200 group-hover:scale-110`}>
                      <feature.icon className={`w-5 h-5 ${feature.iconColor}`} />
                    </div>
                    <span className="text-gray-900 dark:text-white font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {feature.title}
                    </span>
                  </motion.div>
                </StaggerItem>
              ))}
            </StaggerContainer>

            {/* Social Proof */}
            <motion.div
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6, ease: 'easeOut' }}
              className="flex items-center space-x-4 mb-8"
            >
              <div className="flex -space-x-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <span className="text-gray-600 dark:text-gray-400">
                Trusted by 10,000+ teams worldwide
              </span>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7, ease: 'easeOut' }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4"
            >
              <Link href="/auth">
                <button className="group inline-flex items-center justify-center px-6 py-3 text-base sm:text-lg font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full sm:w-auto min-h-[44px]">
                  Get Started Free
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              
              <Link href="/demo">
                <button className="group inline-flex items-center justify-center px-6 py-3 text-base sm:text-lg font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full sm:w-auto min-h-[44px]">
                  <Play className="w-4 h-4 mr-2" />
                  Watch Demo
                </button>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Right side - Authentication Forms */}
        <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12 relative order-first lg:order-last">
          <div className="w-full max-w-md">
            {/* Mobile header */}
            <motion.div
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="lg:hidden text-center mb-6 sm:mb-8"
            >
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                  <Mic className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  Universal Assistant
                </h1>
              </div>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                AI-powered meeting intelligence
              </p>
            </motion.div>

            {/* Auth Mode Toggle */}
            <motion.div
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex p-1 mb-6 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-200/50 dark:border-gray-700/50"
            >
              <button
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all duration-200 ${
                  authMode === 'login'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setAuthMode('signup')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all duration-200 ${
                  authMode === 'signup'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Sign Up
              </button>
            </motion.div>

            {/* Auth Forms with Glass Effect */}
            <motion.div
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="glass-card p-8"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={authMode}
                  initial={{ opacity: 1, x: 0 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: authMode === 'signup' ? -20 : 20 }}
                  transition={{ duration: 0.3 }}
                >
                  {authMode === 'login' ? (
                    <LoginForm
                      onSwitchToSignup={() => setAuthMode('signup')}
                      redirectTo="/dashboard"
                      className="bg-transparent shadow-none border-none p-0"
                    />
                  ) : (
                    <SignupForm
                      onSwitchToLogin={() => setAuthMode('login')}
                      redirectTo="/dashboard"
                      className="bg-transparent shadow-none border-none p-0"
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Quick Access */}
            <motion.div
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-6 text-center"
            >
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Or try without signing up
              </p>
              <Link href="/demo">
                <button className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200">
                  Explore Demo
                </button>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
