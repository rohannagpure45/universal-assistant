interface ContextEntry {
    keyword: string;
    frequency: number;
    lastMentioned: Date;
    speakerIds: Set<string>;
    relatedTerms: string[];
  }

class KeywordExtractor {
  async extract(text: string): Promise<string[]> {
    // Simple keyword extraction - split by spaces and filter common words
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them']);
    
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.has(word))
      .slice(0, 10); // Limit to top 10 keywords
  }
}
  
  export class ContextTracker {
    private contextMap: Map<string, ContextEntry> = new Map();
    private keywordExtractor: KeywordExtractor;
    private maxContextSize = 100;
    
    constructor() {
      this.keywordExtractor = new KeywordExtractor();
    }
    
    async processTranscript(
      text: string,
      speakerId: string
    ): Promise<void> {
      const keywords = await this.keywordExtractor.extract(text);
      
      keywords.forEach((keyword: string) => {
        if (this.contextMap.has(keyword)) {
          const entry = this.contextMap.get(keyword)!;
          entry.frequency++;
          entry.lastMentioned = new Date();
          entry.speakerIds.add(speakerId);
        } else {
          this.contextMap.set(keyword, {
            keyword,
            frequency: 1,
            lastMentioned: new Date(),
            speakerIds: new Set([speakerId]),
            relatedTerms: []
          });
        }
      });
      
      this.pruneOldContext();
    }
    
    private pruneOldContext(): void {
      if (this.contextMap.size > this.maxContextSize) {
        const entries = Array.from(this.contextMap.entries());
        entries.sort((a, b) => b[1].frequency - a[1].frequency);
        
        const toKeep = entries.slice(0, this.maxContextSize);
        this.contextMap = new Map(toKeep);
      }
    }
    
    getTopKeywords(limit: number = 10): string[] {
      const entries = Array.from(this.contextMap.values());
      entries.sort((a, b) => b.frequency - a.frequency);
      return entries.slice(0, limit).map(e => e.keyword);
    }
    
    generateContextSummary(): string {
      const topKeywords = this.getTopKeywords(15);
      return `Current discussion topics: ${topKeywords.join(', ')}`;
    }
  }