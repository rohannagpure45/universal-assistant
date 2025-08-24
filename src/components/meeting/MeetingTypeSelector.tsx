'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, Settings } from 'lucide-react';
import { MeetingTypeService } from '@/services/firebase/MeetingTypeService';
import { MeetingTypeConfig } from '@/types/database';
import { AIModel } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { KeyboardNavigator } from '@/utils/focusManagement';

interface MeetingTypeSelectorProps {
  selectedMeetingType?: MeetingTypeConfig | null;
  onMeetingTypeChange: (meetingType: MeetingTypeConfig | null) => void;
  onCreateMeetingType?: () => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export const MeetingTypeSelector: React.FC<MeetingTypeSelectorProps> = ({
  selectedMeetingType,
  onMeetingTypeChange,
  onCreateMeetingType,
  className = '',
  disabled = false,
  required = false
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [meetingTypes, setMeetingTypes] = useState<MeetingTypeConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for focus management
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const keyboardNavigator = useRef<KeyboardNavigator | null>(null);

  // Default meeting types - fallback if no custom types exist
  const defaultMeetingTypes: Partial<MeetingTypeConfig>[] = [
    {
      id: 'default-team-standup',
      name: 'Team Standup',
      systemPrompt: 'You are an AI assistant for team standup meetings. Focus on progress updates, blockers, and next steps.',
      defaultModel: 'gpt-4o-mini' as AIModel,
      contextRules: 'Keep responses concise and actionable. Focus on team coordination.',
    },
    {
      id: 'default-client-meeting',
      name: 'Client Meeting',
      systemPrompt: 'You are an AI assistant for client meetings. Be professional and focus on client needs and project status.',
      defaultModel: 'claude-3-5-sonnet' as AIModel,
      contextRules: 'Maintain professional tone. Help summarize client requirements and action items.',
    },
    {
      id: 'default-brainstorm',
      name: 'Brainstorming Session',
      systemPrompt: 'You are an AI assistant for creative brainstorming sessions. Encourage idea generation and collaboration.',
      defaultModel: 'gpt-4o' as AIModel,
      contextRules: 'Foster creativity and build on ideas presented. Ask clarifying questions to expand concepts.',
    },
    {
      id: 'default-planning',
      name: 'Planning Session',
      systemPrompt: 'You are an AI assistant for planning meetings. Help organize tasks, timelines, and resource allocation.',
      defaultModel: 'claude-3-5-sonnet' as AIModel,
      contextRules: 'Focus on structure, timelines, and actionable outcomes. Help break down complex plans.',
    },
  ];

  const loadMeetingTypes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Convert default types to full format first
      const fullDefaultTypes: MeetingTypeConfig[] = defaultMeetingTypes.map(type => ({
        id: type.id!,
        name: type.name!,
        ownerId: 'system',
        regularParticipants: [],
        systemPrompt: type.systemPrompt!,
        contextRules: type.contextRules!,
        files: [],
        aiSettings: {
          enableTranscription: true,
          enableSummaries: true,
          summaryStyle: 'bullets' as const,
          autoIdentifySpeakers: true,
        },
        defaultModel: type.defaultModel!,
        modelOverrides: {},
        modelSpecificPrompts: {},
        modelCompatibility: {
          recommendedModel: type.defaultModel!,
          performanceHistory: []
        },
        createdAt: new Date()
      }));
      
      // Get user's custom meeting types if authenticated
      let userTypes: MeetingTypeConfig[] = [];
      if (user?.uid) {
        userTypes = await MeetingTypeService.getUserMeetingTypes(user.uid);
      }
      
      // Combine user types with defaults (or just defaults if not authenticated)
      setMeetingTypes([...userTypes, ...fullDefaultTypes]);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Failed to load meeting types:', err);
      }
      setError('Failed to load meeting types');
      // Fallback to just default types
      const fullDefaultTypes: MeetingTypeConfig[] = defaultMeetingTypes.map(type => ({
        id: type.id!,
        name: type.name!,
        ownerId: 'system',
        regularParticipants: [],
        systemPrompt: type.systemPrompt!,
        contextRules: type.contextRules!,
        files: [],
        aiSettings: {
          enableTranscription: true,
          enableSummaries: true,
          summaryStyle: 'bullets' as const,
          autoIdentifySpeakers: true,
        },
        defaultModel: type.defaultModel!,
        modelOverrides: {},
        modelSpecificPrompts: {},
        modelCompatibility: {
          recommendedModel: type.defaultModel!,
          performanceHistory: []
        },
        createdAt: new Date()
      }));
      setMeetingTypes(fullDefaultTypes);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]); // Keep dependency to reload when auth state changes

  // Load meeting types on mount (works for both authenticated and non-authenticated)
  useEffect(() => {
    loadMeetingTypes();
  }, [loadMeetingTypes]);

  const handleSelect = (meetingType: MeetingTypeConfig) => {
    onMeetingTypeChange(meetingType);
    setIsOpen(false);
    triggerRef.current?.focus(); // Return focus to trigger button
  };

  const handleCreateNew = () => {
    setIsOpen(false);
    if (onCreateMeetingType) {
      onCreateMeetingType();
    }
  };

  // Handle keyboard navigation for dropdown
  const handleTriggerKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        if (!disabled && !isOpen) {
          setIsOpen(true);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!disabled && !isOpen) {
          setIsOpen(true);
        }
        break;
      case 'Escape':
        if (isOpen) {
          event.preventDefault();
          setIsOpen(false);
        }
        break;
    }
  }, [disabled, isOpen]);

  // Initialize keyboard navigator when dropdown opens
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      keyboardNavigator.current = new KeyboardNavigator(dropdownRef.current, { loop: true });
      
      // Focus first option or selected option
      const options = dropdownRef.current.querySelectorAll('[role="option"]');
      const selectedIndex = meetingTypes.findIndex(type => type.id === selectedMeetingType?.id);
      const targetIndex = selectedIndex >= 0 ? selectedIndex : 0;
      
      if (options[targetIndex]) {
        (options[targetIndex] as HTMLElement).focus();
      }
    }
    
    return () => {
      keyboardNavigator.current = null;
    };
  }, [isOpen, meetingTypes, selectedMeetingType]);

  // Handle clicks outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className={`relative ${className}`}>
      {/* Dropdown Container */}
      <div className="w-full flex items-center gap-2">
        {/* Settings Button - Separate from dropdown */}
        {onCreateMeetingType && (
          <button
            onClick={handleCreateNew}
            disabled={disabled}
            className="p-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            aria-label="Create new meeting type"
            title="Create new meeting type"
          >
            <Settings className="w-5 h-5" />
          </button>
        )}
        
        {/* Dropdown Button */}
        <button
          ref={triggerRef}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleTriggerKeyDown}
          disabled={disabled}
          className={`
            flex-1 flex items-center justify-between px-4 py-3
            bg-white dark:bg-gray-800 
            border-2 rounded-xl transition-all duration-200
            text-left min-h-[3rem]
            ${disabled 
              ? 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
              : selectedMeetingType
                ? 'border-blue-300 dark:border-blue-600 hover:border-blue-400 dark:hover:border-blue-500'
                : required
                  ? 'border-red-300 dark:border-red-600 hover:border-red-400 dark:hover:border-red-500'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }
            focus:outline-none focus:ring-2 focus:ring-blue-500/50
          `}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={`Select meeting type${selectedMeetingType ? `, currently selected: ${selectedMeetingType.name}` : ''}`}
          aria-invalid={required && !selectedMeetingType}
          aria-describedby={required && !selectedMeetingType ? 'meeting-type-error' : undefined}
        >
          <div className="flex-1">
            {selectedMeetingType ? (
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {selectedMeetingType.name}
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                  {selectedMeetingType.contextRules || 'No description available'}
                </p>
              </div>
            ) : (
              <span className={`font-medium ${required ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {required ? 'Please select a meeting type' : 'Select meeting type'}
              </span>
            )}
          </div>
          <ChevronDown 
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Error message for required validation */}
      {required && !selectedMeetingType && (
        <p id="meeting-type-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
          Please select a meeting type to continue
        </p>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div 
            ref={dropdownRef}
            className="absolute z-20 w-full mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto"
            role="listbox"
            aria-label="Meeting type options"
            onKeyDown={(e) => {
              if (keyboardNavigator.current) {
                keyboardNavigator.current.handleKeyDown(e.nativeEvent);
              }
              
              // Handle Escape key
              if (e.key === 'Escape') {
                e.preventDefault();
                setIsOpen(false);
                triggerRef.current?.focus();
              }
            }}
          >
            {isLoading ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                Loading meeting types...
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-600 dark:text-red-400">
                {error}
              </div>
            ) : meetingTypes.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No meeting types available
              </div>
            ) : (
              <>
                {meetingTypes.map((meetingType, index) => (
                  <button
                    key={meetingType.id}
                    onClick={() => handleSelect(meetingType)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelect(meetingType);
                      }
                    }}
                    className={`
                      w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700
                      transition-colors duration-200 border-b border-gray-100 dark:border-gray-700 last:border-b-0
                      ${selectedMeetingType?.id === meetingType.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                      focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:ring-inset
                    `}
                    role="option"
                    aria-selected={selectedMeetingType?.id === meetingType.id}
                    aria-posinset={index + 1}
                    aria-setsize={meetingTypes.length}
                    tabIndex={0}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {meetingType.name}
                        </div>
                        {meetingType.contextRules && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {meetingType.contextRules}
                          </p>
                        )}
                        <div className="flex items-center mt-2 space-x-2">
                          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                            {meetingType.defaultModel}
                          </span>
                          {meetingType.ownerId === 'system' ? (
                            <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full">
                              Default
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full">
                              Custom
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};