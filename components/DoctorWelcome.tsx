import React, { useEffect, useState } from 'react';
import { UserIdentity } from '../App';

interface DoctorWelcomeProps {
  user: UserIdentity;
  onComplete: () => void;
}

const DoctorWelcome: React.FC<DoctorWelcomeProps> = ({ user, onComplete }) => {
  const [isExiting, setIsExiting] = useState(false);
  
  // Extract last name logic: "First Last" -> "Last"
  const nameParts = user.full_name.trim().split(/\s+/);
  const lastName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : user.full_name;

  useEffect(() => {
    // Timeline:
    // 0ms: Line 1 Start
    // 200ms: Line 2 Start
    // 400ms: Line 3 Start
    // ~1200ms: Animations settled
    // Hold ~2000ms
    // Total: ~3200ms
    
    const DISPLAY_DURATION = 3200;
    const EXIT_FADE_DURATION = 800;

    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, DISPLAY_DURATION);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, DISPLAY_DURATION + EXIT_FADE_DURATION);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center transition-opacity duration-1000 ease-in-out cursor-default ${isExiting ? 'opacity-0' : 'opacity-100'}`}
      aria-hidden={isExiting}
    >
      <style>{`
        @keyframes welcomeFadeUp {
          from { opacity: 0; transform: translateY(2px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes welcomeBlurIn {
          from { opacity: 0; filter: blur(4px); }
          to { opacity: 1; filter: blur(0); }
        }
        @keyframes welcomeSlideIn {
          from { opacity: 0; transform: translateX(2px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .anim-line-1 { animation: welcomeFadeUp 1s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .anim-line-2 { animation: welcomeBlurIn 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards; opacity: 0; }
        .anim-line-3 { animation: welcomeSlideIn 1s cubic-bezier(0.4, 0, 0.2, 1) forwards; opacity: 0; }
      `}</style>

      <div className="flex flex-col items-center text-center space-y-3">
        {/* Line 1 */}
        <span 
          className="text-sm font-medium text-gray-400 tracking-wide uppercase anim-line-1"
        >
          Welcome
        </span>

        {/* Line 2 */}
        <h1 
          className="text-4xl sm:text-5xl font-semibold text-gray-900 tracking-tight anim-line-2"
          style={{ animationDelay: '200ms' }}
        >
          Dr. {lastName}
        </h1>

        {/* Line 3 */}
        <p 
          className="text-lg text-gray-500 font-medium anim-line-3"
          style={{ animationDelay: '400ms' }}
        >
          Your clinic is ready
        </p>
      </div>

      <div className="absolute bottom-12 opacity-0 anim-line-1" style={{ animationDelay: '800ms' }}>
         <p className="text-[10px] text-gray-300 font-normal">
            Horizon Flow · 2026 · Made in India
         </p>
      </div>
    </div>
  );
};

export default DoctorWelcome;