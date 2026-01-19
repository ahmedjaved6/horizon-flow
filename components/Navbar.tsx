import React from 'react';
import { AppIdentity } from '../App';

interface NavbarProps {
  onLoginClick?: () => void;
  onLogoClick?: () => void;
  onLogoutClick?: () => void;
  isLoggedIn?: boolean;
  identity?: AppIdentity | null;
}

const Navbar: React.FC<NavbarProps> = ({ 
  onLoginClick, 
  onLogoClick, 
  onLogoutClick, 
  isLoggedIn,
  identity
}) => {
  // 1. Authenticated State
  if (isLoggedIn && identity?.user) {
    const isAdmin = identity.user.role === 'ADMIN';
    const userFullName = identity.user.full_name;

    return (
      <header className="w-full px-4 py-3 border-b border-gray-100 bg-white">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between max-w-[980px] mx-auto">
          
          {/* LEFT: Identity Logic */}
          <div className="flex items-center min-w-0">
            {isAdmin ? (
              // Admin Mode: System Branding
              <span className="font-medium text-[15px] tracking-tight text-gray-900">
                Horizon Flow
              </span>
            ) : (
              // Clinical Mode: Clinic Name Only (No Fallbacks)
              <span className="font-medium text-[15px] tracking-tight text-gray-900 truncate">
                {identity.clinic?.name}
              </span>
            )}
          </div>

          {/* RIGHT: User Identity */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <span className="text-sm text-gray-600 font-medium">
              {userFullName}
            </span>
            {onLogoutClick && (
              <button 
                onClick={onLogoutClick}
                className="text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors"
              >
                Log out
              </button>
            )}
          </div>

        </div>
      </header>
    );
  }

  // 2. Unauthenticated / Landing State
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-white/80 backdrop-blur-md border-b border-transparent">
      <nav className="flex items-center justify-between px-6 lg:px-8 max-w-[1200px] mx-auto h-16" aria-label="Global">
        <div className="flex lg:flex-1">
          <button 
            onClick={onLogoClick} 
            className="flex items-center gap-2 focus:outline-none opacity-90 hover:opacity-100 transition-opacity"
          >
            <span className="font-medium text-[15px] tracking-tight text-gray-900">Horizon Flow</span>
          </button>
        </div>
        
        <div className="flex lg:flex-1 lg:justify-end">
          <button 
            onClick={onLoginClick}
            className="text-[13px] font-medium text-gray-900 hover:text-gray-600 transition-colors focus:outline-none"
          >
            Log in
          </button>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;