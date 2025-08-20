/**
 * Legacy storage compatibility layer
 * Redirects to the new StorageService
 */

import { StorageService as NewStorageService } from '@/services/firebase/StorageService';

export class StorageServiceLegacy {
  // Redirect voice sample uploads to new structure
  static async uploadVoiceSample(
    userId: string, 
    profileId: string, 
    audioFile: Buffer,
    mimeType: string
  ): Promise<string> {
    // Map to new structure using deepgramVoiceId
    return NewStorageService.uploadVoiceSample(
      profileId, // Use profileId as deepgramVoiceId
      'legacy_' + userId, // Create a legacy meeting ID
      audioFile,
      10 // Default duration
    );
  }
  
  // Redirect meeting recording to new structure
  static async uploadMeetingRecording(
    meetingId: string,
    audioFile: Buffer,
    ownerId: string
  ): Promise<string> {
    return NewStorageService.uploadMeetingRecording(
      meetingId,
      audioFile,
      true // Assume compressed for legacy
    );
  }
  
  // TTS cache cleanup now handled differently
  static async cleanupTTSCache(): Promise<void> {
    // TTS cache no longer exists in new structure
    // Clean up temp files instead
    return NewStorageService.cleanupOldTempFiles();
  }
  
  // Redirect user avatar to user uploads
  static async uploadUserAvatar(
    userId: string,
    imageFile: Buffer,
    mimeType: string
  ): Promise<string> {
    // User avatars now part of user-uploads
    // Convert to voice training sample for now
    return NewStorageService.uploadUserVoiceTraining(
      userId,
      imageFile,
      true // Mark as initial
    );
  }
  
  // Meeting documents now part of meeting recordings metadata
  static async uploadMeetingDocument(
    userId: string,
    meetingId: string,
    fileName: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<string> {
    // Store as meeting metadata
    await NewStorageService.saveMeetingMetadata(meetingId, {
      title: fileName,
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      participants: [userId],
      transcriptAvailable: false
    });
    
    return `meeting-recordings/${meetingId}/metadata.json`;
  }
  
  // Meeting exports no longer needed in new structure
  static async generateMeetingExport(
    userId: string,
    meetingId: string,
    exportType: 'summary' | 'transcript' | 'analytics',
    content: Buffer,
    format: 'pdf' | 'docx' | 'json'
  ): Promise<string> {
    // Store as meeting metadata
    await NewStorageService.saveMeetingMetadata(meetingId, {
      title: `${exportType} export`,
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      participants: [userId],
      transcriptAvailable: exportType === 'transcript'
    });
    
    return `meeting-recordings/${meetingId}/metadata.json`;
  }
}

// Export for backward compatibility
export { StorageServiceLegacy as StorageService };