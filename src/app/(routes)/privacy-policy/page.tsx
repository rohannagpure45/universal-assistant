'use client';

import React from 'react';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Shield, Lock, Eye, Database, Users, Globe, FileText, Mail } from 'lucide-react';

const PrivacySection: React.FC<{
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}> = ({ title, icon: Icon, children }) => (
  <section className="mb-8">
    <div className="flex items-center space-x-3 mb-4">
      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
        {title}
      </h2>
    </div>
    <div className="prose prose-gray dark:prose-invert max-w-none">
      {children}
    </div>
  </section>
);

export default function PrivacyPolicyPage() {
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Privacy Policy
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Last updated: {new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {/* Introduction */}
          <div className="mb-8">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Universal Assistant ("we," "our," or "us") is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
              when you use our AI-powered meeting assistant service. Please read this policy carefully 
              to understand our practices regarding your personal information.
            </p>
          </div>

          {/* Data Collection */}
          <PrivacySection title="Information We Collect" icon={Database}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Personal Information
            </h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300 mb-4">
              <li>Account information (name, email address, profile picture)</li>
              <li>Authentication credentials and security settings</li>
              <li>User preferences and application settings</li>
              <li>Billing and payment information (processed by third-party providers)</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Meeting and Audio Data
            </h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300 mb-4">
              <li>Audio recordings and voice samples for speaker identification</li>
              <li>Meeting transcripts and conversation content</li>
              <li>Meeting metadata (participants, duration, timestamps)</li>
              <li>AI-generated summaries and insights</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Technical Information
            </h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>Device information and browser details</li>
              <li>IP address and location data</li>
              <li>Usage analytics and performance metrics</li>
              <li>Error logs and diagnostic information</li>
            </ul>
          </PrivacySection>

          {/* Data Usage */}
          <PrivacySection title="How We Use Your Information" icon={Eye}>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We use the collected information for the following purposes:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>Provide and maintain our meeting assistant services</li>
              <li>Process and transcribe audio recordings</li>
              <li>Generate AI-powered meeting insights and summaries</li>
              <li>Identify speakers and improve voice recognition accuracy</li>
              <li>Personalize your experience and remember your preferences</li>
              <li>Communicate with you about service updates and support</li>
              <li>Ensure security and prevent fraudulent activities</li>
              <li>Comply with legal obligations and resolve disputes</li>
              <li>Improve our services through analytics and research</li>
            </ul>
          </PrivacySection>

          {/* Data Storage */}
          <PrivacySection title="Data Storage and Security" icon={Lock}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Storage Infrastructure
            </h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300 mb-4">
              <li>Data is stored securely using Firebase Cloud services with enterprise-grade security</li>
              <li>Audio files are encrypted both in transit and at rest</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Access controls and authentication mechanisms protect your data</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Data Retention
            </h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>Meeting recordings: Retained based on your account settings (default: 30 days)</li>
              <li>Voice samples: Retained for speaker identification purposes</li>
              <li>Account information: Retained until account deletion</li>
              <li>Analytics data: Aggregated and anonymized after 90 days</li>
            </ul>
          </PrivacySection>

          {/* Third-Party Services */}
          <PrivacySection title="Third-Party Services" icon={Globe}>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We integrate with the following third-party services to provide our functionality:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li><strong>OpenAI & Anthropic:</strong> AI model processing for conversation analysis</li>
              <li><strong>Deepgram:</strong> Real-time speech-to-text transcription services</li>
              <li><strong>ElevenLabs:</strong> Text-to-speech synthesis for AI responses</li>
              <li><strong>Firebase/Google Cloud:</strong> Authentication, database, and storage services</li>
              <li><strong>Payment Processors:</strong> Secure payment processing (when applicable)</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mt-4">
              These services have their own privacy policies and security measures. We carefully 
              vet all third-party providers and ensure they meet our security standards.
            </p>
          </PrivacySection>

          {/* Cookies and Tracking */}
          <PrivacySection title="Cookies and Tracking" icon={FileText}>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We use cookies and similar technologies to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>Maintain your login session and authentication state</li>
              <li>Remember your preferences and settings</li>
              <li>Analyze usage patterns and improve our services</li>
              <li>Ensure security and prevent unauthorized access</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mt-4">
              You can control cookie settings through your browser preferences, though some 
              functionality may be limited if you disable certain cookies.
            </p>
          </PrivacySection>

          {/* User Rights */}
          <PrivacySection title="Your Rights and Choices" icon={Users}>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Under applicable privacy laws (GDPR, CCPA, etc.), you have the following rights:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Correct inaccurate or incomplete information</li>
              <li><strong>Erasure:</strong> Request deletion of your personal data</li>
              <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
              <li><strong>Restriction:</strong> Limit how we process your information</li>
              <li><strong>Objection:</strong> Object to certain types of data processing</li>
              <li><strong>Withdraw Consent:</strong> Revoke previously given consent</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mt-4">
              To exercise these rights, please contact us using the information provided below.
            </p>
          </PrivacySection>

          {/* Data Retention */}
          <PrivacySection title="Data Retention Policy" icon={Database}>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We retain your information only as long as necessary to provide our services:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>Active accounts: Data retained while account is active</li>
              <li>Deleted accounts: Most data deleted within 30 days</li>
              <li>Legal requirements: Some data may be retained longer for compliance</li>
              <li>Backup systems: Data in backups may persist for up to 90 days</li>
              <li>Anonymized analytics: May be retained indefinitely for service improvement</li>
            </ul>
          </PrivacySection>

          {/* Security Measures */}
          <PrivacySection title="Security Measures" icon={Shield}>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We implement comprehensive security measures to protect your information:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>End-to-end encryption for sensitive data transmission</li>
              <li>Regular security audits and penetration testing</li>
              <li>Multi-factor authentication and access controls</li>
              <li>Employee security training and background checks</li>
              <li>Incident response and breach notification procedures</li>
              <li>Compliance with industry security standards</li>
            </ul>
          </PrivacySection>

          {/* Contact Information */}
          <PrivacySection title="Contact Information" icon={Mail}>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              If you have questions about this Privacy Policy or wish to exercise your rights, 
              please contact us:
            </p>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="space-y-2 text-gray-700 dark:text-gray-300">
                <p><strong>Email:</strong> rohan@linkstudio.ai</p>
                <p><strong>Slack:</strong> Rohan Nagpure</p>
                <p><strong>Response Time:</strong> We will respond to privacy requests within 30 days</p>
              </div>
            </div>
          </PrivacySection>

          {/* Policy Updates */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Policy Updates
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              We may update this Privacy Policy from time to time to reflect changes in our 
              practices or applicable laws. We will notify you of any material changes by posting 
              the updated policy on our website and updating the "Last updated" date above. 
              We encourage you to review this policy periodically to stay informed about how 
              we protect your privacy.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}