import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  children, 
  className = '', 
  ...props 
}) => {
  // Apple-style: Full rounded corners, Inter font, 44px min-height via padding
  const baseStyles = "inline-flex items-center justify-center rounded-full px-6 py-3 text-[15px] font-medium transition-all duration-150 focus:outline-none focus:ring-4 focus:ring-gray-100 disabled:opacity-50 disabled:pointer-events-none transform active:scale-[0.98]";
  
  const variants = {
    // Primary: #111111
    primary: "bg-gray-900 text-white hover:bg-gray-800 shadow-sm",
    // Secondary: #F9FAFB
    secondary: "bg-gray-50 text-gray-900 border border-gray-200 hover:bg-gray-100",
    // Ghost
    ghost: "bg-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;