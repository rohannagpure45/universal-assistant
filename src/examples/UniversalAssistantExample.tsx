import React from 'react';
import { useUniversalAssistant, useProductionUniversalAssistant } from '@/hooks/useUniversalAssistant';

// Basic usage example
export function BasicUniversalAssistant() {
  const {
    isRecording,
    isPlaying,
    isProcessing,
    transcript,
    speakers,
    currentSpeaker,
    startRecording,
    stopRecording,
    handleVocalInterrupt,
    error,
  } = useUniversalAssistant({
    enableConcurrentProcessing: true,
    enableSpeakerIdentification: true,
  });

  const handleToggleRecording = async () => {
    try {
      if (isRecording) {
        stopRecording();
      } else {
        await startRecording();
      }
    } catch (err) {
      console.error('Recording error:', err);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Universal Assistant</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Control Panel */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={handleToggleRecording}
            disabled={isProcessing}
            className={`px-6 py-2 rounded font-medium ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>

          <button
            onClick={handleVocalInterrupt}
            disabled={!isPlaying}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Interrupt
          </button>
        </div>

        {/* Status Indicators */}
        <div className="flex space-x-6 text-sm">
          <div className={`flex items-center ${isRecording ? 'text-red-600' : 'text-gray-500'}`}>
            <div className={`w-3 h-3 rounded-full mr-2 ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`} />
            Recording
          </div>
          <div className={`flex items-center ${isPlaying ? 'text-blue-600' : 'text-gray-500'}`}>
            <div className={`w-3 h-3 rounded-full mr-2 ${isPlaying ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`} />
            Playing
          </div>
          <div className={`flex items-center ${isProcessing ? 'text-green-600' : 'text-gray-500'}`}>
            <div className={`w-3 h-3 rounded-full mr-2 ${isProcessing ? 'bg-green-500 animate-spin' : 'bg-gray-300'}`} />
            Processing
          </div>
        </div>
      </div>

      {/* Current Speaker */}
      {currentSpeaker && (
        <div className="bg-blue-50 p-3 rounded mb-4">
          <p className="text-blue-800">
            <strong>Current Speaker:</strong> {currentSpeaker}
          </p>
        </div>
      )}

      {/* Transcript Display */}
      <div className="bg-white border rounded-lg p-4 mb-6 min-h-[200px]">
        <h3 className="font-semibold mb-2">Live Transcript</h3>
        <div className="text-gray-700 whitespace-pre-wrap max-h-60 overflow-y-auto">
          {transcript || 'Transcript will appear here...'}
        </div>
      </div>

      {/* Speaker List */}
      {speakers.size > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Identified Speakers ({speakers.size})</h3>
          <div className="space-y-2">
            {Array.from(speakers.entries()).map(([id, profile]) => (
              <div key={id} className="flex items-center justify-between bg-white p-2 rounded">
                <div>
                  <span className="font-medium">{(profile as any).name || id}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({(profile as any).utteranceCount || 0} utterances)
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  Confidence: {Math.round(profile.confidence * 100)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Production-ready component with all features
export function ProductionUniversalAssistant() {
  const assistant = useProductionUniversalAssistant();
  const [showStats, setShowStats] = React.useState(false);
  const [stats, setStats] = React.useState<any>(null);

  // Refresh stats periodically
  React.useEffect(() => {
    if (showStats) {
      const interval = setInterval(() => {
        setStats(assistant.getProcessingStats());
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [showStats, assistant]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Universal Assistant (Production)</h2>
        <button
          onClick={() => setShowStats(!showStats)}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
        >
          {showStats ? 'Hide Stats' : 'Show Stats'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Interface */}
        <div>
          <BasicUniversalAssistant />
        </div>

        {/* Statistics Panel */}
        {showStats && stats && (
          <div className="bg-gray-900 text-white p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">System Statistics</h3>
            <div className="space-y-3 text-sm">
              <div>
                <strong>Conversation:</strong>
                <ul className="ml-4 mt-1 text-gray-300">
                  <li>Active Speakers: {stats.conversation?.activeSpeakers || 0}</li>
                  <li>Buffered Fragments: {stats.conversation?.bufferedFragments || 0}</li>
                  <li>Avg Processing Time: {stats.conversation?.performance?.averageProcessingTime?.toFixed(2) || 0}ms</li>
                  <li>Success Rate: {Math.round((stats.conversation?.performance?.successRate || 1) * 100)}%</li>
                </ul>
              </div>
              <div>
                <strong>Fragment Aggregator:</strong>
                <ul className="ml-4 mt-1 text-gray-300">
                  <li>Total Fragments: {stats.fragmentAggregator?.totalFragments || 0}</li>
                  <li>Oldest Fragment Age: {stats.fragmentAggregator?.oldestFragmentAge ? `${(stats.fragmentAggregator.oldestFragmentAge / 1000).toFixed(1)}s` : 'N/A'}</li>
                </ul>
              </div>
              <div>
                <strong>Performance:</strong>
                <ul className="ml-4 mt-1 text-gray-300">
                  <li>Recent Metrics: {stats.performance?.recentMetrics?.length || 0}</li>
                  <li>Slow Operations: {stats.performance?.slowOperations?.length || 0}</li>
                  <li>Total Errors: {stats.performance?.errorCount || 0}</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Minimal example for quick testing
export function MinimalUniversalAssistant() {
  const { isRecording, transcript, startRecording, stopRecording, error } = useUniversalAssistant();

  return (
    <div className="p-4">
      <button 
        onClick={isRecording ? stopRecording : startRecording}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        {isRecording ? 'Stop' : 'Start'}
      </button>
      
      {error && <p className="text-red-600 mb-2">{error}</p>}
      
      <div className="border p-4 rounded min-h-[100px]">
        {transcript || 'Start recording to see transcript...'}
      </div>
    </div>
  );
}

export default BasicUniversalAssistant;