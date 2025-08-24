'use client';

import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Trash2 } from 'lucide-react';
import { MeetingTypeService } from '@/services/firebase/MeetingTypeService';
import { ClientStorageService } from '@/services/firebase/ClientStorageService';
import { MeetingTypeConfig } from '@/types/database';
import { AIModel } from '@/types';
import { modelConfigs } from '@/config/modelConfigs';
import { useAuth } from '@/hooks/useAuth';

interface CreateMeetingTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMeetingTypeCreated?: (meetingType: MeetingTypeConfig) => void;
}

interface FileUpload {
  id: string;
  file: File;
  url?: string;
  uploading: boolean;
  error?: string;
}

export const CreateMeetingTypeModal: React.FC<CreateMeetingTypeModalProps> = ({
  isOpen,
  onClose,
  onMeetingTypeCreated
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    systemPrompt: '',
    contextRules: '',
    defaultModel: 'gpt-4o-mini' as AIModel,
    enableTranscription: true,
    enableSummaries: true,
    summaryStyle: 'bullets' as const,
    autoIdentifySpeakers: true,
  });
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const handleInputChange = (
    field: string,
    value: string | boolean
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: FileUpload[] = Array.from(selectedFiles).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      uploading: false
    }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const uploadFile = async (fileUpload: FileUpload): Promise<string | null> => {
    try {
      setFiles(prev => prev.map(f => 
        f.id === fileUpload.id ? { ...f, uploading: true, error: undefined } : f
      ));

      const url = await ClientStorageService.uploadFile(
        `meeting-contexts/${user?.uid}/${Date.now()}_${fileUpload.file.name}`,
        fileUpload.file
      );

      setFiles(prev => prev.map(f => 
        f.id === fileUpload.id ? { ...f, uploading: false, url } : f
      ));

      return url;
    } catch (error) {
      console.error('File upload failed:', error);
      setFiles(prev => prev.map(f => 
        f.id === fileUpload.id ? { 
          ...f, 
          uploading: false, 
          error: 'Upload failed' 
        } : f
      ));
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.uid || !formData.name.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload all files first
      const fileUrls: string[] = [];
      for (const fileUpload of files) {
        if (!fileUpload.url && !fileUpload.uploading && !fileUpload.error) {
          const url = await uploadFile(fileUpload);
          if (url) {
            fileUrls.push(url);
          }
        } else if (fileUpload.url) {
          fileUrls.push(fileUpload.url);
        }
      }

      // Create the meeting type
      const meetingTypeData: Omit<MeetingTypeConfig, 'id' | 'createdAt'> = {
        name: formData.name.trim(),
        ownerId: user.uid,
        regularParticipants: [],
        systemPrompt: formData.systemPrompt.trim(),
        contextRules: formData.contextRules.trim(),
        files: fileUrls,
        aiSettings: {
          enableTranscription: formData.enableTranscription,
          enableSummaries: formData.enableSummaries,
          summaryStyle: formData.summaryStyle,
          autoIdentifySpeakers: formData.autoIdentifySpeakers,
        },
        defaultModel: formData.defaultModel,
        modelOverrides: {},
        modelSpecificPrompts: {},
        modelCompatibility: {
          recommendedModel: formData.defaultModel,
          performanceHistory: []
        }
      };

      const id = await MeetingTypeService.createMeetingType(meetingTypeData);

      const createdMeetingType: MeetingTypeConfig = {
        ...meetingTypeData,
        id,
        createdAt: new Date()
      };

      if (onMeetingTypeCreated) {
        onMeetingTypeCreated(createdMeetingType);
      }

      // Reset form
      setFormData({
        name: '',
        systemPrompt: '',
        contextRules: '',
        defaultModel: 'gpt-4o-mini',
        enableTranscription: true,
        enableSummaries: true,
        summaryStyle: 'bullets',
        autoIdentifySpeakers: true,
      });
      setFiles([]);

      onClose();
    } catch (error) {
      console.error('Failed to create meeting type:', error);
      // TODO: Show error notification
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const availableModels = Object.keys(modelConfigs) as AIModel[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Create Meeting Type
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Meeting Type Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Meeting Type Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Weekly Team Sync, Client Review"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                required
              />
            </div>

            {/* System Prompt */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                System Prompt
              </label>
              <textarea
                value={formData.systemPrompt}
                onChange={(e) => handleInputChange('systemPrompt', e.target.value)}
                placeholder="Define how the AI should behave during this type of meeting..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
              />
            </div>

            {/* Context Rules */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Context Rules
              </label>
              <textarea
                value={formData.contextRules}
                onChange={(e) => handleInputChange('contextRules', e.target.value)}
                placeholder="Additional context or rules specific to this meeting type..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
              />
            </div>

            {/* AI Model Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Default AI Model
              </label>
              <select
                value={formData.defaultModel}
                onChange={(e) => handleInputChange('defaultModel', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                {availableModels.map(model => {
                  const config = modelConfigs[model];
                  return (
                    <option key={model} value={model}>
                      {model} ({config.provider}) - ${config.pricing.inputTokenCost * 1000}/1K tokens
                    </option>
                  );
                })}
              </select>
            </div>

            {/* File Upload Section */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Context Files
              </label>
              
              {/* Drop Zone */}
              <div
                className={`
                  border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
                  ${dragOver 
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }
                `}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  Drag and drop files here, or click to select
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Support for PDF, TXT, MD, and other text files
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.txt,.md,.doc,.docx"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                />
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map(file => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {file.file.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {(file.file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {file.uploading && (
                          <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                        )}
                        {file.error && (
                          <span className="text-xs text-red-500">{file.error}</span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeFile(file.id)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors duration-200"
                          aria-label="Remove file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                AI Settings
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.enableTranscription}
                    onChange={(e) => handleInputChange('enableTranscription', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Enable Transcription
                  </span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.enableSummaries}
                    onChange={(e) => handleInputChange('enableSummaries', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Enable Summaries
                  </span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.autoIdentifySpeakers}
                    onChange={(e) => handleInputChange('autoIdentifySpeakers', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Auto-Identify Speakers
                  </span>
                </label>
              </div>

              {formData.enableSummaries && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Summary Style
                  </label>
                  <select
                    value={formData.summaryStyle}
                    onChange={(e) => handleInputChange('summaryStyle', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="bullets">Bullet Points</option>
                    <option value="narrative">Narrative</option>
                    <option value="action-items">Action Items</option>
                  </select>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium rounded-xl transition-colors duration-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.name.trim()}
            className="px-8 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-all duration-200 flex items-center space-x-2 disabled:cursor-not-allowed"
          >
            {isSubmitting && (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            )}
            <span>{isSubmitting ? 'Creating...' : 'Create Meeting Type'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};