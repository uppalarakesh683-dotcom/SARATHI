'use client';

import React from 'react';
import {
  BookOpen,
  Sparkles,
  ListOrdered,
  Award,
  FileText,
  Target,
} from 'lucide-react';
import { LearningMode } from '@/types/ai';

export interface ModeOption {
  id: LearningMode;
  label: string;
  shortDesc: string;
  icon: React.ElementType;
}

export const TUTOR_MODES: ModeOption[] = [
  {
    id: 'explain',
    label: 'Explain',
    shortDesc: 'Clear academic teaching & intuition',
    icon: BookOpen,
  },
  {
    id: 'simple',
    label: 'Simple',
    shortDesc: 'Beginner analogies & plain English',
    icon: Sparkles,
  },
  {
    id: 'step_by_step',
    label: 'Step-by-Step',
    shortDesc: 'Sequential numbered steps',
    icon: ListOrdered,
  },
  {
    id: 'exam',
    label: 'Exam',
    shortDesc: 'Formulas, points & common traps',
    icon: Award,
  },
  {
    id: 'summary',
    label: 'Summary',
    shortDesc: 'Concise revision cheat sheet',
    icon: FileText,
  },
  {
    id: 'practice',
    label: 'Practice',
    shortDesc: 'Immediate drill questions',
    icon: Target,
  },
];

interface TutorModeSelectorProps {
  currentMode: LearningMode;
  onSelectMode: (mode: LearningMode) => void;
  disabled?: boolean;
}

export function TutorModeSelector({
  currentMode,
  onSelectMode,
  disabled = false,
}: TutorModeSelectorProps) {
  return (
    <div className="flex items-center space-x-2 overflow-x-auto py-0.5 custom-scrollbar">
      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold shrink-0 mr-1 hidden sm:inline">
        Mode:
      </span>
      <div className="flex items-center space-x-1.5 shrink-0">
        {TUTOR_MODES.map((mode) => {
          const Icon = mode.icon;
          const isSelected =
            currentMode === mode.id ||
            (mode.id === 'explain' && currentMode === 'detailed') ||
            (mode.id === 'summary' && currentMode === 'revision');

          return (
            <button
              key={mode.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectMode(mode.id)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 sm:px-3 sm:py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 cursor-pointer ${
                isSelected
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/80 shadow-neon-cyan'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={mode.shortDesc}
            >
              <Icon
                className={`w-3.5 h-3.5 ${
                  isSelected ? 'text-cyan-400' : 'text-slate-400'
                }`}
              />
              <span>{mode.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
