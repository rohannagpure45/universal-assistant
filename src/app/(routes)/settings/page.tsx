'use client';

import React, { useState } from 'react';
import { MainLayout } from '@/components/layouts/MainLayout';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { useTheme } from '@/components/providers/ThemeProvider';
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

interface SettingsSectionProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  description,
  icon: Icon,
  children,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
        </div>
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
}

const Toggle: React.FC<ToggleProps> = ({ enabled, onChange, label, description }) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <label className="text-sm font-medium text-gray-900 dark:text-white">
          {label}
        </label>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {description}
          </p>
        )}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
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
  const { theme, setTheme } = useTheme();

  const [profileForm, setProfileForm] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Profile Settings */}
        <SettingsSection
          title="Profile"
          description="Manage your personal information and account details"
          icon={User}
        >
          <div className="space-y-4">
            {/* Profile Picture */}
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Profile"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={profileForm.displayName}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, displayName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={profileForm.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                />
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={isLoading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </button>
          </div>
        </SettingsSection>

        {/* Appearance Settings */}
        <SettingsSection
          title="Appearance"
          description="Customize the look and feel of your interface"
          icon={Palette}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Theme
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex items-center justify-center p-3 border rounded-lg transition-colors ${
                    theme === 'light'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Sun className="w-5 h-5 mr-2" />
                  Light
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex items-center justify-center p-3 border rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Moon className="w-5 h-5 mr-2" />
                  Dark
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={`flex items-center justify-center p-3 border rounded-lg transition-colors ${
                    theme === 'system'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Monitor className="w-5 h-5 mr-2" />
                  System
                </button>
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Audio Settings */}
        <SettingsSection
          title="Audio"
          description="Configure your microphone and speaker settings"
          icon={Mic}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Microphone
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white">
                <option>Default Microphone</option>
                <option>Built-in Microphone</option>
                <option>External Microphone</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Speaker
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white">
                <option>Default Speaker</option>
                <option>Built-in Speakers</option>
                <option>Headphones</option>
              </select>
            </div>

            <div className="space-y-3">
              <Toggle
                enabled={audioSettings.noiseSuppression}
                onChange={(enabled) => updateAudioSettings({ noiseSuppression: enabled })}
                label="Noise Suppression"
                description="Reduce background noise during recordings"
              />
              <Toggle
                enabled={audioSettings.echoCancellation}
                onChange={(enabled) => updateAudioSettings({ echoCancellation: enabled })}
                label="Echo Cancellation"
                description="Prevent audio feedback and echo"
              />
              <Toggle
                enabled={audioSettings.autoGainControl}
                onChange={(enabled) => updateAudioSettings({ autoGainControl: enabled })}
                label="Auto Gain Control"
                description="Automatically adjust microphone volume"
              />
            </div>
          </div>
        </SettingsSection>

        {/* Notification Settings */}
        <SettingsSection
          title="Notifications"
          description="Choose what notifications you want to receive"
          icon={Bell}
        >
          <div className="space-y-3">
            <Toggle
              enabled={notificationSettings.meetingReminders}
              onChange={(enabled) => updateNotificationSettings({ meetingReminders: enabled })}
              label="Meeting Reminders"
              description="Get notified before scheduled meetings"
            />
            <Toggle
              enabled={notificationSettings.transcriptionComplete}
              onChange={(enabled) => updateNotificationSettings({ transcriptionComplete: enabled })}
              label="Transcription Complete"
              description="Notify when meeting transcription is ready"
            />
            <Toggle
              enabled={notificationSettings.systemUpdates}
              onChange={(enabled) => updateNotificationSettings({ systemUpdates: enabled })}
              label="System Updates"
              description="Receive updates about new features and improvements"
            />
            <Toggle
              enabled={notificationSettings.securityAlerts}
              onChange={(enabled) => updateNotificationSettings({ securityAlerts: enabled })}
              label="Security Alerts"
              description="Important security and account notifications"
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
            <button className="flex items-center justify-between w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="flex items-center">
                <Lock className="w-5 h-5 mr-3 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-900 dark:text-white">Change Password</span>
              </div>
              <span className="text-gray-400">›</span>
            </button>
            
            <button className="flex items-center justify-between w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="flex items-center">
                <Globe className="w-5 h-5 mr-3 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-900 dark:text-white">Privacy Policy</span>
              </div>
              <span className="text-gray-400">›</span>
            </button>
            
            <Toggle
              enabled={true}
              onChange={() => {}}
              label="Two-Factor Authentication"
              description="Add an extra layer of security to your account"
            />
          </div>
        </SettingsSection>

        {/* Help & Support */}
        <SettingsSection
          title="Help & Support"
          description="Get help and contact support"
          icon={HelpCircle}
        >
          <div className="space-y-4">
            <button className="flex items-center justify-between w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="flex items-center">
                <HelpCircle className="w-5 h-5 mr-3 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-900 dark:text-white">Help Center</span>
              </div>
              <span className="text-gray-400">›</span>
            </button>
            
            <button className="flex items-center justify-between w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="flex items-center">
                <Mail className="w-5 h-5 mr-3 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-900 dark:text-white">Contact Support</span>
              </div>
              <span className="text-gray-400">›</span>
            </button>
          </div>
        </SettingsSection>
      </div>
    </MainLayout>
  );
}