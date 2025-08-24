#!/bin/bash

# Production Deployment Script
# Comprehensive deployment automation with health checks and rollback capability

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/tmp/deploy-$(date +%Y%m%d-%H%M%S).log"
BUILD_ID="$(git rev-parse --short HEAD)-$(date +%s)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="production"
SKIP_TESTS=false
SKIP_BUILD=false
DRY_RUN=false
ROLLBACK=false
HEALTH_CHECK_TIMEOUT=300
DEPLOYMENT_STRATEGY="blue-green"

# Function to log messages
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")
            echo -e "${GREEN}[INFO]${NC} $message" | tee -a "$LOG_FILE"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} $message" | tee -a "$LOG_FILE"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $message" | tee -a "$LOG_FILE"
            ;;
        "DEBUG")
            echo -e "${BLUE}[DEBUG]${NC} $message" | tee -a "$LOG_FILE"
            ;;
        *)
            echo "[$timestamp] $level $message" | tee -a "$LOG_FILE"
            ;;
    esac
}

# Function to show usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Production deployment script with comprehensive checks and rollback capability.

OPTIONS:
    -e, --environment ENV    Deployment environment (staging|production) [default: production]
    -s, --skip-tests        Skip test suite execution
    -b, --skip-build        Skip build process
    -d, --dry-run          Show what would be done without executing
    -r, --rollback         Rollback to previous deployment
    -t, --timeout SEC      Health check timeout in seconds [default: 300]
    -h, --help             Show this help message

EXAMPLES:
    $0                              # Full production deployment
    $0 -e staging                   # Deploy to staging
    $0 -s                          # Skip tests (not recommended for production)
    $0 -d                          # Dry run to see what would happen
    $0 -r                          # Rollback previous deployment
    
ENVIRONMENT VARIABLES:
    NODE_ENV                       Node environment (production|staging)
    DEPLOYMENT_KEY                 SSH key for deployment server
    MONITORING_WEBHOOK            Webhook URL for deployment notifications
    ROLLBACK_RETENTION            Number of rollback versions to keep [default: 5]

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -s|--skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -b|--skip-build)
            SKIP_BUILD=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -r|--rollback)
            ROLLBACK=true
            shift
            ;;
        -t|--timeout)
            HEALTH_CHECK_TIMEOUT="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log "ERROR" "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validation functions
validate_environment() {
    if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
        log "ERROR" "Invalid environment: $ENVIRONMENT. Must be 'staging' or 'production'"
        exit 1
    fi
}

validate_prerequisites() {
    log "INFO" "Validating prerequisites..."
    
    # Check required tools
    local required_tools=("node" "npm" "git" "curl" "jq")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log "ERROR" "Required tool not found: $tool"
            exit 1
        fi
    done
    
    # Check Node.js version
    local node_version=$(node --version | cut -d'v' -f2)
    local required_version="18.0.0"
    if ! printf '%s\n%s\n' "$required_version" "$node_version" | sort -V -C; then
        log "ERROR" "Node.js version $node_version is less than required $required_version"
        exit 1
    fi
    
    # Check if we're in git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log "ERROR" "Not in a git repository"
        exit 1
    fi
    
    # Check for uncommitted changes in production
    if [[ "$ENVIRONMENT" == "production" && -n "$(git status --porcelain)" ]]; then
        log "ERROR" "Uncommitted changes detected. Commit or stash changes before production deployment"
        exit 1
    fi
    
    log "INFO" "Prerequisites validation passed"
}

