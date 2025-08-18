'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getServiceContainer, initializeTranscription } from '@/services/universal-assistant/ClientServiceContainer';
import type { AudioManager } from '@/services/universal-assistant/AudioManager';
import type { DeepgramSTT } from '@/services/universal-assistant/DeepgramSTT';
import type { FragmentProcessor } from '@/services/universal-assistant/FragmentProcessor';
import type { ConversationProcessor } from '@/services/universal-assistant/ConversationProcessor';
import { useMeetingStore } from '@/stores/meetingStore';

interface TranscriptionServices {
  audioManager: AudioManager;
  deepgramSTT: DeepgramSTT;
  fragmentProcessor: FragmentProcessor;
  conversationProcessor: ConversationProcessor;
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
  
  // Get meeting store for transcript updates
  const { currentMeeting, addTranscriptEntry } = useMeetingStore();

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

            console.log('Adding transcript entry:', entry);
            store.addTranscriptEntry(entry);
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
    if (!isClient || !isInitialized || !servicesRef.current) {
      console.warn('Audio recording requires initialized services');
      setError('Services not initialized. Please wait.');
      return;
    }

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
    }
  }, [isClient, isInitialized]);

  const stopRecording = useCallback(() => {
    if (!servicesRef.current) {
      console.warn('No services to stop');
      return;
    }
    
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
    if (!isClient || !isInitialized || !servicesRef.current) {
      console.warn('Vocal interrupt requires initialized services');
      return;
    }
    
    try {
      setIsProcessing(true);
      const { audioManager } = servicesRef.current;
      
      // Stop any current audio playback
      audioManager.stopPlayback?.();
      
      // Simulate processing delay
      setTimeout(() => {
        setIsProcessing(false);
        setIsPlaying(true);
        
        // Simulate response playback
        setTimeout(() => {
          setIsPlaying(false);
        }, 2000);
      }, 1000);
      
      console.log('Triggered vocal interrupt');
    } catch (err) {
      console.error('Error handling vocal interrupt:', err);
      setError(err instanceof Error ? err.message : 'Error handling interrupt');
      setIsProcessing(false);
    }
  }, [isClient, isInitialized]);

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

  return {
    isRecording,
    isPlaying,
    isProcessing,
    error,
    isInitialized,
    startRecording,
    stopRecording,
    handleVocalInterrupt,
    isReady: isClient && isInitialized,
  };
}