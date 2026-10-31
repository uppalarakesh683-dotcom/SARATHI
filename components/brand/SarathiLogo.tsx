'use client';

import React from 'react';

export interface SarathiLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'hero';
  showWordmark?: boolean;
  showTagline?: boolean;
  animated?: boolean;
  glow?: 'none' | 'subtle' | 'bright' | 'hero';
  className?: string;
  lightSweep?: boolean;
}

export function SarathiLogo({
  size = 'md',
  showWordmark = true,
  showTagline = false,
  animated = false,
  glow = 'subtle',
  className = '',
  lightSweep = false,
}: SarathiLogoProps) {
  // Size mappings
  const iconDimensions = {
    xs: { w: 22, h: 22 },
    sm: { w: 32, h: 32 },
    md: { w: 42, h: 42 },
    lg: { w: 56, h: 56 },
    hero: { w: 84, h: 84 },
  }[size];

  const wordmarkSizes = {
    xs: 'text-xs tracking-[0.18em]',
    sm: 'text-sm tracking-[0.2em]',
    md: 'text-lg tracking-[0.22em]',
    lg: 'text-2xl tracking-[0.24em]',
    hero: 'text-4xl sm:text-5xl md:text-6xl tracking-[0.25em]',
  }[size];

  const taglineSizes = {
    xs: 'text-[8px]',
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
    hero: 'text-sm sm:text-base',
  }[size];

  const glowStyles = {
    none: '',
    subtle: 'drop-shadow-[0_0_12px_rgba(6,182,212,0.35)]',
    bright: 'drop-shadow-[0_0_24px_rgba(6,182,212,0.65)] drop-shadow-[0_0_45px_rgba(59,130,246,0.4)]',
    hero: 'drop-shadow-[0_0_35px_rgba(6,182,212,0.8)] drop-shadow-[0_0_70px_rgba(168,85,247,0.5)]',
  }[glow];

  return (
    <div
      className={`inline-flex items-center ${
        size === 'hero' ? 'flex-col justify-center text-center space-y-4' : 'space-x-3'
      } ${className}`}
    >
      {/* Abstract Navigational Symbol */}
      <div className={`relative flex items-center justify-center shrink-0 ${glowStyles}`}>
        {/* Soft background ambient halo if glow is active */}
        {glow !== 'none' && (
          <div
            className={`absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/20 via-blue-500/20 to-purple-500/20 blur-xl ${
              animated ? 'animate-pulse-slow' : ''
            }`}
          />
        )}

        <svg
          width={iconDimensions.w}
          height={iconDimensions.h}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`relative z-10 ${animated ? 'transition-transform duration-500 hover:scale-105' : ''}`}
        >
          <defs>
            {/* Primary Gradient: Cyan to Electric Blue */}
            <linearGradient id="sarathi-grad-primary" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00F2FE" />
              <stop offset="50%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>

            {/* Accent Gradient: Luminous Violet to Azure */}
            <linearGradient id="sarathi-grad-accent" x1="90" y1="20" x2="10" y2="80" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#A855F7" />
              <stop offset="60%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>

            {/* Core Apex Nexus Glow */}
            <radialGradient id="sarathi-grad-core" cx="50" cy="32" r="24" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="40%" stopColor="#38BDF8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0284C7" stopOpacity="0" />
            </radialGradient>

            {/* Subtle Metallic Face Shimmer */}
            <linearGradient id="sarathi-shimmer" x1="20" y1="0" x2="80" y2="100" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#0F172A" stopOpacity="0.6" />
            </linearGradient>
          </defs>

          {/* Hexagonal Guidance Outer Frame (Subtle Tech Housing) */}
          <polygon
            points="50,4 88,24 88,72 50,96 12,72 12,24"
            stroke="url(#sarathi-grad-primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.45"
            fill="rgba(7, 13, 30, 0.65)"
          />

          {/* Converging Path Vectors (The Dual Guidance Chevrons) */}
          {/* Left Wing / Learning Path */}
          <path
            d="M50 16 L22 68 L36 68 L50 40 L64 68 L78 68 Z"
            fill="url(#sarathi-shimmer)"
            stroke="url(#sarathi-grad-primary)"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Forward Guidance Chevron Apex (Inner Luminous Wayfinder) */}
          <path
            d="M50 24 L32 60 L42 60 L50 44 L58 60 L68 60 Z"
            fill="url(#sarathi-grad-accent)"
            stroke="#00F2FE"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Central Apex Intelligence Nexus (Luminous Waypoint) */}
          <circle cx="50" cy="34" r="5" fill="#FFFFFF" />
          <circle cx="50" cy="34" r="10" fill="url(#sarathi-grad-core)" />

          {/* Dynamic Navigational Target Ring (Subtle Compass Meridian) */}
          <ellipse
            cx="50"
            cy="76"
            rx="22"
            ry="6"
            stroke="url(#sarathi-grad-primary)"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            strokeOpacity="0.6"
          />

          {/* Upward North Trajectory Indicator */}
          <line x1="50" y1="10" x2="50" y2="18" stroke="#00F2FE" strokeWidth="2.5" strokeLinecap="round" />
        </svg>

        {/* Shimmer Light Sweep on Icon */}
        {lightSweep && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent -skew-x-12 animate-pulse pointer-events-none rounded-xl" />
        )}
      </div>

      {/* Wordmark & Tagline Branding */}
      {showWordmark && (
        <div className={`flex flex-col ${size === 'hero' ? 'items-center text-center' : 'items-start text-left'}`}>
          <div className="relative inline-block overflow-hidden">
            <span
              className={`font-black uppercase tracking-widest font-sans ${wordmarkSizes} bg-gradient-to-b from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent select-none`}
              style={{
                textShadow:
                  glow === 'hero'
                    ? '0 0 25px rgba(0, 242, 254, 0.7), 0 0 50px rgba(6, 182, 212, 0.4)'
                    : glow === 'bright'
                    ? '0 0 15px rgba(0, 242, 254, 0.5)'
                    : 'none',
              }}
            >
              SARATHI
            </span>

            {/* Travelling Light Sweep over text */}
            {lightSweep && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/70 to-transparent -skew-x-20 animate-pulse pointer-events-none" />
            )}
          </div>

          {/* Subtitle / Category Label */}
          <span
            className={`font-mono uppercase font-semibold text-cyan-400/80 tracking-[0.2em] ${taglineSizes}`}
          >
            {showTagline ? 'AI-Powered Personalized Learning & Assessment' : 'AI Learning Platform'}
          </span>
        </div>
      )}
    </div>
  );
}

