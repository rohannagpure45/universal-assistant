/**
 * Admin Layout
 * 
 * Layout wrapper for all admin routes with additional security and styling.
 */

'use client';

import React from 'react';
import { withAdminProtection } from '@/middleware/adminMiddleware';

interface AdminLayoutProps {
  children: React.ReactNode;
}

function AdminLayoutComponent({ children }: AdminLayoutProps) {
  return (
    <div className="admin-layout">
      {children}
    </div>
  );
}

// Export the admin-protected layout
export default withAdminProtection(AdminLayoutComponent);