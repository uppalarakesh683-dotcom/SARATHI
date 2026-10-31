import { UserProfile, AIMemoryItem, ActivityLogItem } from '@/types/user';
import { Question, QuestionAttempt } from '@/types/question';
import { ExamSession } from '@/types/exam';
import { ConceptMastery, ReadinessAssessment, NextBestAction, WeaknessReport } from '@/types/progress';
import { DocumentMaterial } from '@/types/material';
import { ChatSession, InterviewSession } from '@/types/ai';

export interface SarathiDatabase {
  profile: UserProfile | null;
  questions: Question[];
  attempts: QuestionAttempt[];
  examSessions: ExamSession[];
  conceptMasteries: Record<string, ConceptMastery>;
  materials: DocumentMaterial[];
  chatSessions: ChatSession[];
  aiMemories: AIMemoryItem[];
  interviewSessions: InterviewSession[];
  activityLog: ActivityLogItem[];
  activeWeaknessFix: {
    conceptId: string;
    conceptName: string;
    step: number; // 1 to 8
    beforeScore?: number;
    afterScore?: number;
    completed: boolean;
  } | null;
}

const STORAGE_KEY = 'sarathi_system_db_v2';

// Initial default clean state with zero fake scores or hardcoded subjects
export function createInitialDatabase(): SarathiDatabase {
  return {
    profile: null,
    questions: [],
    attempts: [],
    examSessions: [],
    conceptMasteries: {},
    materials: [],
    chatSessions: [],
    aiMemories: [],
    interviewSessions: [],
    activityLog: [],
    activeWeaknessFix: null,
  };
}

let inMemoryDb: SarathiDatabase | null = null;

export function getDatabase(): SarathiDatabase {
  if (typeof window === 'undefined') {
    if (!inMemoryDb) inMemoryDb = createInitialDatabase();
    return inMemoryDb;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialDatabase();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      inMemoryDb = initial;
      return initial;
    }
    const parsed = JSON.parse(raw);
    inMemoryDb = parsed;
    return parsed;
  } catch (e) {
    if (!inMemoryDb) inMemoryDb = createInitialDatabase();
    return inMemoryDb;
  }
}

export function saveDatabase(db: SarathiDatabase): void {
  inMemoryDb = db;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }
}

export function resetDatabase(): SarathiDatabase {
  const fresh = createInitialDatabase();
  saveDatabase(fresh);
  return fresh;
}

// User Profile
export function getUserProfile(): UserProfile | null {
  return getDatabase().profile;
}

export function saveUserProfile(profile: UserProfile): void {
  const db = getDatabase();
  const oldSubject = db.profile?.primarySubject;
  db.profile = profile;

  // If student changed their primary subject, clear old subject-specific masteries
  if (oldSubject && profile.primarySubject && oldSubject.toLowerCase() !== profile.primarySubject.toLowerCase()) {
    Object.keys(db.conceptMasteries).forEach((key) => {
      if (db.conceptMasteries[key].subject?.toLowerCase() === oldSubject.toLowerCase()) {
        delete db.conceptMasteries[key];
      }
    });
  }

  db.activityLog.unshift({
    id: `act-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'goal_created',
    title: `Target Goal Configured: ${profile.targetExamLabel}`,
    details: `Target: ${profile.targetExamLabel} • Level: ${profile.currentLevel} • Daily Commitment: ${profile.dailyStudyMinutes} mins`,
  });
  saveDatabase(db);
}

// Log Activity
export function addActivity(activity: Omit<ActivityLogItem, 'id' | 'timestamp'>): void {
  const db = getDatabase();
  db.activityLog.unshift({
    ...activity,
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  });
  saveDatabase(db);
}

// Memory
export function addAIMemory(category: AIMemoryItem['category'], content: string, source: string): void {
  const db = getDatabase();
  db.aiMemories.unshift({
    id: `mem-${Date.now()}`,
    category,
    content,
    timestamp: new Date().toISOString(),
    source,
  });
  saveDatabase(db);
}

export function removeAIMemory(id: string): void {
  const db = getDatabase();
  db.aiMemories = db.aiMemories.filter((m) => m.id !== id);
  saveDatabase(db);
}

// Concept Mastery and Progress Update (Dynamically registers any topic/subject)
export function updateConceptMastery(
  conceptId: string,
  isCorrect: boolean,
  timeSpentSec: number,
  topicName?: string,
  subjectName?: string
): void {
  const db = getDatabase();
  const normalizedId = conceptId.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  let mastery = db.conceptMasteries[normalizedId] || db.conceptMasteries[conceptId];

  if (!mastery) {
    const displayName = topicName || conceptId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const subject = subjectName || db.profile?.primarySubject || 'General';
    mastery = {
      conceptId: normalizedId,
      conceptName: displayName,
      subject,
      topic: displayName,
      status: 'not_assessed',
      score: 0,
      attemptsCount: 0,
      correctCount: 0,
      mistakeCount: 0,
      prerequisites: [],
      subtopics: [displayName],
      description: `Target concept evaluated in ${subject}.`,
    };
  }

  mastery.attemptsCount += 1;
  if (isCorrect) {
    mastery.correctCount += 1;
  } else {
    mastery.mistakeCount += 1;
  }

  mastery.score = Math.round((mastery.correctCount / mastery.attemptsCount) * 100);
  mastery.lastAttempted = new Date().toISOString();

  // Calculate status based on real evidence
  if (mastery.attemptsCount === 0) {
    mastery.status = 'not_assessed';
  } else if (mastery.score >= 85 && mastery.attemptsCount >= 3) {
    mastery.status = 'mastered';
  } else if (mastery.score >= 70) {
    mastery.status = 'strong';
  } else if (mastery.score >= 45) {
    mastery.status = 'developing';
  } else {
    mastery.status = 'beginner';
  }

  db.conceptMasteries[normalizedId] = mastery;
  saveDatabase(db);
}

