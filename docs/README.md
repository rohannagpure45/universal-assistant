# Universal Assistant Documentation

## Project Overview

The Universal Assistant is a sophisticated AI-powered meeting assistant built with Next.js 14 that processes real-time audio, transcribes speech, identifies speakers, and provides contextual AI responses through a multi-agent architecture.

## Table of Contents

### 📋 System Documentation
- [Architecture Overview](./ARCHITECTURE.md)
- [Implementation Phases](./IMPLEMENTATION_PHASES.md)
- [Technology Stack](./TECHNOLOGY_STACK.md)

### 🎙️ Voice Identification System
- [Voice Identification Overview](./voice-identification/README.md)
- [Audio Processing Pipeline](./voice-identification/AUDIO_PROCESSING.md)
- [Speaker Identification](./voice-identification/SPEAKER_IDENTIFICATION.md)
- [Voice Training System](./voice-identification/VOICE_TRAINING.md)

### 🧩 Components
- [UI Components Guide](./components/UI_COMPONENTS.md)
- [Real-time Components](./components/REALTIME_COMPONENTS.md)
- [Voice Library Components](./components/VOICE_LIBRARY.md)
- [Meeting Components](./components/MEETING_COMPONENTS.md)

### ⚙️ Services
- [Firebase Services](./services/FIREBASE_SERVICES.md)
- [Audio Services](./services/AUDIO_SERVICES.md)
- [Voice Processing Services](./services/VOICE_PROCESSING.md)
- [Database Services](./services/DATABASE_SERVICES.md)

### 🔌 API Documentation
- [API Routes](./api/API_ROUTES.md)
- [Service Interfaces](./api/SERVICE_INTERFACES.md)
- [Type Definitions](./api/TYPE_DEFINITIONS.md)
- [Error Handling](./api/ERROR_HANDLING.md)

### 🛠️ Development
- [Setup Guide](./development/SETUP_GUIDE.md)
- [Development Workflow](./development/DEVELOPMENT_WORKFLOW.md)
- [Testing Guide](./development/TESTING_GUIDE.md)
- [Deployment Guide](./development/DEPLOYMENT_GUIDE.md)

### 🗄️ Database
- [Database Schema](./database/DATABASE_SCHEMA.md)
- [Migration Guide](./database/MIGRATION_GUIDE.md)
- [Security Rules](./database/SECURITY_RULES.md)
- [Data Flow](./database/DATA_FLOW.md)

### 👥 User Documentation
- [User Guide](./user/USER_GUIDE.md)
- [Voice Training Tutorial](./user/VOICE_TRAINING_TUTORIAL.md)
- [Meeting Types Guide](./user/MEETING_TYPES_GUIDE.md)
- [Troubleshooting](./user/TROUBLESHOOTING.md)

### 🔧 Technical Specifications
- [Performance Specifications](./technical/PERFORMANCE_SPECS.md)
- [Security Specifications](./technical/SECURITY_SPECS.md)
- [Accessibility Compliance](./technical/ACCESSIBILITY.md)
- [Browser Compatibility](./technical/BROWSER_COMPATIBILITY.md)

### 🔗 Integrations
- [Third-party Integrations](./integrations/THIRD_PARTY.md)
- [Deepgram Integration](./integrations/DEEPGRAM.md)
- [Firebase Integration](./integrations/FIREBASE.md)
- [AI Model Integration](./integrations/AI_MODELS.md)

## Quick Start

1. **Prerequisites**: Node.js 18+, Firebase account, API keys for AI services
2. **Installation**: `npm install`
3. **Environment Setup**: Configure `.env.local` with required API keys
4. **Firebase Setup**: Initialize Firestore and Firebase Auth
5. **Development**: `npm run dev`

## Key Features

### 🎯 Core Capabilities
- **Real-time Audio Processing**: Live audio capture, transcription, and processing
- **Multi-Speaker Identification**: Advanced voice recognition and speaker tracking
- **AI-Powered Responses**: Context-aware responses using multiple AI models
- **Meeting Management**: Comprehensive meeting lifecycle management
- **Voice Library**: Extensive speaker profile and voice sample management

### 🏗️ Architecture Highlights
- **Multi-Agent System**: Specialized agents for different tasks
- **Service-Oriented Design**: Modular, reusable service architecture
- **Real-time Synchronization**: Live data updates across all clients
- **Type-Safe Development**: Comprehensive TypeScript type system
- **Performance Optimized**: Advanced caching and optimization strategies

### 🔊 Voice Identification System
- **Smart Speaker Detection**: Automatic speaker identification during meetings
- **Voice Training**: User-guided voice profile creation and enhancement
- **Quality Assessment**: Advanced audio quality analysis and recommendations
- **Post-Meeting Processing**: Batch identification of unresolved speakers
- **Analytics Dashboard**: Comprehensive voice identification analytics

## Project Structure

```
/docs/                    # Documentation (this directory)
/src/
  /components/           # React components
    /voice-identification/ # Voice ID specific components
    /ui/                 # Reusable UI components
    /meeting/           # Meeting-related components
  /services/            # Business logic services
    /universal-assistant/ # Core assistant services
    /firebase/          # Firebase integration services
    /voice-identification/ # Voice ID services
  /stores/              # Zustand state management
  /types/               # TypeScript type definitions
  /hooks/               # Custom React hooks
  /lib/                 # Utility libraries
/tests/                 # Test suites
  /unit/               # Unit tests
  /integration/        # Integration tests
  /e2e/               # End-to-end tests
```

## Development Status

### ✅ Phase 2: Core Infrastructure (COMPLETED)
- Authentication system with Firebase Auth
- Database operations with Firestore
- State management with Zustand
- Real-time synchronization

### 🚧 Phase 3: Voice Identification System (IN PROGRESS)
- Voice identification UI components
- Speaker management dashboard
- Voice training system
- Post-meeting identification workflow

### 📋 Upcoming Phases
- Enhanced AI integration
- Performance optimizations
- Mobile app development
- Advanced analytics

## Contributing

1. Read the [Development Guide](./development/DEVELOPMENT_WORKFLOW.md)
2. Follow the [Setup Guide](./development/SETUP_GUIDE.md)
3. Review the [Testing Guide](./development/TESTING_GUIDE.md)
4. Submit pull requests following established patterns

## Support

- **Issues**: Report bugs via GitHub issues
- **Documentation**: Refer to relevant sections above
- **Development**: See development guides for setup and workflow

---

*Last Updated: 2025-01-21*
*Version: 3.0.0-alpha*