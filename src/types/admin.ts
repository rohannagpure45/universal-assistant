/**
 * SECURITY-CRITICAL: Admin Type Definitions
 * 
 * Centralized type definitions for the admin access control system.
 * These types enforce strict type safety across all admin-related functionality.
 * 
 * OWASP Reference: Secure Design (A04:2021)
 */

import { User } from './index';

// Core admin permission types
export type AdminLevel = 'super' | 'standard';
export type AdminPermission = 
  | 'user_management' 
  | 'system_configuration' 
  | 'security_monitoring'
  | 'data_export'
  | 'audit_logs'
  | 'meeting_management'
  | 'voice_profile_management';

// Security context for admin operations
export interface SecurityContext {
  clientIP?: string;
  userAgent?: string;
  timestamp: string;
  requestId?: string;
  validatedAt?: string;
}

// Enhanced admin user interface extending base User type
export interface AdminUser extends User {
  isAdmin: true;
  adminLevel: AdminLevel;
  adminSince?: string;
  lastAdminLogin?: string;
  adminPermissions?: AdminPermission[];
  grantedBy?: string;
  customClaims?: {
    admin: boolean;
    adminLevel: AdminLevel;
    adminSince?: string;
    grantedBy?: string;
  };
}

// Admin validation error codes
export type AdminValidationErrorCode = 
  | 'INVALID_TOKEN'
  | 'INSUFFICIENT_PRIVILEGES' 
  | 'VALIDATION_TIMEOUT'
  | 'NETWORK_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_REVOKED'
  | 'MISSING_CLAIMS'
  | 'UNKNOWN_ERROR';

// Structured admin validation error
export interface AdminValidationError {
  code: AdminValidationErrorCode;
  message: string;
  details?: Record<string, unknown>;
  retryable: boolean;
  timestamp: string;
}

// Comprehensive admin validation response
export interface AdminValidationResponse {
  isValid: boolean;
  user?: AdminUser;
  error?: AdminValidationError;
  securityContext: SecurityContext;
  validationDuration?: number;
}

// Admin validation loading state
export interface AdminValidationState {
  isValidating: boolean;
  isValid: boolean | null;
  user: AdminUser | null;
  error: AdminValidationError | null;
  lastValidated?: string;
  validationTimeout?: NodeJS.Timeout;
}

// Admin API context with strict typing
export interface AdminApiContext {
  user: AdminUser;
  isAdmin: true;
  clientIP: string;
  userAgent: string;
  securityContext: SecurityContext;
  requestMetadata?: {
    method: string;
    path: string;
    headers: Record<string, string>;
  };
}

// Admin operation result types
export interface AdminOperationResult {
  success: boolean;
  error?: AdminValidationError;
  data?: unknown;
  metadata?: {
    operationId: string;
    timestamp: string;
    performedBy: string;
  };
}

// Admin privilege grant/revoke operations
export interface AdminPrivilegeOperation {
  targetUid: string;
  adminLevel: AdminLevel;
  permissions?: AdminPermission[];
  reason?: string;
  expiresAt?: string;
}

// Admin audit log entry
export interface AdminAuditEntry {
  id: string;
  adminId: string;
  action: string;
  targetId?: string;
  details: Record<string, unknown>;
  securityContext: SecurityContext;
  timestamp: string;
  success: boolean;
  error?: string;
}

// Client-side admin user type (for UI display)
export interface ClientAdminUser {
  customClaims?: { 
    admin?: boolean; 
    adminLevel?: string;
    adminSince?: string;
  } | null;
  email?: string | null;
  uid?: string;
  displayName?: string | null;
}

// Admin validation options for client-side functions
export interface AdminValidationOptions {
  timeout?: number;
  retryOnFailure?: boolean;
  maxRetries?: number;
  requireLevel?: AdminLevel;
  requiredPermissions?: AdminPermission[];
}

// Type guards for admin validation
export function isAdminUser(user: unknown): user is AdminUser {
  return (
    typeof user === 'object' &&
    user !== null &&
    'isAdmin' in user &&
    user.isAdmin === true &&
    'adminLevel' in user &&
    (user.adminLevel === 'super' || user.adminLevel === 'standard')
  );
}

export function isAdminValidationError(error: unknown): error is AdminValidationError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'retryable' in error &&
    'timestamp' in error
  );
}

export function isClientAdminUser(user: unknown): user is ClientAdminUser {
  return (
    typeof user === 'object' &&
    user !== null &&
    ('customClaims' in user || 'email' in user)
  );
}

// Utility types for admin middleware
export type AdminApiHandler<T = unknown> = (
  request: Request, 
  context: AdminApiContext
) => Promise<Response | T>;

export type AdminMiddlewareResult = 
  | { success: true; context: AdminApiContext }
  | { success: false; error: AdminValidationError; response: Response };

// Export utility constants
export const ADMIN_VALIDATION_TIMEOUT = 10000; // 10 seconds
export const ADMIN_SESSION_DURATION = 3600000; // 1 hour
export const MAX_ADMIN_VALIDATION_RETRIES = 3;

export const DEFAULT_ADMIN_PERMISSIONS: Record<AdminLevel, AdminPermission[]> = {
  standard: [
    'meeting_management',
    'voice_profile_management'
  ],
  super: [
    'user_management',
    'system_configuration',
    'security_monitoring',
    'data_export',
    'audit_logs',
    'meeting_management',
    'voice_profile_management'
  ]
};