'use client';

import { useEffect } from 'react';
import { errorTracker } from '@/services/monitoring/ErrorTracker';
import logger from '@/services/logging/ProductionLogger';
import { performanceDashboard } from '@/services/monitoring/PerformanceDashboard';

// Production monitoring initialization component
export function ProductionMonitoringInit() {
  useEffect(() => {
    // Initialize production monitoring systems
    if (process.env.NODE_ENV === 'production') {
      logger.info('Initializing production monitoring systems', 'App');
      
      // Start performance monitoring
      performanceDashboard.startMonitoring();
      
      // Log application startup
      logger.info('Universal Assistant application started', 'App', {
        metadata: {
          timestamp: new Date().toISOString(),
          version: process.env.npm_package_version,
          environment: process.env.NODE_ENV,
          buildId: process.env.BUILD_ID
        }
      });

      // Set up periodic health checks
      const healthCheckInterval = setInterval(() => {
        const errorStats = errorTracker.getStats();
        if (errorStats.systemHealth < 50) {
          logger.warn('Low system health detected', 'HealthCheck', {
            metadata: { systemHealth: errorStats.systemHealth }
          });
        }
      }, 60000); // Every minute

      return () => {
        clearInterval(healthCheckInterval);
        performanceDashboard.stopMonitoring();
        logger.info('Production monitoring systems stopped', 'App');
      };
    }
  }, []);

  return null;
}