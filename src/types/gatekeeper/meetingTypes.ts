import { MeetingType } from '@/types';

export interface MeetingTypeConfig {
  type: MeetingType;
  indicators: string[];
  responseStyle: 'active' | 'passive' | 'moderate';
  interruptThreshold: number; // seconds
  summaryFrequency: number; // messages
  autoRespond: boolean;
}

export type MeetingTypeConfigMap = Partial<Record<MeetingType, MeetingTypeConfig>>;


