# Phase 4 AI Integration API Documentation

## Overview

This documentation covers the comprehensive API routes for Phase 4 AI integration, built upon the existing Universal Assistant infrastructure. All APIs include Firebase authentication, rate limiting, cost tracking, and advanced error handling.

## Base URL
```
https://your-domain.com/api/universal-assistant
```

## Authentication

All endpoints require Firebase ID token authentication via Bearer token:

```http
Authorization: Bearer <firebase-id-token>
```

## Common Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "latency": 250,
    "requestId": "req-123",
    "model": "claude-sonnet-4-20250514",
    "tokensUsed": 150,
    "cost": 0.0023
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": { ... },
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req-123"
  }
}
```

## Rate Limits

| Endpoint | Rate Limit | Window |
|----------|------------|--------|
| `/ai-response` | 60 requests/minute | Per user |
| `/agent-execute` | 30 requests/minute | Per user |
| `/context` | 100 requests/minute | Per user |
| `/rules` | 50 requests/minute | Per user |
| `/mcp` | 20 requests/minute | Per user |

---

## 1. Enhanced AI Response API

### POST `/api/universal-assistant/ai-response`

Generate AI responses with multi-model processing, streaming support, and cost tracking.

#### Request Body
```json
{
  "text": "User input text to process",
  "context": {
    "meetingType": "technical_discussion",
    "meetingId": "meeting-123",
    "participants": [
      {
        "id": "user-1",
        "name": "Alice",
        "role": "developer"
      }
    ],
    "conversationHistory": [
      {
        "speaker": "Alice",
        "text": "Previous message",
        "timestamp": "2024-01-15T10:29:00Z"
      }
    ],
    "sessionId": "session-456",
    "priority": "normal"
  },
  "model": "claude-sonnet-4-20250514",
  "options": {
    "maxTokens": 1000,
    "temperature": 0.7,
    "streaming": true,
    "fallbackEnabled": true,
    "costBudget": 0.05,
    "timeout": 30000,
    "priority": "normal"
  }
}
```

#### Response (Non-streaming)
```json
{
  "success": true,
  "data": {
    "text": "AI generated response",
    "model": "claude-sonnet-4-20250514",
    "tokensUsed": 150,
    "inputTokens": 75,
    "cost": 0.0023,
    "fallbackUsed": false,
    "context": { ... }
  },
  "metadata": {
    "latency": 1250,
    "requestId": "req-123",
    "model": "claude-sonnet-4-20250514",
    "tokensUsed": 150,
    "cost": 0.0023
  }
}
```

#### Streaming Response
When `streaming: true`, returns Server-Sent Events:

```
data: {"type":"start","data":{"requestId":"req-123","model":"claude-sonnet-4-20250514"}}

data: {"type":"chunk","data":{"text":"Hello","fullText":"Hello","tokens":1}}

