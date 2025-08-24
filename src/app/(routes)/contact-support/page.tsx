'use client';

import React, { useState } from 'react';
import { MainLayout } from '@/components/layouts/MainLayout';
import { 
  Mail, 
  MessageCircle, 
  Send, 
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  HelpCircle
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

interface ContactForm {
  subject: string;
  category: string;
  message: string;
  priority: string;
}

const categories = [
  { value: 'technical', label: 'Technical Issue' },
  { value: 'billing', label: 'Billing & Subscription' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'bug', label: 'Bug Report' },
  { value: 'general', label: 'General Inquiry' },
  { value: 'privacy', label: 'Privacy & Security' },
  { value: 'account', label: 'Account Management' },
  { value: 'other', label: 'Other' }
];

const priorities = [
  { value: 'low', label: 'Low', description: 'General questions, non-urgent issues' },
  { value: 'medium', label: 'Medium', description: 'Standard support requests' },
  { value: 'high', label: 'High', description: 'Service disruption, important issues' },
  { value: 'urgent', label: 'Urgent', description: 'Critical issues affecting business operations' }
];

export default function ContactSupportPage() {
  const { user } = useAuthStore();
  const [form, setForm] = useState<ContactForm>({
    subject: '',
    category: '',
    message: '',
    priority: 'medium'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Partial<ContactForm>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<ContactForm> = {};

    if (!form.subject.trim()) {
      newErrors.subject = 'Subject is required';
    } else if (form.subject.length < 5) {
      newErrors.subject = 'Subject must be at least 5 characters';
    }

    if (!form.category) {
      newErrors.category = 'Please select a category';
    }

    if (!form.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (form.message.length < 20) {
      newErrors.message = 'Message must be at least 20 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Simulate form submission
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real implementation, this would send the form data to your backend
      console.log('Support ticket submitted:', {
        userEmail: user?.email,
        userDisplayName: user?.displayName,
        ...form,
        timestamp: new Date().toISOString()
      });

      setIsSubmitted(true);
    } catch (error) {
      console.error('Error submitting support request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof ContactForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (isSubmitted) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Message Sent Successfully!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Thank you for contacting us. We've received your message and will get back to you within 24 hours.
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                What happens next?
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                <li>• Our team will review your request</li>
                <li>• You'll receive a confirmation email shortly</li>
                <li>• We'll respond via email within 24 hours</li>
                <li>• For urgent issues, we may contact you directly</li>
              </ul>
            </div>
            <button
              onClick={() => {
                setIsSubmitted(false);
                setForm({ subject: '', category: '', message: '', priority: 'medium' });
              }}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Send Another Message
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Contact Support
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Need help? We're here to assist you. Send us a message and we'll get back to you as soon as possible.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Information */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Get in Touch
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Email Support
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      rohan@linkstudio.ai
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <MessageCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Slack Support
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Rohan Nagpure
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Response Time
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Within 24 hours
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Before contacting support:
                </h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Check our Help Center for quick answers</li>
                  <li>• Try refreshing your browser</li>
                  <li>• Verify your internet connection</li>
                  <li>• Include relevant error messages</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Send us a message
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* User Info Display */}
                {user && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Signed in as: {user.displayName || user.email}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Subject */}
                <div>
                  <label 
                    htmlFor="subject" 
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Subject *
                  </label>
                  <input
                    id="subject"
                    type="text"
                    value={form.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                      errors.subject 
                        ? 'border-red-300 dark:border-red-600' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Brief description of your issue or question"
                  />
                  {errors.subject && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.subject}
                    </p>
                  )}
                </div>

                {/* Category and Priority */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label 
                      htmlFor="category" 
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      Category *
                    </label>
                    <select
                      id="category"
                      value={form.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                        errors.category 
                          ? 'border-red-300 dark:border-red-600' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <option value="">Select a category</option>
                      {categories.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                    {errors.category && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {errors.category}
                      </p>
                    )}
                  </div>

                  <div>
                    <label 
                      htmlFor="priority" 
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      Priority
                    </label>
                    <select
                      id="priority"
                      value={form.priority}
                      onChange={(e) => handleInputChange('priority', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    >
                      {priorities.map((priority) => (
                        <option key={priority.value} value={priority.value}>
                          {priority.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {priorities.find(p => p.value === form.priority)?.description}
                    </p>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label 
                    htmlFor="message" 
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Message *
                  </label>
                  <textarea
                    id="message"
                    rows={6}
                    value={form.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none ${
                      errors.message 
                        ? 'border-red-300 dark:border-red-600' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Please provide as much detail as possible about your issue or question. Include any error messages, steps to reproduce the issue, and what you expected to happen."
                  />
                  {errors.message && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.message}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {form.message.length}/500 characters minimum 20
                  </p>
                </div>

                {/* Submit Button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <AlertCircle className="w-4 h-4" />
                    <span>Fields marked with * are required</span>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}