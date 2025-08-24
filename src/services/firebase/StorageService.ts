/**
 * Storage Service
 * Manages Firebase Storage with the new hierarchy - CLIENT-SIDE ONLY
 * For server-side operations, use the API routes in /api/storage/
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

export class StorageService {
  // ============================================
  // VOICE SAMPLES - Individual voice clips for identification
  // ============================================
  
  /**
   * Enhanced upload voice sample for identification with metadata
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
      
      // Client-side: use client SDK
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
   * CLIENT-SIDE ONLY - For server-side operations, use API routes
   */
  static async listVoiceSamples(
    deepgramVoiceId: string,
    limit: number = 50
  ): Promise<VoiceSampleMetadata[]> {
    try {
      // Client-side: use client SDK
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
   * CLIENT-SIDE ONLY - For server-side operations, use API routes
   */
  static async getVoiceSampleMetadata(filePath: string): Promise<VoiceSampleMetadata | null> {
    try {
      // Client-side: use client SDK
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
   * Delete old voice samples based on age
   * SERVER-SIDE ONLY - Not available in client-side mode
   * Use the API route /api/storage/cleanup for this operation
   */
  static async deleteOldSamples(olderThanDays: number = 30): Promise<{ deleted: number; errors: number }> {
    console.warn('deleteOldSamples is only available server-side. Use /api/storage/cleanup instead.');
    return { deleted: 0, errors: 1 };
  }

  /**
   * Get best quality samples for speaker identification
   */
  static async getBestSamplesForIdentification(
    deepgramVoiceId: string,
    maxSamples: number = 5
  ): Promise<VoiceSampleMetadata[]> {
    try {
      const allSamples = await this.listVoiceSamples(deepgramVoiceId, 100);
      
      // Filter and sort by quality, duration, and confidence
      const scoredSamples = allSamples
        .filter(sample => 
          sample.duration >= 2 && // At least 2 seconds
          sample.duration <= 30 && // No more than 30 seconds
          (sample.quality || 0) > 0.3 && // Decent quality
          (sample.speakerConfidence || 0) > 0.5 // Good speaker confidence
        )
        .map(sample => ({
          ...sample,
          score: this.calculateSampleScore(sample)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, maxSamples);

      return scoredSamples;
    } catch (error) {
      console.error('Error getting best samples for identification:', error);
      return [];
    }
  }

  /**
   * Calculate a score for sample quality based on multiple factors
   */
  private static calculateSampleScore(sample: VoiceSampleMetadata): number {
    const qualityScore = (sample.quality || 0.5) * 0.4;
    const confidenceScore = (sample.speakerConfidence || 0.5) * 0.3;
    
    // Prefer samples between 3-15 seconds
    const idealDuration = 8;
    const durationDiff = Math.abs(sample.duration - idealDuration);
    const durationScore = Math.max(0, 1 - (durationDiff / idealDuration)) * 0.2;
    
    // Prefer samples with transcripts
    const transcriptScore = sample.transcript ? 0.1 : 0;
    
    return qualityScore + confidenceScore + durationScore + transcriptScore;
  }

  /**
   * Query voice samples by meeting ID
   */
  static async getVoiceSamplesByMeeting(meetingId: string): Promise<VoiceSampleMetadata[]> {
    try {
      if (typeof window === 'undefined') {
        // Server-side operation not supported in client-only mode
        console.warn('getVoiceSamplesByMeeting: Server-side operation not supported');
        return [];
        // const [files] = await storageInstance.bucket().getFiles({
        //   prefix: 'voice-samples/',
        // });
        // const samples: VoiceSampleMetadata[] = [];
        // for (const file of files) {
        //   try {
        //     const [metadata] = await file.getMetadata();
        //     const customMetadata = metadata.metadata || {};
        //     if (customMetadata.meetingId === meetingId) {
        //       samples.push({
        //         deepgramVoiceId: customMetadata.deepgramVoiceId || '',
        //         meetingId: customMetadata.meetingId || '',
        //         duration: parseFloat(customMetadata.duration || '0'),
        //         quality: customMetadata.quality ? parseFloat(customMetadata.quality) : undefined,
        //         transcript: customMetadata.transcript || undefined,
        //         speakerConfidence: customMetadata.speakerConfidence ? parseFloat(customMetadata.speakerConfidence) : undefined,
        //         uploadedAt: customMetadata.uploadedAt || metadata.timeCreated || new Date().toISOString(),
        //         filePath: file.name,
        //         size: metadata.size ? parseInt(metadata.size) : undefined
        //       });
        //     }
        //   } catch (metadataError) {
        //     console.warn(`Failed to get metadata for file ${file.name}:`, metadataError);
        //   }
        // }
        // return samples.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      } else {
        console.warn('getVoiceSamplesByMeeting can only be called server-side for efficient querying');
        return [];
      }
    } catch (error) {
      console.error('Error getting voice samples by meeting:', error);
      return [];
    }
  }

  /**
   * Get storage statistics for voice samples
   */
  static async getVoiceSampleStats(): Promise<{
    totalSamples: number;
    totalSize: number;
    speakerCount: number;
    oldestSample?: string;
    newestSample?: string;
  }> {
    try {
      if (typeof window === 'undefined') {
        // Server-side operation not supported in client-only mode
        console.warn('getVoiceSampleStats: Server-side operation not supported');
        return {
          totalSamples: 0,
          totalSize: 0,
          speakerCount: 0
        };
        // const [files] = await storageInstance.bucket().getFiles({
        //   prefix: 'voice-samples/',
        // });

        // let totalSize = 0;
        // const speakers = new Set<string>();
        // let oldestDate = new Date();
        // let newestDate = new Date(0);
        // let oldestSample = '';
        // let newestSample = '';
        // for (const file of files) {
        //   try {
        //     const [metadata] = await file.getMetadata();
        //     const customMetadata = metadata.metadata || {};
        //     totalSize += parseInt(metadata.size || '0');
        //     if (customMetadata.deepgramVoiceId) {
        //       speakers.add(customMetadata.deepgramVoiceId);
        //     }
        //     const uploadedAt = new Date(customMetadata.uploadedAt || metadata.timeCreated || new Date());
        //     if (uploadedAt < oldestDate) {
        //       oldestDate = uploadedAt;
        //       oldestSample = file.name;
        //     }
        //     if (uploadedAt > newestDate) {
        //       newestDate = uploadedAt;
        //       newestSample = file.name;
        //     }
        //   } catch (metadataError) {
        //     console.warn(`Failed to get metadata for file ${file.name}:`, metadataError);
        //   }
        // }
        // return {
        //   totalSamples: files.length,
        //   totalSize,
        //   speakerCount: speakers.size,
        //   oldestSample: oldestSample || undefined,
        //   newestSample: newestSample || undefined
        // };
      } else {
        console.warn('getVoiceSampleStats can only be called server-side');
        return {
          totalSamples: 0,
          totalSize: 0,
          speakerCount: 0
        };
      }
    } catch (error) {
      console.error('Error getting voice sample stats:', error);
      return {
        totalSamples: 0,
        totalSize: 0,
        speakerCount: 0
      };
    }
  }

  /**
   * Batch upload multiple voice samples with progress tracking
   */
  static async batchUploadVoiceSamples(
    samples: Array<{
      deepgramVoiceId: string;
      meetingId: string;
      audioFile: Blob;
      duration: number;
      metadata?: {
        quality?: number;
        transcript?: string;
        speakerConfidence?: number;
      };
    }>,
    progressCallback?: (completed: number, total: number, current?: VoiceSampleMetadata) => void
  ): Promise<StorageOperationResult[]> {
    const results: StorageOperationResult[] = [];
    
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      
      try {
        const result = await this.uploadVoiceSample(
          sample.deepgramVoiceId,
          sample.meetingId,
          sample.audioFile,
          sample.duration,
          sample.metadata
        );
        
        results.push(result);
        
        if (progressCallback) {
          progressCallback(i + 1, samples.length, result.metadata);
        }
      } catch (error) {
        const errorResult: StorageOperationResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
        results.push(errorResult);
        
        if (progressCallback) {
          progressCallback(i + 1, samples.length);
        }
      }
    }
    
    return results;
  }

  /**
   * Create retention policy for voice samples based on storage constraints
   */
  static async enforceRetentionPolicy(
    maxTotalSize: number = 500 * 1024 * 1024, // 500MB default
    maxSamplesPerSpeaker: number = 20
  ): Promise<{ totalDeleted: number; sizeSaved: number; errors: number }> {
    // Client-side operation not supported
    console.warn('enforceRetentionPolicy: Server-side operation not supported in client-only mode');
    return { totalDeleted: 0, sizeSaved: 0, errors: 1 };
  }

  // ============================================
  // MEETING RECORDINGS - Full meeting recordings
  // ============================================
  
  /**
   * Upload a full meeting recording
   * CLIENT-SIDE ONLY - Uses Firebase Client SDK
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
   * Save meeting metadata
   * CLIENT-SIDE ONLY - Simplified version using client SDK
   */
  static async saveMeetingMetadata(
    meetingId: string,
    metadata: {
      title: string;
      startTime: Date;
      endTime: Date;
      duration: number;
      participants: string[];
      transcriptAvailable: boolean;
    }
  ): Promise<void> {
    const fileName = `meeting-recordings/${meetingId}/metadata.json`;
    const metadataContent = JSON.stringify(metadata, null, 2);
    const metadataBlob = new Blob([metadataContent], { type: 'application/json' });
    
    const storageRef = ref(storage, fileName);
    await uploadBytes(storageRef, metadataBlob, {
      contentType: 'application/json',
      customMetadata: { meetingId }
    });
  }

  // ============================================
  // MEETING CLIPS - Specific segments from meetings
  // ============================================
  
  /**
   * Upload a meeting clip segment
   * CLIENT-SIDE ONLY - Uses Firebase Client SDK
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

  // ============================================
  // IDENTIFICATION SAMPLES - Clips pending identification
  // ============================================
  
  /**
   * Upload samples for identification
   */
  static async uploadIdentificationSample(
    meetingId: string,
    deepgramVoiceId: string,
    audioFile: Blob,
    sampleType: 'best_sample' | 'sample_1' | 'sample_2'
  ): Promise<string> {
    const fileName = `identification-samples/${meetingId}/${deepgramVoiceId}/${sampleType}.webm`;
    
    if (typeof window === 'undefined') {
      // Server-side not supported in client-only mode
      throw new Error('Server-side operation not supported in client-only mode');
    } else {
      const storageRef = ref(storage, fileName);
      const snapshot = await uploadBytes(storageRef, audioFile, {
        contentType: 'audio/webm',
        customMetadata: {
          meetingId,
          deepgramVoiceId,
          sampleType
        }
      });
      
      return getDownloadURL(snapshot.ref);
    }
  }

  // ============================================
  // USER UPLOADS - User-provided voice samples
  // ============================================
  
  /**
   * Upload user voice training sample
   */
  static async uploadUserVoiceTraining(
    userId: string,
    audioFile: Blob,
    isInitial: boolean = false
  ): Promise<string> {
    const fileName = isInitial 
      ? `user-uploads/${userId}/voice-training/initial_sample.webm`
      : `user-uploads/${userId}/voice-training/${Date.now()}_sample.webm`;
    
    if (typeof window === 'undefined') {
      // Server-side not supported in client-only mode
      throw new Error('Server-side operation not supported in client-only mode');
    } else {
      const storageRef = ref(storage, fileName);
      const snapshot = await uploadBytes(storageRef, audioFile, {
        contentType: 'audio/webm',
        customMetadata: {
          userId,
          isInitial: isInitial.toString()
        }
      });
      
      return getDownloadURL(snapshot.ref);
    }
  }

  // ============================================
  // TEMPORARY FILES - Temporary processing files
  // ============================================
  
  /**
   * Upload temporary chunk for live streaming
   */
  static async uploadTempChunk(
    sessionId: string,
    chunkData: Blob,
    timestamp: number
  ): Promise<string> {
    const fileName = `temp/${sessionId}/${timestamp}_chunk.webm`;
    
    if (typeof window === 'undefined') {
      // Server-side not supported in client-only mode
      throw new Error('Server-side operation not supported in client-only mode');
    } else {
      const storageRef = ref(storage, fileName);
      const snapshot = await uploadBytes(storageRef, chunkData, {
        contentType: 'audio/webm',
        customMetadata: {
          sessionId,
          timestamp: timestamp.toString()
        }
      });
      
      return snapshot.ref.fullPath;
    }
  }

  /**
   * Clean up temporary files for a session
   */
  static async cleanupTempSession(sessionId: string): Promise<void> {
    if (typeof window === 'undefined') {
      // Server-side not supported in client-only mode
      throw new Error('Server-side operation not supported in client-only mode');
    }
    
    // Client-side cleanup not implemented - requires server-side approach
    console.warn('Client-side temp file cleanup not supported - use server-side cleanup');
  }

  /**
   * Clean up old temp files (older than 24 hours)
   */
  static async cleanupOldTempFiles(): Promise<void> {
    if (typeof window === 'undefined') {
      // Server-side not supported in client-only mode
      throw new Error('Server-side operation not supported in client-only mode');
    }
    
    // Client-side cleanup not implemented - requires server-side approach
    console.warn('Client-side temp file cleanup not supported - use server-side cleanup');
  }

  // ============================================
  // UTILITY METHODS
  // ============================================
  
  /**
   * Get download URL for any file
   * CLIENT-SIDE ONLY - Uses Firebase Client SDK
   */
  static async getSignedUrl(
    filePath: string,
    expirationDays: number = 7
  ): Promise<string> {
    const storageRef = ref(storage, filePath);
    return getDownloadURL(storageRef);
  }

  /**
   * Delete a file from storage
   * CLIENT-SIDE ONLY - Uses Firebase Client SDK
   */
  static async deleteFile(filePath: string): Promise<void> {
    const storageRef = ref(storage, filePath);
    await deleteObject(storageRef);
  }
}