# 📋 Hybrid Security Migration Runbook

## Overview
This runbook guides administrators through the gradual migration from legacy storage paths to user-isolated paths in the Universal Assistant application.

## Current Status
- **Phase**: Hybrid Mode
- **Legacy Support**: Enabled
- **Anonymous Auth**: Enabled
- **User Isolation**: Disabled (Ready for activation)

---

## 🚀 Quick Start

### Step 1: Initialize Feature Flags
1. Navigate to `/admin/initialize-flags`
2. Click "Initialize Feature Flags"
3. Verify all flags show as initialized

### Step 2: Test the System
1. Navigate to `/test-hybrid`
2. Test anonymous authentication
3. Test path resolution
4. Verify no errors in console

---

## 📊 Migration Phases

### Phase 1: Hybrid Mode (Current)
**Duration**: 1-2 weeks
**Status**: ✅ ACTIVE

**Configuration**:
```javascript
{
  enableUserIsolation: false,
  enableAnonymousAuth: true,
  enableLegacyPathFallback: true,
  migrationPhase: 'hybrid'
}
```

**Actions**:
- [x] Deploy hybrid security rules
- [x] Initialize feature flags
- [ ] Monitor for errors
- [ ] Collect baseline metrics

### Phase 2: Enable User Isolation
**Duration**: 1-2 weeks
**Status**: ⏳ PENDING

**Configuration**:
```javascript
{
  enableUserIsolation: true,
  enableAnonymousAuth: true,
  enableLegacyPathFallback: true,
  migrationPhase: 'hybrid'
}
```

**Actions**:
- [ ] Enable user isolation flag
- [ ] New data uses user-isolated paths
- [ ] Existing data remains in legacy paths
- [ ] Monitor performance and errors

### Phase 3: Begin Active Migration
**Duration**: 2-4 weeks
**Status**: ⏳ PENDING

**Configuration**:
```javascript
{
  enableUserIsolation: true,
  enableAnonymousAuth: true,
  enableLegacyPathFallback: true,
  migrationPhase: 'migrating',
  autoMigrateOnLogin: true,
  showMigrationPrompt: true
}
```

**Actions**:
- [ ] Enable collection-specific migration flags
- [ ] Run migration for beta users
- [ ] Monitor migration progress
- [ ] Address any issues

### Phase 4: Complete Migration
**Duration**: 1 week
**Status**: ⏳ PENDING

**Configuration**:
```javascript
{
  enableUserIsolation: true,
  enableAnonymousAuth: false,
  enableLegacyPathFallback: false,
  migrationPhase: 'completed'
}
```

**Actions**:
- [ ] Disable anonymous authentication
- [ ] Disable legacy path fallback
- [ ] Clean up anonymous user records
- [ ] Archive legacy data

---

## 🛠️ Administrative Tasks

### Accessing Admin Pages

#### Feature Flag Management
- **URL**: `/admin/initialize-flags`
- **Purpose**: Initialize and manage feature flags
- **Requirements**: Admin access

#### Migration Testing
- **URL**: `/test-hybrid`
- **Purpose**: Test authentication and path resolution
- **Requirements**: None (public test page)

### Monitoring Migration Progress

#### Check Feature Flags
```javascript
// Firebase Console Query
// Collection: systemConfig
// Document: featureFlags
```

#### Check User Migration Status
```javascript
// Firebase Console Query
// Collection: users
// Fields to check:
// - migrationEnabled
// - migrationProgress
// - migratedCollections
```

### Common Operations

#### Enable User Isolation for Specific User
1. Go to Firebase Console
2. Navigate to `users/{userId}`
3. Add field: `migrationEnabled: true`
4. Add field: `migratedCollections: ["voice-samples"]`

#### Force Migration for All Users
1. Navigate to `/admin/initialize-flags`
2. Set `autoMigrateOnLogin: true`
3. Set `migrationPhase: 'migrating'`

#### Rollback Migration
1. Navigate to `/admin/initialize-flags`
2. Set `enableLegacyPathFallback: true`
3. Set `migrationPhase: 'hybrid'`
4. Set `enableUserIsolation: false`

