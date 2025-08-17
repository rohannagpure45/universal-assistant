export interface RuleCondition {
  type: 'keyword' | 'pattern' | 'messageCount' | 'questionDetected';
  operator: 'contains' | 'equals' | 'matches';
  value: any;
}

export interface RuleAction {
  type: 'respond' | 'summarize' | 'note';
  template?: string;
  style?: 'bullet_points' | 'short' | 'detailed';
  category?: string;
}

export interface Rule {
  id: string;
  name: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority: number;
  confidence: number;
}

export const brainstormingRules: Rule[] = [
  {
    id: 'brainstorm_encourage',
    name: 'Encourage Ideas',
    conditions: [
      { type: 'keyword', operator: 'contains', value: ['idea', 'what if', 'maybe'] },
    ],
    actions: [
      { type: 'respond', template: "That's an interesting idea! Can you elaborate on {topic}?" },
    ],
    priority: 5,
    confidence: 0.8,
  },
  {
    id: 'brainstorm_summarize',
    name: 'Periodic Summary',
    conditions: [
      { type: 'messageCount', operator: 'equals', value: 10 },
    ],
    actions: [
      { type: 'summarize', style: 'bullet_points' },
    ],
    priority: 3,
    confidence: 0.9,
  },
];

export const statusUpdateRules: Rule[] = [
  {
    id: 'status_capture',
    name: 'Capture Status Items',
    conditions: [
      { type: 'pattern', operator: 'matches', value: /(?:completed|finished|done|working on|blocked by)/i },
    ],
    actions: [
      { type: 'note', category: 'status_item' },
    ],
    priority: 8,
    confidence: 0.85,
  },
  {
    id: 'status_clarify',
    name: 'Request Clarification',
    conditions: [
      { type: 'keyword', operator: 'contains', value: ['blocked', 'stuck', 'issue'] },
      { type: 'questionDetected', operator: 'equals', value: false },
    ],
    actions: [
      { type: 'respond', template: 'What specifically is blocking you?' },
    ],
    priority: 6,
    confidence: 0.75,
  },
];


