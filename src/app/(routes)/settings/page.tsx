'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layouts/MainLayout';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { useTheme } from '@/components/providers/ThemeProvider';
import { ChangePasswordModal } from '@/components/settings/ChangePasswordModal';
import { 
  User, 
  Bell, 
  Mic, 
  Speaker, 
  Palette, 
  Shield, 
  HelpCircle,
  Save,
  Camera,
  Mail,
  Lock,
  Globe,
  Volume2,
  Monitor,
  Sun,
  Moon
} from 'lucide-react';
import { SkeletonSettings, LoadingSpinner, ButtonSpinner } from '@/components/ui';

interface SettingsSectionProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  isLoading?: boolean;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  description,
  icon: Icon,
  children,
  isLoading = false,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          {isLoading ? (
            <div className="w-5 h-5 animate-pulse bg-gray-300 dark:bg-gray-600 rounded" />
          ) : (
            <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          )}
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-gray-900 dark:text-white">
            {description}
          </p>
        </div>
        {isLoading && (
          <div className="ml-auto">
            <LoadingSpinner size="sm" color="primary" />
          </div>
        )}
      </div>
      {children}
    </div>
  );
};

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label: string;
  description?: string;
  isLoading?: boolean;
  disabled?: boolean;
}

const Toggle: React.FC<ToggleProps> = ({ 
  enabled, 
  onChange, 
  label, 
  description, 
  isLoading = false, 
  disabled = false 
}) => {
  const toggleId = `toggle-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const descriptionId = description ? `${toggleId}-description` : undefined;

  const handleToggle = () => {
    if (!disabled && !isLoading) {
      const newValue = !enabled;
      console.log(`🔄 Toggle "${label}": ${enabled} → ${newValue}`);
      onChange(newValue);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <label 
          htmlFor={toggleId}
          className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
        >
          {label}
        </label>
        {description && (
          <p 
            id={descriptionId}
            className="text-xs text-gray-900 dark:text-white mt-1"
          >
            {description}
          </p>
        )}
      </div>
      <div className="flex items-center space-x-3">
        {isLoading && (
          <LoadingSpinner size="xs" color="primary" />
        )}
        <button
          id={toggleId}
          onClick={handleToggle}
          disabled={disabled || isLoading}
          role="switch"
          aria-checked={enabled}
          aria-describedby={descriptionId}
          aria-label={`Toggle ${label}`}
          className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
            enabled 
              ? 'bg-blue-600 hover:bg-blue-700 shadow-sm' 
              : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 shadow-inner'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-all duration-200 ease-in-out ${
              enabled ? 'translate-x-5' : 'translate-x-0.5'
            }`}
            aria-hidden="true"
          />
          <span className="sr-only">
            {enabled ? 'Disable' : 'Enable'} {label}
          </span>
        </button>
      </div>
    </div>
  );
};

