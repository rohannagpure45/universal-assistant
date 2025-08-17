// Base Agent Interface
export interface AgentContext {
  meetingId?: string;
  meetingType?: string;
  transcript?: string;
  participants?: Array<{ id: string; name?: string }>;
  keywords?: string[];
  query?: string;
  rule?: Record<string, any>;
}

export interface AgentResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
  operations?: Array<'read' | 'write' | 'execute'>;
}

export interface Permissions {
  read: string[];  // Collection paths
  write: string[]; // Collection paths
  execute: string[]; // Function names
}

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  permissions: Permissions;
  execute(context: AgentContext): Promise<AgentResult>;
}

export enum AgentType {
  CONTEXT_SOURCING = 'context_sourcing',
  MEETING_INFO = 'meeting_info',
  NOTES_WRITER = 'notes_writer',
  NOTES_READER = 'notes_reader',
  RULESET_MANAGER = 'ruleset_manager',
}


