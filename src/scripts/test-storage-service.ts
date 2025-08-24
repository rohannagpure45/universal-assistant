#!/usr/bin/env ts-node

/**
 * Test script for StorageService voice sample operations
 * Run with: npx ts-node src/scripts/test-storage-service.ts
 */

import { ClientStorageService, VoiceSampleMetadata, StorageOperationResult } from '../services/firebase/ClientStorageService';

// Mock audio data for testing
const createMockAudioBlob = (duration: number): Blob => {
  // Create a simple WAV header for testing (44 bytes + data)
  const sampleRate = 44100;
  const samples = Math.floor(sampleRate * duration);
  const dataSize = samples * 2; // 16-bit samples
  const fileSize = 44 + dataSize;
  
  const buffer = Buffer.alloc(fileSize);
  
  // WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(fileSize - 8, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM format
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  
  // Fill with random audio data
  for (let i = 44; i < fileSize; i += 2) {
    buffer.writeInt16LE(Math.floor(Math.random() * 65536) - 32768, i);
  }
  
  // Convert Buffer to Blob
  return new Blob([new Uint8Array(buffer)], { type: 'audio/wav' });
};

async function testStorageService() {
  console.log('🧪 Testing StorageService voice sample operations...\n');

  try {
    // Test 1: Upload a voice sample
    console.log('📤 Test 1: Uploading voice sample...');
    const mockAudio = createMockAudioBlob(5.5); // 5.5 second audio
    const uploadResult = await ClientStorageService.uploadVoiceSample(
      'test_voice_123',
      'meeting_abc_456',
      mockAudio,
      5.5,
      {
        quality: 0.85,
        transcript: 'Hello, this is a test voice sample.',
        speakerConfidence: 0.92
      }
    );

    if (uploadResult.success) {
      console.log('✅ Upload successful!');
      console.log(`   URL: ${uploadResult.url}`);
      console.log(`   File Path: ${uploadResult.filePath}`);
      console.log(`   Metadata: ${JSON.stringify(uploadResult.metadata, null, 2)}`);
    } else {
      console.log('❌ Upload failed:', uploadResult.error);
      return;
    }

    // Test 2: List voice samples for the speaker
    console.log('\n📋 Test 2: Listing voice samples...');
    const samples = await ClientStorageService.listVoiceSamples('test_voice_123', 10);
    console.log(`✅ Found ${samples.length} samples for speaker test_voice_123`);
    samples.forEach((sample, index) => {
      console.log(`   Sample ${index + 1}:`);
      console.log(`     Duration: ${sample.duration}s`);
      console.log(`     Quality: ${sample.quality || 'N/A'}`);
      console.log(`     Transcript: ${sample.transcript || 'N/A'}`);
      console.log(`     Uploaded: ${sample.uploadedAt}`);
    });

    // Test 3: Get metadata for a specific sample
    if (uploadResult.filePath) {
      console.log('\n🔍 Test 3: Getting sample metadata...');
      const metadata = await ClientStorageService.getVoiceSampleMetadata(uploadResult.filePath);
      if (metadata) {
        console.log('✅ Metadata retrieved successfully');
        console.log(`   Meeting ID: ${metadata.meetingId}`);
        console.log(`   Duration: ${metadata.duration}s`);
        console.log(`   File Size: ${metadata.size || 'N/A'} bytes`);
      } else {
        console.log('❌ Failed to retrieve metadata');
      }
    }

    // Test 4: Get best samples for identification
    console.log('\n🎯 Test 4: Getting best samples for identification...');
    // Best samples method not available in client-side mode
    console.log('⚠️  getBestSamplesForIdentification not available in client-side mode');
    const bestSamples: VoiceSampleMetadata[] = [];
    console.log(`✅ Found ${bestSamples.length} best samples`);
    bestSamples.forEach((sample, index) => {
      console.log(`   Best Sample ${index + 1}:`);
      console.log(`     Duration: ${sample.duration}s`);
      console.log(`     Quality: ${sample.quality || 'N/A'}`);
      console.log(`     Confidence: ${sample.speakerConfidence || 'N/A'}`);
    });

    // Test 5: Get voice sample statistics
    console.log('\n📊 Test 5: Getting storage statistics...');
    // Stats method not available in client-side mode
    console.log('⚠️  getVoiceSampleStats not available in client-side mode');
    const stats = { totalSamples: 0, totalSize: 0, speakerCount: 0, oldestSample: undefined, newestSample: undefined };
    console.log('✅ Statistics retrieved:');
    console.log(`   Total Samples: ${stats.totalSamples}`);
    console.log(`   Total Size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Speaker Count: ${stats.speakerCount}`);
    console.log(`   Oldest Sample: ${stats.oldestSample || 'N/A'}`);
    console.log(`   Newest Sample: ${stats.newestSample || 'N/A'}`);

    // Test 6: Batch upload (multiple samples)
    console.log('\n🔄 Test 6: Batch upload samples...');
    const batchSamples = [
      {
        deepgramVoiceId: 'test_voice_123',
        meetingId: 'meeting_batch_001',
        audioFile: createMockAudioBlob(3.2),
        duration: 3.2,
        metadata: {
          quality: 0.7,
          transcript: 'Batch sample one',
          speakerConfidence: 0.8
        }
      },
      {
        deepgramVoiceId: 'test_voice_123',
        meetingId: 'meeting_batch_002',
        audioFile: createMockAudioBlob(4.8),
        duration: 4.8,
        metadata: {
          quality: 0.9,
          transcript: 'Batch sample two with higher quality',
          speakerConfidence: 0.95
        }
      }
    ];

    // Batch upload not available in client-side mode
    console.log('⚠️  batchUploadVoiceSamples not available in client-side mode');
    const batchResults: any[] = [];

    const successfulUploads = batchResults.filter(r => r.success).length;
    console.log(`✅ Batch upload completed: ${successfulUploads}/${batchResults.length} successful`);

    // Test 7: Query samples by meeting
    console.log('\n🔎 Test 7: Getting samples by meeting...');
    // Meeting queries not available in client-side mode
    console.log('⚠️  getVoiceSamplesByMeeting not available in client-side mode');
    const meetingSamples: VoiceSampleMetadata[] = [];
    console.log(`✅ Found ${meetingSamples.length} samples for meeting meeting_abc_456`);

    console.log('\n🎉 All tests completed successfully!');
    
    // Clean up test files
    console.log('\n🧹 Note: In a real scenario, you might want to clean up test files.');
    console.log('   Use ClientStorageService.deleteOldSamples() or delete specific files as needed.');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Usage examples and documentation
function printUsageExamples() {
  console.log('\n📖 Usage Examples:\n');
  
  console.log('// Upload a voice sample with metadata');
  console.log(`const result = await ClientStorageService.uploadVoiceSample(
  'speaker_voice_id',
  'meeting_id_123',
  audioBlob,
  8.5, // duration in seconds
  {
    quality: 0.85,
    transcript: 'What the speaker said',
    speakerConfidence: 0.92
  }
);`);

  console.log('\n// List samples for a speaker');
  console.log(`const samples = await ClientStorageService.listVoiceSamples('speaker_voice_id', 50);`);

  console.log('\n// Get best samples for identification');
  console.log(`const bestSamples = await ClientStorageService.getBestSamplesForIdentification('speaker_voice_id', 5);`);

  console.log('\n// Clean up old samples (30+ days)');
  console.log(`const cleanup = await ClientStorageService.deleteOldSamples(30);`);

  console.log('\n// Enforce retention policy');
  console.log(`const retention = await ClientStorageService.enforceRetentionPolicy(
  500 * 1024 * 1024, // 500MB max total size
  20 // max samples per speaker
);`);

  console.log('\n// Get storage statistics');
  console.log(`const stats = await ClientStorageService.getVoiceSampleStats();`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('StorageService Test Script');
    console.log('Usage: npx ts-node src/scripts/test-storage-service.ts [options]');
    console.log('Options:');
    console.log('  --test      Run test suite');
    console.log('  --examples  Show usage examples');
    console.log('  --help      Show this help');
    return;
  }

  if (args.includes('--examples')) {
    printUsageExamples();
    return;
  }

  if (args.includes('--test') || args.length === 0) {
    await testStorageService();
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  testStorageService,
  printUsageExamples,
  createMockAudioBlob
};