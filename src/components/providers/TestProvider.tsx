'use client';

import React from 'react';

export const TestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};