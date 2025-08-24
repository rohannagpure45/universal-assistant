/**
 * ResourceManager - Comprehensive Browser Resource Management
 * 
 * Manages memory usage, MediaRecorder resources, audio contexts, and implements
 * advanced garbage collection strategies for optimal browser performance.
 */

import { nanoid } from 'nanoid';

export interface ResourceMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
    jsHeapSizeLimit: number;
    totalJSHeapSize: number;
    usedJSHeapSize: number;
  };
  resources: {
    mediaRecorders: number;
    audioContexts: number;
    activeConnections: number;
    cachedObjects: number;
    eventListeners: number;
  };
  performance: {
    fps: number;
    cpuUsage: number;
    networkLatency: number;
    renderTime: number;
  };
}

export interface ResourceConfig {
  memoryThreshold: number;
  gcInterval: number;
  cleanupInterval: number;
  mediaRecorderLimit: number;
  audioContextLimit: number;
  cacheLimit: number;
  performanceMonitoring: boolean;
}

export interface ManagedResource {
  id: string;
  type: string;
  resource: any;
  createdAt: number;
  lastUsed: number;
  references: number;
  cleanup: () => void;
}

export class ResourceManager {
  private config: ResourceConfig;
  private managedResources = new Map<string, ManagedResource>();
  private memoryMonitor: PerformanceObserver | null = null;
  private performanceMetrics: ResourceMetrics;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private gcTimer: NodeJS.Timeout | null = null;
  private frameId: number | null = null;
  
  // Resource pools
  private mediaRecorderPool: MediaRecorder[] = [];
  private audioContextPool: AudioContext[] = [];
  private weakReferences = new WeakMap();
  
  constructor(config?: Partial<ResourceConfig>) {
    this.config = {
      memoryThreshold: 80, // 80% memory usage threshold
      gcInterval: 30000,   // 30 seconds
      cleanupInterval: 10000, // 10 seconds
      mediaRecorderLimit: 5,
      audioContextLimit: 3,
      cacheLimit: 100,
      performanceMonitoring: true,
      ...config
    };
    
    this.performanceMetrics = this.initializeMetrics();
    this.initializeResourceManagement();
  }

  /**
   * Initialize resource management systems
   */
  private initializeResourceManagement(): void {
    this.startMemoryMonitoring();
    this.startCleanupTimer();
    this.startGarbageCollectionHints();
    
    if (this.config.performanceMonitoring) {
      this.startPerformanceMonitoring();
    }
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Handle page unload
    window.addEventListener('beforeunload', this.cleanup.bind(this));
    
    console.log('🔧 Resource Manager initialized');
  }

