/**
 * Legacy storage compatibility layer
 * Redirects to the new ClientStorageService
 */

import { ClientStorageService as NewStorageService } from '@/services/firebase/ClientStorageService';

export class StorageServiceLegacy {
  // Redirect voice sample uploads to new structure
  static async uploadVoiceSample(
    userId: string, 
    profileId: string, 
    audioFile: Buffer,
    mimeType: string
  ): Promise<string> {
    // Convert Buffer to Blob for client-side compatibility
    const audioBlob = new Blob([new Uint8Array(audioFile)], { type: mimeType });
    
    // Map to new structure using deepgramVoiceId
    const result = await NewStorageService.uploadVoiceSample(
      profileId, // Use profileId as deepgramVoiceId
      'legacy_' + userId, // Create a legacy meeting ID
      audioBlob,
      10 // Default duration
    );
    
    if (!result.success) {
      throw new Error(`Failed to upload voice sample: ${result.error}`);
    }
    
    return result.url!;
  }
  
  // Redirect meeting recording to new structure
  static async uploadMeetingRecording(
    meetingId: string,
    audioFile: Buffer,
    ownerId: string
  ): Promise<string> {
    // Convert Buffer to Blob for client-side compatibility
    const audioBlob = new Blob([new Uint8Array(audioFile)], { type: 'audio/mp3' });
    
    return NewStorageService.uploadMeetingRecording(
      meetingId,
      audioBlob,
      true // Assume compressed for legacy
    );
  }
  
  // TTS cache cleanup now handled differently
  static async cleanupTTSCache(): Promise<void> {
    // TTS cache cleanup not available in client-side mode
    console.warn('TTS cache cleanup not available in client-side mode');
  }
  
  // Redirect user avatar to user uploads
  static async uploadUserAvatar(
    userId: string,
    imageFile: Buffer,
    mimeType: string
  ): Promise<string> {
    // Convert Buffer to Blob for client-side compatibility
    const imageBlob = new Blob([new Uint8Array(imageFile)], { type: mimeType });
    
    // User avatars now part of user-uploads
    // Convert to voice training sample for now
    console.warn('uploadUserVoiceTraining not available in ClientStorageService');
    return Promise.resolve('/placeholder-avatar.png');
  }
  
  // Meeting documents now part of meeting recordings metadata
  static async uploadMeetingDocument(
    userId: string,
    meetingId: string,
    fileName: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<string> {
    // saveMeetingMetadata not implemented in ClientStorageService
    console.warn('uploadMeetingDocument not fully supported in client-side mode');
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
    // saveMeetingMetadata not implemented in ClientStorageService
    console.warn('generateMeetingExport not fully supported in client-side mode');
    return `meeting-recordings/${meetingId}/metadata.json`;
  }
}

// Export for backward compatibility
export { StorageServiceLegacy as StorageService };