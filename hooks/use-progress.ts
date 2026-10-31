'use client';

import { useContext } from 'react';
import {
  LearningTargetContext,
  LearningTargetContextType,
} from '@/components/providers/LearningTargetProvider';

export function useProgress(): LearningTargetContextType {
  const context = useContext(LearningTargetContext);
  if (!context) {
    throw new Error('useProgress must be used within a LearningTargetProvider');
  }
  return context;
}
