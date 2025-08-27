'use client';

import React from 'react';
import { container } from '@/lib/di-container';

/**
 * Services available through the context
 */
interface Services {
  errorTracker: any | null;
  performanceDashboard: any | null;
  authService: any | null;
  optimizedDatabaseService: any | null;
  productionCacheManager: any | null;
  optimizedRealtimeManager: any | null;
}

interface ServicesContextValue {
  services: Services;
  isInitialized: boolean;
  error: string | null;
}

const ServicesContext = React.createContext<ServicesContextValue | null>(null);

interface ServicesProviderProps {
  children: React.ReactNode;
}

/**
 * ServicesProvider - Proper React Context for service management
 * 
 * Replaces the singleton GlobalServiceManager with a proper React Context
 * that manages service lifecycle within the React component tree.
 */
export function ServicesProvider({ children }: ServicesProviderProps) {
  const [services, setServices] = React.useState<Services>({
    errorTracker: null,
    performanceDashboard: null,
    authService: null,
    optimizedDatabaseService: null,
    productionCacheManager: null,
    optimizedRealtimeManager: null,
  });
  
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    const initializeServices = async () => {
      try {
        // Initialize services in dependency order through DI container
        console.log('[ServicesProvider] Initializing services...');
        
        const [
          errorTracker,
          authService,
          optimizedDatabaseService,
          productionCacheManager,
          optimizedRealtimeManager,
          performanceDashboard,
        ] = await Promise.all([
          container.get('errorTracker'),
          container.get('authService'),
          container.get('optimizedDatabaseService'),
          container.get('productionCacheManager'),
          container.get('optimizedRealtimeManager'),
          container.get('performanceDashboard'),
        ]);

        if (mounted) {
          setServices({
            errorTracker,
            performanceDashboard,
            authService,
            optimizedDatabaseService,
            productionCacheManager,
            optimizedRealtimeManager,
          });
          
          setIsInitialized(true);
          setError(null);
          console.log('[ServicesProvider] Services initialized successfully');
        }
      } catch (err) {
        if (mounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to initialize services';
          setError(errorMessage);
          console.error('[ServicesProvider] Service initialization failed:', err);
        }
      }
    };

    initializeServices();

    // Cleanup on unmount
    return () => {
      mounted = false;
      container.cleanup().catch(console.error);
    };
  }, []);

  const contextValue: ServicesContextValue = {
    services,
    isInitialized,
    error,
  };

  return (
    <ServicesContext.Provider value={contextValue}>
      {children}
    </ServicesContext.Provider>
  );
}

/**
 * Hook to access services from the context
 */
export function useServices(): ServicesContextValue {
  const context = React.useContext(ServicesContext);
  
  if (!context) {
    throw new Error('useServices must be used within a ServicesProvider');
  }
  
  return context;
}

/**
 * Convenience hooks for individual services
 */
export function useErrorTracker() {
  const { services } = useServices();
  return services.errorTracker;
}

export function usePerformanceDashboard() {
  const { services } = useServices();
  return services.performanceDashboard;
}

export function useAuthService() {
  const { services } = useServices();
  return services.authService;
}

export function useOptimizedDatabaseService() {
  const { services } = useServices();
  return services.optimizedDatabaseService;
}

export function useProductionCacheManager() {
  const { services } = useServices();
  return services.productionCacheManager;
}

export function useOptimizedRealtimeManager() {
  const { services } = useServices();
  return services.optimizedRealtimeManager;
}