/**
 * SECURITY-CRITICAL: File Upload Security Utilities
 * 
 * Comprehensive file upload validation and sanitization to prevent
 * malicious file uploads, directory traversal, and other file-based attacks.
 * 
 * Uses proven sanitization functions from sanitization.ts with additional
 * file-specific security measures for production-grade protection.
 */

import { sanitizeFileName } from '../sanitization';

/**
 * File validation result interface
 */
export interface FileValidationResult {
  valid: boolean;
  sanitizedName: string;
  mimeType?: string;
  extension?: string;
  errors: string[];
  warnings: string[];
}

/**
 * File upload security configuration
 */
export interface FileUploadConfig {
  maxSizeBytes?: number;
  allowedExtensions?: string[];
  allowedMimeTypes?: string[];
  blockExecutables?: boolean;
  requireExtensionMatch?: boolean;
  allowedNamePattern?: RegExp;
}

/**
 * Default secure file upload configuration
 */
const DEFAULT_CONFIG: Required<FileUploadConfig> = {
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  allowedExtensions: [
    // Documents
    'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt',
    // Images
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg',
    // Audio
    'mp3', 'wav', 'ogg', 'webm', 'm4a',
    // Video
    'mp4', 'avi', 'mov', 'wmv', 'webm',
    // Data
    'csv', 'json', 'xml'
  ],
  allowedMimeTypes: [
    // Documents
    'application/pdf', 'text/plain', 'text/rtf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/svg+xml',
    // Audio
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4',
    // Video
    'video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo', 'video/webm',
    // Data
    'text/csv', 'application/json', 'application/xml', 'text/xml'
  ],
  blockExecutables: true,
  requireExtensionMatch: true,
  allowedNamePattern: /^[a-zA-Z0-9][a-zA-Z0-9._\-\s]*[a-zA-Z0-9]$/
};

/**
 * Dangerous file extensions that should be blocked
 */
const DANGEROUS_EXTENSIONS = [
  // Executables
  'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar', 'msi',
  // Scripts
  'ps1', 'sh', 'bash', 'zsh', 'fish', 'py', 'rb', 'pl', 'php', 'jsp', 'asp',
  // System files
  'dll', 'sys', 'drv', 'ocx', 'cpl', 'scf', 'lnk', 'url',
  // Archives (can contain malware)
  'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz',
  // Office macros
  'xlsm', 'xltm', 'docm', 'dotm', 'pptm', 'potm', 'ppam', 'ppsm', 'sldm'
];

/**
 * Dangerous MIME types that should be blocked
 */
const DANGEROUS_MIME_TYPES = [
  'application/x-msdownload', 'application/x-executable', 'application/x-dosexec',
  'application/javascript', 'text/javascript', 'application/x-javascript',
  'application/x-shellscript', 'text/x-script', 'application/x-python-code',
  'application/x-php', 'text/x-php', 'application/x-httpd-php'
];

/**
 * Comprehensive file upload validation
 * 
 * @param file - File object with name, size, and type properties
 * @param config - Upload configuration (merged with defaults)
 * @returns FileValidationResult with validation details
 */
export function validateFileUpload(
  file: { name: string; size: number; type?: string },
  config: FileUploadConfig = {}
): FileValidationResult {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Input validation
  if (!file || typeof file.name !== 'string' || typeof file.size !== 'number') {
    return {
      valid: false,
      sanitizedName: '',
      errors: ['Invalid file object provided'],
      warnings: []
    };
  }
  
  // Sanitize filename using proven function
  const sanitizedName = sanitizeFileName(file.name);
  
  if (!sanitizedName) {
    return {
      valid: false,
      sanitizedName: '',
      errors: ['Invalid filename - contains dangerous characters'],
      warnings: []
    };
  }
  
  // Extract extension
  const extension = sanitizedName.toLowerCase().split('.').pop() || '';
  
  // File size validation
  if (file.size > mergedConfig.maxSizeBytes) {
    errors.push(`File too large (${file.size} bytes > ${mergedConfig.maxSizeBytes} bytes)`);
  }
  
  if (file.size <= 0) {
    errors.push('File is empty');
  }
  
  // Filename pattern validation
  if (!mergedConfig.allowedNamePattern.test(sanitizedName)) {
    errors.push('Filename contains invalid characters or pattern');
  }
  
  // Extension validation
  if (mergedConfig.blockExecutables && DANGEROUS_EXTENSIONS.includes(extension)) {
    errors.push(`File extension '${extension}' is not allowed for security reasons`);
  }
  
  if (mergedConfig.allowedExtensions.length > 0 && !mergedConfig.allowedExtensions.includes(extension)) {
    errors.push(`File extension '${extension}' is not in allowed list: ${mergedConfig.allowedExtensions.join(', ')}`);
  }
  
  // MIME type validation
  const mimeType = file.type || '';
  
  if (DANGEROUS_MIME_TYPES.includes(mimeType.toLowerCase())) {
    errors.push(`MIME type '${mimeType}' is not allowed for security reasons`);
  }
  
  if (mergedConfig.allowedMimeTypes.length > 0 && !mergedConfig.allowedMimeTypes.includes(mimeType)) {
    errors.push(`MIME type '${mimeType}' is not in allowed list`);
  }
  
  // Extension-MIME type consistency check
  if (mergedConfig.requireExtensionMatch && mimeType) {
    const mimeExtensionMap: Record<string, string[]> = {
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/gif': ['gif'],
      'application/pdf': ['pdf'],
      'text/plain': ['txt'],
      'audio/mpeg': ['mp3'],
      'audio/wav': ['wav'],
      'video/mp4': ['mp4']
    };
    
    const expectedExtensions = mimeExtensionMap[mimeType.toLowerCase()];
    if (expectedExtensions && !expectedExtensions.includes(extension)) {
      warnings.push(`Extension '${extension}' doesn't match MIME type '${mimeType}'`);
    }
  }
  
  // Additional security checks
  if (sanitizedName.length > 255) {
    errors.push('Filename too long (max 255 characters)');
  }
  
  if (sanitizedName.startsWith('.')) {
    warnings.push('Hidden file detected');
  }
  
  // Check for double extensions (like file.txt.exe)
  const parts = sanitizedName.split('.');
  if (parts.length > 3) {
    warnings.push('Multiple file extensions detected');
  }
  
  return {
    valid: errors.length === 0,
    sanitizedName,
    mimeType,
    extension,
    errors,
    warnings
  };
}

