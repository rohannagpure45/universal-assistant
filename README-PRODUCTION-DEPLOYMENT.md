# Production Deployment Guide

This document provides comprehensive instructions for deploying the Universal Assistant application to production with monitoring, logging, and error handling capabilities.

## 🚀 Production Infrastructure Overview

The production deployment includes:

### 1. **Monitoring System**
- **Performance Dashboard**: Real-time system health and performance metrics
- **Error Tracking**: Automatic error detection, categorization, and recovery
- **Health Checks**: Comprehensive service health monitoring with automatic alerts
- **Analytics**: User behavior and system usage analytics

### 2. **Logging Framework**
- **Structured Logging**: Centralized logging with context and metadata
- **Audit Trails**: Complete audit logs for security and compliance
- **Performance Logging**: Request timing and resource usage tracking
- **Error Context**: Detailed error reporting with stack traces and recovery info

### 3. **Deployment Pipeline**
- **CI/CD Integration**: Automated GitHub Actions workflow
- **Blue-Green Deployment**: Zero-downtime deployment strategy
- **Automated Testing**: Comprehensive test suite with quality gates
- **Security Scanning**: Automated vulnerability detection and reporting

### 4. **Error Handling**
- **Global Error Boundaries**: React error boundaries with graceful recovery
- **Automatic Recovery**: Smart error recovery mechanisms
- **User-Friendly Fallbacks**: Graceful degradation for better user experience
- **Production Error Pages**: Professional error handling for users

## 📋 Prerequisites

### Environment Requirements
- **Node.js**: 18.17.0 or higher
- **npm/pnpm**: Latest stable version
- **Git**: Version control access
- **Docker** (optional): For containerized deployment

### Required Environment Variables

Create a `.env.production` file based on `.env.production.example`:

```bash
# Copy the example file
cp .env.production.example .env.production

# Edit with your production values
vim .env.production
```

**Critical Variables:**
- `NEXT_PUBLIC_FIREBASE_API_KEY`: Firebase project API key
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: Firebase project ID
- `OPENAI_API_KEY`: OpenAI API access
- `ANTHROPIC_API_KEY`: Anthropic Claude API access
- `DEEPGRAM_API_KEY`: Speech-to-text service
- `ELEVENLABS_API_KEY`: Text-to-speech service

## 🔧 Deployment Methods

### Method 1: Automated CI/CD (Recommended)

The GitHub Actions workflow automatically handles:
1. Code quality checks
2. Security scanning
3. Comprehensive testing
4. Performance validation
5. Production deployment
6. Health check validation
7. Rollback on failure

**Trigger deployment:**
```bash
# Push to main branch for production
git push origin main

# Or manually trigger via GitHub Actions
# Repository → Actions → "Production Deployment Pipeline" → "Run workflow"
```

### Method 2: Manual Deployment

Use the provided deployment script:

```bash
# Full production deployment
npm run deploy:production

# Staging deployment
npm run deploy:staging

# Dry run (see what would happen)
npm run deploy:dry-run

# Emergency rollback
./scripts/deploy.sh --rollback --environment production
```

**Deployment script features:**
- ✅ Prerequisites validation
- ✅ Automated testing
- ✅ Production build optimization
- ✅ Health check validation
- ✅ Performance verification
- ✅ Automatic rollback on failure

## 🔍 Production Monitoring

### Health Check API

Monitor system health via the built-in health check endpoint:

```bash
# Basic health check
curl https://your-domain.com/api/health

# Detailed health report
curl https://your-domain.com/api/health?detailed=true
```

**Health check includes:**
- Overall system status
- Individual service health
- Performance metrics
- Error rates
- Memory and resource usage

### Monitoring Dashboard

Access the production monitoring dashboard:
```
https://your-domain.com/admin/monitoring
```

**Dashboard features:**
- 📊 Real-time system metrics
- 🚨 Error tracking and analysis
- ⚡ Performance benchmarks
- 📝 System logs viewer
- 🏥 Health check results
- 📈 Historical trend analysis

### Performance Monitoring

The system includes comprehensive performance monitoring:

```bash
# Generate performance report
npm run performance:benchmark

# Run Lighthouse audit
npm run lighthouse

# Export monitoring data
curl -X POST https://your-domain.com/api/health -d '{"action":"generate-report"}'
```

## 🛡️ Security & Compliance

### Security Features
- **HTTPS Enforcement**: Automatic redirect to secure connections
- **Security Headers**: Comprehensive security header configuration
- **Content Security Policy**: XSS and injection protection
- **Rate Limiting**: API abuse prevention
- **Input Validation**: Request sanitization and validation

### Data Privacy
- **GDPR Compliance**: European data protection compliance
- **CCPA Compliance**: California privacy law compliance
- **Data Retention**: Configurable data retention policies
- **Audit Logging**: Complete audit trail for compliance

### Security Monitoring
```bash
# Security audit
npm run audit:security

# Check for vulnerabilities
npm audit --audit-level=moderate

# Generate security report
curl https://your-domain.com/api/health?detailed=true | jq '.security'
```

## 📈 Performance Optimization

### Build Optimizations
The production build includes:
- **Code Splitting**: Automatic bundle optimization
- **Tree Shaking**: Unused code elimination
- **Compression**: Gzip and Brotli compression
- **Image Optimization**: Automatic image format conversion
- **Static Asset Caching**: Long-term browser caching

