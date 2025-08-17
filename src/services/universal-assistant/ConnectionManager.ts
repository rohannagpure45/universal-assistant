export class ConnectionManager {
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    
    async maintainConnection(): Promise<void> {
      try {
        await this.connect();
      } catch (error) {
        await this.handleConnectionError(error);
      }
    }
    
    private async handleConnectionError(error: any): Promise<void> {
      console.error('Connection error:', error);
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return this.maintainConnection();
      } else {
        throw new Error('Max reconnection attempts reached');
      }
    }
    
    private async connect(): Promise<void> {
      // Connection logic here
      this.reconnectAttempts = 0; // Reset on successful connection
    }
  }