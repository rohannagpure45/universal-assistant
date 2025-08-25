import { useState, useEffect } from 'react';
import { getResourceManager, type ResourceMetrics } from '@/services/browser/ResourceManager';

/**
 * React hook for resource management
 * 
 * Provides real-time resource metrics and management functions.
 * This hook is properly separated from the service layer to maintain
 * clean architecture boundaries between React and business logic.
 */
export function useResourceManager() {
  const defaultMetrics: ResourceMetrics = {
    memory: { 
      used: 0, 
      total: 0, 
      percentage: 0, 
      jsHeapSizeLimit: 0, 
      totalJSHeapSize: 0, 
      usedJSHeapSize: 0 
    },
    resources: {
      mediaRecorders: 0,
      audioContexts: 0,
      activeConnections: 0,
      cachedObjects: 0,
      eventListeners: 0
    },
    performance: { 
      fps: 0, 
      cpuUsage: 0, 
      networkLatency: 0, 
      renderTime: 0 
    }
  };
  
  const manager = getResourceManager();
  const [metrics, setMetrics] = useState<ResourceMetrics>(manager?.getMetrics() || defaultMetrics);
  
  useEffect(() => {
    if (!manager) return;
    
    const interval = setInterval(() => {
      setMetrics(manager.getMetrics());
    }, 2000);
    
    return () => clearInterval(interval);
  }, [manager]);
  
  return {
    metrics,
    createManagedMediaRecorder: (stream: MediaStream, options?: MediaRecorderOptions) =>
      manager?.createManagedMediaRecorder(stream, options),
    createManagedAudioContext: (options?: AudioContextOptions) =>
      manager?.createManagedAudioContext(options),
    registerResource: (type: string, resource: any, cleanup: () => void) =>
      manager?.registerResource(type, resource, cleanup),
    releaseResource: (id: string) => manager?.releaseResource(id),
    forceCleanup: () => manager?.forceCleanup(),
    getResourceCount: () => manager?.getResourceCount() || 0
  };
}