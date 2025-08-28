import React from 'react';
import { GlobalServiceManager, useGlobalServiceManager } from '@/services/universal-assistant/GlobalServiceManager';
import type { UniversalAssistantCoordinator, UniversalAssistantConfig } from '@/services/universal-assistant/UniversalAssistantCoordinator';

/**
 * React hook for managing Universal Assistant Coordinator
 * Moved from service layer to proper hooks directory
 */
export function useUniversalAssistantCoordinator(config?: UniversalAssistantConfig) {
  const serviceManager = useGlobalServiceManager();
  const [coordinator, setCoordinator] = React.useState<UniversalAssistantCoordinator | null>(
    serviceManager.getCurrentCoordinator()
  );
  const [isLoading, setIsLoading] = React.useState(!serviceManager.isReady());
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    const unsubscribe = serviceManager.subscribe((newCoordinator) => {
      if (mounted) {
        setCoordinator(newCoordinator);
        setIsLoading(false);
      }
    });

    // Initialize if not ready
    if (!serviceManager.isReady()) {
      serviceManager.getCoordinator(config)
        .then(() => {
          if (mounted) {
            setError(null);
          }
        })
        .catch((err) => {
          if (mounted) {
            setError(err instanceof Error ? err.message : 'Failed to initialize coordinator');
            setIsLoading(false);
          }
        });
    }

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [config, serviceManager]);

  return {
    coordinator,
    isLoading,
    error,
    isReady: coordinator !== null
  };
}