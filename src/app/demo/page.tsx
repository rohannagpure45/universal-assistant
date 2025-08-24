'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Mic, 
  Users, 
  Calendar, 
  Clock, 
  Play, 
  ArrowRight,
  Shield,
  Zap,
  MessageSquare,
  Settings,
  Palette,
  Bell,
  Volume2
} from 'lucide-react';

// Demo page that shows the application features without requiring authentication
export default function DemoPage() {
  const router = useRouter();

  const features = [
    {
      icon: Mic,
      title: 'Real-time Transcription',
      description: 'Experience accurate speech-to-text conversion with speaker identification',
      demo: 'Try our live transcription demo'
    },
    {
      icon: MessageSquare,
      title: 'AI Assistant',
      description: 'Interact with an intelligent AI that understands meeting context',
      demo: 'Chat with the AI assistant'
    },
    {
      icon: Users,
      title: 'Speaker Recognition',
      description: 'Automatically identify and track different speakers in your meetings',
      demo: 'See speaker identification in action'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Enterprise-grade security ensures your conversations stay confidential',
      demo: 'Learn about our security measures'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Navigation Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                Universal Assistant
              </h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link href="/">
                <button className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg transition-colors min-h-[44px]">
                  Home
                </button>
              </Link>
              <Link href="/auth">
                <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg hover:scale-105 transition-all duration-200 min-h-[44px]">
                  Sign In
                </button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 space-y-8 sm:space-y-12 lg:space-y-16">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
            Experience Universal Assistant
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Try out our AI-powered meeting assistant without creating an account. 
            Explore the features that make your meetings more productive and insightful.
          </p>
        </div>

        {/* Demo Notice */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 sm:p-6 lg:p-8 shadow-lg">
          <div className="flex items-start space-x-3">
            <Play className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Demo Mode
              </h3>
              <p className="text-sm sm:text-base text-blue-800 dark:text-blue-200">
                You're currently in demo mode. Some features are simulated to show you how the application works. 
                For full functionality and to save your data, please create an account.
              </p>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 lg:p-8 shadow-xl border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 hover:scale-105 transform"
            >
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <feature.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">
                    {feature.description}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // For demo purposes, just show an alert
                      alert(`${feature.demo} - This would open an interactive demo of ${feature.title}`);
                    }}
                  >
                    {feature.demo}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Demo Dashboard Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">
            Dashboard Preview
          </h2>
          
          {/* Mock Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 sm:p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Meetings</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">42</div>
              <div className="text-xs text-green-600 dark:text-green-400">+12% this week</div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 sm:p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Hours</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">23.5h</div>
              <div className="text-xs text-green-600 dark:text-green-400">+8% this week</div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 sm:p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Participants</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">156</div>
              <div className="text-xs text-green-600 dark:text-green-400">+15% this week</div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 sm:p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">AI Responses</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">89</div>
              <div className="text-xs text-green-600 dark:text-green-400">+22% this week</div>
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-400 text-center">
            This is a preview of your dashboard with sample data. Real metrics will appear when you start using the application.
          </p>
        </div>

        {/* Settings Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">
            Settings Preview
          </h2>
          <p className="text-sm text-gray-900 dark:text-white mb-6">
            Preview of the updated settings interface with improved text contrast and better toggle switch design.
          </p>
          
          {/* Mock Settings Sections */}
          <div className="space-y-6">
            {/* Appearance Section */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Palette className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    Appearance
                  </h3>
                  <p className="text-xs text-gray-900 dark:text-white">
                    Customize the look and feel of your interface
                  </p>
                </div>
              </div>
            </div>

            {/* Audio Settings Section */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Volume2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    Audio
                  </h3>
                  <p className="text-xs text-gray-900 dark:text-white">
                    Configure your microphone and speaker settings
                  </p>
                </div>
              </div>
              
              {/* Toggle Switches Demo */}
              <div className="space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      Noise Suppression
                    </label>
                    <p className="text-xs text-gray-900 dark:text-white mt-1">
                      Reduce background noise during recordings
                    </p>
                  </div>
                  <button
                    className="relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 bg-blue-600 shadow-inner"
                  >
                    <span
                      className="inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-all duration-200 translate-x-5"
                    />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      Echo Cancellation
                    </label>
                    <p className="text-xs text-gray-900 dark:text-white mt-1">
                      Prevent audio feedback and echo
                    </p>
                  </div>
                  <button
                    className="relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 bg-gray-300 dark:bg-gray-600 shadow-inner"
                  >
                    <span
                      className="inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-all duration-200 translate-x-0.5"
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Notifications Section */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    Notifications
                  </h3>
                  <p className="text-xs text-gray-900 dark:text-white">
                    Choose what notifications you want to receive
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                Fixed Issues:
              </p>
            </div>
            <ul className="mt-2 text-xs text-green-700 dark:text-green-300 space-y-1 pl-4">
              <li>• Text color improved for better readability (darker gray instead of light gray)</li>
              <li>• Toggle switches redesigned to be more rectangular (6x11 instead of 5x9)</li>
              <li>• Better contrast ratio for accessibility compliance</li>
              <li>• More traditional toggle switch appearance</li>
            </ul>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center space-y-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
            Ready to get started?
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Create your account to access all features and start improving your meetings today.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => router.push('/auth')}
              className="group"
            >
              Create Account
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push('/')}
            >
              Back to Home
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}