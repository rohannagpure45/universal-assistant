# Phase 5: Simple Rollback Guide

## Quick Rollback (< 1 minute)

### To Disable Universal Realtime Service:

1. **Set Environment Variable**:
   ```bash
   NEXT_PUBLIC_USE_UNIVERSAL_REALTIME=false
   ```

2. **Restart Application**:
   ```bash
   npm run build
   npm run start
   ```

3. **Verify Disabled**:
   - Check console for absence of `[UniversalRealtime]` logs
   - Service will return `false` from `UniversalRealtimeService.isEnabled()`

## Re-Enable Service

1. **Remove or Set to True**:
   ```bash
   # Either remove the variable entirely (defaults to enabled)
   unset NEXT_PUBLIC_USE_UNIVERSAL_REALTIME
   
   # Or explicitly enable
   NEXT_PUBLIC_USE_UNIVERSAL_REALTIME=true
   ```

2. **Restart Application**

## Health Check

### In Development:
```javascript
// Browser console or Node.js
UniversalRealtimeService.logHealth();
// Output: [UniversalRealtime] { listeners: 5, health: "100%", errors: 0 }
```

### Get Metrics Programmatically:
```javascript
const metrics = UniversalRealtimeService.getHealthMetrics();
console.log(metrics);
// { listenerCount: 5, errorCount: 0, healthScore: 100, timestamp: Date }
```

## Common Issues

### Service Still Active After Disabling
- Ensure environment variable is set before build
- Clear browser cache
- Restart development server

### No Monitoring Output
- Only logs in development mode (`NODE_ENV=development`)
- Check that listeners are actually created
- Call `logHealth()` manually to test

## Production Deployment

### Recommended Approach:
1. Deploy with service enabled (default)
2. Monitor health metrics for first hour
3. If issues arise, set `NEXT_PUBLIC_USE_UNIVERSAL_REALTIME=false`
4. No code changes required for rollback

### Success Indicators:
- Health score > 80%
- Error count < 5% of listener count
- No memory growth over time

## Notes
- This is a simple on/off toggle - no complex percentage rollouts
- Service defaults to enabled for backward compatibility
- All monitoring is passive - no performance impact
- No external dependencies or services required