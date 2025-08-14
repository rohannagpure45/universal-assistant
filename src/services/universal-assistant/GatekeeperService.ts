export interface GatekeeperRule {
    id: string;
    name: string;
    type: 'allow' | 'deny' | 'filter' | 'transform';
    priority: number;
    conditions: {
      field: string;
      operator: 'equals' | 'contains' | 'matches' | 'greater' | 'less';
      value: any;
    }[];
    action: {
      type: 'block' | 'modify' | 'redirect' | 'log';
      params?: Record<string, any>;
    };
    enabled: boolean;
  }
  
  export interface GatekeeperContext {
    userId: string;
    sessionId: string;
    messageType: 'user' | 'ai' | 'system';
    content: string;
    metadata?: Record<string, any>;
    timestamp: Date;
  }
  
  export class GatekeeperService {
    private rules: GatekeeperRule[] = [];
    private violationCallbacks: Set<(violation: any) => void> = new Set();
    private contentFilters: Map<string, RegExp> = new Map();
  
    constructor() {
      this.initializeDefaultRules();
      this.initializeContentFilters();
    }
  
    private initializeDefaultRules(): void {
      // Profanity filter
      this.addRule({
        id: 'profanity-filter',
        name: 'Profanity Filter',
        type: 'filter',
        priority: 100,
        conditions: [
          {
            field: 'content',
            operator: 'matches',
            value: 'profanity_pattern',
          },
        ],
        action: {
          type: 'modify',
          params: { replacement: '[filtered]' },
        },
        enabled: true,
      });
  
      // Rate limiting
      this.addRule({
        id: 'rate-limit',
        name: 'Rate Limiter',
        type: 'deny',
        priority: 90,
        conditions: [
          {
            field: 'requestsPerMinute',
            operator: 'greater',
            value: 60,
          },
        ],
        action: {
          type: 'block',
          params: { message: 'Rate limit exceeded' },
        },
        enabled: true,
      });
  
      // PII detection
      this.addRule({
        id: 'pii-detection',
        name: 'PII Detection',
        type: 'filter',
        priority: 95,
        conditions: [
          {
            field: 'content',
            operator: 'matches',
            value: 'pii_pattern',
          },
        ],
        action: {
          type: 'modify',
          params: { mask: true },
        },
        enabled: true,
      });
    }

    private initializeContentFilters(): void {
      // Email pattern
      this.contentFilters.set(
        'email',
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
      );
      
      // Phone pattern
      this.contentFilters.set(
        'phone',
        /(\+?[1-9]\d{0,2}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g
      );
      
      // SSN pattern
      this.contentFilters.set(
        'ssn',
        /\b\d{3}-\d{2}-\d{4}\b/g
      );
      
      // Credit card pattern
      this.contentFilters.set(
        'creditcard',
        /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g
      );
    }
  
    async processMessage(context: GatekeeperContext): Promise<{
      allowed: boolean;
      modified: boolean;
      content: string;
      violations: string[];
    }> {
      let content = context.content;
      let modified = false;
      const violations: string[] = [];
      let allowed = true;
  
      // Sort rules by priority
      const sortedRules = [...this.rules]
        .filter(r => r.enabled)
        .sort((a, b) => b.priority - a.priority);
  
      for (const rule of sortedRules) {
        if (this.evaluateConditions(rule.conditions, context, content)) {
          const result = await this.executeAction(rule.action, content, context);
          
          if (result.blocked) {
            allowed = false;
            violations.push(`Rule '${rule.name}' blocked message`);
            break;
          }
          
          if (result.modified) {
            content = result.content;
            modified = true;
            violations.push(`Rule '${rule.name}' modified content`);
          }
        }
      }
  
      // Apply content filters
      if (allowed) {
        const filterResult = this.applyContentFilters(content);
        if (filterResult.modified) {
          content = filterResult.content;
          modified = true;
          violations.push(...filterResult.violations);
        }
      }
  
      // Notify violations
      if (violations.length > 0) {
        this.notifyViolations({
          context,
          violations,
          timestamp: new Date(),
        });
      }
  
      return {
        allowed,
        modified,
        content,
        violations,
      };
    }
  
    private evaluateConditions(
      conditions: GatekeeperRule['conditions'],
      context: GatekeeperContext,
      content: string
    ): boolean {
      for (const condition of conditions) {
        let fieldValue: any;
        
        if (condition.field === 'content') {
          fieldValue = content;
        } else if (condition.field in context) {
          fieldValue = (context as any)[condition.field];
        } else if (context.metadata && condition.field in context.metadata) {
          fieldValue = context.metadata[condition.field];
        } else {
          return false;
        }
  
        if (!this.evaluateCondition(fieldValue, condition.operator, condition.value)) {
          return false;
        }
      }
      
      return true;
    }
  
    private evaluateCondition(
      fieldValue: any,
      operator: string,
      conditionValue: any
    ): boolean {
      switch (operator) {
        case 'equals':
          return fieldValue === conditionValue;
        case 'contains':
          return String(fieldValue).includes(String(conditionValue));
        case 'matches':
          if (conditionValue === 'profanity_pattern') {
            return this.containsProfanity(String(fieldValue));
          }
          if (conditionValue === 'pii_pattern') {
            return this.containsPII(String(fieldValue));
          }
          return new RegExp(conditionValue).test(String(fieldValue));
        case 'greater':
          return Number(fieldValue) > Number(conditionValue);
        case 'less':
          return Number(fieldValue) < Number(conditionValue);
        default:
          return false;
      }
    }
  
    private async executeAction(
      action: GatekeeperRule['action'],
      content: string,
      context: GatekeeperContext
    ): Promise<{ blocked: boolean; modified: boolean; content: string }> {
      switch (action.type) {
        case 'block':
          return { blocked: true, modified: false, content };
          
        case 'modify':
          if (action.params?.replacement) {
            const modifiedContent = this.replaceProfanity(content);
            return { blocked: false, modified: true, content: modifiedContent };
          }
          if (action.params?.mask) {
            const maskedContent = this.maskPII(content);
            return { blocked: false, modified: true, content: maskedContent };
          }
          return { blocked: false, modified: false, content };
          
        case 'log':
          console.log('Gatekeeper log:', { context, action });
          return { blocked: false, modified: false, content };
          
        default:
          return { blocked: false, modified: false, content };
      }
    }
  
    private applyContentFilters(content: string): {
      modified: boolean;
      content: string;
      violations: string[];
    } {
      let modified = false;
      let filteredContent = content;
      const violations: string[] = [];
  
      for (const [type, pattern] of this.contentFilters) {
        if (pattern.test(filteredContent)) {
          violations.push(`Detected ${type}`);
          filteredContent = filteredContent.replace(pattern, '[REDACTED]');
          modified = true;
        }
      }
  
      return { modified, content: filteredContent, violations };
    }
  
    private containsProfanity(text: string): boolean {
      // Simplified profanity check - would use a proper library in production
      const profanityList = ['badword1', 'badword2']; // Would be comprehensive
      const lowercaseText = text.toLowerCase();
      return profanityList.some(word => lowercaseText.includes(word));
    }
  
    private replaceProfanity(text: string): string {
      // Would use a proper profanity filter library
      return text.replace(/badword/gi, '****');
    }
  
    private containsPII(text: string): boolean {
      for (const [, pattern] of this.contentFilters) {
        if (pattern.test(text)) {
          return true;
        }
      }
      return false;
    }
  
    private maskPII(text: string): string {
      let maskedText = text;
      for (const [type, pattern] of this.contentFilters) {
        maskedText = maskedText.replace(pattern, `[${type.toUpperCase()}]`);
      }
      return maskedText;
    }
  
    addRule(rule: GatekeeperRule): void {
      this.rules.push(rule);
    }
  
    removeRule(ruleId: string): void {
      this.rules = this.rules.filter(r => r.id !== ruleId);
    }
  
    updateRule(ruleId: string, updates: Partial<GatekeeperRule>): void {
      const index = this.rules.findIndex(r => r.id === ruleId);
      if (index !== -1) {
        this.rules[index] = { ...this.rules[index], ...updates };
      }
    }
    private notifyViolations(violation: any): void {
        this.violationCallbacks.forEach(callback => callback(violation));
      }
    
      onViolation(callback: (violation: any) => void): () => void {
        this.violationCallbacks.add(callback);
        return () => this.violationCallbacks.delete(callback);
      }
    }
    
    export const gatekeeperService = new GatekeeperService();