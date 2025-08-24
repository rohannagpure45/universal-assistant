#!/bin/bash

# Security setup script for Universal Assistant
# This script sets up environment variables, security configurations, and validation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Security configuration directory
SECURITY_DIR="./security-config"
ENV_FILE=".env.local"
ENV_TEMPLATE="scripts/env.template"
ENV_EXAMPLE=".env.example"

echo -e "${BLUE}🛡️  Universal Assistant Security Setup${NC}"
echo "================================================"

# Function to generate secure random key
generate_secure_key() {
    local length=${1:-64}
    openssl rand -hex $length 2>/dev/null || head -c $length < /dev/urandom | xxd -p -c $length
}

# Function to validate key strength
validate_key_strength() {
    local key="$1"
    local min_length=${2:-32}
    
    if [ ${#key} -lt $min_length ]; then
        echo -e "${RED}❌ Key too short (minimum $min_length characters)${NC}"
        return 1
    fi
    
    if [[ ! "$key" =~ [A-Z] ]] || [[ ! "$key" =~ [a-z] ]] || [[ ! "$key" =~ [0-9] ]]; then
        echo -e "${YELLOW}⚠️  Key should contain uppercase, lowercase, and numeric characters${NC}"
    fi
    
    return 0
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to create environment template
create_env_template() {
    echo -e "${BLUE}📄 Creating environment template...${NC}"
    
    cat > "$ENV_TEMPLATE" << 'EOF'
# Universal Assistant Environment Configuration
# Copy this file to .env.local and fill in your values

# =============================================================================
# Firebase Configuration
# =============================================================================

# Firebase Project Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# Firebase Admin SDK (Server-side only)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----"

# Alternative: Path to service account JSON file
# FIREBASE_SERVICE_ACCOUNT_PATH=./path/to/serviceAccountKey.json

# =============================================================================
# AI Service API Keys
# =============================================================================

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_ORGANIZATION=org-your-organization-id

# Anthropic Configuration
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here

# Deepgram Configuration (Speech-to-Text)
DEEPGRAM_API_KEY=your-deepgram-api-key

# ElevenLabs Configuration (Text-to-Speech)
ELEVENLABS_API_KEY=your-elevenlabs-api-key

# =============================================================================
# Security & Encryption Keys
# =============================================================================

# Data Encryption Keys (Generate secure random keys)
VOICE_ENCRYPTION_SECRET=GENERATE_SECURE_KEY_64_CHARS
FIELD_ENCRYPTION_SECRET=GENERATE_SECURE_KEY_64_CHARS
API_KEY_ENCRYPTION_SECRET=GENERATE_SECURE_KEY_64_CHARS
TOKEN_SECRET=GENERATE_SECURE_KEY_64_CHARS
BACKUP_ENCRYPTION_KEY=GENERATE_SECURE_KEY_64_CHARS

# Session Configuration
SESSION_SECRET=GENERATE_SECURE_KEY_64_CHARS
JWT_SECRET=GENERATE_SECURE_KEY_64_CHARS

# =============================================================================
# Monitoring & Alerting
# =============================================================================

# Security Monitoring
MONITORING_WEBHOOK_URL=https://your-monitoring-service.com/webhook
MONITORING_API_KEY=your-monitoring-api-key
SECURITY_ALERT_WEBHOOK=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Application Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
NEW_RELIC_LICENSE_KEY=your-new-relic-license-key

# =============================================================================
# Rate Limiting & Redis (Optional)
# =============================================================================

# Redis Configuration (for production rate limiting)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password

# Rate Limiting Configuration
DEFAULT_RATE_LIMIT=100
PREMIUM_RATE_LIMIT=500
ADMIN_RATE_LIMIT=1000

# =============================================================================
# Development & Testing
# =============================================================================

# Environment
NODE_ENV=development
NEXT_PUBLIC_APP_ENV=development

# Development URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
API_BASE_URL=http://localhost:3000/api

# Testing Configuration
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=SecureTestPassword123!

# =============================================================================
# Security Headers & CSP
# =============================================================================

# Content Security Policy
CSP_REPORT_URI=https://your-domain.report-uri.com/r/d/csp/enforce

# Trusted Domains
TRUSTED_DOMAINS=localhost,your-domain.com,*.your-domain.com

# =============================================================================
# Backup & Storage
# =============================================================================

# Backup Configuration
BACKUP_STORAGE_BUCKET=your-backup-bucket
BACKUP_RETENTION_DAYS=30

# File Upload Limits
MAX_FILE_SIZE=52428800
MAX_AUDIO_DURATION=7200

# =============================================================================
# Feature Flags
# =============================================================================

# Security Features
ENABLE_RATE_LIMITING=true
ENABLE_AUDIT_LOGGING=true
ENABLE_ENCRYPTION=true
ENABLE_2FA=false

# Performance Features
ENABLE_CACHING=true
ENABLE_COMPRESSION=true
ENABLE_CDN=false

EOF

    echo -e "${GREEN}✅ Environment template created at $ENV_TEMPLATE${NC}"
}

# Function to create .env.example
create_env_example() {
    echo -e "${BLUE}📄 Creating .env.example...${NC}"
    
    # Create a safe example file without sensitive data
    sed 's/=.*/=/' "$ENV_TEMPLATE" > "$ENV_EXAMPLE"
    
    echo -e "${GREEN}✅ Environment example created at $ENV_EXAMPLE${NC}"
}

# Function to setup security directory
setup_security_directory() {
    echo -e "${BLUE}📁 Setting up security configuration directory...${NC}"
    
    mkdir -p "$SECURITY_DIR"
    
    # Create security configuration files
    cat > "$SECURITY_DIR/security-policies.json" << 'EOF'
{
  "version": "1.0",
  "policies": {
    "authentication": {
      "requireMFA": false,
      "sessionTimeout": 3600,
      "maxLoginAttempts": 5,
      "lockoutDuration": 900
    },
    "authorization": {
      "defaultRole": "user",
      "roleHierarchy": ["admin", "premium", "user"],
      "resourceAccess": {
        "meetings": ["owner", "participant"],
        "transcripts": ["owner"],
        "voiceProfiles": ["owner"]
      }
    },
    "dataProtection": {
      "encryptSensitiveFields": true,
      "retentionPeriodDays": 365,
      "autoDeleteAfterDays": 1095,
      "backupEncryption": true
    },
    "rateLimiting": {
      "enabled": true,
      "tiers": {
        "free": { "requestsPerMinute": 30, "dailyLimit": 1000 },
        "premium": { "requestsPerMinute": 120, "dailyLimit": 10000 },
        "admin": { "requestsPerMinute": 300, "dailyLimit": 50000 }
      }
    },
    "auditLogging": {
      "enabled": true,
      "logLevel": "info",
      "retentionDays": 90,
      "sensitiveDataRedaction": true
    }
  }
}
EOF

    # Create incident response playbook
    cat > "$SECURITY_DIR/incident-response.json" << 'EOF'
{
  "version": "1.0",
  "contacts": {
    "securityTeam": "security@your-domain.com",
    "technicalLead": "tech-lead@your-domain.com",
    "management": "management@your-domain.com"
  },
  "escalationMatrix": {
    "low": ["securityTeam"],
    "medium": ["securityTeam", "technicalLead"],
    "high": ["securityTeam", "technicalLead", "management"],
    "critical": ["securityTeam", "technicalLead", "management"]
  },
  "responsePlaybooks": {
    "dataBreachSuspected": {
      "immediate": [
        "Isolate affected systems",
        "Preserve logs and evidence",
        "Notify security team"
      ],
      "investigation": [
        "Determine scope of breach",
        "Identify affected data",
        "Document timeline"
      ],
      "containment": [
        "Patch vulnerabilities",
        "Reset compromised credentials",
        "Implement additional monitoring"
      ],
      "communication": [
        "Notify affected users",
        "Prepare public statement",
        "Coordinate with legal team"
      ]
    },
    "unauthorizedAccess": {
      "immediate": [
        "Block suspicious IP addresses",
        "Force password resets for affected accounts",
        "Enable additional monitoring"
      ],
      "investigation": [
        "Review access logs",
        "Identify attack vectors",
        "Assess data exposure"
      ]
    }
  }
}
EOF

    # Create security monitoring rules
    cat > "$SECURITY_DIR/monitoring-rules.json" << 'EOF'
{
  "version": "1.0",
  "alertRules": {
    "authenticationFailures": {
      "threshold": 10,
      "timeWindow": "5m",
      "severity": "medium",
      "action": "alert"
    },
    "rateLimitExceeded": {
      "threshold": 5,
      "timeWindow": "1m",
      "severity": "low",
      "action": "log"
    },
    "suspiciousIpActivity": {
      "threshold": 20,
      "timeWindow": "10m",
      "severity": "high",
      "action": "block"
    },
    "dataAccessAnomalies": {
      "threshold": 100,
      "timeWindow": "1h",
      "severity": "medium",
      "action": "alert"
    },
    "encryptionFailures": {
      "threshold": 1,
      "timeWindow": "1m",
      "severity": "critical",
      "action": "immediate_alert"
    }
  }
}
EOF

    echo -e "${GREEN}✅ Security configuration directory created${NC}"
}

# Function to generate environment file
generate_env_file() {
    echo -e "${BLUE}🔑 Generating secure environment file...${NC}"
    
    if [ -f "$ENV_FILE" ]; then
        echo -e "${YELLOW}⚠️  $ENV_FILE already exists. Creating backup...${NC}"
        cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%s)"
    fi
    
    # Copy template and replace placeholders with generated keys
    cp "$ENV_TEMPLATE" "$ENV_FILE"
    
    # Generate secure keys
    echo -e "${BLUE}🔐 Generating encryption keys...${NC}"
    
    VOICE_KEY=$(generate_secure_key 32)
    FIELD_KEY=$(generate_secure_key 32)
    API_KEY=$(generate_secure_key 32)
    TOKEN_KEY=$(generate_secure_key 32)
    BACKUP_KEY=$(generate_secure_key 32)
    SESSION_KEY=$(generate_secure_key 32)
    JWT_KEY=$(generate_secure_key 32)
    
    # Replace placeholders in .env.local
    sed -i.bak \
        -e "s/GENERATE_SECURE_KEY_64_CHARS/$VOICE_KEY/g" \
        "$ENV_FILE" 2>/dev/null || \
    sed -i '' \
        -e "s/GENERATE_SECURE_KEY_64_CHARS/$VOICE_KEY/g" \
        "$ENV_FILE"
    
    # Replace each key individually
    sed -i.bak2 \
        -e "s/VOICE_ENCRYPTION_SECRET=$VOICE_KEY/VOICE_ENCRYPTION_SECRET=$VOICE_KEY/" \
        -e "s/FIELD_ENCRYPTION_SECRET=$VOICE_KEY/FIELD_ENCRYPTION_SECRET=$FIELD_KEY/" \
        -e "s/API_KEY_ENCRYPTION_SECRET=$VOICE_KEY/API_KEY_ENCRYPTION_SECRET=$API_KEY/" \
        -e "s/TOKEN_SECRET=$VOICE_KEY/TOKEN_SECRET=$TOKEN_KEY/" \
        -e "s/BACKUP_ENCRYPTION_KEY=$VOICE_KEY/BACKUP_ENCRYPTION_KEY=$BACKUP_KEY/" \
        -e "s/SESSION_SECRET=$VOICE_KEY/SESSION_SECRET=$SESSION_KEY/" \
        -e "s/JWT_SECRET=$VOICE_KEY/JWT_SECRET=$JWT_KEY/" \
        "$ENV_FILE" 2>/dev/null || \
    sed -i '' \
        -e "s/VOICE_ENCRYPTION_SECRET=$VOICE_KEY/VOICE_ENCRYPTION_SECRET=$VOICE_KEY/" \
        -e "s/FIELD_ENCRYPTION_SECRET=$VOICE_KEY/FIELD_ENCRYPTION_SECRET=$FIELD_KEY/" \
        -e "s/API_KEY_ENCRYPTION_SECRET=$VOICE_KEY/API_KEY_ENCRYPTION_SECRET=$API_KEY/" \
        -e "s/TOKEN_SECRET=$VOICE_KEY/TOKEN_SECRET=$TOKEN_KEY/" \
        -e "s/BACKUP_ENCRYPTION_KEY=$VOICE_KEY/BACKUP_ENCRYPTION_KEY=$BACKUP_KEY/" \
        -e "s/SESSION_SECRET=$VOICE_KEY/SESSION_SECRET=$SESSION_KEY/" \
        -e "s/JWT_SECRET=$VOICE_KEY/JWT_SECRET=$JWT_KEY/" \
        "$ENV_FILE"
    
    # Clean up backup files
    rm -f "$ENV_FILE.bak" "$ENV_FILE.bak2" 2>/dev/null || true
    
    echo -e "${GREEN}✅ Environment file generated with secure keys${NC}"
    echo -e "${YELLOW}⚠️  Remember to update API keys and Firebase configuration!${NC}"
}

# Function to validate existing environment
validate_environment() {
    echo -e "${BLUE}🔍 Validating environment configuration...${NC}"
    
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${RED}❌ $ENV_FILE not found${NC}"
        return 1
    fi
    
    local issues=0
    
    # Check for placeholder values
    if grep -q "your-" "$ENV_FILE" || grep -q "GENERATE_" "$ENV_FILE"; then
        echo -e "${RED}❌ Found placeholder values in $ENV_FILE${NC}"
        issues=$((issues + 1))
    fi
    
    # Check for minimum key lengths
    while IFS='=' read -r key value; do
        if [[ "$key" == *"SECRET"* ]] || [[ "$key" == *"KEY"* ]]; then
            if [[ ${#value} -lt 32 ]]; then
                echo -e "${RED}❌ $key is too short (${#value} chars, minimum 32)${NC}"
                issues=$((issues + 1))
            fi
        fi
    done < <(grep -E "(SECRET|KEY)=" "$ENV_FILE" | grep -v "^#")
    
    # Check for required Firebase variables
    local required_vars=(
        "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
        "FIREBASE_PROJECT_ID"
        "FIREBASE_CLIENT_EMAIL"
        "FIREBASE_ADMIN_PRIVATE_KEY"
    )
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "$var=" "$ENV_FILE" || grep -q "$var=your-" "$ENV_FILE"; then
            echo -e "${RED}❌ Missing or invalid $var${NC}"
            issues=$((issues + 1))
        fi
    done
    
    if [ $issues -eq 0 ]; then
        echo -e "${GREEN}✅ Environment validation passed${NC}"
        return 0
    else
        echo -e "${RED}❌ Environment validation failed with $issues issues${NC}"
        return 1
    fi
}

# Function to set secure file permissions
set_secure_permissions() {
    echo -e "${BLUE}🔒 Setting secure file permissions...${NC}"
    
    # Secure environment files
    if [ -f "$ENV_FILE" ]; then
        chmod 600 "$ENV_FILE"
        echo -e "${GREEN}✅ Secured $ENV_FILE (600)${NC}"
    fi
    
    # Secure security configuration directory
    if [ -d "$SECURITY_DIR" ]; then
        chmod 700 "$SECURITY_DIR"
        chmod 600 "$SECURITY_DIR"/*
        echo -e "${GREEN}✅ Secured $SECURITY_DIR (700/600)${NC}"
    fi
    
    # Secure Firebase rules files
    for rules_file in "firestore.rules" "storage.rules"; do
        if [ -f "$rules_file" ]; then
            chmod 644 "$rules_file"
            echo -e "${GREEN}✅ Secured $rules_file (644)${NC}"
        fi
    done
}

# Function to create security checklist
create_security_checklist() {
    echo -e "${BLUE}📋 Creating security checklist...${NC}"
    
    cat > "SECURITY_CHECKLIST.md" << 'EOF'
# Universal Assistant Security Checklist

## Environment Setup
- [ ] Environment variables configured with strong keys
- [ ] Firebase project configured with security rules
- [ ] API keys secured and rotated regularly
- [ ] File permissions set correctly (600 for .env files)

## Authentication & Authorization
- [ ] Firebase Authentication enabled
- [ ] Email verification required
- [ ] Multi-factor authentication configured (optional)
- [ ] Role-based access control implemented
- [ ] Session timeouts configured

## Data Protection
- [ ] Sensitive data encrypted at rest
- [ ] Data in transit protected with HTTPS
- [ ] Voice data encrypted with user-specific keys
- [ ] API keys encrypted in database
- [ ] Regular data backups configured

## Security Monitoring
- [ ] Audit logging enabled
- [ ] Rate limiting configured
- [ ] Suspicious activity detection active
- [ ] Security event alerting set up
- [ ] Regular security audits scheduled

## Infrastructure Security
- [ ] Firebase Security Rules deployed
- [ ] Content Security Policy configured
- [ ] Security headers implemented
- [ ] CORS properly configured
- [ ] Dependencies regularly updated

## Incident Response
- [ ] Incident response plan documented
- [ ] Contact information updated
- [ ] Escalation procedures defined
- [ ] Recovery procedures tested
- [ ] Communication plan prepared

## Compliance & Privacy
- [ ] Privacy policy updated
- [ ] Terms of service current
- [ ] Data retention policies enforced
- [ ] User consent mechanisms implemented
- [ ] Data deletion procedures available

## Regular Maintenance
- [ ] Security patches applied monthly
- [ ] API keys rotated quarterly
- [ ] Access reviews conducted quarterly
- [ ] Backup procedures tested monthly
- [ ] Penetration testing annually

## Production Deployment
- [ ] Environment variables secured in production
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery tested
- [ ] Performance monitoring enabled
- [ ] Error tracking configured
EOF

    echo -e "${GREEN}✅ Security checklist created${NC}"
}

# Function to display security recommendations
display_security_recommendations() {
    echo -e "\n${BLUE}🛡️  SECURITY RECOMMENDATIONS${NC}"
    echo "================================================"
    
    echo -e "${GREEN}✅ COMPLETED SETUP:${NC}"
    echo "   • Environment template created"
    echo "   • Secure encryption keys generated"
    echo "   • Security configuration files created"
    echo "   • File permissions secured"
    echo "   • Security checklist provided"
    
    echo -e "\n${YELLOW}⚠️  NEXT STEPS:${NC}"
    echo "   1. Update Firebase configuration in $ENV_FILE"
    echo "   2. Add your API keys (OpenAI, Anthropic, etc.)"
    echo "   3. Configure monitoring webhooks"
    echo "   4. Test backup and restore procedures"
    echo "   5. Review and customize security policies"
    echo "   6. Set up alerting for security events"
    echo "   7. Schedule regular security audits"
    
    echo -e "\n${RED}🚨 CRITICAL REMINDERS:${NC}"
    echo "   • Never commit .env.local to version control"
    echo "   • Rotate encryption keys regularly"
    echo "   • Monitor security logs daily"
    echo "   • Keep dependencies updated"
    echo "   • Test incident response procedures"
    
    echo -e "\n${BLUE}📚 ADDITIONAL RESOURCES:${NC}"
    echo "   • Security checklist: SECURITY_CHECKLIST.md"
    echo "   • Incident response: $SECURITY_DIR/incident-response.json"
    echo "   • Monitoring rules: $SECURITY_DIR/monitoring-rules.json"
    echo "   • Run security audit: npm run security:audit"
}

# Main execution
main() {
    echo -e "${BLUE}Starting security setup...${NC}\n"
    
    # Check prerequisites
    if ! command_exists openssl; then
        echo -e "${RED}❌ OpenSSL not found. Please install OpenSSL for key generation.${NC}"
        exit 1
    fi
    
    # Parse command line arguments
    case "${1:-}" in
        "validate")
            validate_environment
            exit $?
            ;;
        "generate-keys")
            generate_env_file
            set_secure_permissions
            ;;
        "setup-all")
            create_env_template
            create_env_example
            setup_security_directory
            generate_env_file
            set_secure_permissions
            create_security_checklist
            display_security_recommendations
            ;;
        *)
            # Default: full setup
            create_env_template
            create_env_example
            setup_security_directory
            
            # Ask user if they want to generate keys
            echo -e "${YELLOW}Do you want to generate a new .env.local file with secure keys? (y/N)${NC}"
            read -r response
            if [[ "$response" =~ ^[Yy]$ ]]; then
                generate_env_file
            fi
            
            set_secure_permissions
            create_security_checklist
            display_security_recommendations
            ;;
    esac
    
    echo -e "\n${GREEN}🎉 Security setup completed!${NC}"
}

# Run main function
main "$@"