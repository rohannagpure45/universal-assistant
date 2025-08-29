# Phase 5: Deployment Preparation - Detailed Implementation Plan

## Overview
**Duration**: 2 hours  
**Priority**: CRITICAL - Final step before production  
**Risk Level**: MEDIUM - Deployment always carries risk  
**Prerequisites**: All previous phases completed and tested

## Deployment Objectives

1. **Set up monitoring and alerting**
2. **Implement feature flags for safe rollout**
3. **Create rollback procedures**
4. **Document operational runbook**
5. **Prepare deployment scripts**

## Implementation Steps

### Step 1: Monitoring Setup (30 minutes)

#### 1.1 Create Monitoring Service
```typescript
// File: src/services/firebase/UniversalRealtimeMonitoring.ts

import { UniversalRealtimeService } from './UniversalRealtimeService';

export interface RealtimeMetrics {
  timestamp: Date;
  listenerCount: number;
  healthScore: number;
  connectionStates: {
    realtime: number;
    polling: number;
    error: number;
    disconnected: number;
  };
  performance: {
    averageSetupTime: number;
    averageCleanupTime: number;
    memoryUsage: number;
  };
  errors: {
    count: number;
    rate: number;
    types: Map<string, number>;
  };
}

export class UniversalRealtimeMonitoring {
  private static metrics: RealtimeMetrics[] = [];
  private static setupTimes: number[] = [];
  private static cleanupTimes: number[] = [];
  private static errorLog: Array<{ time: Date; error: Error; listenerId: string }> = [];
  private static monitoringInterval: NodeJS.Timeout | null = null;
  
  /**
   * Start monitoring the Universal Realtime Service
   */
  static startMonitoring(intervalMs: number = 60000): void {
    if (this.monitoringInterval) {
      console.warn('Monitoring already started');
      return;
    }
    
    // Hook into service events
    this.installHooks();
    
    // Start periodic metrics collection
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);
    
    console.log(`Universal Realtime monitoring started (interval: ${intervalMs}ms)`);
  }
  
  /**
   * Stop monitoring
   */
  static stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    console.log('Universal Realtime monitoring stopped');
  }
  
  /**
   * Collect current metrics
   */
  private static collectMetrics(): void {
    const states = UniversalRealtimeService.getAllConnectionStates();
    
    // Count states by type
    const stateCounts = {
      realtime: 0,
      polling: 0,
      error: 0,
      disconnected: 0
    };
    
    states.forEach(state => {
      if (state.mode in stateCounts) {
        stateCounts[state.mode as keyof typeof stateCounts]++;
      }
    });
    
    // Calculate error metrics
    const recentErrors = this.errorLog.filter(
      e => e.time > new Date(Date.now() - 60000)
    );
    
    const errorTypes = new Map<string, number>();
    recentErrors.forEach(e => {
      const type = e.error.name || 'Unknown';
      errorTypes.set(type, (errorTypes.get(type) || 0) + 1);
    });
    
    // Calculate performance metrics
    const avgSetupTime = this.setupTimes.length > 0
      ? this.setupTimes.reduce((a, b) => a + b, 0) / this.setupTimes.length
      : 0;
    
    const avgCleanupTime = this.cleanupTimes.length > 0
      ? this.cleanupTimes.reduce((a, b) => a + b, 0) / this.cleanupTimes.length
      : 0;
    
    // Create metrics snapshot
    const metrics: RealtimeMetrics = {
      timestamp: new Date(),
      listenerCount: UniversalRealtimeService.getListenerCount(),
      healthScore: UniversalRealtimeService.getHealthScore(),
      connectionStates: stateCounts,
      performance: {
        averageSetupTime: avgSetupTime,
        averageCleanupTime: avgCleanupTime,
        memoryUsage: typeof process !== 'undefined' 
          ? process.memoryUsage().heapUsed 
          : (performance as any).memory?.usedJSHeapSize || 0
      },
      errors: {
        count: recentErrors.length,
        rate: recentErrors.length / 60, // errors per second
        types: errorTypes
      }
    };
    
    this.metrics.push(metrics);
    
    // Keep only last hour of metrics
    const oneHourAgo = new Date(Date.now() - 3600000);
    this.metrics = this.metrics.filter(m => m.timestamp > oneHourAgo);
    
    // Send to monitoring service (e.g., Datadog, CloudWatch)
    this.sendToMonitoringService(metrics);
    
    // Check for alerts
    this.checkAlerts(metrics);
  }
  
  /**
   * Send metrics to external monitoring service
   */
  private static sendToMonitoringService(metrics: RealtimeMetrics): void {
    // Integration with your monitoring service
    // Example: Datadog
    if (typeof window !== 'undefined' && (window as any).DD_RUM) {
      (window as any).DD_RUM.addAction('realtime_metrics', metrics);
    }
    
    // Example: Custom analytics
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('realtime_metrics', {
        listenerCount: metrics.listenerCount,
        healthScore: metrics.healthScore,
        errorRate: metrics.errors.rate
      });
    }
    
    // Example: Console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.log('Realtime Metrics:', {
        listeners: metrics.listenerCount,
        health: metrics.healthScore,
        states: metrics.connectionStates,
        errors: metrics.errors.count
      });
    }
  }
  
  /**
   * Check for alert conditions
   */
  private static checkAlerts(metrics: RealtimeMetrics): void {
    const alerts: string[] = [];
    
    // High error rate
    if (metrics.errors.rate > 1) {
      alerts.push(`High error rate: ${metrics.errors.rate.toFixed(2)} errors/sec`);
    }
    
    // Low health score
    if (metrics.healthScore < 50) {
      alerts.push(`Low health score: ${metrics.healthScore}`);
    }
    
    // Too many error states
    const errorPercentage = (metrics.connectionStates.error / metrics.listenerCount) * 100;
    if (errorPercentage > 10) {
      alerts.push(`High error percentage: ${errorPercentage.toFixed(1)}%`);
    }
    
    // Memory usage (if available)
    if (metrics.performance.memoryUsage > 500 * 1024 * 1024) {
      alerts.push(`High memory usage: ${(metrics.performance.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
    }
    
    // Send alerts
    if (alerts.length > 0) {
      this.sendAlerts(alerts);
    }
  }
  
  /**
   * Send alerts to notification service
   */
  private static sendAlerts(alerts: string[]): void {
    console.error('🚨 Universal Realtime Alerts:', alerts);
    
    // Send to error tracking service
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      alerts.forEach(alert => {
        (window as any).Sentry.captureMessage(alert, 'warning');
      });
    }
    
    // Send to ops team (example)
    // fetch('/api/alerts', {
    //   method: 'POST',
    //   body: JSON.stringify({ service: 'universal-realtime', alerts })
    // });
  }
  
  /**
   * Install hooks to track service events
   */
  private static installHooks(): void {
    // Hook into createListener to track setup times
    const originalCreate = UniversalRealtimeService.createListener;
    UniversalRealtimeService.createListener = function(...args) {
      const start = performance.now();
      const cleanup = originalCreate.apply(this, args);
      UniversalRealtimeMonitoring.setupTimes.push(performance.now() - start);
      
      // Keep only last 100 measurements
      if (UniversalRealtimeMonitoring.setupTimes.length > 100) {
        UniversalRealtimeMonitoring.setupTimes.shift();
      }
      
      // Wrap cleanup to track cleanup times
      return () => {
        const cleanupStart = performance.now();
        cleanup();
        UniversalRealtimeMonitoring.cleanupTimes.push(performance.now() - cleanupStart);
        
        if (UniversalRealtimeMonitoring.cleanupTimes.length > 100) {
          UniversalRealtimeMonitoring.cleanupTimes.shift();
        }
      };
    };
  }
  
  /**
   * Get current metrics summary
   */
  static getMetricsSummary(): any {
    if (this.metrics.length === 0) {
      return null;
    }
    
    const latest = this.metrics[this.metrics.length - 1];
    const hourAgo = this.metrics[0];
    
    return {
      current: {
        listeners: latest.listenerCount,
        health: latest.healthScore,
        states: latest.connectionStates
      },
      trend: {
        listenerChange: latest.listenerCount - hourAgo.listenerCount,
        healthChange: latest.healthScore - hourAgo.healthScore
      },
      performance: latest.performance,
      errors: {
        lastHour: this.errorLog.length,
        lastMinute: latest.errors.count,
        rate: latest.errors.rate
      }
    };
  }
}
```

### Step 2: Feature Flags (30 minutes)

#### 2.1 Create Feature Flag System
```typescript
// File: src/config/featureFlags.ts

