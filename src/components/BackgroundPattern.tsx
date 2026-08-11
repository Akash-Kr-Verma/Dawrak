import React from 'react';

export const BackgroundPattern: React.FC = () => {
  return (
    <div className="absolute inset-0 z-[-2] opacity-5 pointer-events-none">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="motif-pattern" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
            {/* Shield Motif */}
            <path
              d="M20,10 L40,0 L60,10 L60,30 C60,50 40,70 40,70 C40,70 20,50 20,30 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            {/* Magnifier Motif */}
            <circle cx="40" cy="35" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
            <line x1="47" y1="42" x2="55" y2="50" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#motif-pattern)" className="text-primary" />
      </svg>
    </div>
  );
};
