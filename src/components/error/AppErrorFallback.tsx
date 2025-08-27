import React from 'react';

interface AppErrorFallbackProps {
  error: Error;
}

export const AppErrorFallback: React.FC<AppErrorFallbackProps> = ({ error }) => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Something went wrong
        </h2>
        <p className="text-gray-600 mb-4">
          We encountered an unexpected error. Please try refreshing the page.
        </p>
        <details className="text-left text-xs text-gray-500 bg-gray-100 p-4 rounded">
          <summary className="cursor-pointer font-medium">Error details</summary>
          <pre className="mt-2 whitespace-pre-wrap">{error.message}</pre>
        </details>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
};