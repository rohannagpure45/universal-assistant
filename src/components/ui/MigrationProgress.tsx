/**
 * MigrationProgress Component
 * Provides visual feedback during data migrations
 */

import React from 'react';
import { AlertCircle, CheckCircle, Loader2, XCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { MigrationStatus } from '@/hooks/useMigration';

interface MigrationProgressProps {
  status: MigrationStatus;
  onCancel?: () => void;
  onRetry?: () => void;
  onRestore?: () => void;
  title?: string;
  description?: string;
  className?: string;
  showDetails?: boolean;
}

/**
 * Component that displays migration progress and status
 */
export const MigrationProgress: React.FC<MigrationProgressProps> = ({
  status,
  onCancel,
  onRetry,
  onRestore,
  title = 'Data Migration',
  description = 'Updating your data to the latest format',
  className = '',
  showDetails = true
}) => {
  const progressPercentage = status.total > 0 
    ? Math.round((status.progress / status.total) * 100)
    : 0;

  const getStatusIcon = () => {
    if (status.error) return <XCircle className="w-5 h-5 text-red-500" />;
    if (status.warnings.length > 0) return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    if (status.isRunning) return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
    if (status.completed === status.total) return <CheckCircle className="w-5 h-5 text-green-500" />;
    return <AlertCircle className="w-5 h-5 text-gray-500" />;
  };

  const getStatusText = () => {
    if (status.error) return 'Migration Failed';
    if (status.isRunning) return 'Migration In Progress';
    if (status.completed === status.total && status.total > 0) return 'Migration Complete';
    return 'Ready to Migrate';
  };

  const getStatusColor = () => {
    if (status.error) return 'text-red-600';
    if (status.warnings.length > 0) return 'text-yellow-600';
    if (status.isRunning) return 'text-blue-600';
    if (status.completed === status.total && status.total > 0) return 'text-green-600';
    return 'text-gray-600';
  };

  return (
    <Card className={`${className} transition-all duration-300`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <p className={`text-sm ${getStatusColor()} mt-1`}>
                {getStatusText()}
              </p>
            </div>
          </div>
          
          {status.isRunning && onCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="ml-auto"
            >
              Cancel
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">{description}</p>

        {/* Progress Bar */}
        {(status.isRunning || status.total > 0) && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>
                {status.completed} of {status.total} items
              </span>
              <span>{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}

        {/* Statistics */}
        {showDetails && status.total > 0 && (
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="text-center">
              <div className="text-2xl font-semibold text-green-600">
                {status.completed}
              </div>
              <div className="text-xs text-gray-500">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-red-600">
                {status.failed}
              </div>
              <div className="text-xs text-gray-500">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-yellow-600">
                {status.warnings.length}
              </div>
              <div className="text-xs text-gray-500">Warnings</div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {status.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{status.error}</AlertDescription>
          </Alert>
        )}

        {/* Warnings */}
        {status.warnings.length > 0 && !status.isRunning && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription>
              <div className="text-yellow-800">
                <div className="font-medium mb-1">Warnings:</div>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {status.warnings.slice(0, 5).map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                  {status.warnings.length > 5 && (
                    <li className="text-gray-600">
                      ...and {status.warnings.length - 5} more
                    </li>
                  )}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        {!status.isRunning && (
          <div className="flex gap-2 pt-2">
            {status.error && onRetry && (
              <Button
                onClick={onRetry}
                variant="primary"
                size="sm"
                className="flex-1"
              >
                Retry Migration
              </Button>
            )}
            
            {status.error && onRestore && (
              <Button
                onClick={onRestore}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Restore Backup
              </Button>
            )}
            
            {status.completed === status.total && status.total > 0 && !status.error && (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>Migration completed successfully</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Compact migration indicator for inline use
 */
export const MigrationIndicator: React.FC<{
  status: MigrationStatus;
  className?: string;
}> = ({ status, className = '' }) => {
  const progressPercentage = status.total > 0 
    ? Math.round((status.progress / status.total) * 100)
    : 0;

  if (!status.isRunning && status.total === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {status.isRunning ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          <span className="text-sm text-gray-600">
            Migrating... {progressPercentage}%
          </span>
        </>
      ) : status.error ? (
        <>
          <XCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-600">Migration failed</span>
        </>
      ) : status.completed === status.total ? (
        <>
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-sm text-green-600">Migration complete</span>
        </>
      ) : null}
    </div>
  );
};

/**
 * Migration modal for important migrations
 */
export const MigrationModal: React.FC<{
  isOpen: boolean;
  status: MigrationStatus;
  onClose: () => void;
  onStart: () => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
  warningMessage?: string;
}> = ({
  isOpen,
  status,
  onClose,
  onStart,
  onCancel,
  title = 'System Update Required',
  description = 'We need to update your data to continue. This process is automatic and your data will be backed up.',
  warningMessage
}) => {
  if (!isOpen) return null;

  const canClose = !status.isRunning && (status.completed === status.total || status.error);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">{title}</h2>
          
          <p className="text-gray-600 mb-4">{description}</p>
          
          {warningMessage && (
            <Alert className="mb-4 border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                {warningMessage}
              </AlertDescription>
            </Alert>
          )}

          {status.total > 0 && (
            <MigrationProgress
              status={status}
              onCancel={onCancel}
              showDetails={false}
              className="mb-4"
            />
          )}

          <div className="flex gap-3">
            {!status.isRunning && status.total === 0 && (
              <>
                <Button
                  onClick={onStart}
                  className="flex-1"
                >
                  Start Migration
                </Button>
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </>
            )}
            
            {canClose && (
              <Button
                onClick={onClose}
                className="w-full"
              >
                {status.error ? 'Close' : 'Continue'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MigrationProgress;