export default function SettingsPage() {
  const { user, updateProfile } = useAuthStore();
  const { 
    audioSettings, 
    uiSettings, 
    notificationSettings,
    updateAudioSettings,
    updateUISettings,
    updateNotificationSettings,
    addNotification 
  } = useAppStore();
  const { theme, setTheme, actualTheme } = useTheme();
  const router = useRouter();

  const [profileForm, setProfileForm] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
  });

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [loadingSections, setLoadingSections] = useState<Set<string>>(new Set());
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  // Simulate initial data loading
  useEffect(() => {
    const loadSettings = async () => {
      setIsInitialLoading(true);
      try {
        // Simulate loading user preferences and settings
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Update form with user data once loaded
        if (user) {
          setProfileForm({
            displayName: user.displayName || '',
            email: user.email || '',
          });
        }
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  const setSectionLoading = (section: string, loading: boolean) => {
    setLoadingSections(prev => {
      const newSet = new Set(prev);
      if (loading) {
        newSet.add(section);
      } else {
        newSet.delete(section);
      }
      return newSet;
    });
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsProfileLoading(true);
    setSectionLoading('profile', true);
    try {
      await updateProfile({
        displayName: profileForm.displayName,
      });
      
      addNotification({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your profile has been updated successfully.',
        persistent: false,
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update profile. Please try again.',
        persistent: false,
      });
    } finally {
      setIsProfileLoading(false);
      setSectionLoading('profile', false);
    }
  };

  const handleAudioSettingChange = async (setting: keyof typeof audioSettings, value: boolean) => {
    setAudioLoading(true);
    setSectionLoading('audio', true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API call
      updateAudioSettings({ [setting]: value });
    } finally {
      setAudioLoading(false);
      setSectionLoading('audio', false);
    }
  };

  const handleNotificationSettingChange = async (setting: keyof typeof notificationSettings, value: boolean) => {
    setNotificationLoading(true);
    setSectionLoading('notifications', true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API call
      updateNotificationSettings({ [setting]: value });
    } finally {
      setNotificationLoading(false);
      setSectionLoading('notifications', false);
    }
  };

  // Show loading skeleton while initial data is loading
  if (isInitialLoading) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto">
          <SkeletonSettings />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
          <p className="text-sm sm:text-base text-gray-900 dark:text-white mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Profile Settings */}
        <SettingsSection
          title="Profile"
          description="Manage your personal information and account details"
          icon={User}
          isLoading={loadingSections.has('profile')}
        >
          <div className="space-y-4">
            {/* Profile Picture */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                {user?.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt="Profile"
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-white" />
                )}
              </div>
              <button className="flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                <Camera className="w-4 h-4 mr-2" />
                Change Photo
              </button>
            </div>

            {/* Name and Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label 
                  htmlFor="display-name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Display Name
                  <span className="required" aria-label="required"></span>
                </label>
                <input
                  id="display-name"
                  type="text"
                  value={profileForm.displayName}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, displayName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  aria-required="true"
                  autoComplete="name"
                />
              </div>
              <div>
                <label 
                  htmlFor="email-address"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Email Address
                </label>
                <input
                  id="email-address"
                  type="email"
                  value={profileForm.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                  aria-readonly="true"
                  autoComplete="email"
                  aria-describedby="email-help"
                />
                <p id="email-help" className="text-xs text-gray-900 dark:text-white mt-1">
                  Email address cannot be changed
                </p>
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={isProfileLoading || loadingSections.has('profile')}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProfileLoading || loadingSections.has('profile') ? (
                <ButtonSpinner className="mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isProfileLoading || loadingSections.has('profile') ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </SettingsSection>

        {/* Appearance Settings */}
        <SettingsSection
          title="Appearance"
          description="Customize the look and feel of your interface"
          icon={Palette}
        >
          <div className="space-y-6">
            <div>
              <label 
                id="theme-selection-label"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
              >
                Theme Preference
              </label>
              <div 
                className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                role="radiogroup"
                aria-labelledby="theme-selection-label"
              >
                {/* Light Theme Option */}
                <button
                  onClick={() => setTheme('light')}
                  className={`group relative flex flex-col items-center p-4 border-2 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    theme === 'light'
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 scale-105 shadow-lg'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:scale-102'
                  }`}
                  role="radio"
                  aria-checked={theme === 'light'}
                  aria-label="Light theme"
                >
                  {/* Theme Preview */}
                  <div className="relative w-16 h-12 mb-3 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                    <div className="absolute inset-0 bg-white">
                      <div className="h-3 bg-gray-100 border-b border-gray-200"></div>
                      <div className="p-1 space-y-1">
                        <div className="h-1 bg-gray-300 rounded w-3/4"></div>
                        <div className="h-1 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                    <Sun className={`w-4 h-4 transition-colors ${
                      theme === 'light' ? 'text-blue-600' : ''
                    }`} />
                    <span className={`text-sm font-semibold transition-colors ${
                      theme === 'light' ? 'text-blue-600' : ''
                    }`}>
                      Light
                    </span>
                  </div>
                  
                  {theme === 'light' && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </button>

                {/* Dark Theme Option */}
                <button
                  onClick={() => setTheme('dark')}
                  className={`group relative flex flex-col items-center p-4 border-2 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    theme === 'dark'
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 scale-105 shadow-lg'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:scale-102'
                  }`}
                  role="radio"
                  aria-checked={theme === 'dark'}
                  aria-label="Dark theme"
                >
                  {/* Theme Preview */}
                  <div className="relative w-16 h-12 mb-3 rounded-lg overflow-hidden border border-gray-600">
                    <div className="absolute inset-0 bg-gray-900">
                      <div className="h-3 bg-gray-800 border-b border-gray-700"></div>
                      <div className="p-1 space-y-1">
                        <div className="h-1 bg-gray-600 rounded w-3/4"></div>
                        <div className="h-1 bg-gray-700 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                    <Moon className={`w-4 h-4 transition-colors ${
                      theme === 'dark' ? 'text-blue-600 dark:text-blue-400' : ''
                    }`} />
                    <span className={`text-sm font-semibold transition-colors ${
                      theme === 'dark' ? 'text-blue-600 dark:text-blue-400' : ''
                    }`}>
                      Dark
                    </span>
                  </div>
                  
                  {theme === 'dark' && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </button>

                {/* System Theme Option */}
                <button
                  onClick={() => setTheme('system')}
                  className={`group relative flex flex-col items-center p-4 border-2 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    theme === 'system'
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 scale-105 shadow-lg'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:scale-102'
                  }`}
                  role="radio"
                  aria-checked={theme === 'system'}
                  aria-label="System theme (automatic)"
                >
                  {/* Theme Preview - Split Light/Dark */}
                  <div className="relative w-16 h-12 mb-3 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                    <div className="absolute inset-0 flex">
                      <div className="w-1/2 bg-white">
                        <div className="h-3 bg-gray-100"></div>
                        <div className="p-1 space-y-1">
                          <div className="h-1 bg-gray-300 rounded w-3/4"></div>
                          <div className="h-1 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                      <div className="w-1/2 bg-gray-900">
                        <div className="h-3 bg-gray-800"></div>
                        <div className="p-1 space-y-1">
                          <div className="h-1 bg-gray-600 rounded w-3/4"></div>
                          <div className="h-1 bg-gray-700 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                    <Monitor className={`w-4 h-4 transition-colors ${
                      theme === 'system' ? 'text-blue-600 dark:text-blue-400' : ''
                    }`} />
                    <span className={`text-sm font-semibold transition-colors ${
                      theme === 'system' ? 'text-blue-600 dark:text-blue-400' : ''
                    }`}>
                      System
                    </span>
                  </div>
                  
                  {theme === 'system' && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </button>
              </div>
              
              {/* Current Theme Status */}
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Current theme:
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white capitalize flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      actualTheme === 'dark' ? 'bg-gray-800 dark:bg-gray-200' : 'bg-yellow-400'
                    }`}></div>
                    <span>{actualTheme}</span>
                  </span>
                </div>
                {theme === 'system' && (
                  <p className="text-xs text-gray-900 dark:text-white mt-1">
                    Automatically switches based on your system preference
                  </p>
                )}
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Audio Settings */}
        <SettingsSection
          title="Audio"
          description="Configure your microphone and speaker settings"
          icon={Mic}
          isLoading={loadingSections.has('audio')}
        >
          <div className="space-y-4">
            <div>
              <label 
                htmlFor="microphone-select"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Microphone
              </label>
              <select 
                id="microphone-select"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                aria-describedby="microphone-help"
              >
                <option value="default">Default Microphone</option>
                <option value="builtin">Built-in Microphone</option>
                <option value="external">External Microphone</option>
              </select>
              <p id="microphone-help" className="text-xs text-gray-900 dark:text-white mt-1">
                Select your preferred microphone for voice recording
              </p>
            </div>

            <div>
              <label 
                htmlFor="speaker-select"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Speaker
              </label>
              <select 
                id="speaker-select"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                aria-describedby="speaker-help"
              >
                <option value="default">Default Speaker</option>
                <option value="builtin">Built-in Speakers</option>
                <option value="headphones">Headphones</option>
              </select>
              <p id="speaker-help" className="text-xs text-gray-900 dark:text-white mt-1">
                Select your preferred speaker for audio playback
              </p>
            </div>

            <div className="space-y-3">
              <Toggle
                enabled={audioSettings.noiseSuppression}
                onChange={(enabled) => handleAudioSettingChange('noiseSuppression', enabled)}
                label="Noise Suppression"
                description="Reduce background noise during recordings"
                isLoading={audioLoading}
                disabled={loadingSections.has('audio')}
              />
              <Toggle
                enabled={audioSettings.echoCancellation}
                onChange={(enabled) => handleAudioSettingChange('echoCancellation', enabled)}
                label="Echo Cancellation"
                description="Prevent audio feedback and echo"
                isLoading={audioLoading}
                disabled={loadingSections.has('audio')}
              />
              <Toggle
                enabled={audioSettings.autoGainControl}
                onChange={(enabled) => handleAudioSettingChange('autoGainControl', enabled)}
                label="Auto Gain Control"
                description="Automatically adjust microphone volume"
                isLoading={audioLoading}
                disabled={loadingSections.has('audio')}
              />
            </div>
          </div>
        </SettingsSection>

        {/* Notification Settings */}
        <SettingsSection
          title="Notifications"
          description="Choose what notifications you want to receive"
          icon={Bell}
          isLoading={loadingSections.has('notifications')}
        >
          <div className="space-y-3">
            <Toggle
              enabled={notificationSettings.meetingReminders}
              onChange={(enabled) => handleNotificationSettingChange('meetingReminders', enabled)}
              label="Meeting Reminders"
              description="Get notified before scheduled meetings"
              isLoading={notificationLoading}
              disabled={loadingSections.has('notifications')}
            />
            <Toggle
              enabled={notificationSettings.transcriptionComplete}
              onChange={(enabled) => handleNotificationSettingChange('transcriptionComplete', enabled)}
              label="Transcription Complete"
              description="Notify when meeting transcription is ready"
              isLoading={notificationLoading}
              disabled={loadingSections.has('notifications')}
            />
            <Toggle
              enabled={notificationSettings.systemUpdates}
              onChange={(enabled) => handleNotificationSettingChange('systemUpdates', enabled)}
              label="System Updates"
              description="Receive updates about new features and improvements"
              isLoading={notificationLoading}
              disabled={loadingSections.has('notifications')}
            />
            <Toggle
              enabled={notificationSettings.securityAlerts}
              onChange={(enabled) => handleNotificationSettingChange('securityAlerts', enabled)}
              label="Security Alerts"
              description="Important security and account notifications"
              isLoading={notificationLoading}
              disabled={loadingSections.has('notifications')}
            />
          </div>
        </SettingsSection>

        {/* Privacy & Security */}
        <SettingsSection
          title="Privacy & Security"
          description="Manage your privacy settings and account security"
          icon={Shield}
        >
          <div className="space-y-4">
            <button 
              onClick={() => setShowChangePasswordModal(true)}
              className="flex items-center justify-between w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center">
                <Lock className="w-5 h-5 mr-3 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-900 dark:text-white">Change Password</span>
              </div>
              <span className="text-gray-400">›</span>
            </button>
            
            <button 
              onClick={() => router.push('/privacy-policy')}
              className="flex items-center justify-between w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center">
                <Globe className="w-5 h-5 mr-3 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-900 dark:text-white">Privacy Policy</span>
              </div>
              <span className="text-gray-400">›</span>
            </button>
            
            <button 
              onClick={() => router.push('/settings/2fa')}
              className="flex items-center justify-between w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center">
                <Shield className="w-5 h-5 mr-3 text-gray-600 dark:text-gray-400" />
                <div className="text-left">
                  <div className="text-gray-900 dark:text-white">Two-Factor Authentication</div>
                  <div className="text-xs text-gray-900 dark:text-white">Add an extra layer of security to your account</div>
                </div>
              </div>
              <span className="text-gray-400">›</span>
            </button>
          </div>
        </SettingsSection>

        {/* Help & Support */}
        <SettingsSection
          title="Help & Support"
          description="Get help and contact support"
          icon={HelpCircle}
        >
          <div className="space-y-4">
            <button 
              onClick={() => router.push('/help-center')}
              className="flex items-center justify-between w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center">
                <HelpCircle className="w-5 h-5 mr-3 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-900 dark:text-white">Help Center</span>
              </div>
              <span className="text-gray-400">›</span>
            </button>
            
            <button 
              onClick={() => router.push('/contact-support')}
              className="flex items-center justify-between w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center">
                <Mail className="w-5 h-5 mr-3 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-900 dark:text-white">Contact Support</span>
              </div>
              <span className="text-gray-400">›</span>
            </button>
          </div>
        </SettingsSection>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onSuccess={() => {
          addNotification({
            type: 'success',
            title: 'Password Changed',
            message: 'Your password has been updated successfully.',
            persistent: false,
          });
        }}
      />
    </MainLayout>
  );
}