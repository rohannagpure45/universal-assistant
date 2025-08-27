// Test URL sanitization with direct import
import { sanitizeUrl, isValidUrl } from './src/utils/security/xss-prevention.ts';

async function testUrlSanitization() {
  try {
    
    console.log('Testing URL Sanitization:');
    console.log('========================');
    
    const testUrls = [
      'https://example.com',
      'http://example.com', 
      'https://google.com/search?q=test',
      '/relative/path',
      '#anchor',
      'mailto:test@example.com',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>'
    ];
    
    for (const url of testUrls) {
      const isValid = isValidUrl(url);
      const sanitized = sanitizeUrl(url);
      console.log(`URL: "${url}"`);
      console.log(`  Valid: ${isValid}`);
      console.log(`  Sanitized: "${sanitized}"`);
      console.log(`  Empty result: ${sanitized === ''}`);
      console.log('---');
    }
    
  } catch (error) {
    console.error('Error testing URL sanitization:', error.message);
  }
}

testUrlSanitization().catch(console.error);