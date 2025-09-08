/**
 * RealtimeManager - Intelligent real-time listener management
 * 
 * Surgical fix for managing Firestore real-time listeners with
 * automatic reconnection, cleanup, and error handling.
 */

import { CleanupRegistry } from './CleanupRegistry';

export interface ListenerConfig {
  key: string;
  createListener: () => () => void;
  onError?: (error: Error) => void;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
}

export class RealtimeManager {
  private listeners = new Map<string, () => void>();
  private reconnectAttempts = new Map<string, number>();
  private listenerConfigs = new Map<string, ListenerConfig>();
  private cleanupRegistry: CleanupRegistry;
  private isShuttingDown = false;
  
  constructor(cleanupRegistry?: CleanupRegistry) {
    this.cleanupRegistry = cleanupRegistry || new CleanupRegistry();
    
    // Bind shutdown to preserve context
    this.handleBeforeUnload = this.shutdown.bind(this);
    
    // Register global cleanup
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.handleBeforeUnload);
    }
  }
  
  private handleBeforeUnload: () => Promise<void>;
  
  /**
   * Add a real-time listener with automatic management
   */
  addListener(config: ListenerConfig): void {
    const { key, createListener, autoReconnect = true } = config;
    
    // Remove existing listener if present
    this.removeListener(key);
    
    // Store config for potential reconnection
    this.listenerConfigs.set(key, config);
    
    try {
      // Create and store the unsubscribe function
      const unsubscribe = createListener();
      this.listeners.set(key, unsubscribe);
      
      // Register cleanup
      this.cleanupRegistry.register(() => {
        if (this.listeners.has(key)) {
          unsubscribe();
          this.listeners.delete(key);
        }
      });
      
      // Reset reconnect attempts on successful connection
      this.reconnectAttempts.delete(key);
    } catch (error) {
      console.error(`Failed to create listener ${key}:`, error);
      
      if (autoReconnect) {
        this.scheduleReconnect(key);
      }
      
      config.onError?.(error as Error);
    }
  }
  
  /**
   * Remove a specific listener
   */
  removeListener(key: string): void {
    const unsubscribe = this.listeners.get(key);
    if (unsubscribe) {
      try {
        unsubscribe();
      } catch (error) {
        console.warn(`Error removing listener ${key}:`, error);
      }
      this.listeners.delete(key);
    }
    
    // Clean up related data
    this.listenerConfigs.delete(key);
    this.reconnectAttempts.delete(key);
  }
  
  /**
   * Reconnect a failed listener with exponential backoff
   */
  private scheduleReconnect(key: string): void {
    if (this.isShuttingDown) return;
    
    const config = this.listenerConfigs.get(key);
    if (!config || !config.autoReconnect) return;
    
    const attempts = this.reconnectAttempts.get(key) || 0;
    const maxAttempts = config.maxReconnectAttempts || 5;
    
    if (attempts >= maxAttempts) {
      console.error(`Max reconnection attempts reached for listener ${key}`);
      this.listenerConfigs.delete(key);
      return;
    }
    
    this.reconnectAttempts.set(key, attempts + 1);
    
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = Math.min(1000 * Math.pow(2, attempts), 16000);
    
    setTimeout(() => {
      if (!this.isShuttingDown && this.listenerConfigs.has(key)) {
        console.log(`Attempting to reconnect listener ${key} (attempt ${attempts + 1})`);
        this.addListener(config);
      }
    }, delay);
  }
  
  /**
   * Reconnect all listeners (useful after network recovery)
   */
  reconnectAll(): void {
    if (this.isShuttingDown) return;
    
    console.log('Reconnecting all listeners...');
    
    // Create a copy of configs to avoid modification during iteration
    const configs = Array.from(this.listenerConfigs.values());
    
    for (const config of configs) {
      this.addListener(config);
    }
  }
  
  /**
   * Get listener statistics
   */
  getStats(): {
    activeListeners: number;
    failedListeners: number;
    totalReconnectAttempts: number;
  } {
    let totalReconnectAttempts = 0;
    for (const attempts of this.reconnectAttempts.values()) {
      totalReconnectAttempts += attempts;
    }
    
    return {
      activeListeners: this.listeners.size,
      failedListeners: this.listenerConfigs.size - this.listeners.size,
      totalReconnectAttempts
    };
  }
  
  /**
   * Shutdown all listeners gracefully
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    
    console.log('Shutting down RealtimeManager...');
    
    // Remove event listener to prevent memory leak
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
    
    // Remove all listeners
    for (const key of this.listeners.keys()) {
      this.removeListener(key);
    }
    
    // Clean up all registered cleanups
    await this.cleanupRegistry.cleanupAll();
    
    // Clear all data
    this.listeners.clear();
    this.listenerConfigs.clear();
    this.reconnectAttempts.clear();
  }
  
  /**
   * Check if a listener is active
   */
  hasListener(key: string): boolean {
    return this.listeners.has(key);
  }
  
  /**
   * Get the number of active listeners
   */
  get activeListenerCount(): number {
    return this.listeners.size;
  }
}

// Global instance for shared use
export const globalRealtimeManager = new RealtimeManager();

// React hook for using the RealtimeManager
export function useRealtimeManager(): RealtimeManager {
  return globalRealtimeManager;
}