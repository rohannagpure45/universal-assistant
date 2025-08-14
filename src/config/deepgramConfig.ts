import { Timestamp } from 'firebase-admin/firestore';

const deepgramConfig = {
    model: 'nova-3',
    language: 'en',
    diarize: true,
    punctuate: true,
    numerals: true,
    utterances: true,
    interim_results: true,
    endpointing: 300,
    diarize_version: '2025-08-14'
  };
  
  // Speaker Profile Structure
  interface SpeakerProfile {
    speakerId: string;
    voiceId: string;
    userName?: string;
    voiceEmbedding: number[];
    lastSeen: Timestamp;
    confidence: number;
    sessionCount: number;
  }
  