import crypto from 'crypto';

interface EncryptionResult {
  encryptedData: string;
  iv: string;
  authTag?: string;
}

interface DecryptionResult {
  decryptedData: string;
  isValid: boolean;
}

interface KeyDerivationOptions {
  salt: string;
  iterations: number;
  keyLength: number;
  digest: string;
}

export class DataEncryption {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 12; // 96 bits for GCM
  private static readonly TAG_LENGTH = 16; // 128 bits
  private static readonly SALT_LENGTH = 32; // 256 bits

  // Get encryption key from environment
  private static getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable not set');
    }

    // Ensure key is exactly 32 bytes
    if (key.length === 64) {
      // Hex encoded key
      return Buffer.from(key, 'hex');
    } else if (key.length === 44) {
      // Base64 encoded key
      return Buffer.from(key, 'base64');
    } else {
      // Derive key from password
      return crypto.pbkdf2Sync(key, 'universal-assistant-salt', 100000, this.KEY_LENGTH, 'sha256');
    }
  }

  // Generate secure random key
  static generateKey(): string {
    return crypto.randomBytes(this.KEY_LENGTH).toString('hex');
  }

  // Generate secure random salt
  static generateSalt(): string {
    return crypto.randomBytes(this.SALT_LENGTH).toString('hex');
  }

  // Encrypt data using AES-256-GCM
  static encrypt(data: string): EncryptionResult {
    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(this.IV_LENGTH);
      const cipher = crypto.createCipher(this.ALGORITHM, key);
      cipher.setAAD(Buffer.from('universal-assistant', 'utf8'));

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      return {
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Decrypt data using AES-256-GCM
  static decrypt(encryptedData: string, iv: string, authTag?: string): DecryptionResult {
    try {
      const key = this.getEncryptionKey();
      const decipher = crypto.createDecipher(this.ALGORITHM, key);
      
      if (authTag) {
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      }
      
      decipher.setAAD(Buffer.from('universal-assistant', 'utf8'));

      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return {
        decryptedData: decrypted,
        isValid: true
      };
    } catch (error) {
      return {
        decryptedData: '',
        isValid: false
      };
    }
  }

  // Encrypt with password-based key derivation
  static encryptWithPassword(data: string, password: string): EncryptionResult {
    try {
      const salt = crypto.randomBytes(this.SALT_LENGTH);
      const key = crypto.pbkdf2Sync(password, salt, 100000, this.KEY_LENGTH, 'sha256');
      const iv = crypto.randomBytes(this.IV_LENGTH);
      
      const cipher = crypto.createCipher(this.ALGORITHM, key);
      cipher.setAAD(salt);

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      return {
        encryptedData: encrypted,
        iv: salt.toString('hex') + ':' + iv.toString('hex'), // Salt:IV
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      throw new Error(`Password encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Decrypt with password-based key derivation
  static decryptWithPassword(encryptedData: string, ivWithSalt: string, authTag: string, password: string): DecryptionResult {
    try {
      const [saltHex, ivHex] = ivWithSalt.split(':');
      const salt = Buffer.from(saltHex, 'hex');
      const iv = Buffer.from(ivHex, 'hex');
      const key = crypto.pbkdf2Sync(password, salt, 100000, this.KEY_LENGTH, 'sha256');
      
      const decipher = crypto.createDecipher(this.ALGORITHM, key);
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      decipher.setAAD(salt);

      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return {
        decryptedData: decrypted,
        isValid: true
      };
    } catch (error) {
      return {
        decryptedData: '',
        isValid: false
      };
    }
  }

  // Hash password securely
  static hashPassword(password: string): string {
    const salt = crypto.randomBytes(16);
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256');
    return salt.toString('hex') + ':' + hash.toString('hex');
  }

  // Verify password against hash
  static verifyPassword(password: string, hashedPassword: string): boolean {
    try {
      const [saltHex, hashHex] = hashedPassword.split(':');
      const salt = Buffer.from(saltHex, 'hex');
      const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256');
      return hash.toString('hex') === hashHex;
    } catch (error) {
      return false;
    }
  }

  // Generate secure hash for data integrity
  static generateHash(data: string, algorithm: string = 'sha256'): string {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  // Verify data integrity
  static verifyHash(data: string, hash: string, algorithm: string = 'sha256'): boolean {
    const computedHash = this.generateHash(data, algorithm);
    return computedHash === hash;
  }

  // Generate HMAC for authentication
  static generateHMAC(data: string, secret?: string): string {
    const key = secret || this.getEncryptionKey().toString('hex');
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  // Verify HMAC
  static verifyHMAC(data: string, hmac: string, secret?: string): boolean {
    const computedHMAC = this.generateHMAC(data, secret);
    return crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(computedHMAC, 'hex'));
  }
}

// Voice-specific encryption for sensitive audio data
export class VoiceDataEncryption extends DataEncryption {
  // Encrypt voice sample with metadata
  static encryptVoiceSample(audioData: ArrayBuffer, metadata: Record<string, any>): EncryptionResult {
    const combinedData = JSON.stringify({
      audio: Array.from(new Uint8Array(audioData)),
      metadata: metadata,
      timestamp: Date.now()
    });

    return this.encrypt(combinedData);
  }

  // Decrypt voice sample and extract metadata
  static decryptVoiceSample(encryptedData: string, iv: string, authTag: string): {
    audioData: ArrayBuffer;
    metadata: Record<string, any>;
    timestamp: number;
    isValid: boolean;
  } {
    const result = this.decrypt(encryptedData, iv, authTag);
    
    if (!result.isValid) {
      return {
        audioData: new ArrayBuffer(0),
        metadata: {},
        timestamp: 0,
        isValid: false
      };
    }

    try {
      const parsed = JSON.parse(result.decryptedData);
      const audioData = new ArrayBuffer(parsed.audio.length);
      const audioView = new Uint8Array(audioData);
      audioView.set(parsed.audio);

      return {
        audioData,
        metadata: parsed.metadata,
        timestamp: parsed.timestamp,
        isValid: true
      };
    } catch (error) {
      return {
        audioData: new ArrayBuffer(0),
        metadata: {},
        timestamp: 0,
        isValid: false
      };
    }
  }

  // Encrypt meeting transcript with speaker data
  static encryptMeetingTranscript(transcript: any[], speakerData: Record<string, any>): EncryptionResult {
    const combinedData = JSON.stringify({
      transcript,
      speakers: speakerData,
      timestamp: Date.now()
    });

    return this.encrypt(combinedData);
  }

  // Decrypt meeting transcript
  static decryptMeetingTranscript(encryptedData: string, iv: string, authTag: string): {
    transcript: any[];
    speakers: Record<string, any>;
    timestamp: number;
    isValid: boolean;
  } {
    const result = this.decrypt(encryptedData, iv, authTag);
    
    if (!result.isValid) {
      return {
        transcript: [],
        speakers: {},
        timestamp: 0,
        isValid: false
      };
    }

    try {
      const parsed = JSON.parse(result.decryptedData);
      return {
        transcript: parsed.transcript || [],
        speakers: parsed.speakers || {},
        timestamp: parsed.timestamp || 0,
        isValid: true
      };
    } catch (error) {
      return {
        transcript: [],
        speakers: {},
        timestamp: 0,
        isValid: false
      };
    }
  }
}

// Field-level encryption for database records
export class FieldEncryption extends DataEncryption {
  // Encrypt specific fields in an object
  static encryptFields(data: Record<string, any>, fieldsToEncrypt: string[]): Record<string, any> {
    const result = { ...data };

    for (const field of fieldsToEncrypt) {
      if (result[field] !== undefined) {
        const encrypted = this.encrypt(JSON.stringify(result[field]));
        result[field] = {
          _encrypted: true,
          data: encrypted.encryptedData,
          iv: encrypted.iv,
          authTag: encrypted.authTag
        };
      }
    }

    return result;
  }

  // Decrypt specific fields in an object
  static decryptFields(data: Record<string, any>, fieldsToDecrypt: string[]): Record<string, any> {
    const result = { ...data };

    for (const field of fieldsToDecrypt) {
      if (result[field] && result[field]._encrypted) {
        const encrypted = result[field];
        const decrypted = this.decrypt(encrypted.data, encrypted.iv, encrypted.authTag);
        
        if (decrypted.isValid) {
          try {
            result[field] = JSON.parse(decrypted.decryptedData);
          } catch (error) {
            result[field] = decrypted.decryptedData;
          }
        } else {
          result[field] = null; // Failed to decrypt
        }
      }
    }

    return result;
  }

  // Check if field is encrypted
  static isFieldEncrypted(fieldValue: any): boolean {
    return fieldValue && 
           typeof fieldValue === 'object' && 
           fieldValue._encrypted === true &&
           fieldValue.data &&
           fieldValue.iv;
  }

  // Encrypt sensitive user data
  static encryptUserData(userData: Record<string, any>): Record<string, any> {
    const sensitiveFields = [
      'email',
      'phoneNumber',
      'personalNotes',
      'preferences.apiKeys',
      'voiceData'
    ];

    return this.encryptFields(userData, sensitiveFields);
  }

  // Decrypt sensitive user data
  static decryptUserData(encryptedUserData: Record<string, any>): Record<string, any> {
    const sensitiveFields = [
      'email',
      'phoneNumber',
      'personalNotes',
      'preferences.apiKeys',
      'voiceData'
    ];

    return this.decryptFields(encryptedUserData, sensitiveFields);
  }
}

// API key secure storage
export class APIKeyEncryption extends DataEncryption {
  // Encrypt API key with service identification
  static encryptAPIKey(apiKey: string, service: string, userId: string): EncryptionResult {
    const keyData = JSON.stringify({
      key: apiKey,
      service,
      userId,
      timestamp: Date.now()
    });

    return this.encrypt(keyData);
  }

  // Decrypt API key and validate service/user
  static decryptAPIKey(encryptedData: string, iv: string, authTag: string, expectedService?: string, expectedUserId?: string): {
    apiKey: string;
    service: string;
    userId: string;
    timestamp: number;
    isValid: boolean;
  } {
    const result = this.decrypt(encryptedData, iv, authTag);
    
    if (!result.isValid) {
      return {
        apiKey: '',
        service: '',
        userId: '',
        timestamp: 0,
        isValid: false
      };
    }

    try {
      const parsed = JSON.parse(result.decryptedData);
      
      // Validate service and user if provided
      if (expectedService && parsed.service !== expectedService) {
        return {
          apiKey: '',
          service: parsed.service,
          userId: parsed.userId,
          timestamp: parsed.timestamp,
          isValid: false
        };
      }

      if (expectedUserId && parsed.userId !== expectedUserId) {
        return {
          apiKey: '',
          service: parsed.service,
          userId: parsed.userId,
          timestamp: parsed.timestamp,
          isValid: false
        };
      }

      return {
        apiKey: parsed.key,
        service: parsed.service,
        userId: parsed.userId,
        timestamp: parsed.timestamp,
        isValid: true
      };
    } catch (error) {
      return {
        apiKey: '',
        service: '',
        userId: '',
        timestamp: 0,
        isValid: false
      };
    }
  }

  // Mask API key for display (show only last 4 characters)
  static maskAPIKey(apiKey: string): string {
    if (apiKey.length <= 4) return '****';
    return '*'.repeat(apiKey.length - 4) + apiKey.slice(-4);
  }

  // Validate API key format
  static validateAPIKeyFormat(apiKey: string, service: string): boolean {
    const patterns: Record<string, RegExp> = {
      openai: /^sk-[a-zA-Z0-9]{48}$/,
      anthropic: /^sk-ant-[a-zA-Z0-9]{95}$/,
      deepgram: /^[a-f0-9]{40}$/,
      elevenlabs: /^[a-f0-9]{32}$/,
      firebase: /^[a-zA-Z0-9_-]{40,}$/
    };

    const pattern = patterns[service.toLowerCase()];
    return pattern ? pattern.test(apiKey) : apiKey.length > 8; // Default minimum length
  }
}

// Export alias for backward compatibility
export { DataEncryption as dataEncryption };

// Export types
export type { EncryptionResult, DecryptionResult, KeyDerivationOptions };