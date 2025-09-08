/**
 * CleanupRegistry - Utility for managing resource cleanup
 * 
 * Surgical fix for memory leaks - tracks and executes cleanup functions
 * for WebSockets, audio contexts, media streams, and other resources.
 */
export class CleanupRegistry {
  private cleanups: Set<() => void | Promise<void>> = new Set();
  private isCleaningUp = false;
  
  /**
   * Register a cleanup function
   */
  register(cleanup: () => void | Promise<void>): void {
    if (!this.isCleaningUp) {
      this.cleanups.add(cleanup);
    }
  }
  
  /**
   * Unregister a cleanup function
   */
  unregister(cleanup: () => void | Promise<void>): void {
    this.cleanups.delete(cleanup);
  }
  
  /**
   * Execute all cleanup functions
   */
  async cleanupAll(): Promise<void> {
    if (this.isCleaningUp) return;
    
    this.isCleaningUp = true;
    
    const promises = Array.from(this.cleanups).map(async (cleanup) => {
      try {
        const result = cleanup();
        if (result instanceof Promise) {
          await result;
        }
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    });
    
    await Promise.all(promises);
    this.cleanups.clear();
    this.isCleaningUp = false;
  }
  
  /**
   * Get number of registered cleanups
   */
  get size(): number {
    return this.cleanups.size;
  }
  
  /**
   * Check if registry is empty
   */
  get isEmpty(): boolean {
    return this.cleanups.size === 0;
  }
}