  /**
   * Memory monitoring and optimization
   */
  private startMemoryMonitoring(): void {
    if ('performance' in window && 'memory' in performance) {
      setInterval(() => {
        this.updateMemoryMetrics();
        this.checkMemoryThreshold();
      }, 5000);
    }
    
    // Use PerformanceObserver for more detailed monitoring
    if ('PerformanceObserver' in window) {
      try {
        this.memoryMonitor = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'measure' || entry.entryType === 'navigation') {
              this.updatePerformanceMetrics(entry);
            }
          }
        });
        
        this.memoryMonitor.observe({ 
          entryTypes: ['measure', 'navigation', 'resource'] 
        });
      } catch (error) {
        console.warn('PerformanceObserver not fully supported:', error);
      }
    }
  }

  private updateMemoryMetrics(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.performanceMetrics.memory = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        totalJSHeapSize: memory.totalJSHeapSize,
        usedJSHeapSize: memory.usedJSHeapSize
      };
    }
    
    // Update resource counts
    this.performanceMetrics.resources = {
      mediaRecorders: this.mediaRecorderPool.length + 
        Array.from(this.managedResources.values())
          .filter(r => r.type === 'mediaRecorder').length,
      audioContexts: this.audioContextPool.length + 
        Array.from(this.managedResources.values())
          .filter(r => r.type === 'audioContext').length,
      activeConnections: Array.from(this.managedResources.values())
        .filter(r => r.type === 'connection').length,
      cachedObjects: Array.from(this.managedResources.values())
        .filter(r => r.type === 'cache').length,
      eventListeners: Array.from(this.managedResources.values())
        .filter(r => r.type === 'eventListener').length
    };
  }

  private checkMemoryThreshold(): void {
    if (this.performanceMetrics.memory.percentage > this.config.memoryThreshold) {
      console.warn(`🚨 Memory usage high: ${this.performanceMetrics.memory.percentage.toFixed(1)}%`);
      this.performEmergencyCleanup();
    }
  }

  /**
   * MediaRecorder resource management
   */
  public createManagedMediaRecorder(
    stream: MediaStream, 
    options?: MediaRecorderOptions
  ): MediaRecorder {
    // Reuse from pool if available
    const pooledRecorder = this.mediaRecorderPool.pop();
    if (pooledRecorder && pooledRecorder.state === 'inactive') {
      return this.setupManagedMediaRecorder(pooledRecorder, stream);
    }
    
    // Create new MediaRecorder if under limit
    if (this.performanceMetrics.resources.mediaRecorders < this.config.mediaRecorderLimit) {
      const recorder = new MediaRecorder(stream, options);
      return this.setupManagedMediaRecorder(recorder, stream);
    }
    
    // Force cleanup and retry
    this.cleanupUnusedMediaRecorders();
    const recorder = new MediaRecorder(stream, options);
    return this.setupManagedMediaRecorder(recorder, stream);
  }

  private setupManagedMediaRecorder(recorder: MediaRecorder, stream: MediaStream): MediaRecorder {
    const id = nanoid();
    const managedResource: ManagedResource = {
      id,
      type: 'mediaRecorder',
      resource: recorder,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      references: 1,
      cleanup: () => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
        stream.getTracks().forEach(track => track.stop());
        this.releaseMediaRecorder(recorder);
      }
    };
    
    this.managedResources.set(id, managedResource);
    
    // Set up automatic cleanup on stop
    recorder.addEventListener('stop', () => {
      setTimeout(() => {
        if (this.managedResources.has(id)) {
          this.releaseResource(id);
        }
      }, 5000); // 5 second delay before cleanup
    });
    
    return recorder;
  }

  private releaseMediaRecorder(recorder: MediaRecorder): void {
    if (this.mediaRecorderPool.length < this.config.mediaRecorderLimit) {
      this.mediaRecorderPool.push(recorder);
    }
  }

  private cleanupUnusedMediaRecorders(): void {
    const now = Date.now();
    const unusedRecorders: string[] = [];
    
    this.managedResources.forEach((resource, id) => {
      if (resource.type === 'mediaRecorder' && 
          now - resource.lastUsed > 30000 && // 30 seconds
          (resource.resource as MediaRecorder).state === 'inactive') {
        unusedRecorders.push(id);
      }
    });
    
    unusedRecorders.forEach(id => this.releaseResource(id));
  }

  /**
   * AudioContext resource management
   */
  public createManagedAudioContext(options?: AudioContextOptions): AudioContext {
    // Reuse from pool if available
    const pooledContext = this.audioContextPool.pop();
    if (pooledContext && pooledContext.state !== 'closed') {
      return this.setupManagedAudioContext(pooledContext);
    }
    
    // Create new AudioContext if under limit
    if (this.performanceMetrics.resources.audioContexts < this.config.audioContextLimit) {
      const context = new AudioContext(options);
      return this.setupManagedAudioContext(context);
    }
    
    // Force cleanup and retry
    this.cleanupUnusedAudioContexts();
    const context = new AudioContext(options);
    return this.setupManagedAudioContext(context);
  }

  private setupManagedAudioContext(context: AudioContext): AudioContext {
    const id = nanoid();
    const managedResource: ManagedResource = {
      id,
      type: 'audioContext',
      resource: context,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      references: 1,
      cleanup: async () => {
        if (context.state !== 'closed') {
          await context.close();
        }
        this.releaseAudioContext(context);
      }
    };
    
    this.managedResources.set(id, managedResource);
    return context;
  }

  private releaseAudioContext(context: AudioContext): void {
    if (this.audioContextPool.length < this.config.audioContextLimit && 
        context.state !== 'closed') {
      this.audioContextPool.push(context);
    }
  }

  private cleanupUnusedAudioContexts(): void {
    const now = Date.now();
    const unusedContexts: string[] = [];
    
    this.managedResources.forEach((resource, id) => {
      if (resource.type === 'audioContext' && 
          now - resource.lastUsed > 60000 && // 1 minute
          (resource.resource as AudioContext).state === 'suspended') {
        unusedContexts.push(id);
      }
    });
    
    unusedContexts.forEach(id => this.releaseResource(id));
  }

  /**
   * Generic resource management
   */
  public registerResource(
    type: string,
    resource: any,
    cleanup: () => void
  ): string {
    const id = nanoid();
    const managedResource: ManagedResource = {
      id,
      type,
      resource,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      references: 1,
      cleanup
    };
    
    this.managedResources.set(id, managedResource);
    this.weakReferences.set(resource, id);
    
    return id;
  }

  public releaseResource(id: string): void {
    const resource = this.managedResources.get(id);
    if (resource) {
      try {
        resource.cleanup();
      } catch (error) {
        console.warn(`Resource cleanup failed for ${id}:`, error);
      }
      
      this.managedResources.delete(id);
    }
  }

  public touchResource(id: string): void {
    const resource = this.managedResources.get(id);
    if (resource) {
      resource.lastUsed = Date.now();
    }
  }

  /**
   * Garbage collection and cleanup
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performRoutineCleanup();
    }, this.config.cleanupInterval);
  }

  private startGarbageCollectionHints(): void {
    this.gcTimer = setInterval(() => {
      this.suggestGarbageCollection();
    }, this.config.gcInterval);
  }

  private performRoutineCleanup(): void {
    const now = Date.now();
    const resourcesToCleanup: string[] = [];
    
    this.managedResources.forEach((resource, id) => {
      // Cleanup resources unused for more than 5 minutes
      if (now - resource.lastUsed > 300000) {
        resourcesToCleanup.push(id);
      }
    });
    
    resourcesToCleanup.forEach(id => this.releaseResource(id));
    
    // Clean up pools
    this.cleanupPools();
    
    if (resourcesToCleanup.length > 0) {
      console.log(`🧹 Cleaned up ${resourcesToCleanup.length} unused resources`);
    }
  }

  private performEmergencyCleanup(): void {
    console.log('🚨 Performing emergency cleanup');
    
    const now = Date.now();
    const resourcesToCleanup: string[] = [];
    
    // More aggressive cleanup during memory pressure
    this.managedResources.forEach((resource, id) => {
      if (now - resource.lastUsed > 60000 || // 1 minute for emergency
          resource.references === 0) {
        resourcesToCleanup.push(id);
      }
    });
    
    resourcesToCleanup.forEach(id => this.releaseResource(id));
    
    // Clear all pools
    this.mediaRecorderPool = [];
    this.audioContextPool.forEach(context => {
      if (context.state !== 'closed') {
        context.close().catch(console.error);
      }
    });
    this.audioContextPool = [];
    
    // Force garbage collection if available
    this.forceGarbageCollection();
  }

  private cleanupPools(): void {
    // Clean up MediaRecorder pool
    this.mediaRecorderPool = this.mediaRecorderPool.filter(recorder => 
      recorder.state !== 'inactive' || Date.now() - recorder.stream?.getTracks()[0]?.enabled < 300000
    );
    
    // Clean up AudioContext pool
    this.audioContextPool = this.audioContextPool.filter(context => 
      context.state !== 'closed'
    );
  }

  private suggestGarbageCollection(): void {
    // Trigger garbage collection hints
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        (window as any).gc();
      } catch (error) {
        // GC not available
      }
    }
    
    // Clear WeakMap references that might be holding onto objects
    if (this.managedResources.size > this.config.cacheLimit) {
      this.performRoutineCleanup();
    }
  }

  private forceGarbageCollection(): void {
    // Create pressure to trigger GC
    const arrays: any[] = [];
    try {
      // Create temporary memory pressure
      for (let i = 0; i < 100; i++) {
        arrays.push(new Array(10000).fill(0));
      }
    } catch (error) {
      // Memory exhausted, which is what we want
    } finally {
      // Clear arrays to release memory
      arrays.length = 0;
    }
    
    // Request idle callback to allow GC
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        // GC should happen during idle time
      });
    }
  }

  /**
   * Performance monitoring
   */
  private startPerformanceMonitoring(): void {
    let lastTime = performance.now();
    let frameCount = 0;
    
    const measureFPS = (currentTime: number) => {
      frameCount++;
      
      if (currentTime - lastTime >= 1000) {
        this.performanceMetrics.performance.fps = frameCount;
        frameCount = 0;
        lastTime = currentTime;
      }
      
      this.frameId = requestAnimationFrame(measureFPS);
    };
    
    this.frameId = requestAnimationFrame(measureFPS);
  }

  private updatePerformanceMetrics(entry: PerformanceEntry): void {
    if (entry.entryType === 'navigation') {
      const navEntry = entry as PerformanceNavigationTiming;
      this.performanceMetrics.performance.renderTime = navEntry.loadEventEnd - navEntry.navigationStart;
    }
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      // Page is hidden, reduce resource usage
      this.performRoutineCleanup();
      
      // Suspend AudioContexts
      this.managedResources.forEach((resource) => {
        if (resource.type === 'audioContext') {
          const context = resource.resource as AudioContext;
          if (context.state === 'running') {
            context.suspend().catch(console.error);
          }
        }
      });
    } else {
      // Page is visible, resume resources if needed
      this.managedResources.forEach((resource) => {
        if (resource.type === 'audioContext') {
          resource.lastUsed = Date.now(); // Mark as recently used
        }
      });
    }
  }

  /**
   * Public API methods
   */
  public getMetrics(): ResourceMetrics {
    this.updateMemoryMetrics();
    return { ...this.performanceMetrics };
  }

  public getResourceCount(): number {
    return this.managedResources.size;
  }

  public listManagedResources(): Array<{
    id: string;
    type: string;
    age: number;
    lastUsed: number;
  }> {
    const now = Date.now();
    return Array.from(this.managedResources.entries()).map(([id, resource]) => ({
      id,
      type: resource.type,
      age: now - resource.createdAt,
      lastUsed: now - resource.lastUsed
    }));
  }

  public forceCleanup(): void {
    this.performEmergencyCleanup();
  }

  public cleanup(): void {
    // Stop all timers
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }
    
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    
    // Disconnect performance observer
    if (this.memoryMonitor) {
      this.memoryMonitor.disconnect();
      this.memoryMonitor = null;
    }
    
    // Clean up all managed resources
    const resourceIds = Array.from(this.managedResources.keys());
    resourceIds.forEach(id => this.releaseResource(id));
    
    // Clear pools
    this.mediaRecorderPool = [];
    this.audioContextPool.forEach(context => {
      if (context.state !== 'closed') {
        context.close().catch(console.error);
      }
    });
    this.audioContextPool = [];
    
    console.log('🧹 Resource Manager cleaned up');
  }

  private initializeMetrics(): ResourceMetrics {
    return {
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
  }
}

