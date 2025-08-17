export class CacheManager {
    private ttsCache: Map<string, string> = new Map();
    private transcriptCache: Map<string, string> = new Map();
    private maxCacheSize = 100;
    
    async getCachedTTS(text: string): Promise<string | null> {
      const hash = await this.hashText(text);
      return this.ttsCache.get(hash) || null;
    }
    
    async cacheTTS(text: string, audioUrl: string): Promise<void> {
      const hash = await this.hashText(text);
      this.ttsCache.set(hash, audioUrl);
      this.pruneCache(this.ttsCache);
    }
    
    private async hashText(text: string): Promise<string> {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
    
    private pruneCache(cache: Map<string, any>): void {
      if (cache.size > this.maxCacheSize) {
        const toDelete = cache.size - this.maxCacheSize;
        const keys = Array.from(cache.keys());
        for (let i = 0; i < toDelete; i++) {
          cache.delete(keys[i]);
        }
      }
    }
  }