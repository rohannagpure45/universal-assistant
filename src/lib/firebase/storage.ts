import { adminStorage } from '@/lib/firebase/admin';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export class StorageService {
  // Upload voice sample
  static async uploadVoiceSample(
    userId: string, 
    profileId: string, 
    audioFile: Buffer,
    mimeType: string
  ): Promise<string> {
    const storage = adminStorage();
    if (!storage) {
      throw new Error('Firebase Admin Storage not initialized');
    }

    const fileName = `voice-samples/${userId}/${profileId}/sample.${mimeType.split('/')[1]}`;
    const file = storage.bucket().file(fileName);
    
    await file.save(audioFile, {
      metadata: {
        contentType: mimeType,
        metadata: { userId, profileId, uploadedAt: new Date().toISOString() }
      }
    });
    
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    return url;
  }
  
  // Upload meeting recording
  static async uploadMeetingRecording(
    meetingId: string,
    audioFile: Buffer,
    ownerId: string
  ): Promise<string> {
    const storage = adminStorage();
    if (!storage) {
      throw new Error('Firebase Admin Storage not initialized');
    }

    const fileName = `meeting-recordings/${meetingId}/full-recording.mp3`;
    const file = storage.bucket().file(fileName);
    
    await file.save(audioFile, {
      metadata: {
        contentType: 'audio/mpeg',
        metadata: { meetingId, ownerId, recordedAt: new Date().toISOString() }
      }
    });
    
    return fileName;
  }
  
  // Clean up expired TTS cache
  static async cleanupTTSCache(): Promise<void> {
    const storage = adminStorage();
    if (!storage) {
      console.error('Firebase Admin Storage not initialized');
      return;
    }

    const [files] = await storage.bucket().getFiles({
      prefix: 'tts-cache/',
    });
    
    const now = new Date();
    const expirationMs = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    for (const file of files) {
      const [metadata] = await file.getMetadata();
      const created = new Date(metadata.timeCreated || new Date());
      
      if (now.getTime() - created.getTime() > expirationMs) {
        await file.delete().catch(console.error);
      }
    }
  }
  
  // Upload user avatar
  static async uploadUserAvatar(
    userId: string,
    imageFile: Buffer,
    mimeType: string
  ): Promise<string> {
    const storage = adminStorage();
    if (!storage) {
      throw new Error('Firebase Admin Storage not initialized');
    }

    const extension = mimeType.split('/')[1];
    const fileName = `user-uploads/${userId}/avatars/avatar.${extension}`;
    const file = storage.bucket().file(fileName);
    
    await file.save(imageFile, {
      metadata: {
        contentType: mimeType,
        metadata: { userId, type: 'avatar', uploadedAt: new Date().toISOString() }
      }
    });
    
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000 // 1 year
    });
    
    return url;
  }
  
  // Upload meeting document
  static async uploadMeetingDocument(
    userId: string,
    meetingId: string,
    fileName: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<string> {
    const storage = adminStorage();
    if (!storage) {
      throw new Error('Firebase Admin Storage not initialized');
    }

    const filePath = `user-uploads/${userId}/documents/${meetingId}/${fileName}`;
    const file = storage.bucket().file(filePath);
    
    await file.save(fileBuffer, {
      metadata: {
        contentType: mimeType,
        metadata: { 
          userId, 
          meetingId, 
          originalName: fileName,
          uploadedAt: new Date().toISOString() 
        }
      }
    });
    
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    
    return url;
  }
  
  // Generate meeting export
  static async generateMeetingExport(
    userId: string,
    meetingId: string,
    exportType: 'summary' | 'transcript' | 'analytics',
    content: Buffer,
    format: 'pdf' | 'docx' | 'json'
  ): Promise<string> {
    const storage = adminStorage();
    if (!storage) {
      throw new Error('Firebase Admin Storage not initialized');
    }

    const fileName = `exports/${userId}/meeting-summaries/${meetingId}/${exportType}.${format}`;
    const file = storage.bucket().file(fileName);
    
    const mimeTypes = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      json: 'application/json'
    };
    
    await file.save(content, {
      metadata: {
        contentType: mimeTypes[format],
        metadata: { 
          userId, 
          meetingId, 
          exportType,
          generatedAt: new Date().toISOString() 
        }
      }
    });
    
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    return url;
  }
}