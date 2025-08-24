# Universal Assistant Security Framework

A comprehensive, production-ready security framework for the Universal Assistant application, providing automated security infrastructure, monitoring, and incident response capabilities.

## 🛡️ Features

### Core Security Components

- **Authentication & Authorization**: JWT token validation, role-based access control
- **Input Validation**: XSS prevention, SQL injection protection, audio file validation
- **Rate Limiting**: Configurable rate limiting with tier-based controls
- **Data Encryption**: Field-level encryption, voice data protection, API key security
- **Security Monitoring**: Real-time threat detection and logging
- **Incident Response**: Automated threat response and escalation
- **Environment Security**: Configuration validation and secure setup
- **Security Testing**: Automated penetration testing and vulnerability scanning

### Audio-Specific Security

- **File Validation**: Format verification, size limits, header inspection
- **Content Scanning**: Malicious content detection, format mismatch identification
- **Voice Sample Security**: Encrypted voice profiles, secure sample storage
- **Processing Security**: Parameter validation for AI services

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Run the security setup script
npm run security:setup

# Generate secure environment variables
npm run security:setup-keys

# Validate environment configuration
npm run security:validate
```

### 2. Initialize Security Framework

```typescript
import { securityManager } from '@/lib/security';

// Initialize security framework
await securityManager.initialize();

// Check security health
const health = await securityManager.healthCheck();
console.log('Security Status:', health.status);
```

### 3. Protect API Routes

```typescript
import { withSecurity } from '@/lib/security';

export const POST = withSecurity(
  async (req: AuthenticatedRequest) => {
    // Your protected API logic here
    return NextResponse.json({ success: true });
  },
  {
    requireAuth: true,
    rateLimitRpm: 60,
    allowedMethods: ['POST'],
    csrfProtection: true
  }
);
```

### 4. Validate Audio Files

```typescript
import { AudioSecurityHelpers } from '@/lib/security';

const result = await AudioSecurityHelpers.validateVoiceSample(
  audioFile,
  userId,
  clientIP
);

if (!result.isValid) {
  console.error('Audio validation failed:', result.errors);
}
```

## 📋 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run security:audit` | Run comprehensive security audit |
| `npm run security:setup` | Initial security framework setup |
| `npm run security:test` | Run automated security tests |
| `npm run security:backup` | Create encrypted data backup |
| `npm run security:health` | Check security framework health |
| `npm run security:monitor` | Start incident response monitoring |
| `npm run security:env-check` | Validate environment variables |

## 🔧 Configuration

### Environment Variables

The security framework requires several environment variables for proper operation:

```bash
# Encryption Keys (generate with security:setup-keys)
VOICE_ENCRYPTION_SECRET=your-64-char-secure-key
FIELD_ENCRYPTION_SECRET=your-64-char-secure-key
API_KEY_ENCRYPTION_SECRET=your-64-char-secure-key
TOKEN_SECRET=your-64-char-secure-key
BACKUP_ENCRYPTION_KEY=your-64-char-secure-key

# Monitoring & Alerting
SECURITY_ALERT_WEBHOOK=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
MONITORING_WEBHOOK_URL=https://your-monitoring-service.com/webhook

# API Keys (encrypted in database)
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
DEEPGRAM_API_KEY=your-deepgram-key
```

### Security Configuration

```typescript
import { SecurityManager, SecurityConfig } from '@/lib/security';

const config: SecurityConfig = {
  rateLimiting: {
    enabled: true,
    defaultRpm: 60,
    tiers: {
      free: 30,
      premium: 120,
      admin: 300
    }
  },
  encryption: {
    enabled: true,
    algorithm: 'aes-256-gcm',
    keyRotationDays: 90
  },
  monitoring: {
    enabled: true,
    logLevel: 'info',
    retentionDays: 90
  },
  incidentResponse: {
    enabled: true,
    autoEscalation: true,
    notificationChannels: ['slack', 'email']
  }
};

const securityManager = new SecurityManager(config);
```

## 🔒 Security Components

### 1. Middleware Security (`middleware.ts`)

Provides comprehensive API route protection:

```typescript
import { withSecurity, inputValidation } from '@/lib/security';

// Protect API route with authentication and rate limiting
export const POST = withSecurity(handler, {
  requireAuth: true,
  rateLimitRpm: 100,
  maxRequestSize: 10 * 1024 * 1024, // 10MB
  allowedMethods: ['POST'],
  csrfProtection: true
});

// Input validation utilities
const sanitized = inputValidation.sanitizeText(userInput);
const isValidEmail = inputValidation.isValidEmail(email);
```

### 2. Audio Security (`audioSecurity.ts`)

Specialized validation for audio files and voice data:

