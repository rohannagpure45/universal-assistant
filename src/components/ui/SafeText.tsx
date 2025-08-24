/**
 * SafeText Component
 * Displays text content with automatic XSS protection
 */

import React from 'react';
import { 
  escapeHtml, 
  sanitizeUserInput,
  createSafeDisplayName,
  sanitizeTranscript,
  sanitizeMeetingNotes 
} from '@/utils/sanitization';

export type TextType = 'plain' | 'displayName' | 'transcript' | 'notes' | 'html';
// Note: 'none' type has been removed for security - all text must be sanitized

interface SafeTextProps {
  children: string | null | undefined;
  type?: TextType;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  maxLength?: number;
  fallback?: string;
  allowNewlines?: boolean;
  allowBasicFormatting?: boolean;
}

/**
 * Component that safely displays user-generated text content
 * Automatically sanitizes content to prevent XSS attacks
 */
export const SafeText: React.FC<SafeTextProps> = ({
  children,
  type = 'plain',
  className,
  as: Component = 'span',
  maxLength,
  fallback = '',
  allowNewlines = false,
  allowBasicFormatting = false
}) => {
  // Handle null/undefined
  if (children == null) {
    return <Component className={className}>{fallback}</Component>;
  }

  const text = String(children);
  let sanitized: string;
  let shouldRenderHtml = false;

  switch (type) {
    case 'displayName':
      sanitized = createSafeDisplayName(text, fallback);
      break;

    case 'transcript':
      sanitized = sanitizeTranscript(text);
      // Convert newlines to <br> for display
      if (allowNewlines) {
        sanitized = sanitized.replace(/\n/g, '<br />');
        shouldRenderHtml = true;
      }
      break;

    case 'notes':
      sanitized = sanitizeMeetingNotes(text);
      // Notes allow basic formatting
      shouldRenderHtml = true;
      break;

    case 'html':
      // For controlled HTML content that needs basic formatting
      sanitized = sanitizeUserInput(text, {
        allowNewlines,
        allowBasicFormatting,
        maxLength
      });
      shouldRenderHtml = allowBasicFormatting;
      break;

    case 'plain':
    default:
      sanitized = escapeHtml(text);
      if (maxLength && sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength) + '...';
      }
      break;
  }

  // If we need to render HTML (for line breaks or basic formatting)
  if (shouldRenderHtml) {
    return (
      <Component 
        className={className}
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    );
  }

  // Plain text rendering
  return <Component className={className}>{sanitized}</Component>;
};

/**
 * Specialized component for displaying user names
 */
export const SafeDisplayName: React.FC<{
  name: string | null | undefined;
  fallback?: string;
  className?: string;
}> = ({ name, fallback = 'Unknown User', className }) => (
  <SafeText type="displayName" className={className} fallback={fallback}>
    {name}
  </SafeText>
);

/**
 * Specialized component for displaying transcripts
 */
export const SafeTranscript: React.FC<{
  transcript: string | null | undefined;
  className?: string;
  showLineBreaks?: boolean;
}> = ({ transcript, className, showLineBreaks = true }) => (
  <SafeText 
    type="transcript" 
    className={className}
    allowNewlines={showLineBreaks}
    as="div"
  >
    {transcript}
  </SafeText>
);

/**
 * Specialized component for displaying meeting notes
 */
export const SafeNotes: React.FC<{
  notes: string | null | undefined;
  className?: string;
}> = ({ notes, className }) => (
  <SafeText 
    type="notes" 
    className={className}
    as="div"
    allowBasicFormatting={true}
  >
    {notes}
  </SafeText>
);

/**
 * Hook to get sanitized text without rendering
 */
export function useSafeText(
  text: string | null | undefined,
  type: TextType = 'plain',
  options: {
    maxLength?: number;
    fallback?: string;
  } = {}
): string {
  if (text == null) {
    return options.fallback || '';
  }

  const str = String(text);

  switch (type) {
    case 'displayName':
      return createSafeDisplayName(str, options.fallback);
    case 'transcript':
      return sanitizeTranscript(str);
    case 'notes':
      return sanitizeMeetingNotes(str);
    case 'plain':
    default:
      let result = escapeHtml(str);
      if (options.maxLength && result.length > options.maxLength) {
        result = result.substring(0, options.maxLength) + '...';
      }
      return result;
  }
}

export default SafeText;