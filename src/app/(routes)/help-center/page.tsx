'use client';

import React, { useState } from 'react';
import { MainLayout } from '@/components/layouts/MainLayout';
import { 
  Search, 
  HelpCircle, 
  PlayCircle, 
  User, 
  Mic, 
  Settings, 
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  BookOpen,
  MessageCircle,
  Zap
} from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface HelpSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  items: string[];
}

const helpSections: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the basics of Universal Assistant',
    icon: PlayCircle,
    items: [
      'Creating your first meeting',
      'Setting up speaker identification',
      'Configuring audio settings',
      'Understanding AI responses',
      'Navigating the dashboard'
    ]
  },
  {
    id: 'account-management',
    title: 'Account Management',
    description: 'Manage your account and preferences',
    icon: User,
    items: [
      'Updating your profile',
      'Changing your password',
      'Setting up two-factor authentication',
      'Managing notification preferences',
      'Billing and subscription'
    ]
  },
  {
    id: 'meeting-features',
    title: 'Meeting Features',
    description: 'Master meeting tools and capabilities',
    icon: Mic,
    items: [
      'Real-time transcription',
      'Speaker identification',
      'AI-powered insights',
      'Meeting summaries',
      'Exporting transcripts'
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    description: 'Resolve common issues',
    icon: AlertTriangle,
    items: [
      'Audio not working',
      'Transcription quality issues',
      'Speaker identification problems',
      'Connection problems',
      'Performance optimization'
    ]
  }
];

const faqs: FAQItem[] = [
  {
    id: 'what-is-universal-assistant',
    question: 'What is Universal Assistant?',
    answer: 'Universal Assistant is an AI-powered meeting assistant that provides real-time transcription, speaker identification, and intelligent insights for your meetings. It uses advanced AI models to understand conversations and provide contextual responses.',
    category: 'getting-started'
  },
  {
    id: 'how-speaker-identification-works',
    question: 'How does speaker identification work?',
    answer: 'Our speaker identification system uses voice biometrics to recognize different participants in your meetings. It learns from voice samples and improves accuracy over time. You can train the system by providing sample audio for each speaker.',
    category: 'meeting-features'
  },
  {
    id: 'data-privacy-security',
    question: 'How secure is my data?',
    answer: 'We take data security seriously. All audio is encrypted in transit and at rest, stored securely in Firebase Cloud services. We comply with GDPR and CCPA regulations. You can control data retention settings and delete your data at any time.',
    category: 'account-management'
  },
  {
    id: 'supported-languages',
    question: 'What languages are supported?',
    answer: 'Universal Assistant supports over 30 languages for transcription. AI responses are primarily in English, but we\'re working on expanding multilingual support. Check your settings to select your preferred language.',
    category: 'meeting-features'
  },
  {
    id: 'audio-requirements',
    question: 'What are the audio requirements?',
    answer: 'For best results, use a good quality microphone in a quiet environment. The system works with built-in microphones but external microphones provide better accuracy. Ensure stable internet connection for real-time processing.',
    category: 'troubleshooting'
  },
  {
    id: 'meeting-recordings',
    question: 'Are meetings recorded?',
    answer: 'Meetings are recorded locally during the session for processing. You can choose to save recordings permanently or have them automatically deleted after a specified period. Check your privacy settings for options.',
    category: 'meeting-features'
  },
  {
    id: 'ai-models-used',
    question: 'Which AI models do you use?',
    answer: 'We use state-of-the-art models from OpenAI (GPT-4) and Anthropic (Claude) for conversation analysis and responses. Deepgram provides speech-to-text services, and ElevenLabs handles text-to-speech synthesis.',
    category: 'getting-started'
  },
  {
    id: 'pricing-plans',
    question: 'What are your pricing plans?',
    answer: 'We offer flexible pricing based on usage. Contact our support team for detailed pricing information and to find the plan that best fits your needs.',
    category: 'account-management'
  }
];

const HelpCenterSection: React.FC<{
  section: HelpSection;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ section, isExpanded, onToggle }) => (
  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full px-6 py-4 text-left bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
    >
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <section.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {section.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {section.description}
          </p>
        </div>
      </div>
      {isExpanded ? (
        <ChevronDown className="w-5 h-5 text-gray-400" />
      ) : (
        <ChevronRight className="w-5 h-5 text-gray-400" />
      )}
    </button>
    
    {isExpanded && (
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
        <ul className="space-y-2">
          {section.items.map((item, index) => (
            <li key={index} className="flex items-center space-x-3">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
              <span className="text-gray-700 dark:text-gray-300">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

const FAQItem: React.FC<{
  faq: FAQItem;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ faq, isExpanded, onToggle }) => (
  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full px-6 py-4 text-left bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
    >
      <h4 className="text-base font-medium text-gray-900 dark:text-white pr-4">
        {faq.question}
      </h4>
      {isExpanded ? (
        <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
      ) : (
        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
      )}
    </button>
    
    {isExpanded && (
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
          {faq.answer}
        </p>
      </div>
    )}
  </div>
);

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  // Filter FAQs based on search query
  const filteredFAQs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const toggleFAQ = (faqId: string) => {
    setExpandedFAQ(expandedFAQ === faqId ? null : faqId);
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <HelpCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Help Center
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Find answers to your questions and learn how to get the most out of Universal Assistant
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search for help topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-400"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Quick Start Guide
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Get up and running with Universal Assistant in minutes
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Contact Support
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Get personalized help from our support team
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Best Practices
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Learn tips and tricks for optimal performance
            </p>
          </div>
        </div>

        {/* Help Sections */}
        {!searchQuery && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Browse by Category
            </h2>
            <div className="space-y-4">
              {helpSections.map((section) => (
                <HelpCenterSection
                  key={section.id}
                  section={section}
                  isExpanded={expandedSection === section.id}
                  onToggle={() => toggleSection(section.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* FAQs */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {searchQuery ? `Search Results (${filteredFAQs.length})` : 'Frequently Asked Questions'}
          </h2>
          
          {filteredFAQs.length === 0 ? (
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No results found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Try adjusting your search terms or browse our categories above
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFAQs.map((faq) => (
                <FAQItem
                  key={faq.id}
                  faq={faq}
                  isExpanded={expandedFAQ === faq.id}
                  onToggle={() => toggleFAQ(faq.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Contact Section */}
        <div className="mt-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Still need help?
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Our support team is here to help you succeed
          </p>
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <MessageCircle className="w-4 h-4 mr-2" />
            Contact Support
          </button>
        </div>
      </div>
    </MainLayout>
  );
}