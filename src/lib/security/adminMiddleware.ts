/**
 * Enhanced Admin Validation Middleware
 * Future-proof architecture with extensible admin providers
 */

import { DecodedIdToken } from 'firebase-admin/auth';
import { SecurityLogger } from './monitoring';

export interface AdminValidationResult {
  isAdmin: boolean;
  adminLevel?: 'super' | 'admin' | 'moderator';
  validatedAt: Date;
  source: 'environment' | 'database' | 'external';
  metadata?: Record<string, any>;
}

export interface AdminProvider {
  validateAdmin(email: string, token: DecodedIdToken): Promise<boolean>;
  getAdminLevel?(email: string, token: DecodedIdToken): Promise<'super' | 'admin' | 'moderator'>;
  getSource(): string;
}

/**
 * Environment-based admin provider (primary implementation)
 */
export class EnvironmentAdminProvider implements AdminProvider {
  getSource(): string {
    return 'environment';
  }

  async validateAdmin(email: string): Promise<boolean> {
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];
    return adminEmails.includes(email.toLowerCase());
  }

  async getAdminLevel(email: string): Promise<'super' | 'admin' | 'moderator'> {
    const superAdmins = process.env.SUPER_ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];
    
    if (superAdmins.includes(email.toLowerCase())) {
      return 'super';
    }
    
    return 'admin'; // Default for all other admin emails
  }
}

/**
 * Legacy claims provider (for backward compatibility during migration)
 */
export class ClaimsAdminProvider implements AdminProvider {
  getSource(): string {
    return 'claims';
  }

  async validateAdmin(email: string, token: DecodedIdToken): Promise<boolean> {
    // Check custom claims from token
    return token.admin === true;
  }

  async getAdminLevel(email: string, token: DecodedIdToken): Promise<'super' | 'admin' | 'moderator'> {
    const adminLevel = token.adminLevel as string;
    
    if (adminLevel === 'super') return 'super';
    if (adminLevel === 'moderator') return 'moderator';
    
    return 'admin'; // Default
  }
}

/**
 * Main admin validator with extensible provider architecture
 */
export class AdminValidator {
  private static instance: AdminValidator;
  private providers: AdminProvider[] = [];

  private constructor() {
    // Initialize with default providers
    this.providers = [
      new EnvironmentAdminProvider(),
      new ClaimsAdminProvider() // For backward compatibility
    ];
  }

  public static getInstance(): AdminValidator {
    if (!AdminValidator.instance) {
      AdminValidator.instance = new AdminValidator();
    }
    return AdminValidator.instance;
  }

  /**
   * Add a new admin provider
   */
  public addProvider(provider: AdminProvider): void {
    this.providers.push(provider);
  }

  /**
   * Remove a provider by source
   */
  public removeProvider(source: string): void {
    this.providers = this.providers.filter(p => p.getSource() !== source);
  }

  /**
   * Validate admin access using all available providers
   */
  async validateAdminAccess(
    decodedToken: DecodedIdToken,
    clientIP: string
  ): Promise<AdminValidationResult> {
    const email = decodedToken.email?.toLowerCase() || '';
    let isAdmin = false;
    let adminLevel: 'super' | 'admin' | 'moderator' = 'admin';
    let source = 'environment';
    const validationResults: Record<string, boolean> = {};

    // Try each provider until we find admin status
    for (const provider of this.providers) {
      try {
        const result = await provider.validateAdmin(email, decodedToken);
        validationResults[provider.getSource()] = result;
        
        if (result) {
          isAdmin = true;
          source = provider.getSource();
          
          // Get admin level if provider supports it
          if (provider.getAdminLevel) {
            adminLevel = await provider.getAdminLevel(email, decodedToken);
          }
          
          break; // Use first provider that validates as admin
        }
      } catch (error) {
        console.warn(`Admin provider ${provider.getSource()} failed:`, error);
        validationResults[provider.getSource()] = false;
      }
    }

    // Log the validation attempt
    await SecurityLogger.adminAction(clientIP, decodedToken.uid, {
      action: 'admin_access_validated',
      result: isAdmin,
      email: decodedToken.email,
      adminLevel: isAdmin ? adminLevel : undefined,
      source,
      providers: validationResults,
      timestamp: new Date().toISOString()
    });

    return {
      isAdmin,
      adminLevel: isAdmin ? adminLevel : undefined,
      validatedAt: new Date(),
      source: source as 'environment' | 'database' | 'external',
      metadata: {
        providers: validationResults,
        email: decodedToken.email
      }
    };
  }

  /**
   * Quick admin check without detailed logging (for performance)
   */
  async quickAdminCheck(decodedToken: DecodedIdToken): Promise<boolean> {
    const email = decodedToken.email?.toLowerCase() || '';

    // Check environment first (fastest)
    const envProvider = this.providers.find(p => p.getSource() === 'environment');
    if (envProvider) {
      try {
        const result = await envProvider.validateAdmin(email, decodedToken);
        if (result) return true;
      } catch (error) {
        // Continue to other providers
      }
    }

    // Check claims (for backward compatibility)
    const claimsProvider = this.providers.find(p => p.getSource() === 'claims');
    if (claimsProvider) {
      try {
        return await claimsProvider.validateAdmin(email, decodedToken);
      } catch (error) {
        // Fall through
      }
    }

    return false;
  }

  /**
   * Get current configuration
   */
  public getConfiguration(): {
    providers: string[];
    adminEmails: string[];
    superAdminEmails: string[];
  } {
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
    const superAdminEmails = process.env.SUPER_ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];

    return {
      providers: this.providers.map(p => p.getSource()),
      adminEmails,
      superAdminEmails
    };
  }
}

/**
 * Middleware function for Next.js API routes
 */
export async function withAdminValidation(
  decodedToken: DecodedIdToken,
  clientIP: string
): Promise<AdminValidationResult> {
  const validator = AdminValidator.getInstance();
  return await validator.validateAdminAccess(decodedToken, clientIP);
}

/**
 * Quick admin check for performance-critical paths
 */
export async function isAdminUser(decodedToken: DecodedIdToken): Promise<boolean> {
  const validator = AdminValidator.getInstance();
  return await validator.quickAdminCheck(decodedToken);
}

// Types are already exported inline above