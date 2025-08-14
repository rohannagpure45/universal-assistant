/**
 * Example usage of the new interrupt system architecture
 */

import { AudioManager } from './AudioManager';
import { createInterruptOrchestrator } from './InterruptOrchestrator';

// Example usage
export function setupInterruptSystem() {
  const audioManager = new AudioManager();
  
  // Mock dependencies (replace with actual implementations)
  const mockMessageQueue = {
    clear: () => console.log('Message queue cleared'),
  };
  
  const mockTTSState = {
    reset: () => console.log('TTS state reset'),
  };
  
  const mockStartListening = async () => {
    console.log('Microphone activated');
  };

  // Create the orchestrator with dependencies
  const interruptOrchestrator = createInterruptOrchestrator(audioManager, {
    messageQueue: mockMessageQueue,
    ttsState: mockTTSState,
    startListening: mockStartListening,
  });

  // Configure the orchestrator
  interruptOrchestrator.configure({
    autoExecute: true,
    logInterrupts: true,
    enableAnalytics: true,
  });

  // Example: Process incoming transcripts
  async function handleTranscript(transcript: string) {
    const wasInterrupted = await interruptOrchestrator.processTranscript(transcript);
    
    if (wasInterrupted) {
      console.log('Interrupt detected and handled!');
      
      // Get stats
      const stats = interruptOrchestrator.getInterruptStats();
      console.log('Interrupt stats:', stats);
    }
  }

  // Example: Manual interrupt
  async function triggerManualInterrupt() {
    await interruptOrchestrator.manualInterrupt();
  }

  return {
    handleTranscript,
    triggerManualInterrupt,
    getStats: () => interruptOrchestrator.getInterruptStats(),
    reset: () => interruptOrchestrator.reset(),
  };
}

// Usage example:
/*
const interruptSystem = setupInterruptSystem();

// Process transcripts
await interruptSystem.handleTranscript("stop talking please");

// Manual interrupt
await interruptSystem.triggerManualInterrupt();

// Get statistics
console.log(interruptSystem.getStats());

// Reset system
interruptSystem.reset();
*/
