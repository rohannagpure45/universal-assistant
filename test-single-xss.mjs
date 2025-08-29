import { sanitizeHTML } from './src/utils/security/inputSanitization.ts';
import { createSafeDisplayName } from './src/utils/sanitization.ts';

console.log('Test 1: Removes script tags');
const input1 = '<script>alert(1)</script>Hello';
const result1 = sanitizeHTML(input1);
console.log('Input:', input1);
console.log('Result:', result1);
console.log('Expected: Hello');
console.log('Match:', result1 === 'Hello');

console.log('\nTest 2: createSafeDisplayName with dangerous input');
const input2 = '<script>';
const result2 = createSafeDisplayName(input2);
console.log('Input:', input2);
console.log('Result:', result2);
console.log('Expected: Unknown');
console.log('Match:', result2 === 'Unknown');

console.log('\nTest 3: createSafeDisplayName with onclick');
const input3 = 'John" onclick="alert(1)';
const result3 = createSafeDisplayName(input3);
console.log('Input:', input3);
console.log('Result:', result3);
console.log('Expected: Unknown or empty');
console.log('Match with Unknown:', result3 === 'Unknown');
console.log('Match with empty:', result3 === '');
