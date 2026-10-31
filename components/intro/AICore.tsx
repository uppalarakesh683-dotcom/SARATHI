'use client';

import React from 'react';

interface AICoreProps {
  intensity?: number; // 0 to 1
}

export function AICore({ intensity = 1 }: AICoreProps) {
  return (
    <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center pointer-events-none">
      {/* Outer energy sphere glow */}
      <div
        className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-600/20 via-blue-600/10 to-purple-600/20 blur-2xl animate-pulse-slow"
        style={{ transform: `scale(${0.8 + intensity * 0.4})` }}
      />

      {/* Orbital Ring 1 (Tilted 60 deg) */}
      <div
        className="absolute w-full h-full border border-cyan-400/40 rounded-full animate-orbit-slow"
        style={{
          transform: 'rotateX(65deg) rotateY(20deg)',
          boxShadow: '0 0 15px rgba(6, 182, 212, 0.3)',
        }}
      >
        {/* Orbital satellite node */}
        <div className="absolute top-0 left-1/2 w-3 h-3 -ml-1.5 bg-cyan-300 rounded-full shadow-[0_0_10px_#00f2fe]" />
      </div>

      {/* Orbital Ring 2 (Counter-rotation, Tilted -45 deg) */}
      <div
        className="absolute w-5/6 h-5/6 border border-blue-400/35 rounded-full animate-orbit-reverse"
        style={{
          transform: 'rotateX(45deg) rotateY(-35deg)',
          boxShadow: '0 0 12px rgba(59, 130, 246, 0.3)',
        }}
      >
        <div className="absolute bottom-0 right-1/4 w-2.5 h-2.5 bg-blue-300 rounded-full shadow-[0_0_8px_#38bdf8]" />
      </div>

      {/* Orbital Ring 3 (Z-axis spin) */}
      <div
        className="absolute w-4/6 h-4/6 border border-purple-400/30 rounded-full animate-orbit-slow"
        style={{
          transform: 'rotateX(80deg) rotateZ(45deg)',
          boxShadow: '0 0 10px rgba(168, 85, 247, 0.25)',
        }}
      />

      {/* Holographic Circuit Center Ring */}
      <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full border border-cyan-300/60 bg-gradient-to-br from-cyan-950/60 via-slate-900/80 to-blue-950/60 backdrop-blur-md flex items-center justify-center shadow-neon-cyan">
        {/* Inner geometric crosshairs */}
        <div className="absolute inset-2 border border-cyan-400/20 rounded-full" />
        <div className="absolute inset-6 border border-purple-400/30 rounded-full" />
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 opacity-90 blur-xs flex items-center justify-center animate-pulse">
          <div className="w-8 h-8 rounded-full bg-white shadow-[0_0_20px_#ffffff]" />
        </div>

        {/* Radiating energy lines */}
        <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
        <div className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-cyan-400/60 to-transparent" />
      </div>

      {/* Floating particles background */}
      <div className="absolute -top-6 -left-6 w-2 h-2 rounded-full bg-cyan-400/70 animate-float blur-2xs" />
      <div className="absolute -bottom-8 right-6 w-2.5 h-2.5 rounded-full bg-purple-400/70 animate-float blur-2xs" />
      <div className="absolute top-1/2 -right-8 w-1.5 h-1.5 rounded-full bg-blue-300 animate-float" />
    </div>
  );
}

