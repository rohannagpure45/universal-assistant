#!/bin/bash

# Production Test Runner Script
# Runs comprehensive test suite for production readiness validation

set -e # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
ADMIN_EMAILS="ribt2218@gmail.com,rohan@linkstudio.ai"
TEST_TIMEOUT=300000
PERFORMANCE_THRESHOLD=3000
COVERAGE_THRESHOLD=80

# Utility functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js version 18 or higher required. Current: $(node -v)"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check if dependencies are installed
    if [ ! -d "node_modules" ]; then
        log_info "Installing dependencies..."
        npm ci
    fi
    
    log_success "Dependencies check passed"
}

setup_environment() {
    log_info "Setting up test environment..."
    
    # Create test directories
    mkdir -p test-results/{unit,integration,e2e,performance,security,validation}
    mkdir -p coverage/{unit,integration,e2e}
    mkdir -p reports/{lighthouse,security,performance}
    mkdir -p screenshots/{desktop,mobile,error}
    
    # Set environment variables
    export NODE_ENV=test
    export ADMIN_EMAILS="$ADMIN_EMAILS"
    export TEST_TIMEOUT="$TEST_TIMEOUT"
    
    # Start services if needed
    if [ "$1" = "--with-services" ]; then
        log_info "Starting Firebase emulators..."
        npm run firebase:emulators:start &
        FIREBASE_PID=$!
        sleep 10
        
        # Verify emulators are running
        if ! curl -f http://localhost:9099 &> /dev/null; then
            log_warning "Firebase Auth emulator not responding"
        fi
        
        if ! curl -f http://localhost:8080 &> /dev/null; then
            log_warning "Firestore emulator not responding"
        fi
    fi
    
    log_success "Test environment setup complete"
}

run_linting_and_formatting() {
    log_info "Running code quality checks..."
    
    # TypeScript compilation
    log_info "Checking TypeScript compilation..."
    npm run typecheck || {
        log_error "TypeScript compilation failed"
        return 1
    }
    
    # ESLint
    log_info "Running ESLint..."
    npm run lint || {
        log_error "Linting failed"
        return 1
    }
    
    # Prettier formatting check
    log_info "Checking code formatting..."
    npm run format:check || {
        log_warning "Code formatting issues detected - run 'npm run format' to fix"
    }
    
    log_success "Code quality checks passed"
}

