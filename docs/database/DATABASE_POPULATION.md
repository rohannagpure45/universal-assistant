# Database Population Guide

This document provides comprehensive guidance for populating the Universal Assistant Firestore database with realistic sample data.

## Overview

The `populate-firestore-database.ts` script creates comprehensive sample data across all Firestore collections according to the schema defined in `firestoredb.txt`. This includes users, voice profiles, meeting types, meetings, identification requests, and voice matching cache data.

## Prerequisites

### 1. Firebase Service Account

Ensure you have a `firebase-service-account.json` file in your project root with the following permissions:
- Cloud Datastore User
- Firebase Admin
- Service Account Token Creator

### 2. Environment Setup

```bash
# Set environment variables
export NODE_ENV=development
export FORCE_POPULATE=true  # Required for non-development environments
```

### 3. Dependencies

All required dependencies are already included in the project:
- `firebase-admin` - Firebase Admin SDK
- `typescript` - TypeScript support
- `tsx` - TypeScript execution

## Usage

### Quick Start

```bash
# Preview what will be created (recommended first)
npm run populate-database:dry-run

# Full population (clears existing data)
npm run populate-database

# Add to existing data without clearing
npm run populate-database:incremental
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run populate-database` | Full database population with data clearing |
| `npm run populate-database:dry-run` | Preview mode - shows what would be created |
| `npm run populate-database:incremental` | Add data without clearing existing collections |

## Generated Data Overview

### Users Collection (5 users)
- **John Smith** - Admin user with primary voice profile
- **Sarah Johnson** - UI/UX developer, Claude model preference
- **Mike Chen** - Backend developer, database optimization expert
- **Emily Davis** - Client representative from external company
- **Alex Rodriguez** - New team member without voice profile

Each user includes:
- Realistic email addresses and names
- User preferences (TTS speed, LLM model, language, timezone)
- Admin flags and creation timestamps
- Voice profile associations

### Voice Library Collection (6 voice profiles)
- **4 Confirmed Voices** - Linked to actual users with high confidence
- **2 Unconfirmed Voices** - Unknown speakers requiring identification

Each profile includes:
- Confidence scores (0.65 to 0.95)
- Audio sample metadata and transcripts
- Speaking time statistics
- Identification history with methods used

### Meeting Types Collection (6 types)
- **Daily Standup** - Quick progress updates
- **Client Review** - External stakeholder meetings
- **Sprint Planning** - Detailed planning sessions
- **One-on-One** - Private career discussions
- **Architecture Review** - Technical deep dives
- **All-Hands** - Company-wide meetings

Each type includes:
- AI model preferences and prompts for all supported models
- Meeting-specific settings and rules
- Performance history and compatibility data
- Regular participant lists

### Meetings Collection (3+ detailed meetings)
- **Sprint 23 Standup** - Recent daily standup with full transcript
- **Client Review Alpha** - Weekly client meeting with action items
- **Sprint 24 Planning** - Detailed sprint planning session

Each meeting includes:
- Complete participant tracking by voice ID
- Full conversation transcripts with timestamps
- AI-generated notes and key points
- Action items with assignments and due dates
- Model switching history and context

### Needs Identification Collection (3 pending requests)
- **Unknown Speaker 1** - Product strategy discussion participant
- **Unknown Speaker 2** - Client onboarding reviewer
- **Unknown Speaker 3** - Architecture discussion contributor

Each request includes:
- Sample transcripts for identification
- AI-suggested user matches with confidence scores
- Audio sample references
- Meeting context and host information

### Voice Matches Collection (5 cache entries)
- Confirmed user mappings for known voices
- Meeting history with confidence tracking
- Optimization data for faster voice recognition

## Sample Data Characteristics

### Realistic Relationships
- Users participate in appropriate meeting types
- Voice profiles have consistent usage patterns
- Meeting participants match expected roles
- Action items have realistic assignments and due dates

### Temporal Consistency
- Meeting dates span the last 30 days
- Voice profiles show usage progression over time
- User creation dates follow logical hiring patterns
- Model switching history reflects realistic usage

### Technical Accuracy
- All AI model references match supported models in `modelConfigs.ts`
- Voice IDs use consistent Deepgram format (`dg_voice_###`)
- Meeting statuses follow proper workflow progression
- Confidence scores reflect realistic voice recognition patterns

### Edge Cases Included
- Unidentified speakers requiring manual review
- Failed identification attempts
- Model switching during meetings
- Varying confidence levels and audio quality
- External participants (clients, contractors)

## Customization Options

### Modifying Sample Data

The script uses generator methods that can be customized:

```typescript
// Add more users
private generateUsers(): any[] {
  const users = [
    // Existing users...
    {
      id: 'user_006',
      email: 'your.name@company.com',
      displayName: 'Your Name',
      // ... other properties
    }
  ];
  return users;
}
```

