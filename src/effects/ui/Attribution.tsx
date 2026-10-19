// src/effects/ui/Attribution.tsx
// Creative Commons (CC BY-NC-SA 4.0) attribution component for Jules and Ben's Animated Assets

import React from 'react';

export const Attribution: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`text-[10px] text-zinc-500 font-mono text-center select-none ${className}`}>
      Animated spell effects by{' '}
      <a
        href="https://jb2a.com"
        target="_blank"
        rel="noreferrer"
        className="text-amber-400/90 hover:text-amber-300 underline font-medium"
      >
        Jules and Ben (JB2A)
      </a>{' '}
      under{' '}
      <a
        href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
        target="_blank"
        rel="noreferrer"
        className="text-zinc-400 hover:text-zinc-200 underline"
      >
        CC BY-NC-SA 4.0
      </a>
    </div>
  );
};
