/**
 * React hook for sanitized input handling
 * Provides automatic sanitization for form inputs to prevent XSS
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  sanitizeUserInput, 
  sanitizeUrl, 
  sanitizeEmail,
  createSafeDisplayName,
  sanitizeTranscript,
  sanitizeMeetingNotes
} from '@/utils/sanitization';

export type SanitizationType = 
  | 'text' 
  | 'url' 
  | 'email' 
  | 'displayName' 
  | 'transcript' 
  | 'notes';
// Note: 'none' type has been removed for security - all input must be sanitized

interface UseSanitizedInputOptions {
  type?: SanitizationType;
  maxLength?: number;
  allowNewlines?: boolean;
  allowBasicFormatting?: boolean;
  realTime?: boolean; // Sanitize on every change vs on blur
  customSanitizer?: (value: string) => string;
}

interface UseSanitizedInputReturn {
  value: string;
  sanitizedValue: string;
  setValue: (value: string) => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleBlur: () => void;
  error: string | null;
  isValid: boolean;
}

/**
 * Hook for handling sanitized input
 * @param initialValue - Initial value for the input
 * @param options - Sanitization options
 * @returns Object with value, handlers, and validation state
 */
export function useSanitizedInput(
  initialValue: string = '',
  options: UseSanitizedInputOptions = {}
): UseSanitizedInputReturn {
  const {
    type = 'text',
    maxLength,
    allowNewlines = false,
    allowBasicFormatting = false,
    realTime = false,
    customSanitizer
  } = options;

  const [value, setValue] = useState(initialValue);
  const [sanitizedValue, setSanitizedValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  // Sanitize function based on type
  const sanitize = useCallback((input: string): string => {
    if (customSanitizer) {
      return customSanitizer(input);
    }

    switch (type) {
      case 'url':
        const sanitizedUrl = sanitizeUrl(input);
        if (input && !sanitizedUrl) {
          setError('Invalid URL format');
        } else {
          setError(null);
        }
        return sanitizedUrl;

      case 'email':
        const sanitizedEmail = sanitizeEmail(input);
        if (input && !sanitizedEmail) {
          setError('Invalid email format');
        } else {
          setError(null);
        }
        return sanitizedEmail;

      case 'displayName':
        return createSafeDisplayName(input);

      case 'transcript':
        return sanitizeTranscript(input);

      case 'notes':
        return sanitizeMeetingNotes(input);

      case 'text':
      default:
        return sanitizeUserInput(input, {
          maxLength,
          allowNewlines,
          allowBasicFormatting
        });
    }
  }, [type, maxLength, allowNewlines, allowBasicFormatting, customSanitizer]);

  // Sanitize on value change if realTime is enabled
  useEffect(() => {
    if (realTime) {
      setSanitizedValue(sanitize(value));
    }
  }, [value, realTime, sanitize]);

  // Handle input change
  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const newValue = e.target.value;
    setValue(newValue);
    
    if (realTime) {
      setSanitizedValue(sanitize(newValue));
    }
  }, [realTime, sanitize]);

  // Handle blur event - always sanitize on blur
  const handleBlur = useCallback(() => {
    setSanitizedValue(sanitize(value));
  }, [value, sanitize]);

  // Direct value setter
  const setValueDirect = useCallback((newValue: string) => {
    setValue(newValue);
    if (realTime) {
      setSanitizedValue(sanitize(newValue));
    }
  }, [realTime, sanitize]);

  const isValid = !error && sanitizedValue !== '';

  return {
    value,
    sanitizedValue: realTime ? sanitizedValue : sanitize(value),
    setValue: setValueDirect,
    handleChange,
    handleBlur,
    error,
    isValid
  };
}

/**
 * Hook for sanitizing multiple form fields
 * @param initialValues - Initial form values
 * @param config - Configuration for each field
 * @returns Object with form state and handlers
 */
export function useSanitizedForm<T extends Record<string, string>>(
  initialValues: T,
  config: Record<keyof T, UseSanitizedInputOptions>
) {
  const [values, setValues] = useState(initialValues);
  const [sanitizedValues, setSanitizedValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<keyof T, string | null>>({} as any);

  // Create sanitizers for each field
  const sanitizers = {} as Record<keyof T, (value: string) => string>;
  
  for (const key in config) {
    const fieldConfig = config[key];
    sanitizers[key] = (value: string) => {
      
      if (fieldConfig.customSanitizer) {
        return fieldConfig.customSanitizer(value);
      }

      switch (fieldConfig.type) {
        case 'url':
          return sanitizeUrl(value);
        case 'email':
          return sanitizeEmail(value);
        case 'displayName':
          return createSafeDisplayName(value);
        case 'transcript':
          return sanitizeTranscript(value);
        case 'notes':
          return sanitizeMeetingNotes(value);
        default:
          return sanitizeUserInput(value, {
            maxLength: fieldConfig.maxLength,
            allowNewlines: fieldConfig.allowNewlines,
            allowBasicFormatting: fieldConfig.allowBasicFormatting
          });
      }
    };
  }

  // Handle field change
  const handleFieldChange = useCallback((
    field: keyof T,
    value: string
  ) => {
    setValues(prev => ({
      ...prev,
      [field]: value
    }));

    // Sanitize if real-time is enabled for this field
    if (config[field].realTime) {
      const sanitized = sanitizers[field](value);
      setSanitizedValues(prev => ({
        ...prev,
        [field]: sanitized
      }));

      // Update error state
      if (config[field].type === 'email' && value && !sanitized) {
        setErrors(prev => ({
          ...prev,
          [field]: 'Invalid email format'
        }));
      } else if (config[field].type === 'url' && value && !sanitized) {
        setErrors(prev => ({
          ...prev,
          [field]: 'Invalid URL format'
        }));
      } else {
        setErrors(prev => ({
          ...prev,
          [field]: null
        }));
      }
    }
  }, [config, sanitizers]);

  // Handle field blur
  const handleFieldBlur = useCallback((field: keyof T) => {
    const sanitized = sanitizers[field](values[field]);
    setSanitizedValues(prev => ({
      ...prev,
      [field]: sanitized
    }));
  }, [values, sanitizers]);

  // Get all sanitized values
  const getSanitizedValues = useCallback((): T => {
    const result = {} as T;
    for (const key in values) {
      (result as any)[key] = sanitizers[key](values[key]);
    }
    return result;
  }, [values, sanitizers]);

  // Check if form is valid
  const isValid = Object.values(errors).every(error => !error);

  return {
    values,
    sanitizedValues,
    errors,
    isValid,
    handleFieldChange,
    handleFieldBlur,
    getSanitizedValues,
    setFieldValue: (field: keyof T, value: string) => handleFieldChange(field, value),
    reset: () => {
      setValues(initialValues);
      setSanitizedValues(initialValues);
      setErrors({} as any);
    }
  };
}

export default useSanitizedInput;