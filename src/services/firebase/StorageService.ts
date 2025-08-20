/**
 * Storage Service
 * Manages Firebase Storage with the new hierarchy
 */

import { adminStorage } from '@/lib/firebase/admin';
import { storage } from '@/lib/firebase/client';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export class StorageService {
  // ============================================
  // VOICE SAMPLES - Individual voice clips for identification
  // ============================================
  
  /**
   * Upload a voice sample for identification
   */
  static async uploadVoiceSample(
    deepgramVoiceId: string,
    meetingId: string,
    audioFile: Buffer | Blob,
    duration: number
  ): Promise<string> {
    const timestamp = Date.now();
    const fileName = `voice-samples/${deepgramVoiceId}/${timestamp}_${meetingId}_${duration}s.webm`;
    
    if (typeof window === 'undefined') {
      // Server-side: use admin SDK
      const storageInstance = adminStorage();
      if (!storageInstance) {
        throw new Error('Firebase Admin Storage not initialized');
      }
      
      const file = storageInstance.bucket().file(fileName);
      await file.save(audioFile as Buffer, {
        metadata: {
          contentType: 'audio/webm',
          metadata: { 
            deepgramVoiceId, 
            meetingId, 
            duration: duration.toString(),
            uploadedAt: new Date().toISOString() 
          }
        }
      });
      
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      return url;
    } else {
      // Client-side: use client SDK
      const storageRef = ref(storage, fileName);
      const snapshot = await uploadBytes(storageRef, audioFile as Blob, {
        contentType: 'audio/webm',
        customMetadata: {
          deepgramVoiceId,
          meetingId,
          duration: duration.toString()
        }
      });
      
      return getDownloadURL(snapshot.ref);
    }
  }

  // ============================================
  // MEETING RECORDINGS - Full meeting recordings
  // ============================================
  
  /**
   * Upload a full meeting recording
   */
  static async uploadMeetingRecording(
    meetingId: string,
    audioFile: Buffer | Blob,
    compressed: boolean = false
  ): Promise<string> {
    const fileName = compressed 
      ? `meeting-recordings/${meetingId}/full_recording_compressed.mp3`
      : `meeting-recordings/${meetingId}/full_recording.webm`;
    
    if (typeof window === 'undefined') {
      const storageInstance = adminStorage();
      if (!storageInstance) {
        throw new Error('Firebase Admin Storage not initialized');
      }
      
      const file = storageInstance.bucket().file(fileName);
      await file.save(audioFile as Buffer, {
        metadata: {
          contentType: compressed ? 'audio/mpeg' : 'audio/webm',
          metadata: { 
            meetingId,
            compressed: compressed.toString(),
            recordedAt: new Date().toISOString() 
          }
        }
      });
      
      return fileName;
    } else {
      const storageRef = ref(storage, fileName);
      const snapshot = await uploadBytes(storageRef, audioFile as Blob, {
        contentType: compressed ? 'audio/mpeg' : 'audio/webm',
        customMetadata: {
          meetingId,
          compressed: compressed.toString()
        }
      });
      
      return getDownloadURL(snapshot.ref);
    }
  }

  /**
   * Save meeting metadata
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
    
    if (typeof window === 'undefined') {
      const storageInstance = adminStorage();
      if (!storageInstance) {
        throw new Error('Firebase Admin Storage not initialized');
      }
      
      const file = storageInstance.bucket().file(fileName);
      await file.save(Buffer.from(metadataContent), {
        metadata: {
          contentType: 'application/json',
          metadata: { meetingId }
        }
      });
    }
  }

  // ============================================
  // MEETING CLIPS - Specific segments from meetings
  // ============================================
  
  /**
   * Upload a meeting clip segment
   */
  static async uploadMeetingClip(
    meetingId: string,
    speakerId: string,
    audioFile: Buffer | Blob,
    timestamp: number,
    duration: number
  ): Promise<string> {
    const fileName = `meeting-clips/${meetingId}/${timestamp}_${speakerId}_${duration}s.webm`;
    
    if (typeof window === 'undefined') {
      const storageInstance = adminStorage();
      if (!storageInstance) {
        throw new Error('Firebase Admin Storage not initialized');
      }
      
      const file = storageInstance.bucket().file(fileName);
      await file.save(audioFile as Buffer, {
        metadata: {
          contentType: 'audio/webm',
          metadata: { 
            meetingId,
            speakerId,
            timestamp: timestamp.toString(),
            duration: duration.toString(),
            uploadedAt: new Date().toISOString() 
          }
        }
      });
      
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      return url;
    } else {
      const storageRef = ref(storage, fileName);
      const snapshot = await uploadBytes(storageRef, audioFile as Blob, {
        contentType: 'audio/webm',
        customMetadata: {
          meetingId,
          speakerId,
          timestamp: timestamp.toString(),
          duration: duration.toString()
        }
      });
      
      return getDownloadURL(snapshot.ref);
    }
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
    audioFile: Buffer | Blob,
    sampleType: 'best_sample' | 'sample_1' | 'sample_2'
  ): Promise<string> {
    const fileName = `identification-samples/${meetingId}/${deepgramVoiceId}/${sampleType}.webm`;
    
    if (typeof window === 'undefined') {
      const storageInstance = adminStorage();
      if (!storageInstance) {
        throw new Error('Firebase Admin Storage not initialized');
      }
      
      const file = storageInstance.bucket().file(fileName);
      await file.save(audioFile as Buffer, {
        metadata: {
          contentType: 'audio/webm',
          metadata: { 
            meetingId,
            deepgramVoiceId,
            sampleType,
            uploadedAt: new Date().toISOString() 
          }
        }
      });
      
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
      });
      
      return url;
    } else {
      const storageRef = ref(storage, fileName);
      const snapshot = await uploadBytes(storageRef, audioFile as Blob, {
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
    audioFile: Buffer | Blob,
    isInitial: boolean = false
  ): Promise<string> {
    const fileName = isInitial 
      ? `user-uploads/${userId}/voice-training/initial_sample.webm`
      : `user-uploads/${userId}/voice-training/${Date.now()}_sample.webm`;
    
    if (typeof window === 'undefined') {
      const storageInstance = adminStorage();
      if (!storageInstance) {
        throw new Error('Firebase Admin Storage not initialized');
      }
      
      const file = storageInstance.bucket().file(fileName);
      await file.save(audioFile as Buffer, {
        metadata: {
          contentType: 'audio/webm',
          metadata: { 
            userId,
            isInitial: isInitial.toString(),
            uploadedAt: new Date().toISOString() 
          }
        }
      });
      
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 365 * 24 * 60 * 60 * 1000 // 1 year
      });
      
      return url;
    } else {
      const storageRef = ref(storage, fileName);
      const snapshot = await uploadBytes(storageRef, audioFile as Blob, {
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
    chunkData: Buffer | Blob,
    timestamp: number
  ): Promise<string> {
    const fileName = `temp/${sessionId}/${timestamp}_chunk.webm`;
    
    if (typeof window === 'undefined') {
      const storageInstance = adminStorage();
      if (!storageInstance) {
        throw new Error('Firebase Admin Storage not initialized');
      }
      
      const file = storageInstance.bucket().file(fileName);
      await file.save(chunkData as Buffer, {
        metadata: {
          contentType: 'audio/webm',
          metadata: { 
            sessionId,
            timestamp: timestamp.toString(),
            uploadedAt: new Date().toISOString() 
          }
        }
      });
      
      return fileName;
    } else {
      const storageRef = ref(storage, fileName);
      const snapshot = await uploadBytes(storageRef, chunkData as Blob, {
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
      const storageInstance = adminStorage();
      if (!storageInstance) {
        console.error('Firebase Admin Storage not initialized');
        return;
      }

      const [files] = await storageInstance.bucket().getFiles({
        prefix: `temp/${sessionId}/`,
      });
      
      for (const file of files) {
        await file.delete().catch(console.error);
      }
    }
  }

  /**
   * Clean up old temp files (older than 24 hours)
   */
  static async cleanupOldTempFiles(): Promise<void> {
    if (typeof window === 'undefined') {
      const storageInstance = adminStorage();
      if (!storageInstance) {
        console.error('Firebase Admin Storage not initialized');
        return;
      }

      const [files] = await storageInstance.bucket().getFiles({
        prefix: 'temp/',
      });
      
      const now = new Date();
      const expirationMs = 24 * 60 * 60 * 1000; // 24 hours
      
      for (const file of files) {
        const [metadata] = await file.getMetadata();
        const created = new Date(metadata.timeCreated || new Date());
        
        if (now.getTime() - created.getTime() > expirationMs) {
          await file.delete().catch(console.error);
        }
      }
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================
  
  /**
   * Get signed URL for any file
   */
  static async getSignedUrl(
    filePath: string,
    expirationDays: number = 7
  ): Promise<string> {
    if (typeof window === 'undefined') {
      const storageInstance = adminStorage();
      if (!storageInstance) {
        throw new Error('Firebase Admin Storage not initialized');
      }
      
      const file = storageInstance.bucket().file(filePath);
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + expirationDays * 24 * 60 * 60 * 1000
      });
      
      return url;
    } else {
      const storageRef = ref(storage, filePath);
      return getDownloadURL(storageRef);
    }
  }

  /**
   * Delete a file from storage
   */
  static async deleteFile(filePath: string): Promise<void> {
    if (typeof window === 'undefined') {
      const storageInstance = adminStorage();
      if (!storageInstance) {
        throw new Error('Firebase Admin Storage not initialized');
      }
      
      const file = storageInstance.bucket().file(filePath);
      await file.delete();
    } else {
      const storageRef = ref(storage, filePath);
      await deleteObject(storageRef);
    }
  }
}