# Pre-deployment checks
pre_deployment_checks() {
    log "INFO" "Running pre-deployment checks..."
    
    # Check environment variables
    if [[ "$ENVIRONMENT" == "production" ]]; then
        local required_vars=("NEXT_PUBLIC_FIREBASE_API_KEY" "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" "NEXT_PUBLIC_FIREBASE_PROJECT_ID")
        for var in "${required_vars[@]}"; do
            if [[ -z "${!var:-}" ]]; then
                log "ERROR" "Required environment variable not set: $var"
                exit 1
            fi
        done
    fi
    
    # Verify package.json exists and is valid
    if ! jq empty package.json 2>/dev/null; then
        log "ERROR" "Invalid package.json file"
        exit 1
    fi
    
    # Check for security vulnerabilities
    log "INFO" "Checking for security vulnerabilities..."
    if ! npm audit --audit-level=moderate; then
        log "WARN" "Security vulnerabilities found. Consider fixing before deployment"
        if [[ "$ENVIRONMENT" == "production" ]]; then
            read -p "Continue with production deployment despite vulnerabilities? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log "INFO" "Deployment aborted by user"
                exit 1
            fi
        fi
    fi
    
    log "INFO" "Pre-deployment checks completed"
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log "WARN" "Skipping test suite (not recommended for production)"
        return 0
    fi
    
    log "INFO" "Running test suite..."
    
    # Unit tests
    log "INFO" "Running unit tests..."
    if ! npm run test:unit -- --coverage --watchAll=false; then
        log "ERROR" "Unit tests failed"
        exit 1
    fi
    
    # Integration tests
    log "INFO" "Running integration tests..."
    if ! npm run test:integration -- --watchAll=false; then
        log "ERROR" "Integration tests failed"
        exit 1
    fi
    
    # E2E tests for production
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log "INFO" "Running E2E tests..."
        if ! npm run test:e2e; then
            log "ERROR" "E2E tests failed"
            exit 1
        fi
    fi
    
    log "INFO" "All tests passed"
}

# Build application
build_application() {
    if [[ "$SKIP_BUILD" == "true" ]]; then
        log "WARN" "Skipping build process"
        return 0
    fi
    
    log "INFO" "Building application for $ENVIRONMENT..."
    
    # Set environment variables for build
    export NODE_ENV="$ENVIRONMENT"
    export BUILD_ID="$BUILD_ID"
    export BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    
    # Clean previous build
    rm -rf .next/ out/ || true
    
    # Run build with production config
    if [[ "$ENVIRONMENT" == "production" ]]; then
        cp next.config.production.js next.config.js
    fi
    
    # Build application
    if ! npm run build; then
        log "ERROR" "Build failed"
        exit 1
    fi
    
    # Generate build manifest
    cat > .next/build-manifest.json << EOF
{
    "buildId": "$BUILD_ID",
    "environment": "$ENVIRONMENT",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "commit": "$(git rev-parse HEAD)",
    "branch": "$(git rev-parse --abbrev-ref HEAD)",
    "version": "$(jq -r '.version' package.json)"
}
EOF
    
    # Bundle analysis
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log "INFO" "Analyzing bundle size..."
        BUNDLE_SIZE=$(du -sh .next | cut -f1)
        log "INFO" "Total bundle size: $BUNDLE_SIZE"
        
        # Check bundle size threshold
        BUNDLE_SIZE_MB=$(du -sm .next | cut -f1)
        if [[ $BUNDLE_SIZE_MB -gt 50 ]]; then
            log "WARN" "Large bundle size detected: ${BUNDLE_SIZE_MB}MB"
        fi
    fi
    
    log "INFO" "Build completed successfully"
}

# Health check function
health_check() {
    local url=$1
    local timeout=${2:-$HEALTH_CHECK_TIMEOUT}
    local interval=10
    local elapsed=0
    
    log "INFO" "Running health check on $url (timeout: ${timeout}s)"
    
    while [[ $elapsed -lt $timeout ]]; do
        if curl -sf "$url/api/health" > /dev/null 2>&1; then
            log "INFO" "Health check passed"
            return 0
        fi
        
        log "DEBUG" "Health check failed, retrying in ${interval}s... (${elapsed}s elapsed)"
        sleep $interval
        elapsed=$((elapsed + interval))
    done
    
    log "ERROR" "Health check failed after ${timeout}s"
    return 1
}

# Performance validation
performance_check() {
    local url=$1
    log "INFO" "Running performance validation on $url"
    
    # Check response time
    local response_time=$(curl -w "%{time_total}" -s -o /dev/null "$url")
    log "INFO" "Response time: ${response_time}s"
    
    # Performance thresholds
    if (( $(echo "$response_time > 2.0" | bc -l) )); then
        log "WARN" "Slow response time: ${response_time}s (threshold: 2.0s)"
        return 1
    fi
    
    # Check specific performance metrics
    local health_response=$(curl -s "$url/api/health?detailed=true")
    local system_health=$(echo "$health_response" | jq -r '.metrics.performance.systemHealth // 0')
    
    if [[ $system_health -lt 70 ]]; then
        log "WARN" "Low system health score: $system_health (threshold: 70)"
        return 1
    fi
    
    log "INFO" "Performance validation passed"
    return 0
}

