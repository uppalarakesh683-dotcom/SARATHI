'use client';

import React from 'react';

interface LogoRevealProps {
  currentStep: number; // 0 to 7 (letters) + 8 (final glow)
}

const LETTERS = ['S', 'A', 'R', 'A', 'T', 'H', 'I'];

export function LogoReveal({ currentStep }: LogoRevealProps) {
  const isFinalGlow = currentStep >= 7;

  return (
    <div className="relative flex items-center justify-center select-none py-6">
      {/* Background ambient glow behind logo */}
      <div
        className={`absolute inset-0 bg-cyan-500/10 blur-3xl rounded-full transition-opacity duration-1000 ${
          isFinalGlow ? 'opacity-80 scale-125' : 'opacity-20 scale-90'
        }`}
      />

      {/* Letters container */}
      <div className="relative flex items-center space-x-2 sm:space-x-4 md:space-x-6">
        {LETTERS.map((letter, idx) => {
          const isRevealed = currentStep >= idx;
          const isCurrent = currentStep === idx;

          return (
            <div
              key={idx}
              className="relative flex items-center justify-center"
              style={{
                perspective: '800px',
              }}
            >
              {/* Traveling light beam effect */}
              {isCurrent && (
                <div className="absolute -top-12 w-1 h-24 bg-gradient-to-b from-transparent via-cyan-400 to-transparent animate-pulse filter blur-xs" />
              )}

              {/* Letter box with glass/metallic finish */}
              <div
                className={`relative flex items-center justify-center font-black tracking-wider transition-all duration-700 ease-out text-4xl sm:text-6xl md:text-8xl ${
                  isRevealed
                    ? 'opacity-100 translate-y-0 scale-100'
                    : 'opacity-0 translate-y-8 scale-75'
                }`}
                style={{
                  textShadow: isFinalGlow
                    ? '0 0 25px rgba(0, 242, 254, 0.9), 0 0 60px rgba(6, 182, 212, 0.6)'
                    : isRevealed
                    ? '0 0 15px rgba(0, 242, 254, 0.5)'
                    : 'none',
                }}
              >
                <span className="bg-gradient-to-b from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent filter drop-shadow-[0_2px_10px_rgba(0,242,254,0.4)]">
                  {letter}
                </span>

                {/* Sweep shimmer bar */}
                {isCurrent && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-80 mix-blend-overlay animate-pulse" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Synchronized full-word pulse ring on final reveal */}
      {isFinalGlow && (
        <div className="absolute -inset-x-8 -inset-y-4 border border-cyan-400/30 rounded-2xl animate-pulse pointer-events-none" />
      )}
    </div>
  );
}

