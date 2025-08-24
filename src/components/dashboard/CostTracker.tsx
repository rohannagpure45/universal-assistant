/**
 * Cost Tracker Component - Deprecated
 * Cost tracking functionality has been removed from the system
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function CostTracker() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Cost Tracking Unavailable
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Cost tracking functionality has been removed from this version of the application.
        </p>
      </CardContent>
    </Card>
  );
}