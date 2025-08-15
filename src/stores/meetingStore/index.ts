/**
 * Meeting Store Organization
 * 
 * This file re-exports the meeting store with better organization.
 * We keep the store unified for architectural reasons but provide
 * better organization and specialized hooks.
 */

// Main store export
export * from '../meetingStore';

// Specialized hooks for different concerns
export * from './hooks/useMeetingCore';
export * from './hooks/useMeetingTranscript';
export * from './hooks/useMeetingParticipants';
export * from './hooks/useMeetingRecording';
export * from './hooks/useMeetingSearch';