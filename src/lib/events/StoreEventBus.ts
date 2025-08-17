/**
 * Event Bus for Store Communication
 * 
 * This event bus provides a decoupled way for stores to communicate
 * without direct dependencies. Stores can emit events and subscribe
 * to events without knowing about each other's implementation.
 */

export type StoreEventType = 
  | 'auth:user-signed-in'
  | 'auth:user-signed-out' 
  | 'auth:preferences-updated'
  | 'meeting:started'
  | 'meeting:ended'
  | 'meeting:joined'
  | 'meeting:left'
  | 'app:settings-updated'
  | 'app:device-changed'
  | 'app:online-status-changed';

export interface StoreEvent<T = any> {
  type: StoreEventType;
  payload?: T;
  timestamp: Date;
  source?: string;
}

export interface UserSignedInEvent {
  user: {
    uid: string;
    email: string;
    displayName: string;
    preferences?: any;
  };
}

export interface UserSignedOutEvent {
  userId: string;
  reason?: 'manual' | 'session-expired' | 'error';
}

export interface PreferencesUpdatedEvent {
  userId: string;
  preferences: {
    ai?: any;
    tts?: any;
    ui?: any;
  };
}

export interface MeetingStartedEvent {
  meetingId: string;
  hostId: string;
  type: string;
}

export interface MeetingEndedEvent {
  meetingId: string;
  duration?: number;
}

type EventListener<T = any> = (event: StoreEvent<T>) => void;

class StoreEventBus {
  private listeners: Map<StoreEventType, Set<EventListener>> = new Map();
  private eventHistory: StoreEvent[] = [];
  private readonly maxHistorySize = 100;

  /**
   * Subscribe to store events
   */
  subscribe<T = any>(
    eventType: StoreEventType, 
    listener: EventListener<T>
  ): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType)!.add(listener);
    
    // Return unsubscribe function
    return () => {
      const listenerSet = this.listeners.get(eventType);
      if (listenerSet) {
        listenerSet.delete(listener);
        if (listenerSet.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  /**
   * Emit a store event
   */
  emit<T = any>(eventType: StoreEventType, payload?: T, source?: string): void {
    const event: StoreEvent<T> = {
      type: eventType,
      payload,
      timestamp: new Date(),
      source,
    };

    // Add to history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Notify listeners
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error);
        }
      });
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[StoreEventBus] ${eventType}`, payload);
    }
  }

  /**
   * Subscribe to multiple events with a single listener
   */
  subscribeToMultiple(
    eventTypes: StoreEventType[],
    listener: EventListener
  ): () => void {
    const unsubscribeFunctions = eventTypes.map(eventType => 
      this.subscribe(eventType, listener)
    );
    
    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }

  /**
   * Get event history for debugging
   */
  getEventHistory(): StoreEvent[] {
    return [...this.eventHistory];
  }

  /**
   * Clear event history
   */
  clearEventHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get current listeners count for debugging
   */
  getListenersCount(): Record<StoreEventType, number> {
    const counts: Partial<Record<StoreEventType, number>> = {};
    this.listeners.forEach((listeners, eventType) => {
      counts[eventType] = listeners.size;
    });
    return counts as Record<StoreEventType, number>;
  }

  /**
   * Wait for a specific event (Promise-based)
   */
  waitForEvent<T = any>(
    eventType: StoreEventType, 
    timeout: number = 5000
  ): Promise<StoreEvent<T>> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${eventType}`));
      }, timeout);

      const unsubscribe = this.subscribe(eventType, (event) => {
        clearTimeout(timer);
        unsubscribe();
        resolve(event as StoreEvent<T>);
      });
    });
  }

  /**
   * Dispose of all listeners and history
   */
  dispose(): void {
    this.listeners.clear();
    this.eventHistory = [];
  }
}

// Singleton instance
export const storeEventBus = new StoreEventBus();

// Helper functions for common event patterns
export const emitUserSignedIn = (user: UserSignedInEvent['user']) => {
  storeEventBus.emit('auth:user-signed-in', { user }, 'AuthStore');
};

export const emitUserSignedOut = (userId: string, reason?: UserSignedOutEvent['reason']) => {
  storeEventBus.emit('auth:user-signed-out', { userId, reason }, 'AuthStore');
};

export const emitPreferencesUpdated = (userId: string, preferences: PreferencesUpdatedEvent['preferences']) => {
  storeEventBus.emit('auth:preferences-updated', { userId, preferences }, 'AuthStore');
};

export const emitMeetingStarted = (meetingId: string, hostId: string, type: string) => {
  storeEventBus.emit('meeting:started', { meetingId, hostId, type }, 'MeetingStore');
};

export const emitMeetingEnded = (meetingId: string, duration?: number) => {
  storeEventBus.emit('meeting:ended', { meetingId, duration }, 'MeetingStore');
};

// React hook for using the event bus in components
export const useStoreEvents = () => {
  return {
    subscribe: storeEventBus.subscribe.bind(storeEventBus),
    emit: storeEventBus.emit.bind(storeEventBus),
    waitForEvent: storeEventBus.waitForEvent.bind(storeEventBus),
  };
};