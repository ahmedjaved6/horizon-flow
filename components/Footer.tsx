import React, { useState } from 'react';

const Footer: React.FC = () => {
  const [showAudioControls, setShowAudioControls] = useState(false);

  const playAudio = (path: string) => {
    try {
      const audio = new Audio(path);
      audio.play().catch(e => console.log('Audio play error:', e));
    } catch (e) {
      console.log('Audio initialization error:', e);
    }
  };

  return (
    <footer className="w-full py-6 mt-auto">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 flex flex-col items-center gap-4">
        
        <div className="flex flex-col items-center gap-2">
          <button 
            onClick={() => setShowAudioControls(!showAudioControls)}
            className="text-[10px] text-gray-200 hover:text-gray-400 transition-colors cursor-default"
          >
            Audio Test
          </button>
          
          {showAudioControls && (
            <div className="flex gap-4 fade-in-up items-center bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
              <button 
                onClick={() => playAudio('/audio/welcome-doctor.mp3')}
                className="text-[10px] font-mono text-gray-500 hover:text-gray-900 transition-colors"
              >
                Welcome
              </button>
              <div className="w-px h-3 bg-gray-300"></div>
              <button 
                onClick={() => playAudio('/audio/system-confirmation.mp3')}
                className="text-[10px] font-mono text-gray-500 hover:text-gray-900 transition-colors"
              >
                System
              </button>
            </div>
          )}
        </div>

        <p className="text-[10px] text-gray-400 font-normal">
          © 2024 Horizon Flow
        </p>
      </div>
    </footer>
  );
};

export default Footer;