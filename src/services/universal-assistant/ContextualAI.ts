import { ContextTracker } from './ContextTracker';
import { AIService } from './AIService';
import { AIModel } from '@/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export class ContextualAIService {
    private contextTracker: ContextTracker;
    private aiService: AIService;
    
    constructor(contextTracker: ContextTracker, aiService: AIService) {
      this.contextTracker = contextTracker;
      this.aiService = aiService;
    }
    
    async generateContextualResponse(
      prompt: string,
      conversationHistory: Message[]
    ): Promise<string> {
      const context = this.contextTracker.generateContextSummary();
      const recentTopics = this.contextTracker.getTopKeywords(5);
      
      const enhancedPrompt = `
        Context: ${context}
        Recent topics: ${recentTopics.join(', ')}
        Conversation history: ${this.formatHistory(conversationHistory)}
        
        User query: ${prompt}
        
        Provide a response that considers the context and recent discussion topics.
      `;
      
      const response = await this.aiService.generateResponse(enhancedPrompt, 'gpt-5-mini' as AIModel, []);
      return response.text;
    }

    private formatHistory(conversationHistory: Message[]): string {
      return conversationHistory
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
    }
  }