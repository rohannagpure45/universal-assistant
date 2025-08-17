import { Agent, AgentContext, AgentResult, AgentType } from '@/types/agent/agentInterface';

export class ContextSourcingAgent implements Agent {
  id = 'context_sourcing_agent';
  name = 'Context Sourcing Agent';
  type = AgentType.CONTEXT_SOURCING;

  permissions = {
    read: ['/customRules', '/meetings'],
    write: [],
    execute: ['searchContext', 'extractKeywords'],
  };

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const meetingType = context.meetingType || 'general';
      const transcript = context.transcript || '';

      const rules = await this.fetchRulesForMeetingType(meetingType);
      const extractedContext = await this.applyRules(rules, transcript);

      return {
        success: true,
        data: extractedContext,
        metadata: {
          rulesApplied: rules.length,
          keywordsExtracted: extractedContext.keywords?.length || 0,
        },
        operations: ['read', 'execute'],
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  private async fetchRulesForMeetingType(meetingType: string): Promise<Array<Record<string, any>>> {
    // Placeholder: integrate with Firestore customRules if needed
    return [
      { id: 'keyword_extraction', type: 'keyword', weight: 1 },
      { id: 'action_items', type: 'pattern', pattern: /(action|todo|next steps)/i },
    ];
  }

  private async applyRules(rules: Array<Record<string, any>>, text: string): Promise<{ keywords: string[]; actionMentions: string[] }> {
    const keywords = this.extractKeywords(text);
    const actionMentions = (text.match(/(action|todo|next steps)/gi) || []).map(s => s.toLowerCase());
    return { keywords, actionMentions };
  }

  private extractKeywords(text: string): string[] {
    const common = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','is','are','was','were']);
    return Array.from(
      new Set(
        text
          .toLowerCase()
          .split(/[^a-zA-Z]+/)
          .filter(w => w.length > 2 && !common.has(w))
      )
    ).slice(0, 15);
  }
}

export const contextSourcingAgent = new ContextSourcingAgent();


