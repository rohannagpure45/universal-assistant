#!/usr/bin/env node

/**
 * Comprehensive XSS Prevention Test Suite
 * Tests all sanitization functions to ensure XSS protection is working
 */

import {
  sanitizeUrl,
  isValidUrl,
  sanitizeUserInput,
  escapeHtml,
  sanitizeEmail,
  sanitizeFileName,
  createSafeDisplayName,
  sanitizeTranscript,
  sanitizeMeetingNotes,
  needsSanitization
} from './src/utils/sanitization.ts';

import {
  sanitizeHTML,
  sanitizeHTMLPreserveFormatting,
  sanitizeUserContent,
  sanitizeURLForDisplay,
  sanitizeEmailAddress,
  sanitizeSearchQuery,
  sanitizeAPIParameter
} from './src/utils/security/inputSanitization.ts';

const PASS = '✅';
const FAIL = '❌';
const INFO = 'ℹ️';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(description, actual, expected) {
  totalTests++;
  const passed = actual === expected;
  if (passed) {
    passedTests++;
    console.log(`${PASS} ${description}`);
  } else {
    failedTests++;
    console.log(`${FAIL} ${description}`);
    console.log(`   Expected: "${expected}"`);
    console.log(`   Actual:   "${actual}"`);
  }
  return passed;
}

function testGroup(name, fn) {
  console.log(`\n${INFO} ${name}`);
  console.log('='.repeat(50));
  fn();
}

