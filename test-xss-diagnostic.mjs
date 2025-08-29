#!/usr/bin/env node

/**
 * Diagnostic test to understand XSS test failures
 */

import {
  sanitizeUrl,
  sanitizeUserInput,
  escapeHtml,
  createSafeDisplayName,
  isEnhancedSanitizationEnabled
} from './src/utils/sanitization.ts';

import {
  sanitizeHTML,
  sanitizeAPIParameter
} from './src/utils/security/inputSanitization.ts';

console.log('=== XSS DIAGNOSTIC TEST ===\n');

// Check if enhanced sanitization is enabled
console.log('Enhanced Sanitization Enabled:', isEnhancedSanitizationEnabled());
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('ENABLE_ENHANCED_SANITIZATION:', process.env.ENABLE_ENHANCED_SANITIZATION);
console.log('USE_LEGACY_SANITIZATION:', process.env.USE_LEGACY_SANITIZATION);
console.log('');

// Test the specific failures from comprehensive test
const tests = [
  {
    name: 'Escapes < and >',
    fn: () => escapeHtml('<div>test</div>'),
    expected: '&lt;div&gt;test&lt;/div&gt;',
    actual: null
  },
  {
    name: 'Removes script tags (sanitizeHTML)',
    fn: () => sanitizeHTML('<script>alert(1)</script>Hello'),
    expected: 'Hello',
    actual: null
  },
  {
    name: 'Removes event handlers (createSafeDisplayName)',
    fn: () => createSafeDisplayName('John" onclick="alert(1)'),
    expected: '',
    actual: null
  },
  {
    name: 'API Parameter - Removes HTML',
    fn: () => sanitizeAPIParameter('<script>value</script>'),
    expected: 'value',
    actual: null
  },
  {
    name: 'Nested script tags',
    fn: () => sanitizeHTML('<scr<script>ipt>alert(1)</scr</script>ipt>'),
    expected: 'iptalert(1)ipt',
    actual: null
  },
  {
    name: 'Comment injection',
    fn: () => sanitizeHTML('<!--<script>alert(1)</script>-->'),
    expected: '<!---->',
    actual: null
  }
];

// Run each test and show detailed output
tests.forEach(test => {
  test.actual = test.fn();
  const passed = test.actual === test.expected;
  
  console.log(`Test: ${test.name}`);
  console.log(`  Expected: "${test.expected}"`);
  console.log(`  Actual:   "${test.actual}"`);
  console.log(`  Status:   ${passed ? '✅ PASS' : '❌ FAIL'}`);
  
  if (!passed) {
    // Show character codes for debugging
    console.log('  Expected chars:', [...test.expected].map(c => `${c}(${c.charCodeAt(0)})`).join(' '));
    console.log('  Actual chars:  ', [...test.actual].map(c => `${c}(${c.charCodeAt(0)})`).join(' '));
  }
  console.log('');
});

// Test with different options
console.log('=== Testing sanitizeUserInput with different options ===\n');

const scriptInput = '<script>alert(1)</script>Hello';

console.log('Input:', scriptInput);
console.log('With allowBasicFormatting=false:', sanitizeUserInput(scriptInput, { allowBasicFormatting: false }));
console.log('With allowBasicFormatting=true:', sanitizeUserInput(scriptInput, { allowBasicFormatting: true }));
console.log('Default (no options):', sanitizeUserInput(scriptInput));

// Test the underlying functions
console.log('\n=== Testing underlying sanitization functions ===\n');

const htmlInput = '<div onclick="alert(1)">test</div>';
console.log('Input:', htmlInput);
console.log('escapeHtml:', escapeHtml(htmlInput));
console.log('sanitizeUserInput (no formatting):', sanitizeUserInput(htmlInput, { allowBasicFormatting: false }));
console.log('sanitizeUserInput (with formatting):', sanitizeUserInput(htmlInput, { allowBasicFormatting: true }));
console.log('sanitizeHTML:', sanitizeHTML(htmlInput));