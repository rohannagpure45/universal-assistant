/**
 * Example usage of type-safe ValidationResult
 * This file demonstrates how the discriminated union provides compile-time type safety
 */

import {
  ValidationResult,
  createValidationSuccess,
  createValidationFailure,
  isValidationSuccess,
  isValidationFailure,
  getValidationData,
  getValidationErrors,
  mapValidationResult,
  chainValidation,
  ModelMappingError,
  RateLimitExceededError
} from './ValidationResult';

interface UserData {
  id: string;
  name: string;
  email: string;
}

// Example 1: Type-safe success handling
function validateUser(input: unknown): ValidationResult<UserData> {
  if (typeof input !== 'object' || input === null) {
    return createValidationFailure([
      new ModelMappingError('Invalid input type', 'user', ['object'])
    ]);
  }

  const user = input as any;
  
  if (!user.id || !user.name || !user.email) {
    return createValidationFailure([
      new ModelMappingError('Missing required fields', 'user', ['id', 'name', 'email'])
    ]);
  }

  return createValidationSuccess<UserData>({
    id: user.id,
    name: user.name,
    email: user.email
  });
}

// Example 2: Compile-time type safety with discriminated unions
function processUserValidation(result: ValidationResult<UserData>) {
  if (isValidationSuccess(result)) {
    // TypeScript knows result.data exists and is UserData
    console.log('User ID:', result.data.id);
    console.log('User Name:', result.data.name);
    console.log('User Email:', result.data.email);
    
    // TypeScript knows result.errors doesn't exist here
    // Uncommenting the next line would be a compile error:
    // console.log(result.errors);
  } else {
    // TypeScript knows result.errors exists and is ValidationError[]
    console.log('Validation failed with errors:', result.errors);
    
    // TypeScript knows result.data doesn't exist here
    // Uncommenting the next line would be a compile error:
    // console.log(result.data);
  }
}

// Example 3: Chaining validations with type safety
function validateAge(user: UserData): ValidationResult<UserData & { age: number }> {
  // Simulate age lookup
  const age = 25;
  
  if (age < 18) {
    return createValidationFailure([
      new ModelMappingError('User must be 18 or older', 'age', ['>=18'])
    ]);
  }
  
  return createValidationSuccess({
    ...user,
    age
  });
}

// Example 4: Using utility functions
function demonstrateUtilities() {
  const userResult = validateUser({ id: '1', name: 'John', email: 'john@example.com' });
  
  // Safe data extraction
  const userData = getValidationData(userResult); // UserData | undefined
  if (userData) {
    console.log('Extracted user:', userData);
  }
  
  // Safe error extraction
  const errors = getValidationErrors(userResult); // ValidationError[]
  if (errors.length > 0) {
    console.log('Validation errors:', errors);
  }
  
  // Mapping results
  const upperCaseResult = mapValidationResult(userResult, user => ({
    ...user,
    name: user.name.toUpperCase()
  }));
  
  // Chaining validations
  const ageValidatedResult = chainValidation(userResult, validateAge);
  
  if (isValidationSuccess(ageValidatedResult)) {
    // TypeScript knows the result includes age
    console.log('User age:', ageValidatedResult.data.age);
  }
}

// Example 5: Pattern matching style with exhaustive checks
function handleValidationExhaustive<T>(result: ValidationResult<T>): string {
  switch (result.isValid) {
    case true:
      // TypeScript knows this is ValidationSuccess<T>
      return `Success with data: ${JSON.stringify(result.data)}`;
    case false:
      // TypeScript knows this is ValidationFailure
      return `Failed with ${result.errors.length} errors`;
    default:
      // This ensures exhaustive checking
      const _exhaustive: never = result;
      return _exhaustive;
  }
}

// Example 6: Async validation with type safety
async function validateUserAsync(userId: string): Promise<ValidationResult<UserData>> {
  try {
    // Simulate API call
    const response = await fetch(`/api/users/${userId}`);
    
    if (!response.ok) {
      return createValidationFailure([
        new RateLimitExceededError(
          'API rate limit exceeded',
          'user-api',
          60,
          'requests'
        )
      ]);
    }
    
    const data = await response.json();
    return validateUser(data);
  } catch (error) {
    return createValidationFailure([
      new ModelMappingError(
        'Failed to fetch user',
        'api',
        undefined,
        { error: String(error) }
      )
    ]);
  }
}

// Export examples for testing
export {
  validateUser,
  processUserValidation,
  validateAge,
  demonstrateUtilities,
  handleValidationExhaustive,
  validateUserAsync
};