export interface FeatureFlags {
  useUniversalRealtime: boolean;
  universalRealtimePercentage: number;
  adaptivePollingEnabled: boolean;
  connectionStateTrackingEnabled: boolean;
  realtimeMonitoringEnabled: boolean;
  debugLoggingEnabled: boolean;
}

class FeatureFlagService {
  private flags: FeatureFlags = {
    useUniversalRealtime: false,
    universalRealtimePercentage: 0,
    adaptivePollingEnabled: false,
    connectionStateTrackingEnabled: false,
    realtimeMonitoringEnabled: false,
    debugLoggingEnabled: false
  };
  
  private userBucket: number;
  
  constructor() {
    // Generate consistent user bucket for gradual rollout
    this.userBucket = this.getUserBucket();
    
    // Load flags from environment or remote config
    this.loadFlags();
  }
  
  private getUserBucket(): number {
    // Use user ID or session ID for consistent bucketing
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('userId') || 
                    sessionStorage.getItem('sessionId') ||
                    Math.random().toString();
      
      // Simple hash to number between 0-100
      let hash = 0;
      for (let i = 0; i < userId.length; i++) {
        hash = ((hash << 5) - hash) + userId.charCodeAt(i);
        hash = hash & hash;
      }
      return Math.abs(hash) % 100;
    }
    return Math.floor(Math.random() * 100);
  }
  
  private loadFlags(): void {
    // Load from environment variables
    if (process.env.NEXT_PUBLIC_USE_UNIVERSAL_REALTIME === 'true') {
      this.flags.useUniversalRealtime = true;
    }
    
    if (process.env.NEXT_PUBLIC_UNIVERSAL_REALTIME_PERCENTAGE) {
      this.flags.universalRealtimePercentage = parseInt(
        process.env.NEXT_PUBLIC_UNIVERSAL_REALTIME_PERCENTAGE
      );
    }
    
    // Load from remote config (example)
    this.loadRemoteFlags();
  }
  
  private async loadRemoteFlags(): Promise<void> {
    try {
      // Example: Fetch from your config service
      const response = await fetch('/api/feature-flags');
      if (response.ok) {
        const remoteFlags = await response.json();
        this.flags = { ...this.flags, ...remoteFlags };
      }
    } catch (error) {
      console.error('Failed to load remote feature flags:', error);
    }
  }
  
  isEnabled(flag: keyof FeatureFlags): boolean {
    // Special handling for percentage-based rollout
    if (flag === 'useUniversalRealtime') {
      if (this.flags.useUniversalRealtime) {
        return true; // Fully enabled
      }
      
      // Check percentage rollout
      return this.userBucket < this.flags.universalRealtimePercentage;
    }
    
    return this.flags[flag];
  }
  
  getFlags(): FeatureFlags {
    return { ...this.flags };
  }
  
  // For testing and overrides
  setFlag(flag: keyof FeatureFlags, value: boolean | number): void {
    (this.flags as any)[flag] = value;
  }
}

