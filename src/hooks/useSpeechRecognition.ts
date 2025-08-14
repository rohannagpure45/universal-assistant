import { useState, useCallback, useEffect, useRef } from 'react';
import { DeepgramSTT, TranscriptionResult } from '@/services/universal-assistant/DeepgramSTT';

export function useSpeechRecognition(apiKey: string) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const deepgramRef = useRef<DeepgramSTT | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (apiKey) {
      deepgramRef.current = new DeepgramSTT(apiKey);
    }

    return () => {
      stopListening();
    };
  }, [apiKey]);

  const handleTranscription = useCallback((result: TranscriptionResult) => {
    if (result.isFinal) {
      setTranscript(prev => prev + ' ' + result.transcript);
      setInterimTranscript('');
    } else {
      setInterimTranscript(result.transcript);
    }
  }, []);

  const startListening = useCallback(async () => {
    try {
      setError(null);
      setTranscript('');
      setInterimTranscript('');

      // Get microphone access
      streamRef.current = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });

      // Start Deepgram connection
      await deepgramRef.current?.startLiveTranscription({
        diarize: true,
        punctuate: true,
        smart_format: true,
      });

      deepgramRef.current?.setTranscriptionHandler(handleTranscription);

      // Create media recorder to capture audio chunks
      mediaRecorderRef.current = new MediaRecorder(streamRef.current);
      
      mediaRecorderRef.current.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          const arrayBuffer = await event.data.arrayBuffer();
          deepgramRef.current?.sendAudioChunk(arrayBuffer);
        }
      };

      mediaRecorderRef.current.start(100); // Send chunks every 100ms
      setIsListening(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start listening');
      console.error('Speech recognition error:', err);
    }
  }, [handleTranscription]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    deepgramRef.current?.stopTranscription();
    setIsListening(false);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
  };
}