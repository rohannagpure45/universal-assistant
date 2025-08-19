'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const toastVariants = {
  initial: {
    opacity: 0,
    x: 300,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    x: 300,
    scale: 0.95,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

const progressVariants = {
  initial: { width: '100%' },
  animate: (duration: number) => ({
    width: '0%',
    transition: {
      duration: duration / 1000,
      ease: 'linear',
    },
  }),
};

const ToastComponent: React.FC<ToastProps> = ({ toast, onRemove }) => {
  const { id, type, title, message, duration = 5000, persistent = false, action } = toast;

  const [isHovered, setIsHovered] = React.useState(false);

  React.useEffect(() => {
    if (persistent || isHovered) return;

    const timer = setTimeout(() => {
      onRemove(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, persistent, isHovered, onRemove]);

  const typeConfig = {
    success: {
      icon: CheckCircle,
      colors: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      iconColor: 'text-green-600 dark:text-green-400',
      titleColor: 'text-green-800 dark:text-green-200',
      messageColor: 'text-green-700 dark:text-green-300',
      progressColor: 'bg-green-500',
    },
    error: {
      icon: AlertCircle,
      colors: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      iconColor: 'text-red-600 dark:text-red-400',
      titleColor: 'text-red-800 dark:text-red-200',
      messageColor: 'text-red-700 dark:text-red-300',
      progressColor: 'bg-red-500',
    },
    warning: {
      icon: AlertTriangle,
      colors: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      titleColor: 'text-yellow-800 dark:text-yellow-200',
      messageColor: 'text-yellow-700 dark:text-yellow-300',
      progressColor: 'bg-yellow-500',
    },
    info: {
      icon: Info,
      colors: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      iconColor: 'text-blue-600 dark:text-blue-400',
      titleColor: 'text-blue-800 dark:text-blue-200',
      messageColor: 'text-blue-700 dark:text-blue-300',
      progressColor: 'bg-blue-500',
    },
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      variants={toastVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      layout
      className={cn(
        'relative overflow-hidden rounded-xl border shadow-lg backdrop-blur-sm max-w-md w-full',
        config.colors
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className={cn('w-5 h-5', config.iconColor)} />
          </div>
          
          <div className="ml-3 flex-1">
            <div className="flex items-center justify-between">
              <p className={cn('text-sm font-semibold', config.titleColor)}>
                {title}
              </p>
              <button
                onClick={() => onRemove(id)}
                className={cn(
                  'inline-flex rounded-md p-1.5 transition-colors duration-200',
                  'hover:bg-black/5 dark:hover:bg-white/5',
                  config.iconColor
                )}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {message && (
              <p className={cn('mt-1 text-sm', config.messageColor)}>
                {message}
              </p>
            )}
            
            {action && (
              <div className="mt-3">
                <button
                  onClick={() => {
                    action.onClick();
                    onRemove(id);
                  }}
                  className={cn(
                    'text-sm font-medium px-3 py-1.5 rounded-lg transition-colors duration-200',
                    'bg-white/20 hover:bg-white/30 dark:bg-white/10 dark:hover:bg-white/20',
                    config.titleColor
                  )}
                >
                  {action.label}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {!persistent && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 dark:bg-white/10">
          <motion.div
            variants={progressVariants}
            initial="initial"
            animate={!isHovered ? "animate" : "initial"}
            custom={duration}
            className={cn('h-full', config.progressColor)}
          />
        </div>
      )}
    </motion.div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onRemove,
  position = 'top-right',
}) => {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
  };

  return (
    <div className={cn('fixed z-50 space-y-3', positionClasses[position])}>
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastComponent
            key={toast.id}
            toast={toast}
            onRemove={onRemove}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// Toast hook for managing toasts
export const useToast = () => {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const removeAllToasts = React.useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = React.useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    return addToast({ type: 'success', title, message, ...options });
  }, [addToast]);

  const error = React.useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    return addToast({ type: 'error', title, message, persistent: true, ...options });
  }, [addToast]);

  const warning = React.useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    return addToast({ type: 'warning', title, message, ...options });
  }, [addToast]);

  const info = React.useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    return addToast({ type: 'info', title, message, ...options });
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    removeAllToasts,
    success,
    error,
    warning,
    info,
  };
};

export default ToastContainer;