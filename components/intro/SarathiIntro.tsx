'use client';

import React, { useState, useEffect, useRef } from 'react';

interface SarathiIntroProps {
  onStartReveal?: () => void;
  onComplete: () => void;
}

// Deterministic ambient particles for atmospheric depth (hydration-safe, zero Math.random())
const PARTICLES = [
  { x: 12, y: 25, size: 2.0, delay: 0.0, duration: 9.5 },
  { x: 86, y: 18, size: 1.5, delay: 0.6, duration: 10.0 },
  { x: 62, y: 82, size: 2.5, delay: 1.2, duration: 8.8 },
  { x: 24, y: 65, size: 1.8, delay: 0.4, duration: 9.2 },
  { x: 78, y: 38, size: 2.0, delay: 1.8, duration: 10.4 },
  { x: 16, y: 48, size: 1.5, delay: 2.1, duration: 8.5 },
  { x: 92, y: 72, size: 2.2, delay: 0.9, duration: 9.8 },
  { x: 38, y: 20, size: 1.8, delay: 1.5, duration: 9.0 },
  { x: 50, y: 88, size: 2.5, delay: 0.2, duration: 10.6 },
  { x: 8,  y: 80, size: 1.5, delay: 2.4, duration: 8.9 },
  { x: 94, y: 30, size: 2.0, delay: 0.7, duration: 9.4 },
  { x: 34, y: 10, size: 1.5, delay: 1.1, duration: 9.9 },
];

