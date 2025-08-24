/**
 * Voice Identification Main Page - Admin Only
 * 
 * Central hub for all voice identification features including speaker management,
 * voice library, training, and analytics. Requires admin privileges.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Users, 
  Volume2, 
  BarChart3, 
  Settings, 
  Plus,
  FolderOpen,
  Mic,
  Brain,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { VoiceLibraryDashboard } from '@/components/voice-identification/VoiceLibraryDashboard';
import { withAdminProtection } from '@/middleware/adminMiddleware';

/**
 * Quick action card component
 */
interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
  badge?: string | number;
}

const QuickAction: React.FC<QuickActionProps> = ({ 
  title, 
  description, 
  icon: Icon, 
  href, 
  color,
  badge 
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-800',
    green: 'bg-green-50 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-800',
    purple: 'bg-purple-50 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/20 dark:border-purple-800',
    orange: 'bg-orange-50 border-orange-200 hover:bg-orange-100 dark:bg-orange-900/20 dark:border-orange-800'
  };

  const iconClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    purple: 'text-purple-600 dark:text-purple-400',
    orange: 'text-orange-600 dark:text-orange-400'
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <Link href={href}>
        <Card 
          className={`relative cursor-pointer transition-all duration-200 ${colorClasses[color]}`}
        >
          {badge && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-medium">
              {badge}
            </div>
          )}
          
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/50 dark:bg-black/20">
                <Icon className={`h-6 w-6 ${iconClasses[color]}`} />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">{title}</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {description}
                </p>
              </div>
              <ArrowRight className={`h-5 w-5 ${iconClasses[color]} opacity-50`} />
            </div>
          </CardHeader>
        </Card>
      </Link>
    </motion.div>
  );
};

/**
 * Status overview component
 */
interface StatusCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'success' | 'warning' | 'info';
}

const StatusCard: React.FC<StatusCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  status 
}) => {
  const statusClasses = {
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-orange-600 dark:text-orange-400',
    info: 'text-blue-600 dark:text-blue-400'
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500">{subtitle}</p>
        </div>
        <Icon className={`h-8 w-8 ${statusClasses[status]}`} />
      </div>
    </Card>
  );
};

/**
 * Voice Identification Main Page Component
 */
function VoiceIdentificationPage() {
  const router = useRouter();
  
  const quickActions: QuickActionProps[] = [
    {
      title: 'Speaker Directory',
      description: 'Browse and manage all identified speakers',
      icon: Users,
      href: '/admin/voice-identification/directory',
      color: 'blue'
    },
    {
      title: 'Voice Training',
      description: 'Train new voice profiles and improve recognition',
      icon: Brain,
      href: '/voice-identification/training',
      color: 'green'
    },
    {
      title: 'Analytics Dashboard',
      description: 'View recognition metrics and performance insights',
      icon: BarChart3,
      href: '/voice-identification/analytics',
      color: 'purple'
    },
    {
      title: 'System Settings',
      description: 'Configure recognition thresholds and policies',
      icon: Settings,
      href: '/voice-identification/settings',
      color: 'orange'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Voice Identification
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage speakers, train voice models, and analyze recognition performance
          </p>
        </div>
        
        <Button 
          onClick={() => router.push('/voice-identification/training')}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Training Session
        </Button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          title="Total Speakers"
          value="24"
          subtitle="8 confirmed this week"
          icon={Users}
          status="info"
        />
        <StatusCard
          title="Recognition Rate"
          value="94.2%"
          subtitle="↑ 2.3% from last week"
          icon={CheckCircle}
          status="success"
        />
        <StatusCard
          title="Pending Review"
          value="7"
          subtitle="Requires attention"
          icon={Clock}
          status="warning"
        />
        <StatusCard
          title="Audio Samples"
          value="156"
          subtitle="Total collected"
          icon={Mic}
          status="info"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action, index) => (
            <QuickAction key={index} {...action} />
          ))}
        </div>
      </div>

      {/* Main Dashboard */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Voice Library Overview
        </h2>
        <VoiceLibraryDashboard userId="demo-user" />
      </div>
    </div>
  );
}

// Export the admin-protected component
export default withAdminProtection(VoiceIdentificationPage);