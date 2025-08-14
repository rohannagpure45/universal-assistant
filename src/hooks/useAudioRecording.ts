import { useState, useCallback, useRef } from 'react';
import { audioManager } from '@/services/universal-assistant/AudioManager';

export function useAudioRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setIsRecording(true);
      setAudioBlob(null);
      setRecordingDuration(0);

      // Start duration timer
      intervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 0.1);
      }, 100);

      await audioManager.startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const blob = audioManager.stopRecording();
    if (blob) {
      setAudioBlob(blob);
    }
    setIsRecording(false);
  }, []);

  const resetRecording = useCallback(() => {
    setAudioBlob(null);
    setRecordingDuration(0);
  }, []);

  return {
    isRecording,
    audioBlob,
    recordingDuration,
    startRecording,
    stopRecording,
    resetRecording,
  };
}