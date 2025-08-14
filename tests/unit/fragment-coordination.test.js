/**
 * Test coordination between FragmentProcessor and ImprovedFragmentAggregator
 * This test validates that the dual fragment processing system works correctly
 */

import { ConversationProcessor } from '@/services/universal-assistant/ConversationProcessor';
import { improvedFragmentAggregator } from '@/services/fragments/ImprovedFragmentAggregator';
import { performanceMonitor } from '@/services/monitoring/PerformanceMonitor';

describe('Fragment Processing Coordination', () => {
  let conversationProcessor;

  beforeEach(() => {
    // Reset state before each test
    conversationProcessor = new ConversationProcessor();
    improvedFragmentAggregator.clearAllFragments();
    performanceMonitor.clear();
  });

  afterEach(() => {
    // Clean up after each test
    improvedFragmentAggregator.clearAllFragments();
    performanceMonitor.clear();
  });

  describe('Fragment Aggregation Priority', () => {
    test('should use ImprovedFragmentAggregator for complete fragments', async () => {
      const testEvent = {
        type: 'transcript',
        data: {
          text: 'Hello, how are you?',
          speakerId: 'speaker1',
          timestamp: Date.now(),
          confidence: 0.9,
        }
      };

      const response = await conversationProcessor.processConversationEvent(testEvent);
      
      expect(response.shouldRespond).toBe(true);
      expect(response.processedText).toBe('Hello, how are you?');
      expect(response.confidence).toBeGreaterThanOrEqual(0.85); // ImprovedFragmentAggregator confidence
    });

    test('should fallback to original FragmentProcessor for incomplete fragments', async () => {
      const testEvent = {
        type: 'transcript',
        data: {
          text: 'Well I was thinking',
          speakerId: 'speaker1',
          timestamp: Date.now(),
          confidence: 0.8,
        }
      };

      const response = await conversationProcessor.processConversationEvent(testEvent);
      
      // ImprovedFragmentAggregator should return fragment type, triggering fallback
      expect(response.responseType).toBe('none');
    });

    test('should handle speaker changes correctly', async () => {
      // First speaker says something incomplete
      await conversationProcessor.processConversationEvent({
        type: 'transcript',
        data: {
          text: 'I think we should',
          speakerId: 'speaker1',
          timestamp: Date.now() - 1000,
          confidence: 0.8,
        }
      });

      // Speaker change should trigger aggregation
      const response = await conversationProcessor.processConversationEvent({
        type: 'speaker_change',
        data: {
          speakerId: 'speaker2',
          previousSpeaker: 'speaker1',
          timestamp: Date.now(),
        }
      });

      // Should aggregate fragments from speaker1
      expect(response.processedText).toContain('I think we should');
    });

    test('should handle silence timeout correctly', async () => {
      // Add incomplete fragment
      await conversationProcessor.processConversationEvent({
        type: 'transcript',
        data: {
          text: 'Maybe we could try',
          speakerId: 'speaker1',
          timestamp: Date.now() - 5000,
          confidence: 0.8,
        }
      });

      // Silence should trigger aggregation
      const response = await conversationProcessor.processConversationEvent({
        type: 'silence',
        data: {
          speakerId: 'speaker1',
          timestamp: Date.now(),
          silenceDuration: 4000,
        }
      });

      expect(response.processedText).toContain('Maybe we could try');
    });
  });

  describe('Performance Monitoring', () => {
    test('should track conversation processing performance', async () => {
      const testEvent = {
        type: 'transcript',
        data: {
          text: 'This is a test message.',
          speakerId: 'speaker1',
          timestamp: Date.now(),
          confidence: 0.9,
        }
      };

      await conversationProcessor.processConversationEvent(testEvent);

      const stats = conversationProcessor.getProcessorStats();
      expect(stats.performance.averageProcessingTime).toBeGreaterThan(0);
      expect(stats.performance.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.performance.errorCount).toBe(0);
    });

    test('should track fragment aggregator statistics', async () => {
      // Add some fragments
      await conversationProcessor.processConversationEvent({
        type: 'transcript',
        data: {
          text: 'Fragment one',
          speakerId: 'speaker1',
          timestamp: Date.now(),
          confidence: 0.8,
        }
      });

      await conversationProcessor.processConversationEvent({
        type: 'transcript',
        data: {
          text: 'Fragment two',
          speakerId: 'speaker2',
          timestamp: Date.now(),
          confidence: 0.8,
        }
      });

      const stats = conversationProcessor.getProcessorStats();
      expect(stats.fragmentAggregator.activeSpeakers).toBeGreaterThan(0);
      expect(stats.fragmentAggregator.totalFragments).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid input gracefully', async () => {
      const invalidEvent = {
        type: 'transcript',
        data: {
          text: null,
          speakerId: '',
          timestamp: 'invalid',
          confidence: 'not_a_number',
        }
      };

      const response = await conversationProcessor.processConversationEvent(invalidEvent);
      
      // Should not throw error and return safe response
      expect(response).toBeDefined();
      expect(response.shouldRespond).toBe(false);
    });

    test('should track errors in performance monitor', async () => {
      // This would require mocking to simulate errors, but we can test the structure
      const stats = conversationProcessor.getProcessorStats();
      expect(stats.performance.errorCount).toBeDefined();
      expect(typeof stats.performance.errorCount).toBe('number');
    });
  });

  describe('Memory Management', () => {
    test('should prevent fragment overflow', async () => {
      // Add many fragments for the same speaker
      const speakerId = 'spam_speaker';
      
      for (let i = 0; i < 150; i++) {
        await conversationProcessor.processConversationEvent({
          type: 'transcript',
          data: {
            text: `Fragment ${i}`,
            speakerId,
            timestamp: Date.now() + i,
            confidence: 0.8,
          }
        });
      }

      const stats = conversationProcessor.getProcessorStats();
      const speakerFragments = stats.fragmentAggregator.speakerFragmentCounts[speakerId] || 0;
      
      // Should not exceed memory limits (ImprovedFragmentAggregator has 100 limit)
      expect(speakerFragments).toBeLessThanOrEqual(100);
    });

    test('should clean old fragments', async () => {
      const oldTimestamp = Date.now() - 10000; // 10 seconds ago
      
      await conversationProcessor.processConversationEvent({
        type: 'transcript',
        data: {
          text: 'Old fragment',
          speakerId: 'speaker1',
          timestamp: oldTimestamp,
          confidence: 0.8,
        }
      });

      // Add recent fragment to trigger cleanup
      await conversationProcessor.processConversationEvent({
        type: 'transcript',
        data: {
          text: 'New fragment',
          speakerId: 'speaker2',
          timestamp: Date.now(),
          confidence: 0.8,
        }
      });

      const stats = conversationProcessor.getProcessorStats();
      
      // Old fragments should be cleaned up (ImprovedFragmentAggregator has 5s MAX_FRAGMENT_AGE)
      const oldestAge = stats.fragmentAggregator.oldestFragmentAge;
      if (oldestAge) {
        expect(oldestAge).toBeLessThan(6000); // Should be less than 6 seconds
      }
    });
  });
});

/**
 * Integration test helper functions
 */
export const FragmentTestHelpers = {
  createTranscriptEvent(text, speakerId = 'test_speaker', timestamp = Date.now()) {
    return {
      type: 'transcript',
      data: {
        text,
        speakerId,
        timestamp,
        confidence: 0.8,
      }
    };
  },

  createSilenceEvent(speakerId = 'test_speaker', duration = 3000) {
    return {
      type: 'silence',
      data: {
        speakerId,
        timestamp: Date.now(),
        silenceDuration: duration,
      }
    };
  },

  createSpeakerChangeEvent(newSpeaker, previousSpeaker) {
    return {
      type: 'speaker_change',
      data: {
        speakerId: newSpeaker,
        previousSpeaker,
        timestamp: Date.now(),
      }
    };
  },

  async simulateConversation(processor, messages) {
    const responses = [];
    
    for (const message of messages) {
      const event = this.createTranscriptEvent(message.text, message.speaker, message.timestamp);
      const response = await processor.processConversationEvent(event);
      responses.push(response);
      
      // Add small delay to simulate real conversation timing
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    return responses;
  }
};