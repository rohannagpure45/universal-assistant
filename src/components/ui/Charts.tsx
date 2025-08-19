'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ChartData {
  label: string;
  value: number;
  percentage?: number;
  color?: string;
}

interface BarChartProps {
  data: ChartData[];
  className?: string;
  height?: number;
  showValues?: boolean;
  animate?: boolean;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  className = '',
  height = 200,
  showValues = true,
  animate = true,
}) => {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-end justify-between space-x-2" style={{ height: `${height}px` }}>
        {data.map((item, index) => {
          const barHeight = maxValue > 0 ? (item.value / maxValue) * height * 0.8 : 0;
          const color = item.color || `hsl(${(index * 137.508) % 360}, 70%, 50%)`;
          
          return (
            <div key={item.label} className="flex flex-col items-center flex-1 max-w-16">
              <div className="relative w-full flex flex-col items-center">
                {showValues && (
                  <motion.span
                    className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 truncate max-w-full"
                    initial={animate ? { opacity: 0 } : false}
                    animate={animate ? { opacity: 1 } : false}
                    transition={{ delay: index * 0.1 + 0.5 }}
                  >
                    {item.value.toLocaleString()}
                  </motion.span>
                )}
                
                <motion.div
                  className="w-full rounded-t-md relative overflow-hidden"
                  style={{
                    backgroundColor: color,
                    minHeight: '4px',
                  }}
                  initial={animate ? { height: 0 } : { height: barHeight }}
                  animate={animate ? { height: barHeight } : false}
                  transition={{
                    duration: 0.8,
                    delay: index * 0.1,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                >
                  {/* Gradient overlay */}
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      background: `linear-gradient(to top, ${color}, rgba(255,255,255,0.3))`,
                    }}
                  />
                </motion.div>
              </div>
              
              <motion.span
                className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-2 truncate max-w-full text-center"
                initial={animate ? { opacity: 0, y: 10 } : false}
                animate={animate ? { opacity: 1, y: 0 } : false}
                transition={{ delay: index * 0.1 + 0.3 }}
                title={item.label}
              >
                {item.label}
              </motion.span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface LineChartProps {
  data: { x: string; y: number }[];
  className?: string;
  height?: number;
  color?: string;
  animate?: boolean;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  className = '',
  height = 200,
  color = '#3b82f6',
  animate = true,
}) => {
  const maxValue = Math.max(...data.map(d => d.y));
  const minValue = Math.min(...data.map(d => d.y));
  const range = maxValue - minValue || 1;

  const points = data.map((point, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((point.y - minValue) / range) * 80; // 80% of height for padding
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className={cn('w-full relative', className)} style={{ height: `${height}px` }}>
      <svg width="100%" height="100%" className="overflow-visible">
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-gray-200 dark:text-gray-700"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" opacity="0.3" />

        {/* Area under the line */}
        <motion.path
          d={`M0,100 L${points} L100,100 Z`}
          fill={color}
          fillOpacity="0.1"
          initial={animate ? { pathLength: 0 } : false}
          animate={animate ? { pathLength: 1 } : false}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        />

        {/* Line */}
        <motion.polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={animate ? { pathLength: 0 } : false}
          animate={animate ? { pathLength: 1 } : false}
          transition={{ duration: 1, ease: 'easeInOut' }}
        />

        {/* Data points */}
        {data.map((point, index) => {
          const x = (index / (data.length - 1)) * 100;
          const y = 100 - ((point.y - minValue) / range) * 80;
          
          return (
            <motion.circle
              key={index}
              cx={`${x}%`}
              cy={`${y}%`}
              r="3"
              fill={color}
              stroke="white"
              strokeWidth="2"
              initial={animate ? { scale: 0, opacity: 0 } : false}
              animate={animate ? { scale: 1, opacity: 1 } : false}
              transition={{
                duration: 0.3,
                delay: animate ? index * 0.1 + 0.5 : 0,
                ease: 'backOut',
              }}
              className="drop-shadow-sm"
            />
          );
        })}
      </svg>

      {/* X-axis labels */}
      <div className="absolute -bottom-6 left-0 right-0 flex justify-between">
        {data.map((point, index) => (
          <motion.span
            key={index}
            className="text-xs text-gray-500 dark:text-gray-400"
            initial={animate ? { opacity: 0, y: 10 } : false}
            animate={animate ? { opacity: 1, y: 0 } : false}
            transition={{ delay: index * 0.05 + 1 }}
          >
            {point.x}
          </motion.span>
        ))}
      </div>
    </div>
  );
};

interface PieChartProps {
  data: ChartData[];
  className?: string;
  size?: number;
  innerRadius?: number;
  animate?: boolean;
  showPercentages?: boolean;
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  className = '',
  size = 200,
  innerRadius = 0,
  animate = true,
  showPercentages = true,
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = size / 2 - 10;
  const center = size / 2;
  
  let cumulativePercentage = 0;
  
  const segments = data.map((item, index) => {
    const percentage = total > 0 ? (item.value / total) * 100 : 0;
    const startAngle = (cumulativePercentage / 100) * 360;
    const endAngle = ((cumulativePercentage + percentage) / 100) * 360;
    
    cumulativePercentage += percentage;
    
    const startAngleRad = (startAngle - 90) * (Math.PI / 180);
    const endAngleRad = (endAngle - 90) * (Math.PI / 180);
    
    const largeArcFlag = percentage > 50 ? 1 : 0;
    
    const x1 = center + radius * Math.cos(startAngleRad);
    const y1 = center + radius * Math.sin(startAngleRad);
    const x2 = center + radius * Math.cos(endAngleRad);
    const y2 = center + radius * Math.sin(endAngleRad);
    
    const innerX1 = center + innerRadius * Math.cos(startAngleRad);
    const innerY1 = center + innerRadius * Math.sin(startAngleRad);
    const innerX2 = center + innerRadius * Math.cos(endAngleRad);
    const innerY2 = center + innerRadius * Math.sin(endAngleRad);
    
    const pathData = innerRadius > 0
      ? `M ${innerX1} ${innerY1} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${innerX2} ${innerY2} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerX1} ${innerY1} Z`
      : `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
    
    const color = item.color || `hsl(${(index * 137.508) % 360}, 70%, 50%)`;
    
    return {
      pathData,
      color,
      percentage: percentage.toFixed(1),
      label: item.label,
      value: item.value,
      midAngle: (startAngle + endAngle) / 2,
    };
  });
  
  return (
    <div className={cn('flex items-center gap-6', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {segments.map((segment, index) => (
            <motion.path
              key={index}
              d={segment.pathData}
              fill={segment.color}
              stroke="white"
              strokeWidth="2"
              initial={animate ? { pathLength: 0, opacity: 0 } : false}
              animate={animate ? { pathLength: 1, opacity: 1 } : false}
              transition={{
                duration: 0.8,
                delay: index * 0.1,
                ease: [0.4, 0, 0.2, 1],
              }}
              className="hover:opacity-80 transition-opacity cursor-pointer drop-shadow-sm"
            />
          ))}
        </svg>
        
        {innerRadius > 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Items
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="space-y-2 flex-1">
        {segments.map((segment, index) => (
          <motion.div
            key={index}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            initial={animate ? { opacity: 0, x: 20 } : false}
            animate={animate ? { opacity: 1, x: 0 } : false}
            transition={{ delay: index * 0.1 + 0.5 }}
          >
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: segment.color }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {segment.label}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {segment.value.toLocaleString()}
                {showPercentages && ` (${segment.percentage}%)`}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  animate?: boolean;
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  percentage,
  size = 120,
  strokeWidth = 8,
  color = '#3b82f6',
  backgroundColor = '#e5e7eb',
  animate = true,
  showLabel = true,
  label,
  className = '',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
          className="dark:stroke-gray-700"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          initial={animate ? { strokeDashoffset: circumference } : { strokeDashoffset }}
          animate={animate ? { strokeDashoffset } : false}
          transition={{
            duration: 1,
            ease: [0.4, 0, 0.2, 1],
          }}
          className="drop-shadow-sm"
        />
      </svg>
      
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-lg font-bold text-gray-900 dark:text-white"
            initial={animate ? { scale: 0 } : false}
            animate={animate ? { scale: 1 } : false}
            transition={{ delay: 0.5, duration: 0.3 }}
          >
            {Math.round(percentage)}%
          </motion.span>
          {label && (
            <motion.span
              className="text-xs text-gray-500 dark:text-gray-400 text-center"
              initial={animate ? { opacity: 0 } : false}
              animate={animate ? { opacity: 1 } : false}
              transition={{ delay: 0.7 }}
            >
              {label}
            </motion.span>
          )}
        </div>
      )}
    </div>
  );
};

export default {
  BarChart,
  LineChart,
  PieChart,
  ProgressRing,
};