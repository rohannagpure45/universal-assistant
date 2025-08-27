import type { 
  AuthStoreInterface, 
  MeetingStoreInterface, 
  AppStoreInterface,
  StoreRegistryInterface,
  ServiceDependencies 
} from '@/interfaces/StoreInterfaces';

/**
 * Service Provider for Dependency Injection
 * 
 * This service provider breaks circular dependencies by providing a central
 * registry where stores can be injected and services can access them without
 * direct imports. This follows the dependency injection pattern to ensure
 * webpack can resolve modules without circular import issues.
 */

export class ServiceProvider {
  private static instance: ServiceProvider | null = null;
  private stores: Partial<StoreRegistryInterface> = {};
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): ServiceProvider {
    if (!ServiceProvider.instance) {
      ServiceProvider.instance = new ServiceProvider();
    }
    return ServiceProvider.instance;
  }

  /**
   * Initialize the service provider with store instances
   * This should be called from the AuthProvider or root app component
   */
  public async initialize(stores: StoreRegistryInterface): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._performInitialization(stores);
    return this.initializationPromise;
  }

  private async _performInitialization(stores: StoreRegistryInterface): Promise<void> {
    this.stores = stores;
    this.initialized = true;
    
    console.log('[ServiceProvider] Initialized with stores:', {
      auth: !!stores.auth,
      meeting: !!stores.meeting,
      app: !!stores.app,
    });
  }

  /**
   * Check if the service provider is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Wait for initialization to complete
   */
  public async waitForInitialization(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    // If no initialization is in progress, wait for it to start
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.initialized || this.initializationPromise) {
          clearInterval(checkInterval);
          if (this.initializationPromise) {
            this.initializationPromise.then(resolve);
          } else {
            resolve();
          }
        }
      }, 10);
    });
  }

  /**
   * Get the auth store instance
   */
  public getAuthStore(): AuthStoreInterface {
    if (!this.initialized || !this.stores.auth) {
      throw new Error('[ServiceProvider] AuthStore not initialized. Make sure to call initialize() from AuthProvider.');
    }
    return this.stores.auth;
  }

  /**
   * Get the meeting store instance
   */
  public getMeetingStore(): MeetingStoreInterface {
    if (!this.initialized || !this.stores.meeting) {
      throw new Error('[ServiceProvider] MeetingStore not initialized. Make sure to call initialize() from AuthProvider.');
    }
    return this.stores.meeting;
  }

  /**
   * Get the app store instance
   */
  public getAppStore(): AppStoreInterface {
    if (!this.initialized || !this.stores.app) {
      throw new Error('[ServiceProvider] AppStore not initialized. Make sure to call initialize() from AuthProvider.');
    }
    return this.stores.app;
  }

  /**
   * Get all stores as a bundle (for services that need multiple stores)
   */
  public getStores(): StoreRegistryInterface {
    if (!this.initialized) {
      throw new Error('[ServiceProvider] Stores not initialized. Make sure to call initialize() from AuthProvider.');
    }
    return this.stores as StoreRegistryInterface;
  }

  /**
   * Safely get stores (returns null if not initialized)
   * Useful for optional integrations
   */
  public getStoresSafely(): Partial<StoreRegistryInterface> | null {
    return this.initialized ? this.stores : null;
  }

  /**
   * Create service dependencies object for a specific service
   * This allows services to specify which stores they need
   */
  public createServiceDependencies(requirements: {
    requireAuth?: boolean;
    requireMeeting?: boolean;
    requireApp?: boolean;
  }): ServiceDependencies {
    const deps: ServiceDependencies = {};

    if (requirements.requireAuth) {
      deps.authStore = this.getAuthStore();
    }

    if (requirements.requireMeeting) {
      deps.meetingStore = this.getMeetingStore();
    }

    if (requirements.requireApp) {
      deps.appStore = this.getAppStore();
    }

    return deps;
  }

  /**
   * Reset the service provider (for testing or cleanup)
   */
  public reset(): void {
    this.stores = {};
    this.initialized = false;
    this.initializationPromise = null;
  }

  /**
   * Dispose of the service provider
   */
  public dispose(): void {
    this.reset();
    ServiceProvider.instance = null;
  }
}

// Export singleton instance for convenience
export const serviceProvider = ServiceProvider.getInstance();

// Helper functions for common patterns
export const getAuthStore = () => serviceProvider.getAuthStore();
export const getMeetingStore = () => serviceProvider.getMeetingStore();
export const getAppStore = () => serviceProvider.getAppStore();
export const getStores = () => serviceProvider.getStores();

// Safe accessors (don't throw errors)
export const getAuthStoreSafely = () => {
  try {
    return serviceProvider.getAuthStore();
  } catch {
    return null;
  }
};

export const getMeetingStoreSafely = () => {
  try {
    return serviceProvider.getMeetingStore();
  } catch {
    return null;
  }
};

export const getAppStoreSafely = () => {
  try {
    return serviceProvider.getAppStore();
  } catch {
    return null;
  }
};

// Initialization helper for components
export const initializeServiceProvider = async (stores: StoreRegistryInterface) => {
  return serviceProvider.initialize(stores);
};

// Status check helper
export const isServiceProviderReady = () => serviceProvider.isInitialized();