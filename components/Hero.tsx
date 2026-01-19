import React from 'react';

interface HeroProps {
  onGetStarted: () => void;
}

const Hero: React.FC<HeroProps> = ({ onGetStarted }) => {
  return (
    <section className="flex flex-col items-center text-center py-12">
      <h1 
        className="text-4xl sm:text-5xl font-medium tracking-tight text-gray-900 mb-6 fade-in-up" 
        style={{ animationDelay: '100ms' }}
      >
        Horizon Flow
      </h1>
      
      <p 
        className="text-xl sm:text-2xl leading-relaxed font-normal text-gray-500 max-w-xl mx-auto fade-in-up" 
        style={{ animationDelay: '300ms' }}
      >
        A calm system designed for daily clinical flow.
      </p>

    </section>
  );
};

export default Hero;