'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Zap, Users, Mic } from 'lucide-react';
import { AnimatedPage, staggerContainer, staggerItem } from '@/components/providers/AnimationProvider';
import { cn } from '@/lib/utils';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  showBackButton?: boolean;
  onBack?: () => void;
  className?: string;
}

const features = [
  {
    icon: Mic,
    title: 'Real-time Transcription',
    description: 'Advanced speech-to-text with speaker identification',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Enterprise-grade security for all your meetings',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: Zap,
    title: 'AI-Powered Insights',
    description: 'Intelligent meeting summaries and action items',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Seamless integration with your workflow',
    gradient: 'from-orange-500 to-red-500',
  },
];

const floatingElements = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  size: Math.random() * 100 + 50,
  left: Math.random() * 100,
  top: Math.random() * 100,
  delay: Math.random() * 2,
  duration: Math.random() * 3 + 4,
}));

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
  showBackButton = false,
  onBack,
  className = '',
}) => {
  return (
    <div className={cn(
      'min-h-screen flex',
      'bg-gradient-to-br from-blue-50 via-white to-purple-50',
      'dark:from-gray-900 dark:via-gray-800 dark:to-gray-900',
      className
    )}>
      {/* Background Decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/20 via-transparent to-purple-100/20 dark:from-blue-900/10 dark:to-purple-900/10" />
        
        {/* Floating Elements */}
        {floatingElements.map((element) => (
          <motion.div
            key={element.id}
            className="absolute rounded-full bg-gradient-to-r from-blue-200/30 to-purple-200/30 dark:from-blue-800/20 dark:to-purple-800/20 blur-xl"
            style={{
              width: element.size,
              height: element.size,
              left: `${element.left}%`,
              top: `${element.top}%`,
            }}
            animate={{
              y: [-20, 20, -20],
              x: [-10, 10, -10],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: element.duration,
              delay: element.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Left Side - Features Showcase */}
      <div className="hidden lg:flex lg:w-1/2 relative order-last lg:order-first">
        <div className="flex flex-col justify-center p-12 xl:p-16 relative z-10">
          <motion.div
            initial={{ opacity: 1, x: 0 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="mb-12"
          >
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Universal Assistant
              </h1>
            </div>
            
            <h2 className="text-3xl xl:text-4xl 2xl:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              Transform Your
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {' '}Meetings
              </span>
            </h2>
            
            <p className="text-lg xl:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
              Intelligent meeting assistant with real-time transcription, speaker identification, 
              and AI-powered insights to make your conversations more productive.
            </p>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:gap-6"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={staggerItem}
                className="group relative"
              >
                <div className="glass-card p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className={cn(
                    'w-12 h-12 rounded-lg bg-gradient-to-r mb-4 flex items-center justify-center',
                    feature.gradient
                  )}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1, ease: 'easeOut' }}
            className="mt-8 xl:mt-12 grid grid-cols-3 gap-4 xl:gap-8"
          >
            {[
              { value: '10k+', label: 'Meetings Recorded' },
              { value: '500+', label: 'Hours Transcribed' },
              { value: '99.9%', label: 'Accuracy Rate' },
            ].map((stat, index) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 lg:w-1/2 flex flex-col justify-center relative order-first lg:order-last">
        <div className="glass-card mx-4 sm:mx-6 lg:mx-8 xl:mx-12 2xl:mx-16 p-6 sm:p-8 lg:p-10 xl:p-12 relative z-10">
          {/* Back Button */}
          {showBackButton && onBack && (
            <motion.button
              initial={{ opacity: 1, x: 0 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              onClick={onBack}
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-8 group"
            >
              <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
              Back
            </motion.button>
          )}

          {/* Header */}
          <AnimatedPage className="mb-8">
            <motion.div
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center lg:text-left"
            >
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                {title}
              </h1>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300">
                {subtitle}
              </p>
            </motion.div>
          </AnimatedPage>

          {/* Form Content */}
          <motion.div
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {children}
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400"
          >
            <div className="flex items-center justify-center space-x-6">
              <a href="/privacy" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                Privacy Policy
              </a>
              <a href="/terms" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                Terms of Service
              </a>
              <a href="/support" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                Support
              </a>
            </div>
          </motion.div>
        </div>

        {/* Mobile Brand */}
        <div className="lg:hidden absolute top-4 sm:top-6 lg:top-8 left-4 sm:left-6 lg:left-8 right-4 sm:right-6 lg:right-8 z-20">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-center space-x-3"
          >
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
              Universal Assistant
            </span>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;