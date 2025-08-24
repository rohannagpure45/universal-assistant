'use client';

import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layouts/MainLayout';
import { 
  Shield, 
  Smartphone, 
  Key, 
  Copy, 
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Lock,
  Unlock,
  RefreshCw
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';

interface BackupCode {
  code: string;
  used: boolean;
}

export default function TwoFactorAuthPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [step, setStep] = useState<'setup' | 'verify' | 'complete'>('setup');
  const [error, setError] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<BackupCode[]>([]);

  // Simulate checking current 2FA status
  useEffect(() => {
    // In a real implementation, this would check Firebase Auth MFA status
    const check2FAStatus = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsEnabled(false); // Simulated: user doesn't have 2FA enabled
      } catch (error) {
        console.error('Error checking 2FA status:', error);
      }
    };

    check2FAStatus();
  }, []);

  const generateBackupCodes = (): BackupCode[] => {
    const codes: BackupCode[] = [];
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push({ code, used: false });
    }
    return codes;
  };

  const handleEnable2FA = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }

    setIsEnabling(true);
    setError(null);

    try {
      // Simulate Firebase MFA enrollment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate backup codes
      const codes = generateBackupCodes();
      setBackupCodes(codes);
      
      setStep('verify');
    } catch (error) {
      setError('Failed to send verification code. Please try again.');
    } finally {
      setIsEnabling(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    if (verificationCode.length !== 6) {
      setError('Verification code must be 6 digits');
      return;
    }

    setIsEnabling(true);
    setError(null);

    try {
      // Simulate verification
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate successful verification (in real app, check the code)
      if (verificationCode === '123456') {
        setIsEnabled(true);
        setStep('complete');
        setShowBackupCodes(true);
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } catch (error) {
      setError('Failed to verify code. Please try again.');
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDisable2FA = async () => {
    setIsDisabling(true);
    setError(null);

    try {
      // Simulate disabling 2FA
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIsEnabled(false);
      setStep('setup');
      setPhoneNumber('');
      setVerificationCode('');
      setBackupCodes([]);
      setShowBackupCodes(false);
    } catch (error) {
      setError('Failed to disable 2FA. Please try again.');
    } finally {
      setIsDisabling(false);
    }
  };

  const copyBackupCodes = () => {
    const codesText = backupCodes.map(bc => bc.code).join('\n');
    navigator.clipboard.writeText(codesText);
  };

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const match = numbers.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (match) {
      return !match[2] ? match[1] : `(${match[1]}) ${match[2]}${match[3] ? `-${match[3]}` : ''}`;
    }
    return value;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={() => router.push('/settings')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Two-Factor Authentication
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Add an extra layer of security to your account
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {/* Current Status */}
          <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${
                isEnabled 
                  ? 'bg-green-100 dark:bg-green-900/20' 
                  : 'bg-red-100 dark:bg-red-900/20'
              }`}>
                {isEnabled ? (
                  <Lock className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <Unlock className="w-5 h-5 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  2FA Status: {isEnabled ? 'Enabled' : 'Disabled'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isEnabled 
                    ? 'Your account is protected with two-factor authentication'
                    : 'Your account is not protected with two-factor authentication'
                  }
                </p>
              </div>
            </div>
            
            {isEnabled && (
              <button
                onClick={handleDisable2FA}
                disabled={isDisabling}
                className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isDisabling ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                    <span>Disabling...</span>
                  </div>
                ) : (
                  'Disable 2FA'
                )}
              </button>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}

          {!isEnabled && (
            <>
              {/* Setup Step */}
              {step === 'setup' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Enable Two-Factor Authentication
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      We'll send a verification code to your phone number when you sign in.
                    </p>
                  </div>

                  <div>
                    <label 
                      htmlFor="phone-number"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      Phone Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Smartphone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="phone-number"
                        type="tel"
                        value={phoneNumber}
                        onChange={handlePhoneChange}
                        placeholder="(555) 123-4567"
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        maxLength={14}
                      />
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Enter your phone number to receive verification codes
                    </p>
                  </div>

                  <button
                    onClick={handleEnable2FA}
                    disabled={isEnabling || !phoneNumber.trim()}
                    className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isEnabling ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Sending Code...
                      </>
                    ) : (
                      <>
                        <Shield className="w-5 h-5 mr-2" />
                        Enable 2FA
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Verification Step */}
              {step === 'verify' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Verify Your Phone Number
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      We've sent a 6-digit code to {phoneNumber}. Enter it below to complete setup.
                    </p>
                  </div>

                  <div>
                    <label 
                      htmlFor="verification-code"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      Verification Code
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Key className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="verification-code"
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="123456"
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-center text-lg tracking-widest"
                        maxLength={6}
                      />
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Enter the 6-digit code sent to your phone (use 123456 for demo)
                    </p>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => setStep('setup')}
                      className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleVerify2FA}
                      disabled={isEnabling || verificationCode.length !== 6}
                      className="flex-1 flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isEnabling ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Verifying...
                        </>
                      ) : (
                        'Verify & Enable'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Complete Step */}
              {step === 'complete' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      2FA Successfully Enabled!
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Your account is now protected with two-factor authentication.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Backup Codes Section */}
          {(isEnabled || showBackupCodes) && (
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Backup Codes
                </h3>
                <button
                  onClick={copyBackupCodes}
                  className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy All</span>
                </button>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Save these backup codes in a safe place. You can use them to access your account if you lose your phone.
              </p>
              
              <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg font-mono text-sm">
                {backupCodes.map((backup, index) => (
                  <div 
                    key={index}
                    className={`p-2 rounded border ${
                      backup.used 
                        ? 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 line-through' 
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                    }`}
                  >
                    {backup.code}
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-300">
                    <p className="font-semibold mb-1">Important:</p>
                    <ul className="space-y-1">
                      <li>• Each backup code can only be used once</li>
                      <li>• Store these codes in a secure location</li>
                      <li>• Generate new codes if you suspect they've been compromised</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}