### Runtime Optimizations
- **Service Worker**: Offline functionality and caching
- **CDN Integration**: Static asset distribution
- **Database Indexing**: Optimized query performance
- **Memory Management**: Automatic garbage collection monitoring

### Performance Monitoring
```bash
# Check current performance
npm run health:detailed

# Monitor real-time metrics
curl https://your-domain.com/api/monitoring/metrics

# Generate performance report
curl -X POST https://your-domain.com/api/health -d '{"action":"generate-report"}'
```

## 🚨 Error Handling & Recovery

### Error Boundaries
The application includes multiple levels of error boundaries:
- **Critical**: Application-level errors with full-page fallbacks
- **Page**: Page-level errors with contextual recovery options
- **Component**: Component-level errors with isolated fallbacks

### Automatic Recovery
Smart recovery mechanisms for common issues:
- **Network Failures**: Automatic retry with exponential backoff
- **Authentication Expiry**: Token refresh and session restoration
- **Database Disconnection**: Connection retry and failover
- **Audio System Errors**: Device reset and re-initialization

### Error Monitoring
```bash
# View recent errors
curl https://your-domain.com/admin/monitoring

# Export error data
npm run logs:export

# Clean up old errors
npm run errors:cleanup
```

## 📊 Logging & Analytics

### Structured Logging
All application events are logged with structured data:
- **Request/Response**: API call timing and status
- **User Actions**: User interaction tracking
- **System Events**: Application lifecycle events
- **Performance Metrics**: Resource usage and timing
- **Security Events**: Authentication and authorization

### Log Management
```bash
# View recent logs
curl https://your-domain.com/api/monitoring/logs

# Export logs for analysis
npm run logs:export

# Real-time log streaming
curl -N https://your-domain.com/api/monitoring/logs/stream
```

### Analytics Integration
- **User Analytics**: Behavior tracking and insights
- **Performance Analytics**: System performance trends
- **Error Analytics**: Error pattern analysis
- **Business Metrics**: Usage and engagement metrics

## 🔄 Maintenance & Updates

### Regular Maintenance Tasks
```bash
# Daily health check
npm run health:check

# Weekly performance audit
npm run performance:benchmark

# Monthly security audit
npm run audit:security

# Cleanup old data
npm run errors:cleanup
```

### Update Procedure
1. **Test in Staging**: Deploy updates to staging first
2. **Run Test Suite**: Comprehensive testing validation
3. **Security Scan**: Vulnerability assessment
4. **Performance Test**: Load and stress testing
5. **Production Deploy**: Blue-green deployment
6. **Health Validation**: Post-deployment verification
7. **Monitor**: 24-hour monitoring period

### Rollback Procedure
```bash
# Emergency rollback
./scripts/deploy.sh --rollback --environment production

# Validate rollback
npm run health:detailed

# Notify team
curl -X POST $MONITORING_WEBHOOK -d '{"event":"rollback","status":"completed"}'
```

## 🆘 Troubleshooting

### Common Issues

**1. Application Won't Start**
```bash
# Check logs
npm run logs:export

# Validate environment
node -e "console.log(process.env.NODE_ENV)"

# Test configuration
npm run health:check
```

**2. High Error Rate**
```bash
# Check error dashboard
curl https://your-domain.com/admin/monitoring

# Review recent errors
curl https://your-domain.com/api/health?detailed=true | jq '.errors'

# Clear error cache
npm run errors:cleanup
```

**3. Performance Issues**
```bash
# Generate performance report
npm run performance:benchmark

# Check resource usage
curl https://your-domain.com/api/health?detailed=true | jq '.metrics'

# Review slow operations
curl https://your-domain.com/admin/monitoring
```

**4. Deployment Failures**
```bash
# Run deployment dry-run
npm run deploy:dry-run

# Check prerequisites
./scripts/deploy.sh --help

# Validate configuration
npm run typecheck && npm run lint
```

## 📞 Support & Monitoring

### Alert Channels
- **Slack**: Real-time alerts for critical issues
- **Email**: Detailed reports and summaries
- **Discord**: Development team notifications
- **Webhook**: Custom integrations

### Monitoring Dashboards
- **System Health**: Overall application status
- **Performance Metrics**: Response times and resource usage
- **Error Tracking**: Error rates and recovery status
- **User Analytics**: Usage patterns and engagement

### Support Contacts
- **Technical Issues**: Check the monitoring dashboard first
- **Security Concerns**: Review audit logs and security reports
- **Performance Problems**: Generate performance reports
- **Deployment Issues**: Check CI/CD pipeline logs

---

## 🎯 Best Practices

1. **Monitor Continuously**: Always keep monitoring active in production
2. **Test Thoroughly**: Comprehensive testing before any production changes
3. **Deploy Safely**: Use blue-green deployment for zero downtime
4. **Handle Errors Gracefully**: Provide good user experience during errors
5. **Log Everything**: Maintain detailed logs for debugging and compliance
6. **Secure by Default**: Always prioritize security in configuration
7. **Plan for Scale**: Design for growth and increased load
8. **Have Rollback Ready**: Always have a quick rollback plan

This production deployment provides enterprise-grade reliability, monitoring, and maintainability for the Universal Assistant application.