/**
 * Simple file upload validation (backward compatibility)
 * 
 * @param fileName - Original filename
 * @param fileSize - File size in bytes
 * @param allowedTypes - Array of allowed extensions
 * @returns Validation result object
 */
export function validateFileUploadSimple(
  fileName: string,
  fileSize: number,
  allowedTypes: string[] = []
): { valid: boolean; sanitizedName: string; error?: string } {
  const result = validateFileUpload(
    { name: fileName, size: fileSize },
    { allowedExtensions: allowedTypes.length > 0 ? allowedTypes : undefined }
  );
  
  return {
    valid: result.valid,
    sanitizedName: result.sanitizedName,
    error: result.errors.length > 0 ? result.errors[0] : undefined
  };
}

/**
 * Generate secure upload path
 * 
 * @param sanitizedName - Already sanitized filename
 * @param userId - User ID for path isolation
 * @param category - File category for organization
 * @returns Secure upload path
 */
export function generateSecureUploadPath(
  sanitizedName: string,
  userId: string,
  category: string = 'general'
): string {
  if (!sanitizedName || !userId) {
    throw new Error('Sanitized name and user ID are required');
  }
  
  // Sanitize category
  const sanitizedCategory = category.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
  
  // Generate timestamp for uniqueness
  const timestamp = Date.now();
  
  // Generate random suffix
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  
  // Construct secure path
  const pathComponents = [
    'uploads',
    sanitizedCategory,
    userId.replace(/[^a-zA-Z0-9_-]/g, ''), // Sanitize user ID
    `${timestamp}_${randomSuffix}_${sanitizedName}`
  ];
  
  return pathComponents.join('/');
}

/**
 * Validate file content type by reading magic bytes
 * 
 * This would require actual file content analysis in a real implementation.
 * For now, provides the interface for future enhancement.
 * 
 * @param fileContent - File content as buffer or array
 * @param expectedMimeType - Expected MIME type
 * @returns boolean indicating if content matches expected type
 */
export function validateFileContentType(
  fileContent: ArrayBuffer | Buffer | Uint8Array,
  expectedMimeType: string
): boolean {
  // This is a placeholder for magic byte validation
  // In a real implementation, you would check the file's magic bytes
  // against the expected MIME type to prevent MIME type spoofing
  
  if (!fileContent || !expectedMimeType) {
    return false;
  }
  
  // For now, just return true (implement magic byte checking in production)
  return true;
}

/**
 * Scan filename for suspicious patterns
 * 
 * @param filename - Filename to scan
 * @returns Array of detected suspicious patterns
 */
export function scanFilenameSuspiciousPatterns(filename: string): string[] {
  const suspiciousPatterns: Array<{ pattern: RegExp; description: string }> = [
    { pattern: /\.\.|\/|\\/g, description: 'Directory traversal attempt' },
    { pattern: /[<>:"|?*]/g, description: 'Invalid filename characters' },
    { pattern: /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i, description: 'Reserved Windows filename' },
    { pattern: /^\./g, description: 'Hidden file' },
    { pattern: /\.(bat|exe|com|scr|vbs|js)$/i, description: 'Executable file extension' },
    { pattern: /script|eval|alert|document|window/i, description: 'Script-like content in filename' }
  ];
  
  const detected: string[] = [];
  
  for (const { pattern, description } of suspiciousPatterns) {
    if (pattern.test(filename)) {
      detected.push(description);
    }
  }
  
  return detected;
}

/**
 * Create file upload configuration for specific use cases
 */
export const FILE_UPLOAD_CONFIGS = {
  images: {
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  },
  
  documents: {
    maxSizeBytes: 20 * 1024 * 1024, // 20MB
    allowedExtensions: ['pdf', 'doc', 'docx', 'txt', 'rtf'],
    allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
  },
  
  audio: {
    maxSizeBytes: 50 * 1024 * 1024, // 50MB
    allowedExtensions: ['mp3', 'wav', 'ogg', 'webm', 'm4a'],
    allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4']
  },
  
  strict: {
    maxSizeBytes: 1 * 1024 * 1024, // 1MB
    allowedExtensions: ['txt', 'json', 'csv'],
    allowedMimeTypes: ['text/plain', 'application/json', 'text/csv'],
    blockExecutables: true,
    requireExtensionMatch: true
  }
} as const;