```typescript
import { AudioSecurityValidator, AudioProcessingSecurity } from '@/lib/security';

const validator = new AudioSecurityValidator({
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxDuration: 2 * 60 * 60, // 2 hours
  enableContentScanning: true
});

// Validate audio file
const result = await validator.validateAudioFile(file, fileName, userId, ip);

// Validate processing parameters
const paramValidation = AudioProcessingSecurity.validateDeepgramParams(params);
```

### 3. Data Encryption (`encryption.ts`)

Multi-layer encryption for sensitive data:

```typescript
import { 
  DataEncryption, 
  VoiceDataEncryption, 
  FieldEncryption,
  APIKeyEncryption 
} from '@/lib/security';

// General data encryption
const encryption = new DataEncryption();
const encrypted = await encryption.encryptText(sensitiveData, password);

// Voice-specific encryption
const voiceEncryption = new VoiceDataEncryption();
const encryptedProfile = await voiceEncryption.encryptVoiceProfile(profile, userId);

// Field-level encryption for database
const encryptedField = await FieldEncryption.encryptField(value, fieldName, userId);

// API key encryption
const encryptedKey = await APIKeyEncryption.encryptAPIKey(apiKey, keyType);
```

### 4. Security Monitoring (`monitoring.ts`)

Real-time security event monitoring and alerting:

```typescript
import { SecurityLogger, securityMonitor } from '@/lib/security';

// Log security events
SecurityLogger.authFailure(ip, userAgent, { reason: 'invalid_password' });
SecurityLogger.suspiciousActivity(ip, userId, { action: 'bulk_download' });
SecurityLogger.dataAccess(ip, userId, 'voice_profile_access', resourceId);

// Get security metrics
const metrics = securityMonitor.getMetrics(60); // Last 60 minutes
console.log('Auth failures:', metrics.authFailures);
console.log('Active users:', metrics.activeUsers);

// Check for suspicious patterns
const isSuspicious = securityMonitor.isSuspiciousUser(userId);
if (isSuspicious) {
  // Take action
}
```

### 5. Environment Validation (`envValidation.ts`)

Comprehensive environment variable validation:

```typescript
import { environmentValidator, EnvironmentHelpers } from '@/lib/security';

// Full environment validation
const result = environmentValidator.validateEnvironment();
console.log('Environment Score:', result.score);

// Quick validation check
const isValid = EnvironmentHelpers.isValid();

// Generate validation report
const report = EnvironmentHelpers.generateReport();
console.log(report);
```

### 6. Security Testing (`testing.ts`)

Automated security testing framework:

```typescript
import { SecurityTestRunner, SecurityTestUtils } from '@/lib/security';

// Run full security test suite
const result = await SecurityTestRunner.runCISecurityTests();
console.log(result.report);
process.exit(result.exitCode);

// Quick security validation
const isSecure = await SecurityTestUtils.validateSecurity();

// Test specific endpoint
const endpointTests = await SecurityTestUtils.testEndpoint('/api/secure');
```

### 7. Incident Response (`incidentResponse.ts`)

Automated incident detection and response:

```typescript
import { 
  incidentResponseEngine, 
  IncidentResponseHelpers 
} from '@/lib/security';

// Start monitoring
IncidentResponseHelpers.startMonitoring();

// Report an incident
const incidentId = await IncidentResponseHelpers.reportIncident(
  'auth_failures',
  securityEvents,
  { source: 'automated_detection' }
);

// Get active incidents
const incidents = IncidentResponseHelpers.getActiveIncidents();

// Update incident status
IncidentResponseHelpers.updateIncident(incidentId, 'resolved', 'False positive');
```

## 🔍 Security Audit

The framework includes comprehensive security auditing capabilities:

```bash
# Run security audit
npm run security:audit
```

The audit checks:

- Environment variable security
- Firebase security rules
- API route protection
- Security headers configuration
- Dependency vulnerabilities
- File permissions
- Overall security posture

## 📊 Monitoring & Alerting

### Security Events

The framework monitors and logs various security events:

- Authentication failures
- Rate limit violations
- Suspicious user activity
- Data access anomalies
- System errors
- Encryption failures

### Incident Response

Automated incident response includes:

- **Detection**: Pattern-based threat detection
- **Classification**: Severity-based incident categorization
- **Response**: Automated containment actions
- **Escalation**: Rule-based escalation workflows
- **Notification**: Multi-channel alerting (Slack, email, webhooks)

### Predefined Incidents

- Multiple authentication failures
- Suspicious data access patterns
- Critical system errors
- Brute force attacks
- Data exfiltration attempts

## 🔄 Backup & Recovery

Encrypted backup system for critical data:

