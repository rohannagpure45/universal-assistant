/**
 * React Hook for OptimizedRealtimeManager Integration
 * 
 * Provides React component integration with the singleton OptimizedRealtimeManager
 * while maintaining proper connection lifecycle management.
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  optimizedRealtimeManager,
  ConnectionMetrics, 
  MessagePriority, 
  RealtimeMessage,
  ConnectionConfig 
} from '../services/realtime/OptimizedRealtimeManager';

/**
 * React hook for OptimizedRealtimeManager integration
 * Uses singleton instance to prevent multiple WebSocket connections
 */
export function useOptimizedRealtime() {
  // Use the singleton instance to maintain single connection
  const manager = useMemo(() => optimizedRealtimeManager, []);
  
  // Track connection metrics for UI updates
  const [metrics, setMetrics] = useState<ConnectionMetrics>(manager.getMetrics());
  
  // Update metrics periodically for real-time UI feedback
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(manager.getMetrics());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [manager]);
  
  // Don't disconnect on component unmount - singleton manages connection lifecycle
  // Multiple components might be using the same connection
  
  return {
    /**
     * Connect to WebSocket server
     */
    connect: (url?: string) => manager.connect(url),
    
    /**
     * Disconnect from WebSocket server
     */
    disconnect: () => manager.disconnect(),
    
    /**
     * Send message with priority
     */
    send: (type: string, payload: any, priority?: MessagePriority) => 
      manager.send(type, payload, priority),
    
    /**
     * Subscribe to message type
     */
    subscribe: (
      type: string, 
      handler: (message: RealtimeMessage) => void | Promise<void>, 
      priority?: MessagePriority
    ) => manager.subscribe(type, handler, priority),
    
    /**
     * Current connection metrics
     */
    metrics,
    
    /**
     * Check if currently connected
     */
    isConnected: manager.isConnected(),
    
    /**
     * Get current queue size
     */
    getQueueSize: () => manager.getQueueSize(),
    
    /**
     * Clear message queues
     */
    clearQueue: () => manager.clearQueue()
  };
}