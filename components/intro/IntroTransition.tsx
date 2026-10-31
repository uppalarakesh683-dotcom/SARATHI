'use client';

import React from 'react';
import {
  Brain,
  Target,
  FileCheck2,
  TrendingUp,
  FileText,
  Mic,
  Network,
  Award,
} from 'lucide-react';

interface IntroTransitionProps {
  phase: number; // 0: Letter reveal, 1: AI core + tagline, 2: Feature cards, 3: Initializing -> Open
  initStage: string;
  onSkip: () => void;
}

const FLOATING_FEATURES = [
  { label: 'AI Tutor', icon: Brain, color: 'text-cyan-400', border: 'border-cyan-500/30' },
  { label: 'Practice', icon: Target, color: 'text-blue-400', border: 'border-blue-500/30' },
  { label: 'Mock Exams', icon: FileCheck2, color: 'text-purple-400', border: 'border-purple-500/30' },
  { label: 'Progress', icon: TrendingUp, color: 'text-emerald-400', border: 'border-emerald-500/30' },
  { label: 'Materials', icon: FileText, color: 'text-amber-400', border: 'border-amber-500/30' },
  { label: 'AI Interview', icon: Mic, color: 'text-rose-400', border: 'border-rose-500/30' },
  { label: 'Knowledge Map', icon: Network, color: 'text-sky-400', border: 'border-sky-500/30' },
  { label: 'Readiness', icon: Award, color: 'text-indigo-400', border: 'border-indigo-500/30' },
];

export function IntroTransition({ phase, initStage, onSkip }: IntroTransitionProps) {
  return (
    <div className="w-full flex flex-col items-center justify-center relative">
      {/* Skip button always available in top right */}
      <button
        onClick={onSkip}
        className="fixed top-6 right-6 z-50 px-4 py-1.5 text-xs font-mono font-medium tracking-widest text-cyan-400/80 hover:text-cyan-200 bg-slate-900/60 hover:bg-slate-900/90 border border-cyan-500/30 hover:border-cyan-400 rounded-full backdrop-blur-md transition-all shadow-sm hover:shadow-neon-cyan"
      >
        SKIP INTRO ➔
      </button>

      {/* Tagline Reveal */}
      <div
        className={`text-center space-y-1.5 my-4 transition-all duration-1000 ${
          phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <p className="text-sm sm:text-base md:text-lg text-slate-300 font-light tracking-wide">
          Your goal is the destination.
        </p>
        <p className="text-base sm:text-lg md:text-xl font-medium bg-gradient-to-r from-cyan-400 via-blue-300 to-purple-400 bg-clip-text text-transparent tracking-wider">
          SARATHI guides your path.
        </p>
      </div>

      {/* Floating Holographic Platform Features */}
      {phase >= 2 && (
        <div className="w-full max-w-4xl px-4 my-4 grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fadeIn">
          {FLOATING_FEATURES.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className={`p-3 rounded-xl bg-slate-900/40 backdrop-blur-md border ${feat.border} flex items-center space-x-2.5 transition-all duration-500 hover:scale-105 shadow-glass`}
                style={{
                  animation: `float 6s ease-in-out infinite ${idx * 0.4}s`,
                }}
              >
                <div className={`p-1.5 rounded-lg bg-slate-800/60 ${feat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-slate-200">
                  {feat.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Initialization Status */}
      <div className="mt-4 flex flex-col items-center space-y-2">
        <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400/90">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>{initStage}</span>
        </div>
        <div className="w-48 sm:w-64 h-1 bg-slate-800/80 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 transition-all duration-700 rounded-full"
            style={{
              width:
                phase === 0
                  ? '30%'
                  : phase === 1
                  ? '60%'
                  : phase === 2
                  ? '85%'
                  : '100%',
            }}
          />
        </div>
      </div>
    </div>
  );
}

