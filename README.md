# Universal Assistant - Proof of Concept

A demonstration project showcasing an AI-powered meeting assistant with real-time audio transcription and multi-agent architecture.

## 🎯 Project Status: Proof of Concept

**Important**: This is a POC (Proof of Concept) project intended for demonstration purposes only. It is not production-ready and includes minimal security features.

## Features Demonstrated

- **Real-time Audio Processing**: Capture and process meeting audio in real-time
- **Speech-to-Text**: Integration with Deepgram for live transcription
- **AI Assistance**: Multi-model AI support (OpenAI GPT-4, Anthropic Claude)
- **Speaker Identification**: Voice recognition and speaker profiling concepts
- **Multi-Agent System**: Specialized agents for different meeting tasks
- **Meeting Management**: Basic meeting lifecycle and transcript management

## Quick Start

### Prerequisites

- Node.js (LTS version)
- npm or yarn package manager
- API keys for AI services (optional for demo)

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Technology Stack

- **Framework**: Next.js 14 with TypeScript
- **AI Services**: OpenAI, Anthropic Claude APIs
- **Speech Services**: Deepgram (STT), ElevenLabs (TTS)
- **Database**: Firebase Firestore (simplified setup)
- **UI**: Tailwind CSS, Radix UI components
- **State Management**: Zustand

## Limitations

As this is a proof of concept:

- Authentication is simplified or disabled
- Security features are minimal
- Performance is not optimized for scale
- Some features may be mocked or partially implemented
- Error handling is basic in some areas
- Not suitable for production deployment

## Development

See `CLAUDE.md` for detailed development guidelines and architecture overview.

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build the application
- `npm run lint` - Run code linting
- `npm run typecheck` - Check TypeScript types

## Purpose

This POC demonstrates the feasibility of:
- Real-time audio transcription in web applications
- Multi-agent AI architectures for meeting assistance
- Integration of various AI and speech services
- Modern web application patterns with Next.js

## Note

For production implementation, additional work would be needed for:
- Comprehensive security and authentication
- Performance optimization and scaling
- Error handling and recovery
- Complete feature implementation
- Testing and quality assurance