export function SarathiIntro({ onStartReveal, onComplete }: SarathiIntroProps) {
  const [ambientVisible, setAmbientVisible] = useState(false);
  const [titleVisible, setTitleVisible] = useState(false);
  const [arrowStage, setArrowStage] = useState<'idle' | 'entering' | 'crossing' | 'exited'>('idle');
  const [tagline1Visible, setTagline1Visible] = useState(false);
  const [tagline2Visible, setTagline2Visible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const onStartRevealRef = useRef(onStartReveal);
  onStartRevealRef.current = onStartReveal;

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Lock body scroll during intro
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Stage 1: Ambient background awakens gently (100ms)
    timers.push(
      setTimeout(() => {
        setAmbientVisible(true);
      }, 100)
    );

    // Stage 2: SARATHI text appears first at intended size (600ms)
    timers.push(
      setTimeout(() => {
        setTitleVisible(true);
      }, 600)
    );

    // Stage 3: Pause, then slow golden glowing arrow enters from the LEFT (1600ms)
    // The arrow moves slowly and smoothly across the screen over ~3.8 seconds
    timers.push(
      setTimeout(() => {
        setArrowStage('entering');
      }, 1600)
    );

    // Stage 4: Arrow reaches and crosses/touches the SARATHI name (2800ms)
    // Intensifies golden glow and illuminates letters
    timers.push(
      setTimeout(() => {
        setArrowStage('crossing');
      }, 2800)
    );

    // Stage 5: Arrow exits to the right and disappears into soft light (4400ms)
    timers.push(
      setTimeout(() => {
        setArrowStage('exited');
      }, 4400)
    );

    // Stage 6: Tagline 1 ("Your goal is the destination.") fades in (4800ms)
    timers.push(
      setTimeout(() => {
        setTagline1Visible(true);
      }, 4800)
    );

    // Stage 7: Tagline 2 ("SARATHI guides your path.") fades in (5400ms)
    timers.push(
      setTimeout(() => {
        setTagline2Visible(true);
      }, 5400)
    );

    // Stage 8: Slow, polished transition to the actual platform begins (6300ms)
    timers.push(
      setTimeout(() => {
        if (onStartRevealRef.current) {
          onStartRevealRef.current();
        }
        setIsExiting(true);
      }, 6300)
    );

    // Stage 9: Intro complete unmount (7300ms)
    timers.push(
      setTimeout(() => {
        onCompleteRef.current();
      }, 7300)
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  const handleSkip = () => {
    setTitleVisible(true);
    setArrowStage('exited');
    setTagline1Visible(true);
    setTagline2Visible(true);
    if (onStartRevealRef.current) {
      onStartRevealRef.current();
    }
    setIsExiting(true);
    setTimeout(() => {
      onCompleteRef.current();
    }, 450);
  };

  const isCrossing = arrowStage === 'crossing';
  const hasExited = arrowStage === 'exited';

  return (
    <>
      <style>{`
        @keyframes ambient-particle {
          from { opacity: 0.12; transform: translateY(0px) scale(0.95); }
          to   { opacity: 0.45; transform: translateY(-16px) scale(1.15); }
        }
        /* Slow, deliberate cinematic flight across the entire screen (3.6s duration) */
        @keyframes slow-golden-arrow-flight {
          0% {
            left: -32vw;
            opacity: 0;
          }
          8% {
            opacity: 1;
          }
          88% {
            opacity: 1;
          }
          100% {
            left: 128vw;
            opacity: 0;
          }
        }
        @keyframes mist-smoke-shimmer {
          0%, 100% { opacity: 0.45; transform: scaleY(1); }
          50%       { opacity: 0.25; transform: scaleY(1.35); }
        }
      `}</style>

      <div
        className={`fixed inset-0 w-screen h-screen z-[99999] flex flex-col items-center justify-center bg-slate-950 overflow-hidden select-none transition-all duration-1000 ease-in-out ${
          isExiting ? 'opacity-0 scale-[1.01] pointer-events-none' : 'opacity-100 scale-100'
        }`}
        style={{ backgroundColor: '#020617' }}
      >
        {/* Atmospheric Ambient Lighting */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-1000 ease-out"
          style={{
            background: isCrossing
              ? 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(245,158,11,0.18), rgba(251,191,36,0.06) 45%, transparent 70%)'
              : hasExited
              ? 'radial-gradient(ellipse 65% 45% at 50% 50%, rgba(245,158,11,0.10), transparent 65%)'
              : 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(245,158,11,0.05), transparent 60%)',
            opacity: ambientVisible ? 1 : 0,
          }}
        />

        {/* Ambient Peaceful Floating Particles (Hydration-safe) */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-1000 ease-out"
          style={{ opacity: ambientVisible ? 1 : 0 }}
        >
          {PARTICLES.map((p, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-amber-400/25"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size,
                animation: `ambient-particle ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
              }}
            />
          ))}
        </div>

        {/* Skip button for user/judge convenience */}
        <button
          type="button"
          onClick={handleSkip}
          className="fixed top-6 right-6 z-50 px-3.5 py-1.5 text-[11px] font-mono tracking-widest text-amber-400/70 hover:text-amber-200 bg-slate-900/60 hover:bg-slate-900/90 border border-amber-500/25 hover:border-amber-400/60 rounded-full backdrop-blur-md transition-all cursor-pointer"
        >
          SKIP ➔
        </button>

        {/* Central Stage */}
        <div className="relative z-10 flex flex-col items-center justify-center max-w-4xl w-full px-6 text-center space-y-10">
          
          {/* ========================================================= */}
          {/* STAGE: SARATHI NAME + SLOW HORIZONTAL GOLDEN ARROW         */}
          {/* ========================================================= */}
          <div className="relative flex items-center justify-center py-6 px-10 w-full max-w-3xl overflow-visible">
            
            {/* 1. SARATHI Letters in Center (Original/Intended Size) */}
            <div
              className={`relative z-10 tracking-[0.24em] font-extrabold font-mono text-5xl sm:text-7xl md:text-8xl select-none bg-clip-text text-transparent transition-all duration-700 ease-out transform ${
                titleVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}
              style={{
                backgroundImage: isCrossing
                  ? 'linear-gradient(135deg, #ffffff 0%, #fef3c7 30%, #fde68a 60%, #f59e0b 100%)'
                  : hasExited
                  ? 'linear-gradient(135deg, #ffffff 0%, #fef3c7 40%, #fde68a 70%, #d97706 100%)'
                  : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #cbd5e1 100%)',
                textShadow: isCrossing
                  ? '0 0 25px rgba(245, 158, 11, 0.95), 0 0 50px rgba(251, 191, 36, 0.65), 0 0 85px rgba(217, 119, 6, 0.35)'
                  : hasExited
                  ? '0 0 20px rgba(245, 158, 11, 0.45), 0 0 35px rgba(251, 191, 36, 0.25)'
                  : '0 0 16px rgba(255, 255, 255, 0.25)',
                transition: 'text-shadow 0.4s ease-out, background-image 0.4s ease-out',
              }}
            >
              SARATHI
            </div>

            {/* 2. REALISTIC SLOW GOLDEN GLOWING ARROW */}
            {/* Starts from far left, crosses/touches SARATHI at vertical midpoint, exits to far right */}
            {arrowStage !== 'idle' && (
              <div
                className="absolute top-1/2 -translate-y-1/2 pointer-events-none z-20 flex items-center overflow-visible"
                style={{
                  animation: 'slow-golden-arrow-flight 3.6s cubic-bezier(0.25, 0.1, 0.25, 1) forwards',
                }}
              >
                {/* Arrow Shaft: Straight thin beam with golden luminous glow & motion trail */}
                <div
                  className="relative flex items-center"
                  style={{
                    width: 'clamp(280px, 38vw, 500px)',
                    height: isCrossing ? '2.5px' : '2px',
                    background:
                      'linear-gradient(90deg, transparent 0%, rgba(245, 158, 11, 0.25) 15%, rgba(251, 191, 36, 0.95) 75%, #ffffff 100%)',
                    boxShadow: isCrossing
                      ? '0 0 14px #f59e0b, 0 0 28px #fbbf24, 0 0 48px rgba(245, 158, 11, 0.85), 0 0 65px rgba(251, 191, 36, 0.45)'
                      : '0 0 8px #f59e0b, 0 0 18px #fbbf24, 0 0 30px rgba(245, 158, 11, 0.55)',
                    transition: 'box-shadow 0.3s ease-out, height 0.3s ease-out',
                  }}
                >
                  {/* Subtle soft light / smoke trail behind the shaft */}
                  <div
                    className="absolute inset-0 -top-1 -bottom-1 pointer-events-none opacity-40 blur-xs"
                    style={{
                      background:
                        'linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.2) 20%, rgba(251,191,36,0.6) 80%, rgba(255,255,255,0.8) 100%)',
                      animation: 'mist-smoke-shimmer 1.4s ease-in-out infinite',
                    }}
                  />
                </div>

                {/* Arrowhead at the Far-Right End */}
                {/* Sharp aerodynamic golden light arrow tip pointing RIGHT (▶) */}
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  className="shrink-0 -ml-1 overflow-visible"
                  style={{
                    filter: isCrossing
                      ? 'drop-shadow(0 0 10px #fbbf24) drop-shadow(0 0 22px #f59e0b)'
                      : 'drop-shadow(0 0 6px #fbbf24) drop-shadow(0 0 14px #f59e0b)',
                  }}
                >
                  <defs>
                    <linearGradient id="goldenEnergyGrad" x1="0%" y1="0%" x2="100%" y2="50%">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="60%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#ffffff" />
                    </linearGradient>
                  </defs>
                  {/* Clean, sharp, luminous arrowhead */}
                  <polygon
                    points="2,4 20,12 2,20 6,12"
                    fill="url(#goldenEnergyGrad)"
                    stroke="#fffbeb"
                    strokeWidth="0.5"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* TAGLINES: Fade in smoothly after the arrow passes         */}
          {/* ========================================================= */}
          <div className="space-y-2.5 min-h-[58px] flex flex-col items-center justify-center">
            <p
              className={`text-slate-300 text-sm sm:text-base font-light tracking-wide transition-all duration-700 ease-out transform ${
                tagline1Visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}
            >
              Your goal is the destination.
            </p>
            <p
              className={`text-base sm:text-lg font-semibold tracking-wide bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent transition-all duration-700 ease-out transform ${
                tagline2Visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}
              style={{
                textShadow: tagline2Visible ? '0 0 20px rgba(245,158,11,0.35)' : 'none',
              }}
            >
              SARATHI guides your path.
            </p>
          </div>
        </div>

        {/* Ambient Top & Bottom Glow Lines */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent pointer-events-none" />
      </div>
    </>
  );
}
