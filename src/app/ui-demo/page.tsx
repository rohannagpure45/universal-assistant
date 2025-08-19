'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, Users, Mic, BarChart3, TrendingUp, Activity, Plus,
  PlayCircle, PauseCircle, StopCircle, DollarSign, Settings, Home,
  Bell, LogOut, User, X, Menu, Zap, Target, RefreshCw
} from 'lucide-react';

// Demo Dashboard Card Component
const DashboardCard = ({ title, value, icon: Icon, trend, className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div className={`group relative bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6 card-hover overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-900/10 dark:to-purple-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {title}
          </p>
          <p className={`text-fluid-2xl font-bold text-gray-900 dark:text-white transition-all duration-700 ${isVisible ? 'animate-counter' : 'opacity-0'}`}>
            {value}
          </p>
          {trend && (
            <div className={`flex items-center mt-2 text-sm transition-colors duration-200 ${
              trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              <TrendingUp className={`w-4 h-4 mr-1 transition-transform duration-200 group-hover:scale-110 ${
                !trend.isPositive ? 'rotate-180' : ''
              }`} />
              <span className="font-medium">{Math.abs(trend.value)}% from last week</span>
            </div>
          )}
        </div>
        <div className="relative p-3 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 rounded-xl group-hover:scale-105 transition-transform duration-200">
          <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors duration-200" />
          <div className="absolute inset-0 rounded-xl bg-blue-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300" />
        </div>
      </div>
      
      {className.includes('ring-2') && (
        <div className="absolute top-2 right-2">
          <div className="w-3 h-3 bg-red-500 rounded-full pulse-soft" />
        </div>
      )}
    </div>
  );
};