async function runTests() {
  console.log('🔒 XSS PREVENTION TEST SUITE');
  console.log('============================\n');

  // Test 1: URL Sanitization
  testGroup('URL SANITIZATION', () => {
    // Valid URLs should pass through
    test('Valid HTTPS URL', sanitizeUrl('https://example.com'), 'https://example.com');
    test('Valid HTTP URL', sanitizeUrl('http://example.com'), 'http://example.com');
    test('URL with query params', sanitizeUrl('https://google.com/search?q=test'), 'https://google.com/search?q=test');
    test('Relative path', sanitizeUrl('/relative/path'), '/relative/path');
    test('Hash fragment', sanitizeUrl('#anchor'), '#anchor');
    test('Mailto link', sanitizeUrl('mailto:test@example.com'), 'mailto:test@example.com');
    test('Tel link', sanitizeUrl('tel:+1234567890'), 'tel:+1234567890');
    
    // Dangerous URLs should be blocked
    test('JavaScript protocol blocked', sanitizeUrl('javascript:alert(1)'), '');
    test('Data URL blocked', sanitizeUrl('data:text/html,<script>alert(1)</script>'), '');
    test('VBScript protocol blocked', sanitizeUrl('vbscript:alert(1)'), '');
    test('File protocol blocked', sanitizeUrl('file:///etc/passwd'), '');
    test('About protocol blocked', sanitizeUrl('about:blank'), '');
    
    // URLs with dangerous characters
    test('URL with script tags', sanitizeUrl('https://example.com/<script>alert(1)</script>'), '');
    test('URL with quotes', sanitizeUrl('https://example.com/"onclick="alert(1)"'), '');
  });

  // Test 2: HTML Sanitization
  testGroup('HTML SANITIZATION', () => {
    // Basic HTML escaping
    test('Escapes < and >', escapeHtml('<div>test</div>'), '&lt;div&gt;test&lt;/div&gt;');
    test('Escapes quotes', escapeHtml('"hello"'), '&quot;hello&quot;');
    test('Escapes single quotes', escapeHtml("'hello'"), '&#39;hello&#39;');
    test('Escapes ampersand', escapeHtml('hello & world'), 'hello &amp; world');
    
    // Script tag removal
    test('Removes script tags', sanitizeHTML('<script>alert(1)</script>Hello'), 'Hello');
    test('Removes inline scripts', sanitizeHTML('Hello<script>alert(1)</script>World'), 'HelloWorld');
    test('Removes iframe', sanitizeHTML('<iframe src="evil.com"></iframe>'), '');
    test('Removes object tags', sanitizeHTML('<object data="evil.swf"></object>'), '');
    test('Removes embed tags', sanitizeHTML('<embed src="evil.swf">'), '');
    
    // Event handler removal
    test('Removes onclick', sanitizeHTML('<div onclick="alert(1)">test</div>'), 'test');
    test('Removes onload', sanitizeHTML('<img onload="alert(1)" src="x">'), '');
    test('Removes onerror', sanitizeHTML('<img onerror="alert(1)" src="x">'), '');
  });

  // Test 3: User Input Sanitization
  testGroup('USER INPUT SANITIZATION', () => {
    // Basic sanitization
    test('Plain text passes through', sanitizeUserInput('Hello World'), 'Hello World');
    test('Removes HTML tags', sanitizeUserInput('Hello <b>World</b>'), 'Hello World');
    test('Handles newlines when allowed', 
      sanitizeUserInput('Line1\nLine2', { allowNewlines: true }), 
      'Line1\nLine2'
    );
    test('Converts newlines to spaces when not allowed', 
      sanitizeUserInput('Line1\nLine2', { allowNewlines: false }), 
      'Line1 Line2'
    );
    
    // Length limiting
    test('Respects max length', 
      sanitizeUserInput('This is a very long string', { maxLength: 10 }), 
      'This is a '
    );
    
    // XSS prevention
    test('Removes script in user input', 
      sanitizeUserInput('Hello <script>alert(1)</script> World'), 
      'Hello  World'
    );
    test('Removes javascript: URLs', 
      sanitizeUserInput('Click <a href="javascript:alert(1)">here</a>'), 
      'Click here'
    );
  });

  // Test 4: Email Sanitization
  testGroup('EMAIL SANITIZATION', () => {
    test('Valid email passes', sanitizeEmail('test@example.com'), 'test@example.com');
    test('Converts to lowercase', sanitizeEmail('TEST@EXAMPLE.COM'), 'test@example.com');
    test('Trims whitespace', sanitizeEmail('  test@example.com  '), 'test@example.com');
    test('Invalid email blocked', sanitizeEmail('not-an-email'), '');
    test('Email with XSS blocked', sanitizeEmail('test<script>@example.com'), '');
    test('Email with quotes blocked', sanitizeEmail('"test"@example.com'), '');
  });

  // Test 5: File Name Sanitization
  testGroup('FILE NAME SANITIZATION', () => {
    test('Normal filename passes', sanitizeFileName('document.pdf'), 'document.pdf');
    test('Removes directory traversal', sanitizeFileName('../../../etc/passwd'), 'etcpasswd');
    test('Removes slashes', sanitizeFileName('folder/file.txt'), 'folderfile.txt');
    test('Removes special chars', sanitizeFileName('file<>:"|?*.txt'), 'file.txt');
    test('Limits length', 
      sanitizeFileName('a'.repeat(300) + '.txt'), 
      'a'.repeat(251) + '.txt'
    );
  });

  // Test 6: Display Name Sanitization
  testGroup('DISPLAY NAME SANITIZATION', () => {
    test('Normal name passes', createSafeDisplayName('John Doe'), 'John Doe');
    test('Removes script tags', createSafeDisplayName('John<script>alert(1)</script>'), '');
    test('Removes event handlers', createSafeDisplayName('John" onclick="alert(1)'), '');
    test('Returns fallback for empty', createSafeDisplayName(''), 'Unknown');
    test('Returns fallback for dangerous', createSafeDisplayName('<script>'), 'Unknown');
  });

  // Test 7: Search Query Sanitization
  testGroup('SEARCH QUERY SANITIZATION', () => {
    test('Normal query passes', sanitizeSearchQuery('search term'), 'search term');
    test('Removes HTML', sanitizeSearchQuery('search <b>term</b>'), 'search term');
    test('Limits length', 
      sanitizeSearchQuery('x'.repeat(250)), 
      'x'.repeat(200)
    );
    test('Removes newlines', sanitizeSearchQuery('search\nterm'), 'search term');
  });

  // Test 8: API Parameter Sanitization
  testGroup('API PARAMETER SANITIZATION', () => {
    test('Normal param passes', sanitizeAPIParameter('value123'), 'value123');
    test('Removes HTML', sanitizeAPIParameter('<script>value</script>'), 'value');
    test('Limits length', 
      sanitizeAPIParameter('x'.repeat(600)), 
      'x'.repeat(500)
    );
    test('Removes dangerous chars', sanitizeAPIParameter('value<>'), 'value');
  });

  // Test 9: Content Detection
  testGroup('CONTENT DETECTION', () => {
    test('Detects HTML chars', needsSanitization('<div>test</div>'), true);
    test('Detects quotes', needsSanitization('"test"'), true);
    test('Detects ampersand', needsSanitization('test & test'), true);
    test('Plain text is safe', needsSanitization('plain text'), false);
  });

  // Test 10: Complex XSS Attacks
  testGroup('COMPLEX XSS ATTACK PREVENTION', () => {
    // Nested attacks
    test('Nested script tags', 
      sanitizeHTML('<scr<script>ipt>alert(1)</scr</script>ipt>'), 
      'iptalert(1)ipt'
    );
    
    // Encoded attacks
    test('HTML entity encoded', 
      sanitizeUserInput('&lt;script&gt;alert(1)&lt;/script&gt;'), 
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
    
    // Mixed case attacks
    test('Mixed case script tag', 
      sanitizeHTML('<ScRiPt>alert(1)</ScRiPt>'), 
      ''
    );
    
    // Comment injection
    test('Comment injection', 
      sanitizeHTML('<!--<script>alert(1)</script>-->'), 
      '<!---->'
    );
    
    // SVG attacks
    test('SVG onload attack', 
      sanitizeHTML('<svg onload="alert(1)">'), 
      ''
    );
    
    // Data URI in img
    test('Data URI in img', 
      sanitizeHTML('<img src="data:text/html,<script>alert(1)</script>">'), 
      ''
    );
  });

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ${PASS}`);
  console.log(`Failed: ${failedTests} ${failedTests > 0 ? FAIL : ''}`);
  console.log(`Success Rate: ${((passedTests/totalTests) * 100).toFixed(1)}%`);
  
  if (failedTests === 0) {
    console.log('\n🎉 ALL TESTS PASSED! XSS PREVENTION IS WORKING CORRECTLY');
  } else {
    console.log(`\n⚠️ ${failedTests} TEST(S) FAILED - XSS PREVENTION NEEDS FIXES`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});