/**
 * Type definitions for Universal Realtime Service
 */

export interface RealtimeListener {
  listenerId: string;
  cleanup: () => void;
}

export interface ListenerConfig {
  maxRealtimeFailures?: number;
  pollingInterval?: number;
  retryBaseDelay?: number;
  retryMaxDelay?: number;
  forcePollingMode?: boolean; // For testing
}

export type ListenerCallback<T> = (data: T[]) => void;
export type DocumentListenerCallback<T> = (data: T | null) => void;
export type ErrorCallback = (error: Error) => void;

export interface RealtimeMetrics {
  activeListeners: number;
  failedConnections: number;
  pollingFallbacks: number;
  averageResponseTime: number;
}

export type ListenerMode = 'realtime' | 'polling';

export interface ListenerState {
  id: string;
  mode: ListenerMode;
  failureCount: number;
  lastUpdate: Date;
  isActive: boolean;
}