data: {"type":"end","data":{"fullResponse":"Hello world","totalTokens":150,"latency":1250}}
```

#### Features
- **Multi-model Support**: Supports all configured AI models with automatic fallbacks
- **Cost Management**: Real-time budget checking and cost tracking
- **Streaming**: Server-Sent Events for real-time response streaming
- **Context-Aware**: Intelligent context building and preservation
- **Performance Monitoring**: Built-in latency and performance tracking

---

## 2. Agent Execution API

### POST `/api/universal-assistant/agent-execute`

Execute agents with task queuing, orchestration, and performance monitoring.

#### Request Body
```json
{
  "agentType": "context-sourcing",
  "task": {
    "type": "extract_context",
    "parameters": {
      "conversationHistory": [...],
      "analysisDepth": "detailed"
    },
    "priority": "normal",
    "timeout": 60000,
    "retryAttempts": 1
  },
  "context": {
    "meetingId": "meeting-123",
    "userId": "user-456",
    "sessionId": "session-789",
    "dependencies": ["task-abc"]
  },
  "options": {
    "async": false,
    "enableMonitoring": true,
    "costBudget": 0.10
  }
}
```

#### Response (Synchronous)
```json
{
  "success": true,
  "data": {
    "taskId": "task-123",
    "status": "completed",
    "result": {
      "extractedTopics": ["API design", "microservices"],
      "keyDecisions": ["Use GraphQL for API"],
      "actionItems": [...]
    },
    "latency": 2500,
    "cost": 0.0034
  }
}
```

#### Response (Asynchronous)
```json
{
  "success": true,
  "data": {
    "taskId": "task-123",
    "status": "queued",
    "estimatedCompletion": "2024-01-15T10:32:00Z"
  }
}
```

### GET `/api/universal-assistant/agent-execute`

Retrieve task status or execution statistics.

#### Query Parameters
- `taskId`: Get specific task status
- `stats=true`: Get execution statistics
- No params: Get all user tasks

#### Response (Task Status)
```json
{
  "success": true,
  "data": {
    "id": "task-123",
    "status": "completed",
    "progress": 100,
    "result": { ... },
    "createdAt": "2024-01-15T10:30:00Z",
    "completedAt": "2024-01-15T10:32:30Z",
    "metadata": {
      "cost": 0.0034,
      "latency": 2500
    }
  }
}
```

### DELETE `/api/universal-assistant/agent-execute?taskId=task-123`

Cancel a running or queued task.

#### Available Agents
- `context-sourcing`: Extract context from conversations
- `meeting-info`: Manage meeting metadata
- `notes-writer`: Generate meeting notes
- `notes-reader`: Retrieve and search notes
- `ruleset-manager`: Manage custom rules
- `speaker-identification`: Identify and analyze speakers
- `conversation-processor`: Process conversation flow

---

## 3. Context Management API

### POST `/api/universal-assistant/context`

Create or update conversation context with intelligent compression.

#### Request Body
```json
{
  "sessionId": "session-123",
  "meetingId": "meeting-456",
  "context": {
    "conversationHistory": [
      {
        "speaker": "Alice",
        "text": "Let's discuss the API design",
        "timestamp": "2024-01-15T10:30:00Z",
        "metadata": {
          "sentiment": "positive",
          "topics": ["API", "design"]
        }
      }
    ],
    "participants": [
      {
        "id": "user-1",
        "name": "Alice",
        "role": "lead developer"
      }
    ],
    "meetingType": "technical_discussion",
    "topics": ["API design", "microservices"],
    "summary": "Discussion about API architecture",
    "metadata": {
      "environment": "development",
      "project": "universal-assistant"
    }
  },
  "options": {
    "compressionLevel": "medium",
    "retentionDays": 30,
    "enableVersioning": true
  }
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "contextId": "ctx-123",
    "sessionId": "session-123",
    "version": 1,
    "compressed": {
      "level": "medium",
      "originalSize": 2048,
      "compressedSize": 512,
      "summary": "Team discussed API design patterns...",
      "keyPoints": ["RESTful architecture", "Authentication strategy"],
      "participants": ["Alice", "Bob"],
      "topics": ["API", "design", "security"]
    },
    "expiresAt": "2024-02-14T10:30:00Z"
  }
}
```

### GET `/api/universal-assistant/context`

Retrieve context with advanced search and filtering.

#### Query Parameters
- `contextId`: Get specific context
- `sessionId`: Get all context for session
- `meetingId`: Get context for meeting
- `search`: Text search in context
- `speakers`: Filter by speakers (comma-separated)
- `topics`: Filter by topics (comma-separated)
- `meetingTypes`: Filter by meeting types
- `timeStart`/`timeEnd`: Date range filter
- `format`: Response format (`full`|`summary`|`minimal`)
- `maxResults`: Maximum results (default: 100)

#### Response
```json
{
  "success": true,
  "data": {
    "contexts": [
      {
        "id": "ctx-123",
        "sessionId": "session-123",
        "compressed": {
          "summary": "Brief summary of the context",
          "topics": ["API", "design"]
        },
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "totalCount": 15
  }
}
```

### DELETE `/api/universal-assistant/context`

Delete context entries.

#### Query Parameters
- `contextId`: Delete specific context
- `sessionId`: Delete all context for session
- `deleteAll=true`: Delete all user context

#### Compression Levels
- **none**: No compression, store full context
- **light**: Basic summarization, ~12.5% compression
- **medium**: Moderate compression with key points, ~6.25% compression  
- **heavy**: Aggressive compression, essential info only, ~3.125% compression

---

## 4. Rules Engine API

### POST `/api/universal-assistant/rules`

Create rules or perform rule operations.

#### Create Rule Request
```json
{
  "name": "Action Item Detector",
  "description": "Automatically highlight action items in conversations",
  "meetingTypes": ["standup", "planning"],
  "conditions": [
    {
      "type": "keyword",
      "field": "text",
      "operator": "contains",
      "value": "action item|todo|follow up",
      "caseSensitive": false
    }
  ],
  "actions": [
    {
      "type": "highlight",
      "parameters": {
        "color": "yellow",
        "priority": "high"
      },
      "priority": "normal"
    }
  ],
  "priority": 80,
  "enabled": true,
  "tags": ["productivity", "tracking"]
}
```

#### Rule Evaluation Request
Add `?action=evaluate` to URL:

```json
{
  "ruleIds": ["rule-123", "rule-456"],
  "context": {
    "text": "We need to follow up on the API documentation",
    "speaker": "Alice",
    "meetingType": "standup",
    "timestamp": "2024-01-15T10:30:00Z",
    "metadata": {
      "sessionId": "session-123"
    }
  },
  "options": {
    "includeDisabled": false,
    "maxResults": 10
  }
}
```

#### Rule Suggestion Request  
Add `?action=suggest` to URL:

```json
{
  "conversationHistory": [
    {
      "speaker": "Alice",
      "text": "Let's schedule a follow-up meeting",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "meetingTypes": ["standup", "planning"],
  "userPreferences": {
    "automate": ["scheduling", "action-tracking"],
    "notifications": true
  }
}
```

### GET `/api/universal-assistant/rules`

Retrieve rules with optional filtering.

#### Query Parameters
- `ruleId`: Get specific rule
- `includeStats=true`: Include usage statistics
- `meetingType`: Filter by meeting type
- `enabled`: Filter by enabled status

### PUT `/api/universal-assistant/rules`

Update existing rule.

### DELETE `/api/universal-assistant/rules?ruleId=rule-123`

Delete rule.

#### Rule Condition Types
- `keyword`: Text matching with operators
- `speaker`: Speaker-based conditions
- `sentiment`: AI-powered sentiment analysis
- `context`: AI-powered contextual matching
- `time`: Time-based conditions
- `pattern`: Regular expression matching

#### Rule Action Types
- `respond`: Generate AI response
- `summarize`: Create summary
- `ignore`: Skip processing
- `highlight`: Visual highlighting
- `notify`: Send notification
- `escalate`: Escalate to human
- `log`: Log for analysis

---

## 5. MCP Integration API

### POST `/api/universal-assistant/mcp`

Execute Model Context Protocol tools.

#### Request Body
```json
{
  "tool": "transcript-analyzer",
  "parameters": {
    "transcript": "Alice: Let's review the API design...",
    "analysisType": "sentiment",
    "context": {
      "meetingType": "technical_discussion"
    }
  },
  "context": {
    "sessionId": "session-123",
    "userId": "user-456",
    "meetingId": "meeting-789"
  },
  "options": {
    "timeout": 30000,
    "retryAttempts": 1,
    "enableCaching": true
  }
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "toolName": "transcript-analyzer",
    "success": true,
    "data": {
      "analysisType": "sentiment",
      "result": "Overall sentiment: Positive (0.85/1.0)...",
      "confidence": 0.85,
      "metadata": {
        "transcriptLength": 1024,
        "model": "gpt-4o-mini"
      }
    },
    "metadata": {
      "executionTime": 1500,
      "cost": 0.0015,
      "cached": false,
      "retryAttempts": 0
    }
  }
}
```

### GET `/api/universal-assistant/mcp`

Get tool information or execution status.

#### Query Parameters
- `action=tools`: List available tools
- `action=execution&executionId=exec-123`: Get execution status
- `action=stats&tool=transcript-analyzer`: Get tool statistics

#### Available MCP Tools

1. **transcript-analyzer**
   - Analyze conversation sentiment, topics, summaries
   - Parameters: `transcript`, `analysisType`, `context`

2. **meeting-summarizer**
   - Generate comprehensive meeting summaries
   - Parameters: `transcript`, `participants`, `meetingType`, `format`

3. **context-retriever**
   - Retrieve relevant context from previous conversations
   - Parameters: `query`, `timeRange`, `maxResults`, `filters`

4. **speaker-analytics**
   - Analyze speaker patterns and participation
   - Parameters: `transcript`, `participants`, `metrics`

5. **action-item-tracker**
   - Extract and track action items
   - Parameters: `transcript`, `assigneeHints`, `dueDate`, `priority`

---

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `AUTH_MISSING_TOKEN` | Missing authorization token |
| `AUTH_INVALID_TOKEN` | Invalid or expired token |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded |
| `BUDGET_EXCEEDED` | Cost budget exceeded |
| `MODEL_NOT_AVAILABLE` | Requested AI model unavailable |
| `TOOL_NOT_FOUND` | MCP tool not found |
| `RULE_NOT_FOUND` | Rule not found |
| `CONTEXT_NOT_FOUND` | Context not found |
| `TASK_NOT_FOUND` | Agent task not found |
| `DEPENDENCY_NOT_MET` | Task dependencies not completed |
| `INTERNAL_SERVER_ERROR` | Server error |

---

## Usage Examples

### Example 1: AI Response with Streaming

```javascript
const response = await fetch('/api/universal-assistant/ai-response', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${firebaseToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: "Can you summarize our discussion so far?",
    context: {
      meetingType: "standup",
      sessionId: "session-123"
    },
    options: {
      streaming: true,
      model: "claude-sonnet-4-20250514"
    }
  })
});

// Handle streaming response
const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = new TextDecoder().decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      console.log('Received:', data);
    }
  }
}
```

### Example 2: Agent Orchestration

```javascript
// Execute multiple agents in sequence
const contextTask = await fetch('/api/universal-assistant/agent-execute', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${firebaseToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    agentType: "context-sourcing",
    task: {
      type: "extract_context",
      parameters: { conversationHistory: [...] }
    },
    context: { sessionId: "session-123" },
    options: { async: true }
  })
});

