import { SecurityMonitor } from './monitoring';

interface AudioValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  riskScore: number;
  metadata?: AudioMetadata;
}

interface AudioMetadata {
  duration: number;
  sampleRate: number;
  channels: number;
  bitRate?: number;
  format: string;
  size: number;
}

interface VoiceProcessingOptions {
  maxDuration: number; // seconds
  maxFileSize: number; // bytes
  allowedFormats: string[];
  requireValidAudio: boolean;
  scanForMalware: boolean;
}

export class AudioSecurity {
  private static readonly DEFAULT_OPTIONS: VoiceProcessingOptions = {
    maxDuration: 300, // 5 minutes
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedFormats: ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg'],
    requireValidAudio: true,
    scanForMalware: false
  };

  // Comprehensive audio file validation
  static async validateAudioFile(
    file: File | Blob,
    options: Partial<VoiceProcessingOptions> = {}
  ): Promise<AudioValidationResult> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskScore = 0;
    let metadata: AudioMetadata | undefined;

    try {
      // 1. Basic file validation
      const basicValidation = await this.validateBasicFileProperties(file, config);
      if (!basicValidation.isValid) {
        return basicValidation;
      }

      // 2. Content type validation
      if (file instanceof File) {
        if (!config.allowedFormats.includes(file.type)) {
          errors.push(`Unsupported audio format: ${file.type}`);
          riskScore += 0.5;
        }

        // Check for file extension mismatch
        const extension = file.name.split('.').pop()?.toLowerCase();
        const expectedExtensions = this.getExpectedExtensions(file.type);
        if (extension && !expectedExtensions.includes(extension)) {
          warnings.push(`File extension ${extension} doesn't match MIME type ${file.type}`);
          riskScore += 0.2;
        }
      }

      // 3. Audio metadata extraction and validation
      try {
        metadata = await this.extractAudioMetadata(file);
        
        if (metadata.duration > config.maxDuration) {
          errors.push(`Audio duration ${metadata.duration}s exceeds maximum ${config.maxDuration}s`);
          riskScore += 0.3;
        }

        if (metadata.duration < 0.1) {
          errors.push('Audio file too short (minimum 0.1 seconds)');
          riskScore += 0.2;
        }

        // Validate audio properties
        if (metadata.sampleRate < 8000 || metadata.sampleRate > 48000) {
          warnings.push(`Unusual sample rate: ${metadata.sampleRate}Hz`);
          riskScore += 0.1;
        }

        if (metadata.channels > 2) {
          warnings.push(`Multi-channel audio detected: ${metadata.channels} channels`);
          riskScore += 0.1;
        }

      } catch (error) {
        if (config.requireValidAudio) {
          errors.push('Failed to extract audio metadata - file may be corrupted');
          riskScore += 0.4;
        } else {
          warnings.push('Could not validate audio properties');
          riskScore += 0.1;
        }
      }

      // 4. Content scanning for suspicious patterns
      const contentScan = await this.scanAudioContent(file);
      errors.push(...contentScan.errors);
      warnings.push(...contentScan.warnings);
      riskScore += contentScan.riskScore;

      // 5. Malware scanning (if enabled)
      if (config.scanForMalware) {
        const malwareScan = await this.scanForMalware(file);
        if (!malwareScan.clean) {
          errors.push('File failed malware scan');
          riskScore += 1.0;
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        riskScore: Math.min(riskScore, 1.0),
        metadata
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        riskScore: 0.8
      };
    }
  }

  private static async validateBasicFileProperties(
    file: File | Blob,
    config: VoiceProcessingOptions
  ): Promise<AudioValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskScore = 0;

    // Size validation
    if (file.size === 0) {
      errors.push('File is empty');
      riskScore += 0.5;
    }

    if (file.size > config.maxFileSize) {
      errors.push(`File size ${file.size} bytes exceeds maximum ${config.maxFileSize} bytes`);
      riskScore += 0.3;
    }

    // Extremely large files are suspicious
    if (file.size > 100 * 1024 * 1024) { // 100MB
      warnings.push('Very large audio file detected');
      riskScore += 0.2;
    }

    // Check for suspicious file names (if File object)
    if (file instanceof File) {
      const suspiciousPatterns = [
        /\.(exe|scr|bat|cmd|com|pif|vbs|js|jar)$/i,
        /[<>:"|?*]/,
        /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(file.name)) {
          errors.push(`Suspicious file name: ${file.name}`);
          riskScore += 0.7;
          break;
        }
      }

      // Check for hidden files or very long names
      if (file.name.startsWith('.') && file.name.length > 1) {
        warnings.push('Hidden file detected');
        riskScore += 0.1;
      }

      if (file.name.length > 255) {
        warnings.push('Very long filename');
        riskScore += 0.1;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskScore
    };
  }

