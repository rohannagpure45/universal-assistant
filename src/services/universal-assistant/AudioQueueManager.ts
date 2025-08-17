interface QueuedAudio {
    id: string;
    url: string;
    priority: number;
    timestamp: Date;
    interruptible: boolean;
    onComplete?: () => void;
  }

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}
  
  export class AudioQueueManager {
    private queue: QueuedAudio[] = [];
    private currentlyPlaying: QueuedAudio | null = null;
    private audioElement: HTMLAudioElement;
    
    constructor() {
      this.audioElement = new Audio();
      this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
      this.audioElement.addEventListener('ended', () => {
        this.onAudioEnded();
      });
      
      this.audioElement.addEventListener('error', (error) => {
        console.error('Audio playback error:', error);
        this.playNext();
      });
    }

    private onAudioEnded(): void {
      if (this.currentlyPlaying?.onComplete) {
        this.currentlyPlaying.onComplete();
      }
      this.playNext();
    }
    
    async enqueue(
      url: string,
      options: Partial<QueuedAudio> = {}
    ): Promise<void> {
      const audio: QueuedAudio = {
        id: generateId(),
        url,
        priority: options.priority || 5,
        timestamp: new Date(),
        interruptible: options.interruptible ?? true,
        onComplete: options.onComplete
      };
      
      this.queue.push(audio);
      this.queue.sort((a, b) => b.priority - a.priority);
      
      if (!this.currentlyPlaying) {
        await this.playNext();
      }
    }
    
    private async playNext(): Promise<void> {
      if (this.queue.length === 0) {
        this.currentlyPlaying = null;
        return;
      }
      
      const audio = this.queue.shift()!;
      this.currentlyPlaying = audio;
      
      try {
        this.audioElement.src = audio.url;
        await this.audioElement.play();
      } catch (error) {
        console.error('Failed to play audio:', error);
        this.playNext();
      }
    }
    
    stopAll(): void {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.queue = [];
      this.currentlyPlaying = null;
    }
    
    interrupt(): void {
      if (this.currentlyPlaying?.interruptible) {
        this.stopAll();
      }
    }
  }