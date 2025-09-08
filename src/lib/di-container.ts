/**
 * Dependency Injection Container
 * 
 * Replaces the problematic GlobalServiceManager singleton with proper
 * dependency management that doesn't violate React principles.
 */

interface ServiceFactory<T> {
  create(): T | Promise<T>;
  dependencies?: string[];
}

interface ServiceState<T> {
  instance?: T;
  status: 'uninitialized' | 'initializing' | 'initialized' | 'failed';
  error?: Error;
}

export class DIContainer {
  private factories = new Map<string, ServiceFactory<any>>();
  private instances = new Map<string, ServiceState<any>>();
  private initializingPromises = new Map<string, Promise<any>>();
  
  /**
   * Register a service factory with its dependencies
   */
  register<T>(name: string, factory: ServiceFactory<T>): void {
    this.factories.set(name, factory);
    this.instances.set(name, { status: 'uninitialized' });
  }
  
  /**
   * Get a service instance, initializing if needed
   * Returns null if initialization fails or service doesn't exist
   */
  async get<T>(name: string): Promise<T | null> {
    const state = this.instances.get(name);
    if (!state) return null;
    
    // Return existing instance if available
    if (state.status === 'initialized' && state.instance) {
      return state.instance;
    }
    
    // Return null if failed
    if (state.status === 'failed') {
      return null;
    }
    
    // If already initializing, wait for the existing promise
    if (this.initializingPromises.has(name)) {
      return this.initializingPromises.get(name);
    }
    
    const factory = this.factories.get(name);
    if (!factory) return null;
    
    // Create initialization promise
    const initPromise = this.initializeService(name, factory, state);
    this.initializingPromises.set(name, initPromise);
    
    try {
      const result = await initPromise;
      return result;
    } finally {
      this.initializingPromises.delete(name);
    }
  }
  
  private async initializeService<T>(
    name: string, 
    factory: ServiceFactory<T>, 
    state: ServiceState<T>
  ): Promise<T | null> {
    state.status = 'initializing';
    
    try {
      // Initialize dependencies first
      if (factory.dependencies && factory.dependencies.length > 0) {
        await Promise.all(
          factory.dependencies.map(dep => this.get(dep))
        );
      }
      
      const instance = await factory.create();
      state.instance = instance;
      state.status = 'initialized';
      
      return instance;
      
    } catch (error) {
      state.status = 'failed';
      state.error = error instanceof Error ? error : new Error(String(error));
      console.error(`Failed to initialize service ${name}:`, error);
      return null;
    }
  }
  
  /**
   * Check if a service is available (initialized and healthy)
   */
  async isAvailable(name: string): Promise<boolean> {
    const instance = await this.get(name);
    return instance !== null;
  }
  
  /**
   * Get service status for health checks
   */
  getStatus(name: string): { status: string; error?: string } {
    const state = this.instances.get(name);
    if (!state) {
      return { status: 'not_registered' };
    }
    
    return {
      status: state.status,
      error: state.error?.message
    };
  }
  
  /**
   * Cleanup all services
   */
  async cleanup(): Promise<void> {
    // Wait for any pending initializations to complete
    if (this.initializingPromises.size > 0) {
      await Promise.allSettled(Array.from(this.initializingPromises.values()));
    }
    
    for (const [name, state] of this.instances.entries()) {
      if (state.instance && typeof state.instance.cleanup === 'function') {
        try {
          await state.instance.cleanup();
        } catch (error) {
          console.error(`Error cleaning up service ${name}:`, error);
        }
      }
    }
    
    this.instances.clear();
    this.initializingPromises.clear();
  }
}

// Global container instance
export const container = new DIContainer();

// Service registration
container.register('errorTracker', {
  create: async () => {
    const { errorTracker } = await import('@/services/monitoring/ErrorTracker');
    return errorTracker;
  },
  dependencies: []
});

container.register('performanceDashboard', {
  create: async () => {
    const { performanceDashboard } = await import('@/services/monitoring/PerformanceDashboard');
    return performanceDashboard;
  },
  dependencies: ['errorTracker']
});

container.register('authService', {
  create: async () => {
    const { authService } = await import('@/services/firebase/AuthService');
    return authService;
  },
  dependencies: []
});

container.register('optimizedDatabaseService', {
  create: async () => {
    const { optimizedDatabaseService } = await import('@/services/firebase/OptimizedDatabaseService');
    return optimizedDatabaseService;
  },
  dependencies: ['authService']
});

container.register('productionCacheManager', {
  create: async () => {
    const { productionCacheManager } = await import('@/services/cache/ProductionCacheManager');
    return productionCacheManager;
  },
  dependencies: []
});

container.register('optimizedRealtimeManager', {
  create: async () => {
    const { optimizedRealtimeManager } = await import('@/services/realtime/OptimizedRealtimeManager');
    return optimizedRealtimeManager;
  },
  dependencies: ['authService', 'optimizedDatabaseService']
});