// Singleton instance - only create on client side
export const resourceManager = typeof window !== 'undefined' ? new ResourceManager() : null;

// React hook for resource management
export function useResourceManager() {
  const defaultMetrics: ResourceMetrics = {
    memory: { used: 0, total: 0, limit: 0, percentage: 0 },
    performance: { fps: 0, responseTime: 0 },
    connections: { active: 0, total: 0 }
  };
  
  const [metrics, setMetrics] = useState<ResourceMetrics>(resourceManager?.getMetrics() || defaultMetrics);
  
  useEffect(() => {
    if (!resourceManager) return;
    
    const interval = setInterval(() => {
      setMetrics(resourceManager.getMetrics());
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  return {
    metrics,
    createManagedMediaRecorder: (stream: MediaStream, options?: MediaRecorderOptions) =>
      resourceManager?.createManagedMediaRecorder(stream, options),
    createManagedAudioContext: (options?: AudioContextOptions) =>
      resourceManager?.createManagedAudioContext(options),
    registerResource: (type: string, resource: any, cleanup: () => void) =>
      resourceManager?.registerResource(type, resource, cleanup),
    releaseResource: (id: string) => resourceManager?.releaseResource(id),
    forceCleanup: () => resourceManager?.forceCleanup(),
    getResourceCount: () => resourceManager?.getResourceCount() || 0
  };
}