// Demo Navigation Sidebar
const Sidebar = ({ isOpen }) => {
  const navigationItems = [
    { label: 'Dashboard', href: '/dashboard', icon: Home, active: true },
    { label: 'Meeting', href: '/meeting', icon: Mic, active: false },
    { label: 'Analytics', href: '/analytics', icon: BarChart3, active: false },
    { label: 'Settings', href: '/settings', icon: Settings, active: false },
  ];

  return (
    <aside className={`fixed left-0 top-0 z-30 h-full w-64 glass-morphism dark:glass-morphism-dark border-r border-white/30 dark:border-gray-700/30 backdrop-blur-xl transform transition-all duration-500 ease-out ${
      isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
    }`}>
      <div className="flex flex-col h-full">
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

        <nav className="flex-1 p-4 space-y-2">
          {navigationItems.map((item, index) => (
            <button
              key={item.href}
              className={`group relative w-full flex items-center space-x-4 px-4 py-3.5 rounded-xl text-left transition-all duration-200 button-press overflow-hidden ${
                item.active
                  ? 'bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-400 shadow-soft'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-gray-800/30 hover:text-blue-600 dark:hover:text-blue-400'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {item.active && (
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-r-full" />
              )}
              
              <item.icon className={`w-5 h-5 transition-all duration-200 ${
                item.active ? 'scale-110' : 'group-hover:scale-110'
              }`} />
              <span className="font-semibold text-fluid-sm flex-1">{item.label}</span>
              
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl" />
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/20 dark:border-gray-700/30">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center font-medium">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full pulse-soft" />
              <span>UI Demo Mode</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

// Demo Meeting Controls
const MeetingControls = () => {
  const [isRecording, setIsRecording] = useState(false);

  return (
    <div className="glass-morphism dark:glass-morphism-dark rounded-xl p-6 border border-white/30 dark:border-gray-700/30">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Meeting Controls
      </h3>
      
      <div className="flex items-center justify-center space-x-4">
        <button
          onClick={() => setIsRecording(!isRecording)}
          className={`group relative p-6 rounded-full transition-all duration-300 ${
            isRecording 
              ? 'bg-gradient-to-r from-red-500 to-pink-500 shadow-glow pulse-soft' 
              : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:shadow-glow'
          } button-press`}
        >
          <Mic className="w-8 h-8 text-white" />
          {isRecording && (
            <div className="absolute inset-0 rounded-full bg-red-400 opacity-30 animate-ping" />
          )}
        </button>
        
        <button className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 button-press">
          <PauseCircle className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        </button>
        
        <button className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 button-press">
          <StopCircle className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        </button>
      </div>
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {isRecording ? 'Recording in progress...' : 'Click to start recording'}
        </p>
      </div>
    </div>
  );
};

// Loading Skeleton Demo
const SkeletonCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
    <div className="animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2 shimmer"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 shimmer"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-28 mt-2 shimmer"></div>
        </div>
        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg shimmer"></div>
      </div>
    </div>
  </div>
);

export default function UIDemoPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showLoadingDemo, setShowLoadingDemo] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-blue-900/10 dark:to-purple-900/10">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} />
      
      {/* Main Content */}
      <div className={`transition-all duration-500 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {/* Header */}
        <header className="glass-morphism dark:glass-morphism-dark border-b border-white/20 dark:border-gray-700/30 px-6 py-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2.5 rounded-xl hover:bg-white/30 dark:hover:bg-gray-800/30 transition-all duration-200 button-press"
              >
                <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                UI Improvements Demo
              </h1>
              
              <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-400 rounded-full shadow-soft">
                <div className="w-2 h-2 bg-green-500 rounded-full pulse-soft" />
                <span className="text-sm font-semibold">All Systems Operational</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button className="group p-2.5 rounded-xl hover:bg-white/30 dark:hover:bg-gray-800/30 transition-all duration-200 relative button-press">
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:scale-110 transition-transform duration-200" />
                <span className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-semibold rounded-full flex items-center justify-center shadow-glow pulse-soft">
                  3
                </span>
              </button>
              
              <div className="group flex items-center space-x-3 p-2 rounded-xl hover:bg-gradient-to-r hover:from-gray-100 hover:to-blue-50 dark:hover:from-gray-700 dark:hover:to-blue-900/20 transition-all duration-200 button-press cursor-pointer">
                <div className="relative w-9 h-9 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-soft group-hover:scale-105 transition-transform duration-200">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="hidden md:block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Demo User
                </span>
              </div>
            </div>
          </div>
        </header>
        
        {/* Main Content Area */}
        <main className="p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Section: Dashboard Cards with Animations */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Dashboard Cards with Enhanced Animations
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardCard
                  title="Total Meetings"
                  value="156"
                  icon={Calendar}
                  trend={{ value: 12, isPositive: true }}
                />
                <DashboardCard
                  title="Active Now"
                  value="3"
                  icon={Activity}
                  className="ring-2 ring-red-500"
                />
                <DashboardCard
                  title="Total Hours"
                  value="48.5h"
                  icon={Clock}
                  trend={{ value: 8, isPositive: true }}
                />
                <DashboardCard
                  title="Participants"
                  value="892"
                  icon={Users}
                  trend={{ value: 15, isPositive: true }}
                />
              </div>
            </section>
            
            {/* Section: Glass Morphism Effects */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Glass Morphism & Wave Animations
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="wave-bg rounded-xl p-6 text-white">
                  <h3 className="text-xl font-bold mb-4">Wave Background Animation</h3>
                  <p className="opacity-90">
                    This demonstrates the subtle wave animation background effect that creates visual interest.
                  </p>
                </div>
                
                <MeetingControls />
              </div>
            </section>
            
            {/* Section: Loading States */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Loading States & Shimmer Effects
              </h2>
              <button
                onClick={() => setShowLoadingDemo(!showLoadingDemo)}
                className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors button-press"
              >
                Toggle Loading Demo
              </button>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {showLoadingDemo ? (
                  <>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </>
                ) : (
                  <>
                    <DashboardCard title="API Calls" value="1,234" icon={Zap} />
                    <DashboardCard title="Avg Cost/Call" value="$0.045" icon={DollarSign} />
                    <DashboardCard title="Efficiency" value="2.3k t/$" icon={Target} />
                  </>
                )}
              </div>
            </section>
            
            {/* Section: Button Styles */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Button Styles & Interactions
              </h2>
              <div className="flex flex-wrap gap-4">
                <button className="px-6 py-3 bg-gradient-primary text-white rounded-xl shadow-glow button-press hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200">
                  Primary Button
                </button>
                <button className="px-6 py-3 bg-gradient-success text-white rounded-xl button-press hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200">
                  Success Button
                </button>
                <button className="px-6 py-3 bg-gradient-warning text-white rounded-xl button-press hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200">
                  Warning Button
                </button>
                <button className="px-6 py-3 bg-gradient-error text-white rounded-xl button-press hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200">
                  Error Button
                </button>
                <button className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 dark:hover:from-gray-700 dark:hover:to-gray-600 button-press transition-all duration-200">
                  Outline Button
                </button>
              </div>
            </section>
            
            {/* Section: Typography */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Fluid Typography System
              </h2>
              <div className="space-y-4 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <p className="text-fluid-3xl font-bold text-gray-900 dark:text-white">
                  Fluid 3XL Heading
                </p>
                <p className="text-fluid-2xl font-semibold text-gray-800 dark:text-gray-200">
                  Fluid 2XL Subheading
                </p>
                <p className="text-fluid-xl text-gray-700 dark:text-gray-300">
                  Fluid XL Text - Scales smoothly with viewport
                </p>
                <p className="text-fluid-lg text-gray-600 dark:text-gray-400">
                  Fluid Large Text - Responsive typography
                </p>
                <p className="text-fluid-base text-gray-600 dark:text-gray-400">
                  Fluid Base Text - Perfect for body content
                </p>
                <p className="text-fluid-sm text-gray-500 dark:text-gray-500">
                  Fluid Small Text - For secondary information
                </p>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}