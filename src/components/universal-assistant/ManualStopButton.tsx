import React, { useState } from 'react';

interface StopButtonProps {
  onStop: () => void;
  isPlaying: boolean;
}

// Minimal Stop icon
const StopIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

const ManualStopButton: React.FC<StopButtonProps> = ({ onStop, isPlaying }) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleStop = () => {
    setIsPressed(true);
    onStop();
    setTimeout(() => setIsPressed(false), 200);
  };

  return (
    <button
      className={`
        stop-button
        ${isPlaying ? 'active' : 'inactive'}
        ${isPressed ? 'pressed' : ''}
      `}
      onClick={handleStop}
      disabled={!isPlaying}
      aria-label="Stop audio playback"
    >
      <StopIcon className="w-8 h-8" />
      <span className="sr-only">Stop</span>
    </button>
  );
};

export default ManualStopButton;

// CSS for stop button (optional: move to a CSS/TS file and inject via your styling solution)
export const stopButtonStyles = `
  .stop-button {
    @apply bg-red-600 hover:bg-red-700 text-white;
    @apply rounded-full p-4 transition-all duration-200;
    @apply shadow-lg hover:shadow-xl;
  }

  .stop-button.inactive {
    @apply bg-gray-400 cursor-not-allowed opacity-50;
  }

  .stop-button.pressed {
    @apply scale-95 bg-red-800;
  }
`;


