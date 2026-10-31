'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { UserProfile } from '@/types/user';
import { QuestionAttempt } from '@/types/question';
import { ConceptMastery, ReadinessAssessment, WeaknessReport } from '@/types/progress';
import { ActivityLogItem } from '@/types/user';
import {
  SarathiDatabase,
  createInitialDatabase,
  getDatabase,
  saveUserProfile,
  saveDatabase,
  resetDatabase,
} from '@/lib/db/client';
import { calculateReadiness } from '@/lib/evaluation/readiness';
import { detectWeaknesses } from '@/lib/evaluation/weaknesses';

export interface LearningTargetContextType {
  db: SarathiDatabase;
  profile: UserProfile | null;
  targetExamLabel: string | null;
  isMounted: boolean;
  readiness: ReadinessAssessment;
  weaknesses: WeaknessReport[];
  conceptMasteries: Record<string, ConceptMastery>;
  attempts: QuestionAttempt[];
  activityLog: ActivityLogItem[];
  activeWeaknessFix: SarathiDatabase['activeWeaknessFix'];
  saveProfile: (newProfile: UserProfile) => void;
  sync: () => void;
  resetAll: () => void;
  startWeaknessFix: (conceptId: string, conceptName: string, beforeScore: number) => void;
  updateWeaknessStep: (step: number, afterScore?: number, completed?: boolean) => void;
}

const initialCleanDb = createInitialDatabase();
const initialReadiness = calculateReadiness(initialCleanDb);
const initialWeaknesses = detectWeaknesses(initialCleanDb);

export const LearningTargetContext = createContext<LearningTargetContextType | null>(null);

export function LearningTargetProvider({ children }: { children: React.ReactNode }) {
  // Deterministic initial state on both SSR server AND initial client hydration render
  const [db, setDb] = useState<SarathiDatabase>(initialCleanDb);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [targetExamLabel, setTargetExamLabel] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<ReadinessAssessment>(initialReadiness);
  const [weaknesses, setWeaknesses] = useState<WeaknessReport[]>(initialWeaknesses);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  const sync = useCallback(() => {
    if (typeof window === 'undefined') return;
    const fresh = getDatabase();
    setDb({ ...fresh });
    setProfile(fresh.profile);
    setTargetExamLabel(fresh.profile?.targetExamLabel || null);
    setReadiness(calculateReadiness(fresh));
    setWeaknesses(detectWeaknesses(fresh));
  }, []);

  // Mount effect: runs strictly after initial hydration render has completed
  useEffect(() => {
    setIsMounted(true);
    sync();

    const handleStorage = () => sync();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [sync]);

  const saveProfileHandler = useCallback(
    (newProfile: UserProfile) => {
      saveUserProfile(newProfile);
      setProfile(newProfile);
      setTargetExamLabel(newProfile.targetExamLabel);
      sync();
    },
    [sync]
  );

  const resetAllHandler = useCallback(() => {
    const fresh = resetDatabase();
    setDb({ ...fresh });
    setProfile(null);
    setTargetExamLabel(null);
    setReadiness(calculateReadiness(fresh));
    setWeaknesses(detectWeaknesses(fresh));
  }, []);

  const startWeaknessFixHandler = useCallback(
    (conceptId: string, conceptName: string, beforeScore: number) => {
      const currentDb = getDatabase();
      currentDb.activeWeaknessFix = {
        conceptId,
        conceptName,
        step: 1,
        beforeScore,
        completed: false,
      };
      saveDatabase(currentDb);
      sync();
    },
    [sync]
  );

  const updateWeaknessStepHandler = useCallback(
    (step: number, afterScore?: number, completed = false) => {
      const currentDb = getDatabase();
      if (currentDb.activeWeaknessFix) {
        currentDb.activeWeaknessFix.step = step;
        if (afterScore !== undefined) {
          currentDb.activeWeaknessFix.afterScore = afterScore;
        }
        if (completed) {
          currentDb.activeWeaknessFix.completed = true;
        }
        saveDatabase(currentDb);
        sync();
      }
    },
    [sync]
  );

  const value = useMemo<LearningTargetContextType>(
    () => ({
      db,
      profile,
      targetExamLabel,
      isMounted,
      readiness,
      weaknesses,
      conceptMasteries: db.conceptMasteries,
      attempts: db.attempts,
      activityLog: db.activityLog,
      activeWeaknessFix: db.activeWeaknessFix,
      saveProfile: saveProfileHandler,
      sync,
      resetAll: resetAllHandler,
      startWeaknessFix: startWeaknessFixHandler,
      updateWeaknessStep: updateWeaknessStepHandler,
    }),
    [
      db,
      profile,
      targetExamLabel,
      isMounted,
      readiness,
      weaknesses,
      saveProfileHandler,
      sync,
      resetAllHandler,
      startWeaknessFixHandler,
      updateWeaknessStepHandler,
    ]
  );

  return (
    <LearningTargetContext.Provider value={value}>
      {children}
    </LearningTargetContext.Provider>
  );
}

export function useLearningTarget(): LearningTargetContextType {
  const ctx = useContext(LearningTargetContext);
  if (!ctx) {
    throw new Error('useLearningTarget must be used within a LearningTargetProvider');
  }
  return ctx;
}

