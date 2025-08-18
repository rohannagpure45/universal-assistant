/**
 * DeepgramSTT Service - Real-time Speech-to-Text using WebSocket Connection
 * 
 * This service establishes a direct WebSocket connection to the Deepgram API for real-time
 * speech transcription. It handles:
 * - Direct WebSocket connection to wss://api.deepgram.com/v1/listen
 * - Audio chunk processing from AudioManager (receives ArrayBuffer from Blob conversion)
 * - Connection lifecycle management (open, close, error, reconnect)
 * - Automatic reconnection with exponential backoff
 * - Heartbeat/keepalive mechanism to maintain connection
 * - Comprehensive logging and connection status tracking
 * - Proper transcription result parsing and emission for FragmentProcessor
 * 
 * Audio Flow: AudioManager (Blob) → ArrayBuffer → WebSocket → Deepgram → TranscriptionResult
 */

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  timestamp: number;
  isFinal: boolean;
  speaker?: number;
}

export interface ConnectionStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';
  error?: string;
  reconnectAttempts?: number;
}

export class DeepgramSTT {
  private apiKey: string;
  private websocket: WebSocket | null = null;
  private onTranscription: ((result: TranscriptionResult) => void) | null = null;
  private onInterimTranscription: ((result: TranscriptionResult) => void) | null = null;
  private onConnectionChange: ((status: ConnectionStatus) => void) | null = null;
  private connectionStatus: ConnectionStatus = { status: 'disconnected' };
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000; // Start with 1 second
  private maxReconnectDelay: number = 30000; // Max 30 seconds
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private heartbeatInterval: number = 30000; // 30 seconds
  private isIntentionalDisconnect: boolean = false;
  // Audio chunk logging throttling
  private audioChunkCount: number = 0;
  private audioChunkLogThrottle: number = 10;
  // Performance optimization: chunk queue and batching
  private chunkQueue: ArrayBuffer[] = [];
  private isProcessingQueue: boolean = false;
  private queueTimer: NodeJS.Timeout | null = null;
  // Recent final suppression to avoid duplicated finals from the API
  private recentFinalKeys: Map<string, number> = new Map();
  private recentFinalTtlMs: number = 10000;
  private recentFinalTexts: Map<string, number> = new Map();
  private recentFinalTextTtlMs: number = 5000;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async startLiveTranscription(options?: {
    model?: string;
    language?: string;
    punctuate?: boolean;
    diarize?: boolean;
    smart_format?: boolean;
    utterances?: boolean;
  }): Promise<void> {
    try {
      console.log('[DeepgramSTT] Starting live transcription...');
      this.isIntentionalDisconnect = false;
      this.reconnectAttempts = 0;
      this.audioChunkCount = 0; // Reset chunk counter for new session
      
      await this.establishWebSocketConnection(options);
    } catch (error) {
      console.error('[DeepgramSTT] Failed to start live transcription:', error);
      this.updateConnectionStatus({ 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  private async establishWebSocketConnection(options?: {
    model?: string;
    language?: string;
    punctuate?: boolean;
    diarize?: boolean;
    smart_format?: boolean;
    utterances?: boolean;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log('[DeepgramSTT] Establishing WebSocket connection...');
        this.updateConnectionStatus({ status: 'connecting' });

        // Build WebSocket URL with required parameters (configured for WebM/Opus containerized audio)
        // Note: For containerized audio like WebM, Deepgram reads container headers automatically
        // so we don't set encoding/sample_rate for WebM format
        const wsUrl = new URL('wss://api.deepgram.com/v1/listen');
        // wsUrl.searchParams.set('encoding', 'linear16'); // Removed for WebM container format
        // wsUrl.searchParams.set('sample_rate', '16000'); // Removed for WebM container format
        // wsUrl.searchParams.set('channels', '1'); // Removed for WebM container format
        wsUrl.searchParams.set('model', options?.model || 'nova-2');
        wsUrl.searchParams.set('language', options?.language || 'en-US');
        wsUrl.searchParams.set('smart_format', String(options?.smart_format !== false));
        wsUrl.searchParams.set('diarize', String(options?.diarize !== false));
        wsUrl.searchParams.set('punctuate', String(options?.punctuate !== false));
        wsUrl.searchParams.set('interim_results', 'true');
        
        if (options?.utterances) {
          wsUrl.searchParams.set('utterances', 'true');
        }

        console.log('[DeepgramSTT] WebSocket URL:', wsUrl.toString());
        console.log('[DeepgramSTT] Audio format configuration (WebM containerized):', {
          encoding: 'auto-detected from WebM container',
          sample_rate: 'auto-detected from WebM container', 
          channels: 'auto-detected from WebM container',
          model: wsUrl.searchParams.get('model'),
          language: wsUrl.searchParams.get('language')
        });

        // Use subprotocol authentication as required by Deepgram for browser WebSocket connections
        // Reference: https://developers.deepgram.com/docs/using-the-sec-websocket-protocol
        console.log('[DeepgramSTT] Using subprotocol authentication with token');

        // Create WebSocket connection using subprotocol authentication (Deepgram standard)
        this.websocket = new WebSocket(wsUrl.toString(), ['token', this.apiKey]);

        // Set up connection timeout
        const connectionTimeout = setTimeout(() => {
          console.error('[DeepgramSTT] Connection timeout');
          if (this.websocket && this.websocket.readyState === WebSocket.CONNECTING) {
            this.websocket.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000);

        this.websocket.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log('[DeepgramSTT] WebSocket connection established');
          this.updateConnectionStatus({ status: 'connected' });
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          
          // PERFORMANCE OPTIMIZATION: Process any queued chunks
          if (this.chunkQueue.length > 0) {
            console.log(`[DeepgramSTT] Processing ${this.chunkQueue.length} queued audio chunks`);
            this.processChunkQueue();
          }
          
          resolve();
        };

        this.websocket.onmessage = (event) => {
          this.handleWebSocketMessage(event);
        };

        this.websocket.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error('[DeepgramSTT] WebSocket error:', error);
          this.updateConnectionStatus({ 
            status: 'error', 
            error: 'WebSocket connection error' 
          });
          
          if (this.websocket?.readyState === WebSocket.CONNECTING) {
            reject(new Error('WebSocket connection failed'));
          }
        };

        this.websocket.onclose = (event) => {
          clearTimeout(connectionTimeout);
          console.log('[DeepgramSTT] WebSocket connection closed:', event.code, event.reason);
          this.stopHeartbeat();
          
          if (!this.isIntentionalDisconnect) {
            this.updateConnectionStatus({ status: 'disconnected' });
            this.attemptReconnection(options);
          } else {
            this.updateConnectionStatus({ status: 'disconnected' });
          }
        };

      } catch (error) {
        console.error('[DeepgramSTT] Error creating WebSocket:', error);
        reject(error);
      }
    });
  }

  sendAudioChunk(chunk: ArrayBuffer): void {
    // PERFORMANCE OPTIMIZATION: Queue chunks for batch processing
    this.chunkQueue.push(chunk);
    this.audioChunkCount++;
    
    // Process queue immediately if WebSocket is ready, otherwise queue will be processed when connection is ready
    if (!this.isProcessingQueue) {
      this.processChunkQueue();
    }
  }

  private processChunkQueue(): void {
    if (this.isProcessingQueue || this.chunkQueue.length === 0) {
      return;
    }
    
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.isProcessingQueue = true;
      
      try {
        // Send all queued chunks
        const chunksToSend = [...this.chunkQueue];
        this.chunkQueue = [];
        
        for (const chunk of chunksToSend) {
          this.websocket.send(chunk);
        }
        
        // Optimized logging: only log every 20th batch with summary info
        if (this.audioChunkCount % 20 === 0) {
          console.log(`[DeepgramSTT] Sent batch: ${chunksToSend.length} chunks, total processed: ${this.audioChunkCount}`);
          
          // Detailed analysis only every 100th chunk for performance
          if (this.audioChunkCount % 100 === 0) {
            const lastChunk = chunksToSend[chunksToSend.length - 1];
            if (lastChunk) {
              const totalBytes = chunksToSend.reduce((sum, c) => sum + c.byteLength, 0);
              console.log(`[DeepgramSTT] Batch analysis:`, {
                batchSize: chunksToSend.length,
                totalBytes,
                avgChunkSize: Math.round(totalBytes / chunksToSend.length),
                lastChunkSize: lastChunk.byteLength
              });
            }
          }
        }
      } catch (error) {
        console.error('[DeepgramSTT] Error processing chunk queue:', error);
      } finally {
        this.isProcessingQueue = false;
        
        // If more chunks were queued while processing, schedule next batch
        if (this.chunkQueue.length > 0) {
          setTimeout(() => this.processChunkQueue(), 5);
        }
      }
    } else {
      // WebSocket not ready, queue will be processed when connection is established
      if (this.audioChunkCount % 50 === 0) {
        console.warn(`[DeepgramSTT] WebSocket not ready (${this.getWebSocketStateString()}), queueing ${this.chunkQueue.length} chunks`);
      }
    }
  }

  private getWebSocketStateString(): string {
    if (!this.websocket) return 'null';
    switch (this.websocket.readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'OPEN';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }

  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      console.log('[DeepgramSTT] Received message:', data);

      // Enhanced debugging for Results processing
      if (data.channel && data.channel.alternatives) {
        console.log(`[DeepgramSTT] Processing Results message with ${data.channel.alternatives.length} alternatives`);
        
        if (data.channel.alternatives.length > 0) {
          const alternative = data.channel.alternatives[0];
          console.log('[DeepgramSTT] Alternative data:', {
            transcript: alternative.transcript,
            transcriptLength: alternative.transcript?.length || 0,
            transcriptTrimmed: alternative.transcript?.trim(),
            confidence: alternative.confidence,
            hasOnTranscription: !!this.onTranscription
          });
          
          if (alternative.transcript && alternative.transcript.trim()) {
            const result: TranscriptionResult = {
              transcript: alternative.transcript,
              confidence: alternative.confidence || 0,
              timestamp: Date.now(),
              isFinal: data.is_final || false,
              speaker: this.extractSpeakerId(alternative)
            };

            // CRITICAL FIX: Filter interim results to prevent duplicates
            if (result.isFinal) {
              // Build a stable key to detect duplicate finals quickly
              try {
                const normalized = (alternative.transcript || '').replace(/\s+/g, ' ').trim().toLowerCase();
                const start = typeof (data.start) === 'number' ? data.start : alternative.words?.[0]?.start || 0;
                const duration = typeof (data.duration) === 'number' ? data.duration : 0;
                const segStart = Math.max(0, Math.round(start * 100) / 100);
                const segEnd = Math.max(segStart, Math.round((start + duration) * 100) / 100);
                const key = `${segStart}|${segEnd}|${normalized}`;

                // Purge expired entries
                const nowMs = Date.now();
                for (const [k, ts] of this.recentFinalKeys.entries()) {
                  if (nowMs - ts > this.recentFinalTtlMs) this.recentFinalKeys.delete(k);
                }
                for (const [k, ts] of this.recentFinalTexts.entries()) {
                  if (nowMs - ts > this.recentFinalTextTtlMs) this.recentFinalTexts.delete(k);
                }

                if (this.recentFinalKeys.has(key)) {
                  console.log('[DeepgramSTT] Suppressing duplicate FINAL (dedup key hit):', key);
                  return; // Do not forward duplicate final
                }
                this.recentFinalKeys.set(key, nowMs);

                // Secondary guard: suppress identical normalized text repeated within short window
                if (this.recentFinalTexts.has(normalized)) {
                  console.log('[DeepgramSTT] Suppressing duplicate FINAL (text window):', normalized);
                  this.recentFinalTexts.set(normalized, nowMs); // refresh
                  return;
                }
                this.recentFinalTexts.set(normalized, nowMs);
              } catch (e) {
                console.warn('[DeepgramSTT] Final dedup key generation failed, proceeding without suppression');
              }
              // Only send final results to FragmentProcessor to prevent duplicates
              if (this.onTranscription) {
                console.log('[DeepgramSTT] Sending FINAL transcript to FragmentProcessor:', result.transcript);
                console.log('[DeepgramSTT] Full transcription result:', result);
                this.onTranscription(result);
              } else {
                console.warn('[DeepgramSTT] No transcription handler set! Cannot send transcript to FragmentProcessor');
              }
            } else {
              // Send interim results to separate callback for real-time UI updates
              if (this.onInterimTranscription) {
                console.log('[DeepgramSTT] Sending INTERIM transcript for UI updates:', result.transcript);
                this.onInterimTranscription(result);
              }
            }
          } else {
            console.log('[DeepgramSTT] Transcript is empty or whitespace only, skipping');
          }
        } else {
          console.log('[DeepgramSTT] No alternatives in channel data');
        }
      }

      // Handle metadata/status messages
      if (data.metadata) {
        console.log('[DeepgramSTT] Metadata received:', data.metadata);
      }

      // Handle error messages
      if (data.error) {
        console.error('[DeepgramSTT] Deepgram error:', data.error);
        this.updateConnectionStatus({ 
          status: 'error', 
          error: data.error 
        });
      }

    } catch (error) {
      console.error('[DeepgramSTT] Error parsing WebSocket message:', error);
    }
  }

