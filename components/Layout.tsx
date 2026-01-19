import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { AppIdentity } from '../App';

interface LayoutProps {
  children: React.ReactNode;
  onLoginClick?: () => void;
  onLogoClick?: () => void;
  onLogoutClick?: () => void;
  isLoggedIn?: boolean;
  identity?: AppIdentity | null;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  onLoginClick, 
  onLogoClick, 
  onLogoutClick, 
  isLoggedIn,
  identity
}) => {
  // GUARD: If authenticated but identity is not yet available, show loading
  if (isLoggedIn && !identity) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
         <div className="w-6 h-6 border-2 border-[#e5e5ea] border-t-[#86868b] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col font-sans antialiased selection:bg-gray-100 selection:text-gray-900">
      
      {/* Hide Navbar in unauthenticated state for unified intro surface */}
      {isLoggedIn && (
        <Navbar 
          onLoginClick={onLoginClick} 
          onLogoClick={onLogoClick} 
          onLogoutClick={onLogoutClick}
          isLoggedIn={isLoggedIn} 
          identity={identity}
        />
      )}
      
      {/* 
        Main Application Area
      */}
      <main className="flex-grow flex flex-col justify-center items-center w-full px-4 sm:px-6 relative z-0 py-12">
        <div className="w-full max-w-[980px] mx-auto">
          {children}
        </div>
      </main>
      
      {/* Hide Global Footer in unauthenticated state */}
      {isLoggedIn && <Footer />}
      
      <div 
        id="bottom-actions-root" 
        className="fixed bottom-0 left-0 right-0 z-[100] pointer-events-none pb-[env(safe-area-inset-bottom)]"
      />
    </div>
  );
};

export default Layout;