const contextResponse = await contextTask.json();
const taskId = contextResponse.data.taskId;

// Wait for completion and start next agent
const notesTask = await fetch('/api/universal-assistant/agent-execute', {
  method: 'POST',
  body: JSON.stringify({
    agentType: "notes-writer",
    task: {
      type: "write_notes",
      parameters: { contextId: "ctx-123" }
    },
    context: { 
      sessionId: "session-123",
      dependencies: [taskId]
    }
  })
});
```

### Example 3: Context Management

```javascript
// Store conversation context
await fetch('/api/universal-assistant/context', {
  method: 'POST',
  body: JSON.stringify({
    sessionId: "session-123",
    context: {
      conversationHistory: [...],
      participants: [...],
      meetingType: "planning"
    },
    options: {
      compressionLevel: "medium",
      retentionDays: 30
    }
  })
});

// Search context later
const searchResponse = await fetch(
  '/api/universal-assistant/context?search=API+design&timeStart=2024-01-01&format=summary'
);
```

---

## Best Practices

### 1. Cost Management
- Set appropriate `costBudget` limits
- Use cost-efficient models for simple tasks
- Enable caching where appropriate
- Monitor usage with statistics endpoints

### 2. Performance Optimization
- Use streaming for long-running AI responses
- Implement proper retry logic with exponential backoff
- Cache frequently accessed context
- Use compression for large conversation histories

### 3. Error Handling
- Always check `success` field in responses
- Implement proper fallback strategies
- Handle rate limiting with appropriate delays
- Log errors for debugging and monitoring

### 4. Security
- Never expose Firebase tokens in client-side code
- Validate all user inputs before API calls
- Use HTTPS for all API communications
- Implement proper session management

### 5. Monitoring
- Use `requestId` for request tracing
- Monitor latency and cost metrics
- Set up alerts for budget thresholds
- Track usage patterns for optimization

---

This documentation provides comprehensive coverage of all Phase 4 AI integration APIs with practical examples and best practices for implementation.