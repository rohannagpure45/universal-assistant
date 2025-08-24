/**
 * Speaker Settings Panel
 * 
 * Global configuration interface for the voice identification system.
 * Provides settings for identification thresholds, algorithms, privacy policies,
 * data retention, and system performance tuning.
 * 
 * Features:
 * - Identification threshold configuration
 * - Algorithm selection and tuning
 * - Privacy and data retention settings
 * - Export/import system configuration
 * - Performance optimization controls
 * - System monitoring and alerts
 * 
 * @fileoverview Global speaker identification system settings
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Sliders, 
  Shield, 
  Database, 
  Download, 
  Upload, 
  Save, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Bell, 
  Zap, 
  Clock, 
  Target, 
  Activity,
  Eye,
  Lock,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import type { VoiceIdentificationConfig } from '@/types/voice-identification';

// Settings configuration interface
interface SystemSettings {
  identification: {
    autoIdentifyThreshold: number;
    minConfidenceThreshold: number;
    maxSamplesPerProfile: number;
    sampleDurationMin: number;
    sampleDurationMax: number;
    sampleDurationOptimal: number;
    enableAutoMerging: boolean;
    mergeThreshold: number;
    enableRealTimeProcessing: boolean;
  };
  privacy: {
    dataRetentionDays: number;
    anonymizeAfterDays: number;
    allowDataExport: boolean;
    requireExplicitConsent: boolean;
    enableAuditLogging: boolean;
    encryptStoredData: boolean;
  };
  performance: {
    maxConcurrentProcessing: number;
    cacheExpirationHours: number;
    enableBackgroundProcessing: boolean;
    processingQuality: 'fast' | 'balanced' | 'accurate';
    enableGpuAcceleration: boolean;
    memoryLimitMB: number;
  };
  notifications: {
    enableSystemAlerts: boolean;
    alertThresholds: {
      lowConfidence: number;
      highErrorRate: number;
      storageLimit: number;
    };
    emailNotifications: boolean;
    webhookUrl: string;
  };
  advanced: {
    debugMode: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    enableExperimentalFeatures: boolean;
    customModelPath: string;
    apiRateLimit: number;
  };
}

// Default settings
const defaultSettings: SystemSettings = {
  identification: {
    autoIdentifyThreshold: 0.8,
    minConfidenceThreshold: 0.7,
    maxSamplesPerProfile: 5,
    sampleDurationMin: 3,
    sampleDurationMax: 30,
    sampleDurationOptimal: 10,
    enableAutoMerging: false,
    mergeThreshold: 0.85,
    enableRealTimeProcessing: true,
  },
  privacy: {
    dataRetentionDays: 365,
    anonymizeAfterDays: 90,
    allowDataExport: true,
    requireExplicitConsent: true,
    enableAuditLogging: true,
    encryptStoredData: true,
  },
  performance: {
    maxConcurrentProcessing: 4,
    cacheExpirationHours: 24,
    enableBackgroundProcessing: true,
    processingQuality: 'balanced',
    enableGpuAcceleration: false,
    memoryLimitMB: 512,
  },
  notifications: {
    enableSystemAlerts: true,
    alertThresholds: {
      lowConfidence: 0.6,
      highErrorRate: 0.1,
      storageLimit: 0.8,
    },
    emailNotifications: false,
    webhookUrl: '',
  },
  advanced: {
    debugMode: false,
    logLevel: 'info',
    enableExperimentalFeatures: false,
    customModelPath: '',
    apiRateLimit: 100,
  },
};

export const SpeakerSettingsPanel: React.FC = () => {
  // State management
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [originalSettings, setOriginalSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  // Load settings from storage/API
  const loadSettings = async () => {
    try {
      setError(null);
      // TODO: Load actual settings from backend/storage
      // For now, use default settings
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate loading
      
      setSettings(defaultSettings);
      setOriginalSettings(defaultSettings);
    } catch (err) {
      console.error('Error loading settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  // Save settings
  const saveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // TODO: Save settings to backend/storage
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate saving
      
      setOriginalSettings(settings);
      setHasChanges(false);
      
      // Show success notification
      console.log('Settings saved successfully');
      
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Reset settings to defaults
  const resetToDefaults = () => {
    setSettings(defaultSettings);
    setHasChanges(true);
  };

  // Revert unsaved changes
  const revertChanges = () => {
    setSettings(originalSettings);
    setHasChanges(false);
  };

  // Export settings
  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `speaker-settings-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import settings
  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target?.result as string);
        setSettings(importedSettings);
        setHasChanges(true);
      } catch (err) {
        setError('Invalid settings file format');
      }
    };
    reader.readAsText(file);
  };

  // Test webhook connection
  const testWebhookConnection = async () => {
    if (!settings.notifications.webhookUrl) return;

    setTestingConnection(true);
    try {
      // TODO: Implement actual webhook test
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Webhook test successful');
    } catch (err) {
      setError('Webhook test failed');
    } finally {
      setTestingConnection(false);
    }
  };

  // Update settings helper
  const updateSettings = (path: string, value: any) => {
    const keys = path.split('.');
    const newSettings = { ...settings };
    let current: any = newSettings;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setSettings(newSettings);
    setHasChanges(true);
  };

  // Initial load
  useEffect(() => {
    loadSettings();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading system settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Speaker System Settings</h1>
          <p className="text-muted-foreground">
            Configure global settings for the voice identification system
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".json"
            onChange={importSettings}
            className="hidden"
            id="import-settings"
          />
          
          <Button
            variant="outline"
            size="sm"
            onClick={exportSettings}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('import-settings')?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          
          {hasChanges && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={revertChanges}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Revert
              </Button>
              
              <Button
                size="sm"
                onClick={saveSettings}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Changes indicator */}
      {hasChanges && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Unsaved Changes</AlertTitle>
          <AlertDescription>
            You have unsaved changes to your system settings. Remember to save your changes.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Settings Tabs */}
      <Tabs defaultValue="identification" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="identification">Identification</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* Identification Settings */}
        <TabsContent value="identification" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Identification Thresholds
              </CardTitle>
              <CardDescription>
                Configure confidence thresholds for automatic speaker identification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Auto-Identify Threshold</Label>
                    <div className="mt-2">
                      <Slider
                        value={[settings.identification.autoIdentifyThreshold]}
                        onValueChange={([value]) => updateSettings('identification.autoIdentifyThreshold', value)}
                        max={1}
                        min={0}
                        step={0.01}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground mt-1">
                        <span>0%</span>
                        <span>{(settings.identification.autoIdentifyThreshold * 100).toFixed(0)}%</span>
                        <span>100%</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Minimum confidence required for automatic identification
                    </p>
                  </div>

                  <div>
                    <Label>Minimum Confidence Threshold</Label>
                    <div className="mt-2">
                      <Slider
                        value={[settings.identification.minConfidenceThreshold]}
                        onValueChange={([value]) => updateSettings('identification.minConfidenceThreshold', value)}
                        max={1}
                        min={0}
                        step={0.01}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground mt-1">
                        <span>0%</span>
                        <span>{(settings.identification.minConfidenceThreshold * 100).toFixed(0)}%</span>
                        <span>100%</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Minimum confidence to consider an identification valid
                    </p>
                  </div>

                  <div>
                    <Label>Merge Threshold</Label>
                    <div className="mt-2">
                      <Slider
                        value={[settings.identification.mergeThreshold]}
                        onValueChange={([value]) => updateSettings('identification.mergeThreshold', value)}
                        max={1}
                        min={0}
                        step={0.01}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground mt-1">
                        <span>0%</span>
                        <span>{(settings.identification.mergeThreshold * 100).toFixed(0)}%</span>
                        <span>100%</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Similarity threshold for automatic profile merging
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="maxSamples">Max Samples per Profile</Label>
                    <Input
                      id="maxSamples"
                      type="number"
                      min="1"
                      max="20"
                      value={settings.identification.maxSamplesPerProfile}
                      onChange={(e) => updateSettings('identification.maxSamplesPerProfile', parseInt(e.target.value))}
                      className="mt-2"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Maximum number of voice samples to store per profile
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label htmlFor="minDuration">Min Duration (s)</Label>
                      <Input
                        id="minDuration"
                        type="number"
                        min="1"
                        max="10"
                        value={settings.identification.sampleDurationMin}
                        onChange={(e) => updateSettings('identification.sampleDurationMin', parseInt(e.target.value))}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="optimalDuration">Optimal (s)</Label>
                      <Input
                        id="optimalDuration"
                        type="number"
                        min="5"
                        max="20"
                        value={settings.identification.sampleDurationOptimal}
                        onChange={(e) => updateSettings('identification.sampleDurationOptimal', parseInt(e.target.value))}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxDuration">Max Duration (s)</Label>
                      <Input
                        id="maxDuration"
                        type="number"
                        min="15"
                        max="60"
                        value={settings.identification.sampleDurationMax}
                        onChange={(e) => updateSettings('identification.sampleDurationMax', parseInt(e.target.value))}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="enableAutoMerging">Enable Auto-Merging</Label>
                      <Switch
                        id="enableAutoMerging"
                        checked={settings.identification.enableAutoMerging}
                        onCheckedChange={(checked) => updateSettings('identification.enableAutoMerging', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="enableRealTime">Enable Real-Time Processing</Label>
                      <Switch
                        id="enableRealTime"
                        checked={settings.identification.enableRealTimeProcessing}
                        onCheckedChange={(checked) => updateSettings('identification.enableRealTimeProcessing', checked)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Settings */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy & Data Protection
              </CardTitle>
              <CardDescription>
                Configure data retention, privacy, and compliance settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="retentionDays">Data Retention (days)</Label>
                    <Input
                      id="retentionDays"
                      type="number"
                      min="30"
                      max="3650"
                      value={settings.privacy.dataRetentionDays}
                      onChange={(e) => updateSettings('privacy.dataRetentionDays', parseInt(e.target.value))}
                      className="mt-2"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      How long to keep voice data before automatic deletion
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="anonymizeDays">Anonymize After (days)</Label>
                    <Input
                      id="anonymizeDays"
                      type="number"
                      min="1"
                      max="365"
                      value={settings.privacy.anonymizeAfterDays}
                      onChange={(e) => updateSettings('privacy.anonymizeAfterDays', parseInt(e.target.value))}
                      className="mt-2"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Remove personally identifiable information after this period
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Allow Data Export</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable users to export their voice data
                      </p>
                    </div>
                    <Switch
                      checked={settings.privacy.allowDataExport}
                      onCheckedChange={(checked) => updateSettings('privacy.allowDataExport', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Explicit Consent</Label>
                      <p className="text-sm text-muted-foreground">
                        Require user consent before voice processing
                      </p>
                    </div>
                    <Switch
                      checked={settings.privacy.requireExplicitConsent}
                      onCheckedChange={(checked) => updateSettings('privacy.requireExplicitConsent', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Audit Logging</Label>
                      <p className="text-sm text-muted-foreground">
                        Log all data access and modifications
                      </p>
                    </div>
                    <Switch
                      checked={settings.privacy.enableAuditLogging}
                      onCheckedChange={(checked) => updateSettings('privacy.enableAuditLogging', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Encrypt Stored Data</Label>
                      <p className="text-sm text-muted-foreground">
                        Encrypt voice data at rest
                      </p>
                    </div>
                    <Switch
                      checked={settings.privacy.encryptStoredData}
                      onCheckedChange={(checked) => updateSettings('privacy.encryptStoredData', checked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Settings */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Performance Optimization
              </CardTitle>
              <CardDescription>
                Configure system performance and resource usage settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="maxConcurrent">Max Concurrent Processing</Label>
                    <Input
                      id="maxConcurrent"
                      type="number"
                      min="1"
                      max="16"
                      value={settings.performance.maxConcurrentProcessing}
                      onChange={(e) => updateSettings('performance.maxConcurrentProcessing', parseInt(e.target.value))}
                      className="mt-2"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Maximum number of simultaneous voice processing tasks
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="cacheExpiration">Cache Expiration (hours)</Label>
                    <Input
                      id="cacheExpiration"
                      type="number"
                      min="1"
                      max="168"
                      value={settings.performance.cacheExpirationHours}
                      onChange={(e) => updateSettings('performance.cacheExpirationHours', parseInt(e.target.value))}
                      className="mt-2"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      How long to cache processed voice data
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="memoryLimit">Memory Limit (MB)</Label>
                    <Input
                      id="memoryLimit"
                      type="number"
                      min="128"
                      max="4096"
                      value={settings.performance.memoryLimitMB}
                      onChange={(e) => updateSettings('performance.memoryLimitMB', parseInt(e.target.value))}
                      className="mt-2"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Maximum memory usage for voice processing
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="processingQuality">Processing Quality</Label>
                    <Select
                      value={settings.performance.processingQuality}
                      onValueChange={(value: any) => updateSettings('performance.processingQuality', value)}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fast">Fast (Lower accuracy)</SelectItem>
                        <SelectItem value="balanced">Balanced</SelectItem>
                        <SelectItem value="accurate">Accurate (Slower)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-1">
                      Balance between speed and accuracy
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Enable Background Processing</Label>
                        <p className="text-sm text-muted-foreground">
                          Process voice data in the background
                        </p>
                      </div>
                      <Switch
                        checked={settings.performance.enableBackgroundProcessing}
                        onCheckedChange={(checked) => updateSettings('performance.enableBackgroundProcessing', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Enable GPU Acceleration</Label>
                        <p className="text-sm text-muted-foreground">
                          Use GPU for faster processing (if available)
                        </p>
                      </div>
                      <Switch
                        checked={settings.performance.enableGpuAcceleration}
                        onCheckedChange={(checked) => updateSettings('performance.enableGpuAcceleration', checked)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                System Notifications
              </CardTitle>
              <CardDescription>
                Configure alerts and notification settings for system events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable System Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications for system events and issues
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.enableSystemAlerts}
                  onCheckedChange={(checked) => updateSettings('notifications.enableSystemAlerts', checked)}
                />
              </div>

              {settings.notifications.enableSystemAlerts && (
                <div className="space-y-4 border-l-4 border-primary pl-4">
                  <h4 className="font-medium">Alert Thresholds</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Low Confidence Threshold</Label>
                      <div className="mt-2">
                        <Slider
                          value={[settings.notifications.alertThresholds.lowConfidence]}
                          onValueChange={([value]) => updateSettings('notifications.alertThresholds.lowConfidence', value)}
                          max={1}
                          min={0}
                          step={0.01}
                          className="w-full"
                        />
                        <div className="text-center text-sm text-muted-foreground mt-1">
                          {(settings.notifications.alertThresholds.lowConfidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>High Error Rate Threshold</Label>
                      <div className="mt-2">
                        <Slider
                          value={[settings.notifications.alertThresholds.highErrorRate]}
                          onValueChange={([value]) => updateSettings('notifications.alertThresholds.highErrorRate', value)}
                          max={1}
                          min={0}
                          step={0.01}
                          className="w-full"
                        />
                        <div className="text-center text-sm text-muted-foreground mt-1">
                          {(settings.notifications.alertThresholds.highErrorRate * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>Storage Limit Threshold</Label>
                      <div className="mt-2">
                        <Slider
                          value={[settings.notifications.alertThresholds.storageLimit]}
                          onValueChange={([value]) => updateSettings('notifications.alertThresholds.storageLimit', value)}
                          max={1}
                          min={0}
                          step={0.01}
                          className="w-full"
                        />
                        <div className="text-center text-sm text-muted-foreground mt-1">
                          {(settings.notifications.alertThresholds.storageLimit * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Send alerts via email
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifications.emailNotifications}
                      onCheckedChange={(checked) => updateSettings('notifications.emailNotifications', checked)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="webhookUrl">Webhook URL</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="webhookUrl"
                        type="url"
                        placeholder="https://your-webhook-url.com/endpoint"
                        value={settings.notifications.webhookUrl}
                        onChange={(e) => updateSettings('notifications.webhookUrl', e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={testWebhookConnection}
                        disabled={!settings.notifications.webhookUrl || testingConnection}
                      >
                        {testingConnection ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          'Test'
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Send webhook notifications to this URL
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Settings */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Advanced Configuration
              </CardTitle>
              <CardDescription>
                Advanced settings for developers and system administrators
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  These settings are for advanced users only. Incorrect configuration may affect system performance.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="logLevel">Log Level</Label>
                    <Select
                      value={settings.advanced.logLevel}
                      onValueChange={(value: any) => updateSettings('advanced.logLevel', value)}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="error">Error</SelectItem>
                        <SelectItem value="warn">Warning</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="debug">Debug</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="apiRateLimit">API Rate Limit (requests/minute)</Label>
                    <Input
                      id="apiRateLimit"
                      type="number"
                      min="10"
                      max="1000"
                      value={settings.advanced.apiRateLimit}
                      onChange={(e) => updateSettings('advanced.apiRateLimit', parseInt(e.target.value))}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="customModel">Custom Model Path</Label>
                    <Input
                      id="customModel"
                      type="text"
                      placeholder="/path/to/custom/model"
                      value={settings.advanced.customModelPath}
                      onChange={(e) => updateSettings('advanced.customModelPath', e.target.value)}
                      className="mt-2"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Path to custom voice identification model
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Debug Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable verbose logging and debugging features
                      </p>
                    </div>
                    <Switch
                      checked={settings.advanced.debugMode}
                      onCheckedChange={(checked) => updateSettings('advanced.debugMode', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Experimental Features</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable experimental voice identification features
                      </p>
                    </div>
                    <Switch
                      checked={settings.advanced.enableExperimentalFeatures}
                      onCheckedChange={(checked) => updateSettings('advanced.enableExperimentalFeatures', checked)}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">Reset to Factory Defaults</h4>
                    <p className="text-sm text-muted-foreground">
                      This will reset all settings to their default values
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    onClick={resetToDefaults}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Reset All Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SpeakerSettingsPanel;