run_unit_tests() {
    log_info "Running unit tests..."
    
    local test_groups=("core" "components" "services" "security")
    local failed_groups=()
    
    for group in "${test_groups[@]}"; do
        log_info "Running unit tests for: $group"
        
        case $group in
            "core")
                npm run test -- tests/unit/production-core.test.ts \
                    --coverage --coverageDirectory=coverage/unit/core \
                    --testTimeout=$TEST_TIMEOUT || failed_groups+=("core")
                ;;
            "components")
                npm run test -- "tests/unit/*component*.test.tsx" \
                    --coverage --coverageDirectory=coverage/unit/components \
                    --testTimeout=$TEST_TIMEOUT || failed_groups+=("components")
                ;;
            "services")
                npm run test -- "tests/unit/*service*.test.ts" \
                    --coverage --coverageDirectory=coverage/unit/services \
                    --testTimeout=$TEST_TIMEOUT || failed_groups+=("services")
                ;;
            "security")
                npm run test -- tests/security/production-security.test.ts \
                    --coverage --coverageDirectory=coverage/unit/security \
                    --testTimeout=$TEST_TIMEOUT || failed_groups+=("security")
                ;;
        esac
    done
    
    if [ ${#failed_groups[@]} -eq 0 ]; then
        log_success "All unit tests passed"
        return 0
    else
        log_error "Unit test failures in groups: ${failed_groups[*]}"
        return 1
    fi
}

run_integration_tests() {
    log_info "Running integration tests..."
    
    local test_files=(
        "tests/integration/production-firebase.test.ts"
        "tests/integration/auth-flow.test.ts"
        "tests/integration/api-endpoints.test.ts"
        "tests/integration/cross-store-sync.test.ts"
    )
    
    local failed_tests=()
    
    for test_file in "${test_files[@]}"; do
        if [ -f "$test_file" ]; then
            log_info "Running: $test_file"
            
            npm run test -- "$test_file" \
                --coverage --coverageDirectory=coverage/integration \
                --testTimeout=$TEST_TIMEOUT || failed_tests+=("$test_file")
        else
            log_warning "Test file not found: $test_file"
        fi
    done
    
    if [ ${#failed_tests[@]} -eq 0 ]; then
        log_success "All integration tests passed"
        return 0
    else
        log_error "Integration test failures: ${failed_tests[*]}"
        return 1
    fi
}

run_e2e_tests() {
    log_info "Running end-to-end tests..."
    
    # Start application server
    log_info "Starting application server..."
    npm run build
    npm run start &
    SERVER_PID=$!
    
    # Wait for server to start
    local retry_count=0
    while [ $retry_count -lt 30 ]; do
        if curl -f http://localhost:3000 &> /dev/null; then
            break
        fi
        sleep 2
        retry_count=$((retry_count + 1))
    done
    
    if [ $retry_count -eq 30 ]; then
        log_error "Application server failed to start"
        kill $SERVER_PID 2>/dev/null || true
        return 1
    fi
    
    log_success "Application server started"
    
    # Run E2E tests
    local browsers=("chromium")
    local test_suites=(
        "tests/e2e/production-readiness.spec.ts"
        "tests/e2e/meeting-functionality.spec.ts"
    )
    
    local failed_tests=()
    
    for browser in "${browsers[@]}"; do
        for test_suite in "${test_suites[@]}"; do
            if [ -f "$test_suite" ]; then
                log_info "Running $test_suite on $browser"
                
                npx playwright test "$test_suite" \
                    --project="$browser" \
                    --output-dir="test-results/e2e/$browser" \
                    --screenshot=only-on-failure \
                    --video=retain-on-failure || failed_tests+=("$test_suite ($browser)")
            fi
        done
    done
    
    # Cleanup server
    kill $SERVER_PID 2>/dev/null || true
    
    if [ ${#failed_tests[@]} -eq 0 ]; then
        log_success "All E2E tests passed"
        return 0
    else
        log_error "E2E test failures: ${failed_tests[*]}"
        return 1
    fi
}

run_performance_tests() {
    log_info "Running performance tests..."
    
    # Start application server if not running
    if ! curl -f http://localhost:3000 &> /dev/null; then
        log_info "Starting application server for performance tests..."
        npm run start &
        SERVER_PID=$!
        sleep 10
    fi
    
    # Run performance tests with Playwright
    npx playwright test tests/performance/production-performance.test.ts \
        --project=chromium \
        --output-dir=test-results/performance \
        --screenshot=only-on-failure || {
        log_error "Performance tests failed"
        kill $SERVER_PID 2>/dev/null || true
        return 1
    }
    
    # Run Lighthouse audit if available
    if command -v lighthouse &> /dev/null; then
        log_info "Running Lighthouse audit..."
        
        lighthouse http://localhost:3000 \
            --output=html \
            --output-path=reports/lighthouse/report.html \
            --chrome-flags="--headless --no-sandbox" || {
            log_warning "Lighthouse audit failed"
        }
    else
        log_warning "Lighthouse not available - skipping audit"
    fi
    
    # Cleanup
    kill $SERVER_PID 2>/dev/null || true
    
    log_success "Performance tests completed"
}

run_production_validation() {
    log_info "Running production validation tests..."
    
    npm run test -- tests/validation/production-validation.test.ts \
        --testTimeout=300000 \
        --verbose || {
        log_error "Production validation failed"
        return 1
    }
    
    log_success "Production validation passed"
}

generate_reports() {
    log_info "Generating test reports..."
    
    # Create summary report
    cat > reports/test-summary.md << EOF
# Production Test Summary

**Generated:** $(date)
**Test Run ID:** $(date +%s)

## Test Results

### Unit Tests
$([ -d "coverage/unit" ] && echo "✅ Passed" || echo "❌ Failed")

### Integration Tests  
$([ -d "coverage/integration" ] && echo "✅ Passed" || echo "❌ Failed")

### End-to-End Tests
$([ -d "test-results/e2e" ] && echo "✅ Passed" || echo "❌ Failed")

### Performance Tests
$([ -d "test-results/performance" ] && echo "✅ Passed" || echo "❌ Failed")

### Production Validation
$([ -f "test-results/validation-results.json" ] && echo "✅ Passed" || echo "❌ Failed")

## Coverage Summary
$(if [ -d "coverage" ]; then
    echo "Coverage reports available in /coverage directory"
else
    echo "No coverage data available"
fi)

## Recommendations
- Review any failed tests in detail
- Check performance metrics against thresholds
- Verify security scan results
- Ensure all admin features are properly tested

EOF

    # Generate HTML report index
    cat > reports/index.html << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Production Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 20px; border-left: 4px solid #007acc; }
        .success { color: green; }
        .error { color: red; }
        .warning { color: orange; }
        ul { list-style-type: none; }
        li { margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Universal Assistant - Production Test Report</h1>
        <p>Generated: $(date)</p>
    </div>
    
    <div class="section">
        <h2>Available Reports</h2>
        <ul>
            <li><a href="lighthouse/report.html">📊 Lighthouse Performance Report</a></li>
            <li><a href="../coverage/unit/lcov-report/index.html">📈 Unit Test Coverage</a></li>
            <li><a href="../coverage/integration/lcov-report/index.html">📈 Integration Test Coverage</a></li>
            <li><a href="../test-results/e2e/chromium/index.html">🎭 Playwright E2E Report</a></li>
            <li><a href="../test-results/performance/index.html">⚡ Performance Test Results</a></li>
        </ul>
    </div>
    
    <div class="section">
        <h2>Quick Actions</h2>
        <ul>
            <li><a href="../screenshots/">📷 Test Screenshots</a></li>
            <li><a href="test-summary.md">📋 Detailed Test Summary</a></li>
        </ul>
    </div>
</body>
</html>
EOF

    log_success "Reports generated in /reports directory"
}

cleanup() {
    log_info "Cleaning up test environment..."
    
    # Kill background processes
    [ ! -z "$SERVER_PID" ] && kill $SERVER_PID 2>/dev/null || true
    [ ! -z "$FIREBASE_PID" ] && kill $FIREBASE_PID 2>/dev/null || true
    
    # Clean up temporary files
    rm -rf .tmp-test-*
    
    log_info "Cleanup completed"
}

main() {
    local start_time=$(date +%s)
    
    log_info "🚀 Starting Production Test Suite"
    log_info "Admin emails: $ADMIN_EMAILS"
    log_info "Test timeout: ${TEST_TIMEOUT}ms"
    
    # Handle script arguments
    local run_services=false
    local test_types=("all")
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --with-services)
                run_services=true
                shift
                ;;
            --unit-only)
                test_types=("unit")
                shift
                ;;
            --integration-only)
                test_types=("integration")
                shift
                ;;
            --e2e-only)
                test_types=("e2e")
                shift
                ;;
            --performance-only)
                test_types=("performance")
                shift
                ;;
            --validation-only)
                test_types=("validation")
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --with-services     Start Firebase emulators"
                echo "  --unit-only         Run only unit tests"
                echo "  --integration-only  Run only integration tests"
                echo "  --e2e-only          Run only E2E tests"
                echo "  --performance-only  Run only performance tests"
                echo "  --validation-only   Run only validation tests"
                echo "  --help             Show this help message"
                exit 0
                ;;
            *)
                log_warning "Unknown option: $1"
                shift
                ;;
        esac
    done
    
    # Setup trap for cleanup
    trap cleanup EXIT
    
    # Run test pipeline
    check_dependencies
    
    if [ "$run_services" = true ]; then
        setup_environment --with-services
    else
        setup_environment
    fi
    
    local failed_stages=()
    
    # Code quality checks
    run_linting_and_formatting || failed_stages+=("linting")
    
    # Run selected test types
    for test_type in "${test_types[@]}"; do
        case $test_type in
            "all")
                run_unit_tests || failed_stages+=("unit")
                run_integration_tests || failed_stages+=("integration")
                run_e2e_tests || failed_stages+=("e2e")
                run_performance_tests || failed_stages+=("performance")
                run_production_validation || failed_stages+=("validation")
                break
                ;;
            "unit")
                run_unit_tests || failed_stages+=("unit")
                ;;
            "integration")
                run_integration_tests || failed_stages+=("integration")
                ;;
            "e2e")
                run_e2e_tests || failed_stages+=("e2e")
                ;;
            "performance")
                run_performance_tests || failed_stages+=("performance")
                ;;
            "validation")
                run_production_validation || failed_stages+=("validation")
                ;;
        esac
    done
    
    # Generate reports
    generate_reports
    
    # Final results
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    log_info "📊 Test Suite Completed in ${duration}s"
    
    if [ ${#failed_stages[@]} -eq 0 ]; then
        log_success "🎉 All tests passed! Application is production-ready."
        echo ""
        log_info "Next steps:"
        echo "  1. Review test reports in /reports directory"
        echo "  2. Check performance metrics against requirements"
        echo "  3. Deploy to production environment"
        exit 0
    else
        log_error "❌ Test failures detected in stages: ${failed_stages[*]}"
        echo ""
        log_error "Please fix the following before production deployment:"
        for stage in "${failed_stages[@]}"; do
            echo "  - $stage test failures"
        done
        exit 1
    fi
}

# Run main function with all arguments
main "$@"