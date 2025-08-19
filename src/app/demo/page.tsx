'use client';

import React from 'react';
import DashboardPage from '@/app/(routes)/dashboard/page';

// Demo wrapper that bypasses authentication requirement
export default function DemoPage() {
  return <DashboardPage />;
}