  private extractSpeakerId(alternative: any): number | undefined {
    // Try to get speaker ID from words array
    if (alternative.words && alternative.words.length > 0) {
      const firstWord = alternative.words[0];
      if (firstWord.speaker !== undefined) {
        return firstWord.speaker;
      }
    }
    
    // Fallback: try to get speaker from alternative level
    if (alternative.speaker !== undefined) {
      return alternative.speaker;
    }
    
    return undefined;
  }

  stopTranscription(): void {
    console.log('[DeepgramSTT] Stopping transcription...');
    this.isIntentionalDisconnect = true;
    
    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.stopHeartbeat();
    
    // Close WebSocket connection
    if (this.websocket && this.websocket.readyState !== WebSocket.CLOSED) {
      this.websocket.close(1000, 'Transcription stopped by user');
      this.websocket = null;
    }
    
    this.updateConnectionStatus({ status: 'disconnected' });
    console.log('[DeepgramSTT] Transcription stopped');
  }

  private startHeartbeat(): void {
    this.stopHeartbeat(); // Clear any existing heartbeat
    
    this.heartbeatTimer = setInterval(() => {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        try {
          // Send keepalive message
          const keepAlive = JSON.stringify({ type: 'KeepAlive' });
          this.websocket.send(keepAlive);
          console.log('[DeepgramSTT] Sent heartbeat');
        } catch (error) {
          console.error('[DeepgramSTT] Error sending heartbeat:', error);
          this.updateConnectionStatus({ 
            status: 'error', 
            error: 'Heartbeat failed' 
          });
        }
      }
    }, this.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private attemptReconnection(options?: any): void {
    if (this.isIntentionalDisconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[DeepgramSTT] Max reconnection attempts reached');
        this.updateConnectionStatus({ 
          status: 'error', 
          error: 'Max reconnection attempts reached' 
        });
      }
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    console.log(`[DeepgramSTT] Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    this.updateConnectionStatus({ 
      status: 'reconnecting', 
      reconnectAttempts: this.reconnectAttempts 
    });

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.establishWebSocketConnection(options);
        console.log('[DeepgramSTT] Reconnection successful');
      } catch (error) {
        console.error('[DeepgramSTT] Reconnection failed:', error);
        this.attemptReconnection(options); // Try again
      }
    }, delay);
  }

  private updateConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatus = { ...status };
    console.log('[DeepgramSTT] Connection status:', this.connectionStatus);
    
    if (this.onConnectionChange) {
      this.onConnectionChange(this.connectionStatus);
    }
  }

  setTranscriptionHandler(handler: (result: TranscriptionResult) => void): void {
    this.onTranscription = handler;
  }

  setConnectionChangeHandler(handler: (status: ConnectionStatus) => void): void {
    this.onConnectionChange = handler;
  }

  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  isConnected(): boolean {
    return this.connectionStatus.status === 'connected';
  }

  isConnecting(): boolean {
    return this.connectionStatus.status === 'connecting' || 
           this.connectionStatus.status === 'reconnecting';
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  // For backward compatibility - this method no longer uses the Deepgram SDK
  async transcribeFile(audioFile: File): Promise<TranscriptionResult> {
    console.warn('[DeepgramSTT] transcribeFile method is not available in WebSocket mode');
    throw new Error('File transcription is not supported in real-time WebSocket mode. Use the REST API endpoint instead.');
  }

  // Cleanup method for proper resource management
  cleanup(): void {
    console.log('[DeepgramSTT] Cleaning up resources...');
    this.stopTranscription();
    this.onTranscription = null;
    this.onConnectionChange = null;
  }

  // For debugging and monitoring
  getWebSocketState(): string {
    return this.getWebSocketStateString();
  }

  // Method to manually trigger reconnection (useful for testing)
  async forceReconnect(options?: {
    model?: string;
    language?: string;
    punctuate?: boolean;
    diarize?: boolean;
    smart_format?: boolean;
    utterances?: boolean;
  }): Promise<void> {
    console.log('[DeepgramSTT] Force reconnecting...');
    this.isIntentionalDisconnect = true; // Prevent auto-reconnection
    
    if (this.websocket && this.websocket.readyState !== WebSocket.CLOSED) {
      this.websocket.close(1000, 'Force reconnect');
    }
    
    // Reset reconnection state
    this.reconnectAttempts = 0;
    this.isIntentionalDisconnect = false;
    
    // Wait a bit before reconnecting
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return this.establishWebSocketConnection(options);
  }
}