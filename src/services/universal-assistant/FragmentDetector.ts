export interface FragmentAnalysis {
    isComplete: boolean;
    confidence: number;
    type: 'statement' | 'question' | 'fragment' | 'interjection';
    suggestedAction: 'wait' | 'respond' | 'clarify';
  }
  
  export class FragmentDetector {
    private sentenceEnders = /[.!?]$/;
    private questionWords = /^(what|when|where|who|why|how|is|are|can|could|would|should|do|does|did)/i;
    private fragmentIndicators = /^(um|uh|like|so|well|yeah|yes|no|okay|oh)/i;
    private minimumWordCount = 3;
  
    analyzeUtterance(text: string, context?: {
      previousUtterances?: string[];
      speakerPaused?: boolean;
      pauseDuration?: number;
    }): FragmentAnalysis {
      const trimmedText = text.trim();
      const wordCount = trimmedText.split(/\s+/).length;
      
      // Check for sentence completeness
      const hasEndPunctuation = this.sentenceEnders.test(trimmedText);
      const isQuestion = this.questionWords.test(trimmedText);
      const isFragment = this.fragmentIndicators.test(trimmedText) || wordCount < this.minimumWordCount;
      
      // Calculate confidence based on multiple factors
      let confidence = 0.5;
      
      if (hasEndPunctuation) confidence += 0.3;
      if (wordCount >= 5) confidence += 0.2;
      if (context?.speakerPaused && (context.pauseDuration || 0) > 1000) confidence += 0.2;
      if (isFragment) confidence -= 0.3;
      
      confidence = Math.max(0, Math.min(1, confidence));
      
      // Determine type
      let type: FragmentAnalysis['type'] = 'fragment';
      if (isQuestion) type = 'question';
      else if (hasEndPunctuation && wordCount >= this.minimumWordCount) type = 'statement';
      else if (wordCount < 2) type = 'interjection';
      
      // Suggest action
      let suggestedAction: FragmentAnalysis['suggestedAction'] = 'wait';
      if (confidence > 0.7 && type !== 'fragment') {
        suggestedAction = 'respond';
      } else if (confidence < 0.3 && context?.speakerPaused) {
        suggestedAction = 'clarify';
      }
      
      return {
        isComplete: confidence > 0.6 && type !== 'fragment',
        confidence,
        type,
        suggestedAction,
      };
    }
  
    detectConversationEnd(utterances: string[], pauseDuration: number): boolean {
      if (utterances.length === 0) return false;
      
      const lastUtterance = utterances[utterances.length - 1];
      const analysis = this.analyzeUtterance(lastUtterance, { pauseDuration });
      
      // Check for conversation ending patterns
      const endingPhrases = /\b(goodbye|bye|see you|talk to you later|have a good|take care|thanks|thank you)\b/i;
      const hasEndingPhrase = endingPhrases.test(lastUtterance);
      
      return (
        hasEndingPhrase ||
        (analysis.isComplete && pauseDuration > 3000) ||
        (analysis.type === 'statement' && pauseDuration > 5000)
      );
    }
  }