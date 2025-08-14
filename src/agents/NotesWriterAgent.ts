import { Agent, AgentContext, AgentResult, AgentType } from '@/types/agent/agentInterface';

export class NotesWriterAgent implements Agent {
  id = 'notes_writer_agent';
  name = 'Notes Writer Agent';
  type = AgentType.NOTES_WRITER;

  permissions = {
    read: [],
    write: ['/meetings/{meetingId}/notes'],
    execute: ['appendNote'],
  };

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const note = await this.generateNote(context);
      await this.appendToNotes(context.meetingId || 'unknown', note);

      return {
        success: true,
        data: { note, timestamp: new Date().toISOString() },
        operations: ['write'],
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  private async generateNote(context: AgentContext): Promise<string> {
    const parts: string[] = [];
    if (context.transcript) parts.push(context.transcript);
    if (context.keywords?.length) parts.push(`Keywords: ${context.keywords.join(', ')}`);
    return parts.join('\n');
  }

  private async appendToNotes(meetingId: string, note: string): Promise<void> {
    // Placeholder: integrate with Firestore if needed
    void meetingId; void note;
  }
}

export const notesWriterAgent = new NotesWriterAgent();


