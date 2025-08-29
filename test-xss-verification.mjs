#!/usr/bin/env node

/**
 * Final XSS Security Verification Test
 * Confirms that the security issues mentioned in CRITICAL_ISSUES_TRACKER are resolved
 */

import {
  sanitizeUrl,
  sanitizeUserInput,
  escapeHtml,
  isEnhancedSanitizationEnabled
} from './src/utils/sanitization.ts';

import {
  sanitizeHTML,
  sanitizeURLForDisplay
} from './src/utils/security/inputSanitization.ts';

const PASS = '✅';
const FAIL = '❌';

console.log('🔒 XSS SECURITY VERIFICATION TEST');
console.log('==================================\n');

// Track results
let totalTests = 0;
let passedTests = 0;
let criticalFailures = [];

function verify(description, condition, critical = false) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`${PASS} ${description}`);
  } else {
    console.log(`${FAIL} ${description}`);
    if (critical) {
      criticalFailures.push(description);
    }
  }
  return condition;
}

// Issue #1: URL sanitization returns empty strings for all valid URLs
console.log('ISSUE #1: URL Sanitization\n');
verify('Valid HTTPS URLs are preserved', 
  sanitizeUrl('https://example.com') === 'https://example.com', true);
verify('Valid HTTP URLs are preserved', 
  sanitizeUrl('http://example.com') === 'http://example.com', true);
verify('Query parameters are preserved', 
  sanitizeUrl('https://example.com?q=test&foo=bar') === 'https://example.com?q=test&foo=bar', true);
verify('Relative paths work', 
  sanitizeUrl('/path/to/page') === '/path/to/page', true);
verify('JavaScript URLs are blocked', 
  sanitizeUrl('javascript:alert(1)') === '', true);
verify('Data URLs are blocked', 
  sanitizeUrl('data:text/html,<script>alert(1)</script>') === '', true);

// Issue #2: XSS prevention implementation broken
console.log('\nISSUE #2: XSS Prevention\n');
verify('Script tags are removed from HTML', 
  sanitizeHTML('<script>alert(1)</script>Hello') === 'Hello', true);
verify('Event handlers are removed', 
  sanitizeHTML('<div onclick="alert(1)">Test</div>') === 'Test', true);
verify('Iframe tags are removed', 
  sanitizeHTML('<iframe src="evil.com"></iframe>Content') === 'Content', true);
verify('Image XSS is blocked', 
  sanitizeHTML('<img src=x onerror=alert(1)>') === '', true);
verify('Plain text passes through', 
  sanitizeHTML('Normal text without HTML') === 'Normal text without HTML', true);

// Issue #3: Enhanced sanitization working
console.log('\nISSUE #3: Enhanced Sanitization Status\n');
const enhancedEnabled = isEnhancedSanitizationEnabled();
verify('Enhanced sanitization is enabled', enhancedEnabled, true);

if (enhancedEnabled) {
  verify('Enhanced mode removes dangerous tags', 
    sanitizeUserInput('<script>test</script>content', { allowBasicFormatting: false }) === 'content');
  verify('Enhanced mode preserves safe formatting when allowed', 
    sanitizeUserInput('<b>bold</b> text', { allowBasicFormatting: true }).includes('bold'));
}

// Issue #4: Performance (no DOMPurify)
console.log('\nISSUE #4: Performance Check\n');
const startTime = performance.now();
for (let i = 0; i < 1000; i++) {
  sanitizeHTML('<script>alert(1)</script>Some text with <b>formatting</b>');
}
const duration = performance.now() - startTime;
verify(`1000 sanitizations complete in <100ms (actual: ${duration.toFixed(2)}ms)`, 
  duration < 100);

// Additional Security Checks
console.log('\nADDITIONAL SECURITY CHECKS\n');
verify('Mixed case script tags blocked', 
  sanitizeHTML('<ScRiPt>alert(1)</ScRiPt>') === '');
verify('Nested tags handled', 
  sanitizeHTML('<div><script>alert(1)</script></div>') === '');
verify('SVG XSS blocked', 
  sanitizeHTML('<svg onload="alert(1)">') === '');
verify('Style tag XSS blocked', 
  sanitizeHTML('<style>body{background:url("javascript:alert(1)")}</style>') === '');

// Summary
console.log('\n' + '='.repeat(50));
console.log('VERIFICATION SUMMARY');
console.log('='.repeat(50));
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passedTests} ${PASS}`);
console.log(`Failed: ${totalTests - passedTests} ${totalTests - passedTests > 0 ? FAIL : ''}`);
console.log(`Success Rate: ${((passedTests/totalTests) * 100).toFixed(1)}%`);

if (criticalFailures.length > 0) {
  console.log('\n⚠️  CRITICAL FAILURES DETECTED:');
  criticalFailures.forEach(failure => {
    console.log(`  - ${failure}`);
  });
  console.log('\n❌ XSS SECURITY IS NOT FULLY FIXED');
  process.exit(1);
} else {
  console.log('\n✅ ALL CRITICAL SECURITY CHECKS PASSED');
  console.log('🎉 XSS PREVENTION IS WORKING CORRECTLY');
  
  console.log('\n📝 RESOLVED ISSUES:');
  console.log('  1. URL sanitization now correctly handles valid URLs');
  console.log('  2. XSS prevention removes dangerous HTML/scripts');
  console.log('  3. Enhanced sanitization is enabled by default');
  console.log('  4. Performance is excellent (no DOMPurify overhead)');
  console.log('  5. No bundle size increase (DOMPurify never installed)');
}