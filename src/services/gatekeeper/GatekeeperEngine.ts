import { MeetingType } from '@/types';
import type { MeetingTypeConfig } from '@/types/gatekeeper/meetingTypes';
import type { Rule } from '@/config/gatekeeper/ruleDefinitions';

export interface SpeakerProfile {
  id: string;
  name?: string;
  role?: string;
}

export interface Message {
  id: string;
  text: string;
  timestamp: number;
}

export interface MeetingContext {
  meetingId: string;
  type: MeetingType;
  participants: SpeakerProfile[];
  messageCount: number;
}

export interface RuleResult {
  shouldHandle: boolean;
  action?: any;
  response?: string;
  confidence?: number;
}

export interface GatekeeperDecision {
  action: any;
  response?: string;
  metadata?: { ruleId?: string; confidence?: number };
}

export class GatekeeperEngine {
  private rules: Map<string, Rule[]> = new Map();
  private meetingType: MeetingType;
  private context: MeetingContext;

  constructor(meetingType: MeetingType, context: MeetingContext, meetingRules?: Map<string, Rule[]>) {
    this.meetingType = meetingType;
    this.context = context;
    if (meetingRules) {
      this.rules = meetingRules;
    }
  }

  async processMessage(message: Message, sender: SpeakerProfile): Promise<GatekeeperDecision> {
    const intent = await this.classifyIntent(message);
    const applicableRules = this.getApplicableRules(this.meetingType, intent, sender);

    for (const rule of applicableRules) {
      const result = await this.applyRule(rule, message);
      if (result.shouldHandle) {
        return {
          action: result.action,
          response: result.response,
          metadata: { ruleId: rule.id, confidence: result.confidence },
        };
      }
    }

    return this.getDefaultDecision(message, intent);
  }

  private async classifyIntent(message: Message): Promise<string> {
    // Simple heuristic intent classification
    const text = message.text.toLowerCase();
    if (/[?]/.test(text)) return 'question';
    if (/action|todo|next steps/.test(text)) return 'action_item';
    if (/block(ed|er)|issue|stuck/.test(text)) return 'blocker';
    return 'statement';
  }

  private getApplicableRules(meetingType: MeetingType, intent: string, sender: SpeakerProfile): Rule[] {
    const rules = this.rules.get(meetingType) || [];
    return [...rules].sort((a, b) => b.priority - a.priority);
  }

  private async applyRule(rule: Rule, message: Message): Promise<RuleResult> {
    const conditionsMet = rule.conditions.every(condition => this.evaluateCondition(condition, message));
    if (!conditionsMet) return { shouldHandle: false };

    // Execute first action that applies
    const firstAction = rule.actions[0];
    const response = this.executeAction(firstAction, message);
    return {
      shouldHandle: true,
      action: firstAction,
      response,
      confidence: rule.confidence,
    };
  }

  private evaluateCondition(condition: any, message: Message): boolean {
    switch (condition.type) {
      case 'keyword':
        return (condition.value as string[]).some((kw: string) => message.text.toLowerCase().includes(kw));
      case 'pattern':
        return (condition.value as RegExp).test(message.text);
      case 'messageCount':
        if (condition.operator === 'equals') return this.context.messageCount % Number(condition.value) === 0;
        return false;
      case 'questionDetected':
        const isQuestion = /\?/.test(message.text);
        return condition.operator === 'equals' ? isQuestion === Boolean(condition.value) : false;
      default:
        return false;
    }
  }

  private executeAction(action: any, message: Message): string | undefined {
    if (action.type === 'respond' && action.template) {
      return action.template.replace('{topic}', this.extractTopic(message.text));
    }
    if (action.type === 'summarize') {
      return 'Here are the key points so far: ...';
    }
    if (action.type === 'note') {
      return undefined; // side-effect in real impl
    }
    return undefined;
  }

  private extractTopic(text: string): string {
    const words = text.split(/\s+/).filter(w => w.length > 3);
    return words.slice(0, 3).join(' ');
  }

  private getDefaultDecision(message: Message, intent: string): GatekeeperDecision {
    return { action: { type: 'none', intent }, response: undefined };
  }
}