  private static async extractAudioMetadata(file: File | Blob): Promise<AudioMetadata> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);

      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        
        // Extract available metadata
        const metadata: AudioMetadata = {
          duration: audio.duration,
          sampleRate: 44100, // Default, actual detection would need Web Audio API
          channels: 2, // Default, actual detection would need Web Audio API
          format: file instanceof File ? file.type : 'unknown',
          size: file.size
        };

        resolve(metadata);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load audio file'));
      };

      // Set a timeout for metadata loading
      setTimeout(() => {
        URL.revokeObjectURL(url);
        reject(new Error('Timeout loading audio metadata'));
      }, 10000);

      audio.src = url;
    });
  }

  private static async scanAudioContent(file: File | Blob): Promise<{
    errors: string[];
    warnings: string[];
    riskScore: number;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskScore = 0;

    try {
      // Read first chunk of file for header analysis
      const headerSize = Math.min(1024, file.size);
      const headerBuffer = await file.slice(0, headerSize).arrayBuffer();
      const headerBytes = new Uint8Array(headerBuffer);

      // Check for valid audio file headers
      const audioHeaders = [
        { format: 'MP3', signature: [0xFF, 0xFB] },
        { format: 'MP3', signature: [0xFF, 0xF3] },
        { format: 'MP3', signature: [0xFF, 0xF2] },
        { format: 'WAV', signature: [0x52, 0x49, 0x46, 0x46] }, // RIFF
        { format: 'OGG', signature: [0x4F, 0x67, 0x67, 0x53] }, // OggS
        { format: 'WEBM', signature: [0x1A, 0x45, 0xDF, 0xA3] }
      ];

      let hasValidHeader = false;
      for (const { format, signature } of audioHeaders) {
        if (this.compareBytes(headerBytes, signature, 0)) {
          hasValidHeader = true;
          break;
        }
      }

      if (!hasValidHeader) {
        warnings.push('No valid audio header detected');
        riskScore += 0.3;
      }

      // Check for embedded executable content
      const executableSignatures = [
        [0x4D, 0x5A], // MZ (PE executable)
        [0x50, 0x4B], // PK (ZIP/JAR)
        [0x7F, 0x45, 0x4C, 0x46], // ELF executable
      ];

      for (const signature of executableSignatures) {
        if (this.searchBytes(headerBytes, signature)) {
          errors.push('Embedded executable content detected');
          riskScore += 0.8;
          break;
        }
      }

      // Check for suspicious metadata
      const headerString = new TextDecoder('utf-8', { fatal: false }).decode(headerBytes);
      const suspiciousStrings = [
        'script', 'javascript', 'vbscript', 'powershell',
        'cmd.exe', 'system32', 'shell', 'eval'
      ];

      for (const suspicious of suspiciousStrings) {
        if (headerString.toLowerCase().includes(suspicious)) {
          warnings.push(`Suspicious content detected: ${suspicious}`);
          riskScore += 0.2;
        }
      }

    } catch (error) {
      warnings.push('Failed to scan audio content');
      riskScore += 0.1;
    }

    return { errors, warnings, riskScore };
  }

  private static async scanForMalware(file: File | Blob): Promise<{ clean: boolean }> {
    // Placeholder for malware scanning
    // In production, integrate with actual malware scanning service
    try {
      const malwareScanEndpoint = process.env.MALWARE_SCAN_ENDPOINT;
      if (!malwareScanEndpoint) {
        return { clean: true }; // Skip if no scanner configured
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(malwareScanEndpoint, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${process.env.MALWARE_SCAN_API_KEY}`
        }
      });

      const result = await response.json();
      return { clean: result.clean === true };

    } catch (error) {
      console.error('Malware scan failed:', error);
      return { clean: true }; // Default to clean if scan fails
    }
  }

  private static compareBytes(buffer: Uint8Array, signature: number[], offset: number = 0): boolean {
    if (buffer.length < offset + signature.length) return false;
    
    for (let i = 0; i < signature.length; i++) {
      if (buffer[offset + i] !== signature[i]) return false;
    }
    
    return true;
  }

  private static searchBytes(buffer: Uint8Array, signature: number[]): boolean {
    for (let i = 0; i <= buffer.length - signature.length; i++) {
      if (this.compareBytes(buffer, signature, i)) return true;
    }
    return false;
  }

  private static getExpectedExtensions(mimeType: string): string[] {
    const extensionMap: Record<string, string[]> = {
      'audio/mpeg': ['mp3'],
      'audio/mp3': ['mp3'],
      'audio/wav': ['wav'],
      'audio/wave': ['wav'],
      'audio/webm': ['webm'],
      'audio/ogg': ['ogg'],
      'audio/opus': ['opus']
    };

    return extensionMap[mimeType] || [];
  }

  // Voice sample security validation
  static async validateVoiceSample(
    audioData: ArrayBuffer | File,
    voiceId: string,
    userId: string,
    clientIP: string,
    userAgent: string
  ): Promise<AudioValidationResult> {
    try {
      const file = audioData instanceof ArrayBuffer 
        ? new Blob([audioData], { type: 'audio/webm' })
        : audioData;

      const result = await this.validateAudioFile(file, {
        maxDuration: 30, // Voice samples should be short
        maxFileSize: 5 * 1024 * 1024, // 5MB max for voice samples
        requireValidAudio: true,
        scanForMalware: true
      });

      // Log voice data access
      await SecurityMonitor.logVoiceDataAccess(
        userId,
        voiceId,
        'write',
        clientIP,
        userAgent
      );

      // Additional voice-specific validation
      if (result.metadata && result.metadata.duration < 1) {
        result.warnings.push('Voice sample may be too short for accurate identification');
        result.riskScore += 0.1;
      }

      if (result.metadata && result.metadata.duration > 30) {
        result.errors.push('Voice sample too long (maximum 30 seconds)');
        result.riskScore += 0.3;
      }

      return result;

    } catch (error) {
      return {
        isValid: false,
        errors: [`Voice sample validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        riskScore: 0.8
      };
    }
  }

  // Meeting recording security validation
  static async validateMeetingRecording(
    audioData: ArrayBuffer | File,
    meetingId: string,
    userId: string,
    clientIP: string,
    userAgent: string
  ): Promise<AudioValidationResult> {
    try {
      const file = audioData instanceof ArrayBuffer 
        ? new Blob([audioData], { type: 'audio/webm' })
        : audioData;

      const result = await this.validateAudioFile(file, {
        maxDuration: 7200, // 2 hours max for meetings
        maxFileSize: 500 * 1024 * 1024, // 500MB max for meetings
        requireValidAudio: true,
        scanForMalware: true
      });

      // Log meeting access
      await SecurityMonitor.logMeetingAccess(
        userId,
        meetingId,
        'create',
        clientIP,
        userAgent
      );

      return result;

    } catch (error) {
      return {
        isValid: false,
        errors: [`Meeting recording validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        riskScore: 0.8
      };
    }
  }

  // Sanitize audio metadata before storage
  static sanitizeAudioMetadata(metadata: any): Record<string, any> {
    const allowedFields = [
      'duration',
      'sampleRate',
      'channels',
      'bitRate',
      'format',
      'size',
      'createdAt',
      'confidence'
    ];

    const sanitized: Record<string, any> = {};

    for (const field of allowedFields) {
      if (metadata[field] !== undefined) {
        // Type validation and sanitization
        switch (field) {
          case 'duration':
          case 'sampleRate':
          case 'channels':
          case 'bitRate':
          case 'size':
          case 'confidence':
            if (typeof metadata[field] === 'number' && !isNaN(metadata[field])) {
              sanitized[field] = Math.max(0, metadata[field]);
            }
            break;
          case 'format':
            if (typeof metadata[field] === 'string' && metadata[field].length < 50) {
              sanitized[field] = metadata[field].replace(/[^\w\-\/]/g, '');
            }
            break;
          case 'createdAt':
            if (metadata[field] instanceof Date || typeof metadata[field] === 'string') {
              sanitized[field] = new Date(metadata[field]).toISOString();
            }
            break;
        }
      }
    }

    return sanitized;
  }
}

// Export default validator instance
export const defaultAudioValidator = new (class extends AudioSecurity {
  async validateAudioFile(file: File | Blob, fileName?: string): Promise<AudioValidationResult> {
    return AudioSecurity.validateAudioFile(file, {
      maxDuration: 300,
      maxFileSize: 52428800, // 50MB
      allowedFormats: ['webm', 'mp3', 'wav', 'm4a'],
      requireValidAudio: true,
      scanForMalware: false
    });
  }
})();

// Export types
export type { AudioValidationResult, AudioMetadata, VoiceProcessingOptions };