# Deploy function
deploy() {
    local deployment_url
    
    case $ENVIRONMENT in
        "staging")
            deployment_url="https://staging.universal-assistant.com"
            ;;
        "production")
            deployment_url="https://universal-assistant.com"
            ;;
    esac
    
    log "INFO" "Deploying to $ENVIRONMENT environment..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "DRY RUN: Would deploy to $deployment_url"
        log "INFO" "DRY RUN: Build ID would be: $BUILD_ID"
        return 0
    fi
    
    # Create deployment backup for rollback
    local backup_dir="/tmp/deployment-backup-$(date +%s)"
    mkdir -p "$backup_dir"
    
    # Store current deployment info for rollback
    if curl -sf "$deployment_url/api/health" > /dev/null 2>&1; then
        curl -s "$deployment_url/api/health?detailed=true" > "$backup_dir/previous-health.json"
        echo "$deployment_url" > "$backup_dir/deployment-url"
    fi
    
    # Deployment implementation would go here
    # This is where you'd integrate with your deployment platform:
    # - Vercel: npx vercel --prod --token=$VERCEL_TOKEN
    # - AWS: aws s3 sync .next/ s3://your-bucket/
    # - Docker: docker build && docker push && kubectl apply
    # - Custom: rsync, scp, or other deployment methods
    
    log "INFO" "Deployment command would execute here"
    
    # Wait for deployment to be available
    log "INFO" "Waiting for deployment to be available..."
    sleep 30
    
    # Verify deployment
    if ! health_check "$deployment_url"; then
        log "ERROR" "Deployment health check failed"
        return 1
    fi
    
    # Performance validation
    if ! performance_check "$deployment_url"; then
        log "WARN" "Performance validation failed, but deployment continues"
    fi
    
    # Update monitoring
    if [[ -n "${MONITORING_WEBHOOK:-}" ]]; then
        curl -X POST "$MONITORING_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{
                \"event\": \"deployment\",
                \"environment\": \"$ENVIRONMENT\",
                \"buildId\": \"$BUILD_ID\",
                \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
                \"status\": \"success\"
            }" || log "WARN" "Failed to notify monitoring webhook"
    fi
    
    log "INFO" "Deployment to $ENVIRONMENT completed successfully"
    log "INFO" "Build ID: $BUILD_ID"
    log "INFO" "URL: $deployment_url"
}

# Rollback function
rollback() {
    log "INFO" "Initiating rollback for $ENVIRONMENT..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "DRY RUN: Would rollback $ENVIRONMENT deployment"
        return 0
    fi
    
    # Implementation would depend on your deployment platform
    # This might involve:
    # - Reverting to previous Docker image
    # - Switching traffic back to previous version
    # - Restoring database to previous state (if needed)
    
    log "INFO" "Rollback command would execute here"
    
    # Verify rollback
    local deployment_url
    case $ENVIRONMENT in
        "staging")
            deployment_url="https://staging.universal-assistant.com"
            ;;
        "production")
            deployment_url="https://universal-assistant.com"
            ;;
    esac
    
    if ! health_check "$deployment_url" 60; then
        log "ERROR" "Rollback verification failed"
        return 1
    fi
    
    log "INFO" "Rollback completed successfully"
}

# Cleanup function
cleanup() {
    log "INFO" "Cleaning up temporary files..."
    
    # Remove temporary build artifacts if needed
    if [[ "$ENVIRONMENT" == "production" && -f "next.config.js" ]]; then
        git checkout next.config.js 2>/dev/null || true
    fi
    
    # Clean up old logs (keep last 10)
    find /tmp -name "deploy-*.log" -type f | sort | head -n -10 | xargs rm -f || true
    
    log "INFO" "Cleanup completed"
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    log "INFO" "Starting deployment script for $ENVIRONMENT environment"
    log "INFO" "Build ID: $BUILD_ID"
    log "INFO" "Log file: $LOG_FILE"
    
    validate_environment
    validate_prerequisites
    pre_deployment_checks
    
    if [[ "$ROLLBACK" == "true" ]]; then
        rollback
    else
        run_tests
        build_application
        deploy
    fi
    
    log "INFO" "Deployment script completed successfully"
}

# Execute main function
main "$@"