export const featureFlags = new FeatureFlagService();

// React hook for feature flags
export function useFeatureFlag(flag: keyof FeatureFlags): boolean {
  const [enabled, setEnabled] = useState(false);
  
  useEffect(() => {
    setEnabled(featureFlags.isEnabled(flag));
    
    // Re-check periodically for remote updates
    const interval = setInterval(() => {
      setEnabled(featureFlags.isEnabled(flag));
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [flag]);
  
  return enabled;
}
```

#### 2.2 Integrate Feature Flags with Service
```typescript
// File: src/stores/meetingStore.ts
// Update setupRealtimeListeners to use feature flags

import { featureFlags } from '@/config/featureFlags';

// In setupRealtimeListeners function:
setupRealtimeListeners: (meetingId) => {
  // Check feature flag
  if (!featureFlags.isEnabled('useUniversalRealtime')) {
    // Use old implementation if available
    console.log('Using legacy realtime service');
    // ... old implementation ...
    return;
  }
  
  // Use new Universal Realtime Service
  console.log('Using Universal Realtime Service');
  
  // Enable monitoring if flagged
  if (featureFlags.isEnabled('realtimeMonitoringEnabled')) {
    UniversalRealtimeMonitoring.startMonitoring();
  }
  
  // ... rest of new implementation ...
}
```

### Step 3: Rollback Procedures (30 minutes)

#### 3.1 Create Rollback Script
```bash
#!/bin/bash
# File: scripts/rollback-universal-realtime.sh

set -e

echo "🔄 Starting Universal Realtime Service Rollback"

# Step 1: Disable feature flag immediately
echo "Step 1: Disabling feature flag..."
curl -X POST https://your-app.com/api/feature-flags \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"useUniversalRealtime": false, "universalRealtimePercentage": 0}'

# Step 2: Clear any cached configurations
echo "Step 2: Clearing cache..."
curl -X POST https://your-app.com/api/cache/clear \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Step 3: Revert to previous deployment if needed
echo "Step 3: Checking if code rollback needed..."
CURRENT_VERSION=$(curl -s https://your-app.com/api/version)
echo "Current version: $CURRENT_VERSION"

if [[ "$1" == "--revert-code" ]]; then
  echo "Reverting to previous deployment..."
  
  # Using your deployment service (example: Vercel)
  vercel rollback --yes
  
  # Or using Git
  # git revert HEAD
  # git push origin main
  
  echo "Code reverted"
fi

# Step 4: Monitor metrics
echo "Step 4: Monitoring rollback impact..."
sleep 10

# Check health
HEALTH=$(curl -s https://your-app.com/api/health)
echo "Health check: $HEALTH"

# Check error rate
ERROR_RATE=$(curl -s https://your-app.com/api/metrics/errors)
echo "Error rate: $ERROR_RATE"

echo "✅ Rollback completed"
echo ""
echo "Next steps:"
echo "1. Monitor error rates for next 30 minutes"
echo "2. Check user reports"
echo "3. Investigate root cause"
echo "4. Create incident report"
```

#### 3.2 Create Rollback Runbook
```markdown
# File: docs/universal-realtime-fixes/ROLLBACK_RUNBOOK.md

# Universal Realtime Service - Rollback Runbook

## When to Rollback

Rollback if ANY of these conditions occur:
- Error rate increases by more than 5%
- Memory usage increases by more than 100MB/hour
- More than 10 user complaints in first hour
- Health score drops below 50
- Critical functionality broken

## Rollback Procedure

### Level 1: Feature Flag Disable (Immediate)
**Time**: < 1 minute  
**Impact**: Minimal

1. Access feature flag dashboard
2. Set `useUniversalRealtime` to `false`
3. Set `universalRealtimePercentage` to `0`
4. Clear CDN cache
5. Verify old service active

### Level 2: Percentage Rollback (5 minutes)
**Time**: 5 minutes  
**Impact**: Gradual

1. Reduce percentage by 50%
2. Monitor for 5 minutes
3. If stable, keep reduced percentage
4. If not stable, go to Level 1

### Level 3: Code Rollback (15 minutes)
**Time**: 15 minutes  
**Impact**: Full revert

1. Run rollback script: `./scripts/rollback-universal-realtime.sh --revert-code`
2. Verify deployment successful
3. Check all services operational
4. Monitor for stability

## Post-Rollback Actions

1. **Immediate (0-30 min)**
   - Monitor metrics continuously
   - Check user reports
   - Verify core functionality working
   - Send status update to team

2. **Short-term (30 min - 2 hours)**
   - Gather diagnostic data
   - Identify root cause
   - Create incident ticket
   - Schedule post-mortem

3. **Long-term (2+ hours)**
   - Fix identified issues
   - Update tests
   - Plan re-deployment
   - Document lessons learned

## Monitoring During Rollback

Watch these metrics:
- Error rate (target: < 0.1%)
- Memory usage (target: stable)
- Active listeners (target: > 0)
- User complaints (target: 0)
- Health score (target: > 80)

## Communication Template

**Initial Alert**:
```
🚨 Universal Realtime Service Issue Detected
- Issue: [Brief description]
- Impact: [User impact]
- Action: Initiating rollback
- ETA: [Time estimate]
```

**Update**:
```
📊 Rollback Update
- Status: [In progress/Complete]
- Current state: [Service status]
- Next steps: [What's happening next]
```

**Resolution**:
```
✅ Service Restored
- Rollback complete at [time]
- Service stable
- Root cause investigation in progress
- Post-mortem scheduled for [date/time]
```
```

### Step 4: Deployment Scripts (30 minutes)

#### 4.1 Create Deployment Script
```bash
#!/bin/bash
# File: scripts/deploy-universal-realtime.sh

set -e

echo "🚀 Deploying Universal Realtime Service"

# Configuration
INITIAL_PERCENTAGE=${1:-5}  # Start with 5% by default
MONITORING_DURATION=${2:-300}  # Monitor for 5 minutes by default

echo "Configuration:"
echo "- Initial rollout: ${INITIAL_PERCENTAGE}%"
echo "- Monitoring duration: ${MONITORING_DURATION}s"
echo ""

# Step 1: Pre-deployment checks
echo "Step 1: Pre-deployment checks..."

# Check test results
if [ ! -f "test-results.json" ]; then
  echo "❌ Error: test-results.json not found. Run tests first."
  exit 1
fi

TEST_PASS=$(jq '.success' test-results.json)
if [ "$TEST_PASS" != "true" ]; then
  echo "❌ Error: Tests are failing. Fix before deployment."
  exit 1
fi

echo "✅ All tests passing"

# Step 2: Enable monitoring
echo "Step 2: Enabling monitoring..."
curl -X POST https://your-app.com/api/monitoring/enable \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"service": "universal-realtime"}'

# Step 3: Deploy code
echo "Step 3: Deploying code..."
npm run build
npm run deploy

# Wait for deployment
echo "Waiting for deployment to complete..."
sleep 30

# Step 4: Enable feature flag gradually
echo "Step 4: Starting gradual rollout..."

# Start with initial percentage
curl -X POST https://your-app.com/api/feature-flags \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"universalRealtimePercentage\": $INITIAL_PERCENTAGE}"

echo "Enabled for ${INITIAL_PERCENTAGE}% of users"

# Step 5: Monitor initial rollout
echo "Step 5: Monitoring for ${MONITORING_DURATION} seconds..."

START_TIME=$(date +%s)
ERROR_COUNT=0

while [ $(($(date +%s) - START_TIME)) -lt $MONITORING_DURATION ]; do
  # Check health
  HEALTH=$(curl -s https://your-app.com/api/realtime/health | jq '.score')
  ERROR_RATE=$(curl -s https://your-app.com/api/metrics/errors | jq '.rate')
  
  echo "$(date '+%H:%M:%S') - Health: ${HEALTH}, Error rate: ${ERROR_RATE}"
  
  # Check thresholds
  if (( $(echo "$ERROR_RATE > 1" | bc -l) )); then
    echo "❌ Error rate too high! Initiating rollback..."
    ./scripts/rollback-universal-realtime.sh
    exit 1
  fi
  
  if (( $(echo "$HEALTH < 50" | bc -l) )); then
    echo "❌ Health score too low! Initiating rollback..."
    ./scripts/rollback-universal-realtime.sh
    exit 1
  fi
  
  sleep 10
done

echo "✅ Initial rollout stable"

# Step 6: Gradual increase
echo "Step 6: Increasing rollout percentage..."

PERCENTAGES=(10 25 50 75 100)

for PERCENTAGE in "${PERCENTAGES[@]}"; do
  echo ""
  echo "Increasing to ${PERCENTAGE}%..."
  
  curl -X POST https://your-app.com/api/feature-flags \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{\"universalRealtimePercentage\": $PERCENTAGE}"
  
  # Monitor for 2 minutes at each level
  sleep 120
  
  # Check metrics
  HEALTH=$(curl -s https://your-app.com/api/realtime/health | jq '.score')
  
  if (( $(echo "$HEALTH < 70" | bc -l) )); then
    echo "⚠️  Health degraded at ${PERCENTAGE}%. Staying at previous level."
    PREV_PERCENTAGE=$((PERCENTAGE - 25))
    curl -X POST https://your-app.com/api/feature-flags \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -d "{\"universalRealtimePercentage\": $PREV_PERCENTAGE}"
    break
  fi
  
  echo "✅ Stable at ${PERCENTAGE}%"
done

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Summary:"
echo "- Final rollout percentage: ${PERCENTAGE}%"
echo "- Health score: ${HEALTH}"
echo "- Monitoring dashboard: https://your-app.com/admin/realtime"
```

### Step 5: Documentation (30 minutes)

#### 5.1 Create Operational Runbook
```markdown
# File: docs/universal-realtime-fixes/OPERATIONAL_RUNBOOK.md

# Universal Realtime Service - Operational Runbook

## Service Overview

The Universal Realtime Service provides real-time data synchronization with automatic fallback to polling. It works across all browsers without browser detection.

## Key Metrics

### Health Indicators
- **Health Score**: Should be > 80
- **Error Rate**: Should be < 0.1%
- **Memory Growth**: Should be < 10MB/hour
- **Listener Count**: Varies by load
- **Connection Modes**: Expect 85% realtime, 15% polling

### Performance Targets
- **Setup Time**: < 100ms
- **Cleanup Time**: < 10ms
- **Fallback Time**: < 15 seconds
- **Memory per Listener**: < 1KB

## Common Operations

### Check Service Health
```bash
curl https://your-app.com/api/realtime/health
```

### View Current Metrics
```bash
curl https://your-app.com/api/realtime/metrics
```

### Enable/Disable Service
```bash
# Enable
curl -X POST https://your-app.com/api/feature-flags \
  -d '{"useUniversalRealtime": true}'

# Disable
curl -X POST https://your-app.com/api/feature-flags \
  -d '{"useUniversalRealtime": false}'
```

### Adjust Rollout Percentage
```bash
curl -X POST https://your-app.com/api/feature-flags \
  -d '{"universalRealtimePercentage": 50}'
```

## Troubleshooting

### High Error Rate
**Symptoms**: Error rate > 1%
**Possible Causes**:
1. Firebase service issues
2. Network problems
3. Authentication failures

**Actions**:
1. Check Firebase status page
2. Review error logs for patterns
3. Verify authentication service healthy
4. Consider temporary rollback if > 5%

### Memory Growth
**Symptoms**: Memory growing > 10MB/hour
**Possible Causes**:
1. Listener leak
2. Retry timeout accumulation
3. State tracking issue

**Actions**:
1. Check listener count growth
2. Review cleanup logs
3. Force garbage collection
4. Restart service if critical

### Low Health Score
**Symptoms**: Health score < 50
**Possible Causes**:
1. High error rate
2. Many listeners in error state
3. Network connectivity issues

**Actions**:
1. Check individual connection states
2. Review error logs
3. Check network connectivity
4. Consider reducing load

### All Listeners in Polling Mode
**Symptoms**: 0% realtime connections
**Possible Causes**:
1. WebSocket blocked
2. Firebase real-time service down
3. Authentication issues

**Actions**:
1. Check WebSocket connectivity
2. Verify Firebase configuration
3. Test with single listener
4. Review security rules

## Monitoring Dashboards

### Grafana Dashboard
URL: https://grafana.your-app.com/d/universal-realtime

Key Panels:
- Listener count over time
- Health score trend
- Error rate
- Memory usage
- Connection mode distribution

### Custom Admin Panel
URL: https://your-app.com/admin/realtime

Features:
- Live connection states
- Individual listener details
- Manual cleanup tools
- Force mode switching

## Alerts

### Critical Alerts (Page immediately)
- Health score < 30
- Error rate > 5%
- Memory growth > 100MB/hour
- All listeners in error state

### Warning Alerts (Check within 1 hour)
- Health score < 60
- Error rate > 1%
- Memory growth > 50MB/hour
- Polling mode > 50%

### Info Alerts (Check daily)
- Gradual health decline
- Increasing polling percentage
- Memory growth trend

## Maintenance Procedures

### Weekly Health Check
1. Review metrics trends
2. Check error patterns
3. Verify performance targets met
4. Clear old monitoring data

### Monthly Optimization
1. Analyze usage patterns
2. Adjust polling intervals
3. Update browser compatibility data
4. Review and update documentation

### Quarterly Review
1. Performance benchmark
2. Cost analysis
3. Architecture review
4. Capacity planning

## Emergency Contacts

- **On-call Engineer**: [Phone/Slack]
- **Firebase Support**: [Ticket system]
- **Team Lead**: [Contact]
- **Escalation**: [Process]

## Related Documentation

- [Architecture Overview](./MASTER_FIX_PLAN.md)
- [Rollback Procedures](./ROLLBACK_RUNBOOK.md)
- [Testing Guide](./Phase4-Testing-Validation.md)
- [Deployment Guide](./Phase5-Deployment-Preparation.md)
```

## Success Criteria

### Monitoring Setup
- ✅ Metrics collection working
- ✅ Alerts configured
- ✅ Dashboards created
- ✅ Health endpoints active

### Feature Flags
- ✅ Flags configurable remotely
- ✅ Percentage rollout working
- ✅ User bucketing consistent
- ✅ Override capability available

### Rollback Procedures
- ✅ Rollback script tested
- ✅ Runbook documented
- ✅ Communication templates ready
- ✅ Team trained on procedures

### Deployment
- ✅ Deployment script tested
- ✅ Gradual rollout working
- ✅ Monitoring during deployment
- ✅ Automatic rollback triggers

### Documentation
- ✅ Operational runbook complete
- ✅ Troubleshooting guide ready
- ✅ Architecture documented
- ✅ Team trained

## Time Tracking

| Task | Estimated | Actual | Notes |
|------|-----------|--------|-------|
| Monitoring Setup | 30 min | ___ | Service & dashboards |
| Feature Flags | 30 min | ___ | System & integration |
| Rollback Procedures | 30 min | ___ | Scripts & runbook |
| Deployment Scripts | 30 min | ___ | Automation |
| Documentation | 30 min | ___ | Runbooks & guides |
| **Total** | **2.5h** | ___ | With buffer |

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Load tests completed
- [ ] Documentation updated
- [ ] Team briefed
- [ ] Rollback plan ready

### During Deployment
- [ ] Monitoring enabled
- [ ] Start with 5% rollout
- [ ] Monitor for 5 minutes
- [ ] Gradually increase percentage
- [ ] Watch metrics at each stage

### Post-Deployment
- [ ] Monitor for 24 hours
- [ ] Gather user feedback
- [ ] Document any issues
- [ ] Plan optimization
- [ ] Schedule retrospective

## Final Sign-off

Before proceeding with deployment:

- [ ] **Engineering**: Code review complete, tests passing
- [ ] **QA**: Testing complete, no blockers
- [ ] **DevOps**: Infrastructure ready, monitoring setup
- [ ] **Product**: Feature validated, rollout approved
- [ ] **Management**: Risk accepted, timeline approved

## Next Steps

1. **Get final approval** from all stakeholders
2. **Schedule deployment** during low-traffic period
3. **Brief support team** on new service
4. **Execute deployment** following script
5. **Monitor closely** for first 48 hours

---

*This completes the Universal Realtime Service fix implementation. The service is now ready for production deployment with comprehensive monitoring, rollback procedures, and documentation.*