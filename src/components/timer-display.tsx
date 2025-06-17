"use client";

import React from 'react';

interface TimerDisplayProps {
  elapsedTime: number;
}

export function TimerDisplay({ elapsedTime }: TimerDisplayProps) {
  const formatTime = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div 
      className="text-5xl md:text-6xl font-mono text-foreground tabular-nums p-4 bg-muted/50 rounded-lg shadow-inner w-full text-center" 
      aria-live="polite" 
      aria-atomic="true"
      role="timer"
    >
      {formatTime(elapsedTime)}
    </div>
  );
}