```bash
# Create encrypted backup
npm run security:backup

# Restore from backup (dry run)
npm run security:backup:restore backup-file.backup collection-name

# Restore from backup (live)
npm run security:backup:restore backup-file.backup collection-name --confirm

# Clean old backups
npm run security:backup:clean 5  # Keep last 5 backups
```

## 🧪 Testing

### Security Test Suites

The framework includes comprehensive security tests:

- **Authentication Tests**: JWT validation, password strength
- **Input Validation Tests**: XSS prevention, SQL injection protection
- **Encryption Tests**: Data encryption strength validation
- **Environment Tests**: Configuration security validation
- **Penetration Tests**: API endpoint security testing

### Running Tests

```bash
# Run all security tests
npm run security:test

# Check security health
npm run security:health

# Validate environment
npm run security:env-check
```

## 🚨 Production Deployment

### Pre-Deployment Checklist

1. **Environment Setup**
   ```bash
   npm run security:setup
   npm run security:env-check
   ```

2. **Security Validation**
   ```bash
   npm run security:test
   npm run security:audit
   ```

3. **Monitoring Setup**
   ```bash
   npm run security:monitor
   ```

### Production Configuration

- Use strong, randomly generated encryption keys
- Enable all security features
- Configure monitoring webhooks
- Set up incident response notifications
- Schedule regular security audits
- Enable automated backups

### Monitoring

```typescript
// Initialize in production
if (process.env.NODE_ENV === 'production') {
  await securityManager.initialize();
}

// Health check endpoint
app.get('/health/security', async (req, res) => {
  const health = await securityManager.healthCheck();
  res.json(health);
});
```

## 📚 Best Practices

1. **Environment Security**
   - Never commit `.env.local` to version control
   - Use strong, unique encryption keys
   - Rotate keys regularly (quarterly)
   - Validate environment on startup

2. **API Security**
   - Always use `withSecurity` middleware
   - Implement proper rate limiting
   - Validate all inputs
   - Log security events

3. **Data Protection**
   - Encrypt sensitive data at rest
   - Use HTTPS for all communications
   - Implement proper access controls
   - Regular data backups

4. **Monitoring**
   - Monitor security logs daily
   - Set up automated alerting
   - Regular security audits
   - Incident response drills

5. **Testing**
   - Include security tests in CI/CD
   - Regular penetration testing
   - Dependency vulnerability scanning
   - Security regression testing

## 🔗 Integration Examples

### Next.js API Route

```typescript
import { withSecurity } from '@/lib/security/middleware';
import { AudioSecurityHelpers } from '@/lib/security/audioSecurity';

export const POST = withSecurity(
  async (req: AuthenticatedRequest) => {
    const { audioFile } = await req.formData();
    
    // Validate audio file
    const validation = await AudioSecurityHelpers.validateVoiceSample(
      audioFile as File,
      req.user!.uid,
      req.ip
    );
    
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Invalid audio file', details: validation.errors },
        { status: 400 }
      );
    }
    
    // Process audio file...
    return NextResponse.json({ success: true });
  },
  {
    requireAuth: true,
    rateLimitRpm: 30,
    maxRequestSize: 50 * 1024 * 1024 // 50MB
  }
);
```

### React Component

```typescript
import { useEffect, useState } from 'react';
import { EnvironmentHelpers } from '@/lib/security/envValidation';

export function SecurityStatus() {
  const [isSecure, setIsSecure] = useState(false);
  
  useEffect(() => {
    const checkSecurity = async () => {
      const secure = EnvironmentHelpers.isValid();
      setIsSecure(secure);
    };
    
    checkSecurity();
  }, []);
  
  return (
    <div className={`p-4 rounded ${isSecure ? 'bg-green-100' : 'bg-red-100'}`}>
      Security Status: {isSecure ? '✅ Secure' : '❌ Issues Detected'}
    </div>
  );
}
```

## 🆘 Troubleshooting

### Common Issues

1. **Environment Validation Failures**
   ```bash
   # Check environment status
   npm run security:env-check
   
   # Regenerate keys
   npm run security:setup-keys
   ```

2. **Security Test Failures**
   ```bash
   # Run detailed security tests
   npm run security:test
   
   # Check specific components
   npm run security:audit
   ```

3. **Monitoring Issues**
   ```bash
   # Check security health
   npm run security:health
   
   # Restart monitoring
   npm run security:monitor
   ```

### Support

For security-related issues:

1. Check the security audit output
2. Validate environment configuration
3. Review security logs
4. Test security components individually
5. Check incident response logs

## 📝 License

This security framework is part of the Universal Assistant project and follows the same licensing terms.

---

## 🔐 Security Notice

This framework implements industry-standard security practices but should be reviewed and customized for your specific security requirements. Regular security audits and penetration testing are recommended for production deployments.