### Adjusting Data Volume

Modify the constants at the top of the script:

```typescript
const BATCH_SIZE = 500; // Firestore batch limit
const MAX_MEETINGS_PER_USER = 20; // Increase for more data
const DAYS_OF_HISTORY = 60; // Extend time range
```

### Environment-Specific Configuration

Set environment variables for different deployments:

```bash
# Development (less data)
export NODE_ENV=development
export DATA_SCALE=small

# Staging (moderate data)
export NODE_ENV=staging
export DATA_SCALE=medium

# Production (full dataset)
export NODE_ENV=production
export DATA_SCALE=large
export FORCE_POPULATE=true
```

## Safety Features

### Dry Run Mode
Always test with `--dry-run` first to preview changes:
- Shows exactly what would be created
- Validates data structure
- Tests database connectivity
- No actual data is written

### Environment Protection
- Requires explicit confirmation for production environments
- `FORCE_POPULATE=true` environment variable required outside development
- Clear warnings about data deletion
- Validation of database connectivity before execution

### Incremental Mode
Use `--incremental` to add data without clearing:
- Preserves existing documents
- Adds only new sample data
- Useful for testing or development environments
- Safe for environments with existing data

### Error Handling
- Comprehensive error reporting
- Transaction rollback on failures
- Detailed logging of operations
- Graceful handling of network issues

## Monitoring and Validation

### Population Statistics
The script provides detailed statistics:
- Documents created per collection
- Total execution time
- Success/failure rates
- Error details and recovery actions

### Data Validation
After population, verify data integrity:

```bash
# Check document counts
npm run db:stats

# Validate relationships
npm run db:validate

# Test query performance
npm run db:benchmark
```

## Troubleshooting

### Common Issues

#### Permission Errors
```
Error: Permission denied - Missing or insufficient permissions
```
**Solution:** Verify service account has Firestore permissions

#### Connection Timeout
```
Error: DEADLINE_EXCEEDED
```
**Solution:** Check network connectivity and firewall settings

#### Memory Issues
```
Error: JavaScript heap out of memory
```
**Solution:** Reduce batch size or use incremental mode

#### Data Validation Errors
```
Error: Invalid document structure
```
**Solution:** Check schema compatibility and field types

### Debug Mode

Enable detailed logging:

```bash
export DEBUG=true
npm run populate-database:dry-run
```

### Recovery Procedures

If population fails midway:

1. **Check Error Logs** - Review detailed error messages
2. **Partial Cleanup** - Remove partially created data if needed
3. **Resume from Checkpoint** - Use incremental mode to continue
4. **Full Reset** - Clear all data and restart if necessary

```bash
# Clear all data and restart
npm run db:clear
npm run populate-database
```

## Performance Considerations

### Batch Processing
- Uses Firestore batch writes (500 operations max)
- Parallel execution where possible
- Progress reporting for long operations

### Resource Usage
- Typical execution time: 2-5 minutes
- Memory usage: ~100-200MB
- Network bandwidth: Minimal (metadata only)

### Optimization Tips
- Run during off-peak hours for production
- Use incremental mode for development
- Monitor Firestore quotas and billing

## Integration with Testing

### Test Data Dependencies
Many tests depend on this sample data:

```bash
# Populate before running tests
npm run populate-database
npm run test:integration

# Reset between test suites
npm run db:clear
npm run populate-database
npm run test:e2e
```

### CI/CD Integration
Add to deployment pipeline:

```yaml
# Example GitHub Actions step
- name: Populate Test Database
  run: |
    npm run populate-database:dry-run
    npm run populate-database
  env:
    FORCE_POPULATE: true
```

## Security Considerations

### Service Account Security
- Store service account key securely
- Rotate keys regularly
- Use least-privilege permissions
- Never commit keys to version control

### Data Privacy
- Sample data uses fictional names and emails
- No real personal information included
- Meeting content is professional and generic
- Voice samples reference non-existent audio files

### Access Control
- Script requires explicit environment confirmation
- Admin permissions needed for execution
- Audit logging of all database operations
- Rollback capabilities for data protection

## Future Enhancements

### Planned Features
- **Multi-tenant Support** - Organization-specific data
- **Configurable Data Scales** - Small/medium/large datasets
- **Custom Data Templates** - Industry-specific scenarios
- **Performance Benchmarking** - Automated performance testing
- **Data Anonymization** - Convert production data to samples

### Contributing
To add new sample data or improve the script:

1. Follow existing data structure patterns
2. Maintain referential integrity
3. Add appropriate error handling
4. Update documentation
5. Test with dry-run mode first

For questions or issues, refer to the main project documentation or create a GitHub issue.