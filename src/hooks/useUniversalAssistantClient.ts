'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getServiceContainer, initializeTranscription } from '@/services/universal-assistant/ClientServiceContainer';
import { useGlobalServiceManager, useUniversalAssistantCoordinator } from '@/services/universal-assistant/GlobalServiceManager';
import type { AudioManager } from '@/services/universal-assistant/AudioManager';
import type { DeepgramSTT } from '@/services/universal-assistant/DeepgramSTT';
import type { FragmentProcessor } from '@/services/universal-assistant/FragmentProcessor';
import type { ConversationProcessor } from '@/services/universal-assistant/ConversationProcessor';
import { useMeetingStore, useAppStore } from '@/stores';

interface TranscriptionServices {
  audioManager: AudioManager;
  deepgramSTT: DeepgramSTT;
  fragmentProcessor: FragmentProcessor;
  conversationProcessor: ConversationProcessor;
}

interface CoordinatorServices {
  services: TranscriptionServices;
}

/**
 * Client-side only wrapper for Universal Assistant functionality
 * This ensures the audio-related code only runs in the browser
 */
export function useUniversalAssistantClient() {
  const [isClient, setIsClient] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const servicesRef = useRef<TranscriptionServices | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const initializationAttempted = useRef(false);
  
  // Concurrency control for recording operations
  const recordingMutexRef = useRef(false);
  
  // Use global service manager for coordinator
  const serviceManager = useGlobalServiceManager();
  const { coordinator, isLoading: isCoordinatorLoading, error: coordinatorError } = useUniversalAssistantCoordinator({
    model: 'claude-3-5-sonnet',
    maxTokens: 1000,
    voiceId: '21m00Tcm4TlvDq8ikWAM',
    ttsSpeed: 1.0,
    enableConcurrentProcessing: true,
    enableSpeakerIdentification: true,
  });
  
  // Get stores for integration
  const meetingStore = useMeetingStore();
  const appStore = useAppStore();
  const { currentMeeting, addTranscriptEntry } = meetingStore;

  useEffect(() => {
    // Only initialize on client side and only once
    if (typeof window !== 'undefined' && !initializationAttempted.current) {
      setIsClient(true);
      initializationAttempted.current = true;
      initializeServices();
    }
  }, []); // Empty deps array - only run once on mount

  const initializeServices = useCallback(async () => {
    // Prevent double initialization
    if (servicesRef.current) {
      console.log('Services already initialized, skipping...');
      return;
    }

    try {
      console.log('Initializing Universal Assistant services...');
      
      // Initialize the transcription pipeline with transcript entry callback
      // We'll use a ref to access the latest store functions to avoid re-initialization
      const services = await initializeTranscription({
        onTranscriptEntry: (entry) => {
          // Access store directly to get latest values
          const store = useMeetingStore.getState();
          if (store.currentMeeting?.meetingId) {
            // Simple de-duplication/coalescing: if the new final text is the same as
            // or an extension/refinement of the most recent transcript from the same speaker
            // within a short window, update the last entry instead of adding a new one.
            const transcript = store.transcript;
            const last = transcript.length > 0 ? transcript[transcript.length - 1] : null;
            const nowTs = entry.timestamp instanceof Date ? entry.timestamp.getTime() : new Date(entry.timestamp as any).getTime();
            const shouldCoalesce = !!last && last.speakerId === entry.speakerId &&
              Math.abs(nowTs - (last.timestamp instanceof Date ? last.timestamp.getTime() : new Date(last.timestamp as any).getTime())) <= 12000;

            if (shouldCoalesce) {
              const newText = entry.text.trim();
              const lastText = (last.text || '').trim();
              const a = newText.toLowerCase();
              const b = lastText.toLowerCase();
              // Prefix-based check
              const isSameOrExtension = a === b || a.startsWith(b) || b.startsWith(a);
              // Token/Jaccard similarity check to catch paraphrase like
              // "is today's date?" vs "what is today's date?"
              const normalize = (s: string) => s.replace(/[^a-z0-9\s']/gi, ' ').toLowerCase().trim();
              const toSet = (s: string) => new Set(normalize(s).split(/\s+/).filter(Boolean));
              const setA = toSet(newText);
              const setB = toSet(lastText);
              const intersectionSize = Array.from(setA).filter(w => setB.has(w)).length;
              const unionSize = new Set<string>([...Array.from(setA), ...Array.from(setB)]).size || 1;
              const jaccard = intersectionSize / unionSize;
              const isHighOverlap = jaccard >= 0.7;

              if ((isSameOrExtension || isHighOverlap) && last.id) {
                console.log('Coalescing transcript entry via update:', { lastId: last.id, lastText, newText });
                store.updateTranscriptEntry(last.id, {
                  text: newText.length >= lastText.length ? entry.text : last.text,
                  confidence: Math.max(last.confidence ?? 0, entry.confidence ?? 0),
                  timestamp: entry.timestamp,
                });
                return;
              }
            }

            // Convert simplified entry to full TranscriptEntry format
            const fullEntry = {
              meetingId: store.currentMeeting.meetingId,
              content: entry.text,
              speaker: entry.speakerId,
              speakerId: entry.speakerId,
              speakerName: entry.speakerId,
              text: entry.text,
              timestamp: entry.timestamp,
              duration: 0,
              confidence: entry.confidence,
              language: 'en-US',
              isFragment: false,
              isComplete: entry.isFinal,
              isProcessed: false
            };

            console.log('Adding transcript entry:', fullEntry);
            store.addTranscriptEntry(fullEntry);
          } else {
            console.warn('No current meeting found to add transcript entry:', {
              hasCurrentMeeting: !!store.currentMeeting,
              meetingId: store.currentMeeting?.meetingId,
              entry
            });
          }
        }
      });
      servicesRef.current = services;
      
      console.log('Services connected and ready for transcription');
      
      setIsInitialized(true);
      console.log('Universal Assistant services initialized successfully');
    } catch (err) {
      console.error('Failed to initialize Universal Assistant services:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize audio system');
    }
  }, []); // No dependencies - only initialize once

  const startRecording = useCallback(async () => {
    // Check concurrency mutex first
    if (recordingMutexRef.current) {
      console.warn('Recording operation already in progress');
      return;
    }
    
    if (!isClient || !isInitialized || !servicesRef.current) {
      console.warn('Audio recording requires initialized services');
      setError('Services not initialized. Please wait.');
      return;
    }

    // Set mutex lock
    recordingMutexRef.current = true;

    try {
      console.log('Starting recording...');
      setError(null);
      setIsProcessing(true);
      
      const { audioManager, deepgramSTT } = servicesRef.current;
      
      // Start Deepgram live transcription
      await deepgramSTT.startLiveTranscription({
        model: 'nova-2',
        language: 'en-US',
        punctuate: true,
        diarize: true,
        smart_format: true,
        utterances: true,
      });
      
      // Start audio recording with chunk callback
      await audioManager.startRecording((chunk: Blob) => {
        // Convert Blob to ArrayBuffer and send to Deepgram
        chunk.arrayBuffer().then((arrayBuffer) => {
          deepgramSTT.sendAudioChunk(arrayBuffer);
        });
      });
      
      setIsRecording(true);
      setIsProcessing(false);
      console.log('Recording started successfully');
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      setIsRecording(false);
      setIsProcessing(false);
    } finally {
      // Always release the mutex
      recordingMutexRef.current = false;
    }
  }, [isClient, isInitialized]);

  const stopRecording = useCallback(() => {
    if (!servicesRef.current) {
      console.warn('No services to stop');
      return;
    }
    
    // Ensure mutex is properly released when stopping
    recordingMutexRef.current = false;
    
    try {
      console.log('Stopping recording...');
      const { audioManager, deepgramSTT } = servicesRef.current;
      
      // Stop Deepgram transcription first to prevent new chunks from being processed
      deepgramSTT.stopTranscription();
      
      // Then stop audio recording to ensure no more chunks are generated
      audioManager.stopRecording();
      
      setIsRecording(false);
      console.log('Recording stopped successfully');
    } catch (err) {
      console.error('Error stopping recording:', err);
      setError(err instanceof Error ? err.message : 'Error stopping recording');
    }
  }, []);

  const handleVocalInterrupt = useCallback(() => {
    if (!isClient || !isInitialized || !coordinator) {
      console.warn('Vocal interrupt requires initialized coordinator');
      return;
    }
    
    try {
      setIsProcessing(true);
      
      // Use coordinator's vocal interrupt handling
      coordinator.handleVocalInterrupt();
      
      // Subscribe to coordinator state changes
      const unsubscribe = coordinator.subscribe((state) => {
        setIsPlaying(state.isPlaying);
        setIsProcessing(state.isProcessing);
      });
      
      // Clean up subscription after a short delay
      setTimeout(() => {
        unsubscribe();
      }, 5000);
      
      console.log('Triggered vocal interrupt via coordinator');
    } catch (err) {
      console.error('Error handling vocal interrupt:', err);
      setError(err instanceof Error ? err.message : 'Error handling interrupt');
      setIsProcessing(false);
    }
  }, [isClient, isInitialized, coordinator]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      console.log('useUniversalAssistantClient: Component unmounting, running cleanup...');
      
      try {
        // Stop recording if active - this will stop both AudioManager and DeepgramSTT
        if (servicesRef.current) {
          console.log('Stopping active recording during cleanup...');
          const { audioManager, deepgramSTT } = servicesRef.current;
          
          // Stop transcription first
          if (deepgramSTT) {
            deepgramSTT.stopTranscription();
          }
          
          // Stop audio recording
          if (audioManager) {
            audioManager.stopRecording();
          }
        }
        
        // Clean up any remaining stream references
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            track.stop();
            console.log(`Cleanup: Stopped track ${track.kind}`);
          });
          streamRef.current = null;
        }
        
        // Clean up all services through the container
        if (servicesRef.current) {
          console.log('Cleaning up service container...');
          const container = getServiceContainer();
          container.cleanup();
          servicesRef.current = null;
        }
        
        console.log('useUniversalAssistantClient: Cleanup completed');
      } catch (err) {
        console.error('Error during cleanup:', err);
      }
    };
  }, []); // Empty dependency array - only run on mount/unmount

  // Add triggerAIResponse function
  const triggerAIResponse = useCallback(async (text?: string) => {
    if (!isClient || !isInitialized || !coordinator) {
      console.warn('AI response trigger requires initialized coordinator');
      setError('Services not ready. Please wait.');
      return;
    }
    
    try {
      setError(null);
      await coordinator.triggerAIResponse(text);
    } catch (err) {
      console.error('Error triggering AI response:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate AI response');
    }
  }, [isClient, isInitialized, coordinator]);

  return {
    isRecording,
    isPlaying,
    isProcessing,
    error,
    isInitialized,
    startRecording,
    stopRecording,
    handleVocalInterrupt,
    triggerAIResponse,
    coordinator,
    isReady: isClient && isInitialized,
  };
}