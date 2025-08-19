'use client';

import React from 'react';
import { Button } from './Button';
import { Play, Square } from 'lucide-react';

/**
 * Test component to verify Button prop filtering is working correctly
 * This component should render without React prop warnings in the browser console
 */
export function TestButtonProps() {
  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold mb-4">Button Prop Testing</h2>
      
      {/* Test all the problematic props that were causing warnings */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Static Button with Custom Props</h3>
          <Button
            static={true}
            variant="primary"
            size="md"
            fullWidth={false}
            loading={false}
            leftIcon={<Play />}
            rightIcon={<Square />}
            onClick={() => console.log('Static button clicked')}
          >
            Static Button Test
          </Button>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Motion Button with Custom Props</h3>
          <Button
            variant="secondary"
            size="lg"
            fullWidth={true}
            loading={false}
            leftIcon={<Play />}
            onClick={() => console.log('Motion button clicked')}
          >
            Motion Button Test
          </Button>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Loading State Button</h3>
          <Button
            variant="success"
            size="sm"
            fullWidth={false}
            loading={true}
            leftIcon={<Play />}
            rightIcon={<Square />}
            onClick={() => console.log('Loading button clicked')}
          >
            Loading Button Test
          </Button>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Full Width Button</h3>
          <Button
            static={true}
            variant="outline"
            size="xl"
            fullWidth={true}
            loading={false}
            leftIcon={<Play />}
            onClick={() => console.log('Full width button clicked')}
          >
            Full Width Static Button
          </Button>
        </div>
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          <strong>Test Instructions:</strong> Open browser console and check for React prop warnings.
          If prop filtering is working correctly, you should see NO warnings about unknown DOM props
          like "fullWidth", "loading", or "leftIcon" being passed to DOM elements.
        </p>
      </div>
    </div>
  );
}