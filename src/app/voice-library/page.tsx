/**
 * Voice Library Page
 * 
 * Next.js page component for the Voice Library Management system.
 * Provides a complete interface for managing voice profiles and speaker identification.
 */

'use client';

import React from 'react';
import { VoiceLibraryDemo } from '@/components/voice-identification/VoiceLibraryDemo';

export default function VoiceLibraryPage() {
  return (
    <div className="min-h-screen bg-background">
      <VoiceLibraryDemo 
        userId="user_demo"
        showTutorial={false}
        className="w-full"
      />
    </div>
  );
}