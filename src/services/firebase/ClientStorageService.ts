/**
 * Client Storage Service
 * CLIENT-SIDE ONLY Firebase Storage operations
 * Uses Firebase Client SDK for safe bundling
 */

import { storage } from '@/lib/firebase/client';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll, getMetadata } from 'firebase/storage';

// Voice sample metadata interface
export interface VoiceSampleMetadata {
  deepgramVoiceId: string;
  meetingId: string;
  duration: number;
  quality?: number;
  transcript?: string;
  speakerConfidence?: number;
  uploadedAt: string;
  filePath: string;
  size?: number;
}

// Storage operation result interface
export interface StorageOperationResult {
  success: boolean;
  url?: string;
  filePath?: string;
  error?: string;
  metadata?: VoiceSampleMetadata;
}

export class ClientStorageService {
  /**
   * Upload voice sample for identification with metadata
   * CLIENT-SIDE ONLY - Uses Firebase Client SDK
   */
  static async uploadVoiceSample(
    deepgramVoiceId: string,
    meetingId: string,
    audioFile: Blob,
    duration: number,
    additionalMetadata?: {
      quality?: number;
      transcript?: string;
      speakerConfidence?: number;
    }
  ): Promise<StorageOperationResult> {
    try {
      const timestamp = Date.now();
      const fileName = `voice-samples/${deepgramVoiceId}/${timestamp}_${meetingId}_${duration}s.webm`;
      
      const metadata = {
        deepgramVoiceId,
        meetingId,
        duration: duration.toString(),
        uploadedAt: new Date().toISOString(),
        quality: additionalMetadata?.quality?.toString() || '0.5',
        transcript: additionalMetadata?.transcript || '',
        speakerConfidence: additionalMetadata?.speakerConfidence?.toString() || '0.5'
      };
      
      const storageRef = ref(storage, fileName);
      const snapshot = await uploadBytes(storageRef, audioFile, {
        contentType: 'audio/webm',
        customMetadata: metadata
      });
      
      const url = await getDownloadURL(snapshot.ref);
      
      const sampleMetadata: VoiceSampleMetadata = {
        deepgramVoiceId,
        meetingId,
        duration,
        quality: additionalMetadata?.quality,
        transcript: additionalMetadata?.transcript,
        speakerConfidence: additionalMetadata?.speakerConfidence,
        uploadedAt: metadata.uploadedAt,
        filePath: fileName,
        size: audioFile.size
      };
      
      return {
        success: true,
        url,
        filePath: fileName,
        metadata: sampleMetadata
      };
    } catch (error) {
      console.error('Error uploading voice sample:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * List voice samples for a specific speaker
   * CLIENT-SIDE ONLY
   */
  static async listVoiceSamples(
    deepgramVoiceId: string,
    limit: number = 50
  ): Promise<VoiceSampleMetadata[]> {
    try {
      const folderRef = ref(storage, `voice-samples/${deepgramVoiceId}/`);
      const result = await listAll(folderRef);
      
      const samples: VoiceSampleMetadata[] = [];
      
      for (const itemRef of result.items.slice(0, limit)) {
        try {
          const metadata = await getMetadata(itemRef);
          const customMetadata = metadata.customMetadata || {};
          
          samples.push({
            deepgramVoiceId: customMetadata.deepgramVoiceId || deepgramVoiceId,
            meetingId: customMetadata.meetingId || '',
            duration: parseFloat(customMetadata.duration || '0'),
            quality: customMetadata.quality ? parseFloat(customMetadata.quality) : undefined,
            transcript: customMetadata.transcript || undefined,
            speakerConfidence: customMetadata.speakerConfidence ? parseFloat(customMetadata.speakerConfidence) : undefined,
            uploadedAt: customMetadata.uploadedAt || metadata.timeCreated || new Date().toISOString(),
            filePath: itemRef.fullPath,
            size: metadata.size
          });
        } catch (metadataError) {
          console.warn(`Failed to get metadata for file ${itemRef.fullPath}:`, metadataError);
        }
      }

      // Sort by upload time (newest first)
      return samples.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    } catch (error) {
      console.error('Error listing voice samples:', error);
      return [];
    }
  }

  /**
   * Get metadata for a specific voice sample
   * CLIENT-SIDE ONLY
   */
  static async getVoiceSampleMetadata(filePath: string): Promise<VoiceSampleMetadata | null> {
    try {
      const fileRef = ref(storage, filePath);
      const metadata = await getMetadata(fileRef);
      const customMetadata = metadata.customMetadata || {};

      return {
        deepgramVoiceId: customMetadata.deepgramVoiceId || '',
        meetingId: customMetadata.meetingId || '',
        duration: parseFloat(customMetadata.duration || '0'),
        quality: customMetadata.quality ? parseFloat(customMetadata.quality) : undefined,
        transcript: customMetadata.transcript || undefined,
        speakerConfidence: customMetadata.speakerConfidence ? parseFloat(customMetadata.speakerConfidence) : undefined,
        uploadedAt: customMetadata.uploadedAt || metadata.timeCreated || new Date().toISOString(),
        filePath,
        size: metadata.size
      };
    } catch (error) {
      console.error('Error getting voice sample metadata:', error);
      return null;
    }
  }

  /**
   * Upload a full meeting recording
   * CLIENT-SIDE ONLY
   */
  static async uploadMeetingRecording(
    meetingId: string,
    audioFile: Blob,
    compressed: boolean = false
  ): Promise<string> {
    const fileName = compressed 
      ? `meeting-recordings/${meetingId}/full_recording_compressed.mp3`
      : `meeting-recordings/${meetingId}/full_recording.webm`;
    
    const storageRef = ref(storage, fileName);
    const snapshot = await uploadBytes(storageRef, audioFile, {
      contentType: compressed ? 'audio/mpeg' : 'audio/webm',
      customMetadata: {
        meetingId,
        compressed: compressed.toString(),
        recordedAt: new Date().toISOString()
      }
    });
    
    return getDownloadURL(snapshot.ref);
  }

  /**
   * Upload a meeting clip segment
   * CLIENT-SIDE ONLY
   */
  static async uploadMeetingClip(
    meetingId: string,
    speakerId: string,
    audioFile: Blob,
    timestamp: number,
    duration: number
  ): Promise<string> {
    const fileName = `meeting-clips/${meetingId}/${timestamp}_${speakerId}_${duration}s.webm`;
    
    const storageRef = ref(storage, fileName);
    const snapshot = await uploadBytes(storageRef, audioFile, {
      contentType: 'audio/webm',
      customMetadata: {
        meetingId,
        speakerId,
        timestamp: timestamp.toString(),
        duration: duration.toString(),
        uploadedAt: new Date().toISOString()
      }
    });
    
    return getDownloadURL(snapshot.ref);
  }

  /**
   * Get download URL for any file
   * CLIENT-SIDE ONLY
   */
  static async getDownloadUrl(filePath: string): Promise<string> {
    const storageRef = ref(storage, filePath);
    return getDownloadURL(storageRef);
  }

  /**
   * Delete a file from storage
   * CLIENT-SIDE ONLY
   */
  static async deleteFile(filePath: string): Promise<void> {
    const storageRef = ref(storage, filePath);
    await deleteObject(storageRef);
  }

  /**
   * Upload any file to Firebase Storage
   * CLIENT-SIDE ONLY
   */
  static async uploadFile(filePath: string, file: Blob): Promise<string> {
    try {
      const storageRef = ref(storage, filePath);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }
}