---

## 🚨 Troubleshooting

### Common Issues

#### Issue: "Missing or insufficient permissions" error
**Solution**:
1. Ensure feature flags are initialized
2. Check that `enableLegacyPathFallback: true`
3. Verify Firebase rules are deployed

#### Issue: Files not accessible after migration
**Solution**:
1. Check `enableLegacyPathFallback` is true
2. Verify user has `migrationEnabled: true`
3. Check StoragePathResolver is resolving correctly

#### Issue: Anonymous users can't access app
**Solution**:
1. Ensure `enableAnonymousAuth: true`
2. Check Firestore rules include `isAuthenticatedOrAnonymous()`
3. Verify Firebase Authentication has anonymous auth enabled

### Emergency Rollback

If critical issues occur:
```javascript
// Set these flags immediately:
{
  enableUserIsolation: false,
  enableAnonymousAuth: true,
  enableLegacyPathFallback: true,
  migrationPhase: 'hybrid',
  autoMigrateOnLogin: false
}
```

---

## 📈 Monitoring Checklist

### Daily Checks
- [ ] Check error logs for permission denied errors
- [ ] Verify new users can sign up
- [ ] Confirm existing users can access their data
- [ ] Monitor Firebase usage/costs

### Weekly Checks
- [ ] Review migration progress metrics
- [ ] Check anonymous user accumulation
- [ ] Verify storage path distribution
- [ ] Assess performance impact

### Before Phase Transitions
- [ ] Backup Firestore data
- [ ] Backup Storage files
- [ ] Test in development environment
- [ ] Prepare rollback plan
- [ ] Notify team of changes

---

## 📝 Migration Metrics

Track these metrics throughout migration:

1. **User Metrics**
   - Total users
   - Anonymous users
   - Migrated users
   - Failed migrations

2. **Storage Metrics**
   - Files in legacy paths
   - Files in new paths
   - Migration success rate
   - Storage costs

3. **Performance Metrics**
   - Path resolution time
   - File access latency
   - API response times
   - Error rates

---

## 🔒 Security Considerations

### During Migration
- ✅ Maintain `enableLegacyPathFallback: true` until complete
- ✅ Monitor for unauthorized access attempts
- ✅ Keep audit logs of migration actions
- ✅ Test security rules after each phase

### Post-Migration
- ✅ Disable anonymous authentication
- ✅ Remove legacy path access
- ✅ Clean up orphaned data
- ✅ Update security documentation

---

## 📞 Support Contacts

### Technical Issues
- Review logs in Firebase Console
- Check GitHub issues: `github.com/your-org/universal-assistant`
- Contact: technical-support@example.com

### Emergency Escalation
1. Check this runbook first
2. Try emergency rollback
3. Contact on-call engineer
4. Document issue for post-mortem

---

## 📅 Timeline

| Week | Phase | Actions |
|------|-------|---------|
| 1-2 | Hybrid Mode | Deploy, initialize, monitor |
| 3-4 | User Isolation | Enable for new data |
| 5-8 | Active Migration | Migrate existing users |
| 9 | Completion | Disable legacy support |
| 10+ | Cleanup | Remove anonymous users, archive |

---

## ✅ Final Checklist

Before considering migration complete:
- [ ] All users migrated successfully
- [ ] No errors in past 7 days
- [ ] Performance metrics acceptable
- [ ] Security audit passed
- [ ] Documentation updated
- [ ] Team trained on new system
- [ ] Backup and rollback tested
- [ ] Anonymous users cleaned up
- [ ] Legacy paths removed
- [ ] Migration flags set to 'completed'

---

## 📚 Additional Resources

- [Firebase Security Rules Documentation](https://firebase.google.com/docs/firestore/security/get-started)
- [Storage Security Rules Guide](https://firebase.google.com/docs/storage/security)
- [Feature Flag Best Practices](https://docs.google.com/feature-flags)
- [Migration Strategy Patterns](https://docs.google.com/migration-patterns)

---

Last Updated: August 2025
Version: 1.0.0