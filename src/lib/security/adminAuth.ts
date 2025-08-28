/**
 * SECURITY-CRITICAL: Admin Authorization Module
 * 
 * This module provides test compatibility exports while maintaining
 * the secure custom claims system implemented in Issue #9.
 * 
 * IMPORTANT: Real admin validation uses serverAdminUtils.ts with Firebase Custom Claims
 * This file is primarily for test compatibility and should not be used for actual security decisions.
 */

import { validateAdminAccess } from '@/utils/serverAdminUtils';

/**
 * Test-compatible admin email validation
 * 
 * WARNING: This is a simplified check for test compatibility only.
 * Production admin validation should use serverAdminUtils.validateAdminAccess()
 * with proper Firebase ID token validation and custom claims.
 * 
 * @param email - Email to check for admin authorization
 * @returns Promise<boolean> indicating admin status
 */
export async function isAuthorizedAdmin(email: string): Promise<boolean> {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  try {
    // Environment-based check for test compatibility
    // Real implementation should use Firebase custom claims via serverAdminUtils
    const adminEmails = process.env.ADMIN_EMAILS?.split(',')
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0) || [];
    
    const normalizedEmail = email.trim().toLowerCase();
    return adminEmails.includes(normalizedEmail);
  } catch (error) {
    console.error('Admin authorization check failed:', error);
    return false; // Fail secure
  }
}

/**
 * Synchronous admin email check for test compatibility
 * 
 * @param email - Email to check
 * @returns boolean indicating admin status
 */
export function isAuthorizedAdminSync(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  try {
    const adminEmails = process.env.ADMIN_EMAILS?.split(',')
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0) || [];
    
    const normalizedEmail = email.trim().toLowerCase();
    return adminEmails.includes(normalizedEmail);
  } catch {
    return false; // Fail secure
  }
}

/**
 * Get list of authorized admin emails (for testing/debugging)
 * 
 * @returns Array of admin email addresses
 */
export function getAuthorizedAdmins(): string[] {
  try {
    return process.env.ADMIN_EMAILS?.split(',')
      .map(e => e.trim())
      .filter(e => e.length > 0) || [];
  } catch {
    return [];
  }
}

// Re-export the secure admin validation function for convenience
export { validateAdminAccess } from '@/utils/serverAdminUtils';