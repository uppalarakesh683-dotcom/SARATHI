export type ExamType =
  | 'gate_cse'
  | 'college_exam'
  | 'placement'
  | 'technical_interview'
  | 'certification'
  | 'skill_development'
  | 'competitive'
  | 'university'
  | 'interview'
  | 'skill';

export type LearnerLevel = 'beginner' | 'intermediate' | 'advanced';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  targetExam: ExamType;
  targetExamLabel: string;
  targetRole?: string;
  targetRoleCategory?: string;
  targetSkills?: string[];
  careerGoal?: string;
  primarySubject?: string;
  currentLevel: LearnerLevel;
  targetDate: string;
  dailyStudyMinutes: number;
  completedOnboarding: boolean;
  totalStudyMinutes: number;
  streakDays: number;
  createdAt: string;
}

export type MemoryCategory = 'goal' | 'weakness' | 'preference' | 'mastery' | 'study_habit';

export interface AIMemoryItem {
  id: string;
  category: MemoryCategory;
  content: string;
  timestamp: string;
  source: string;
}

export type ActivityType =
  | 'diagnostic'
  | 'practice'
  | 'mock_exam'
  | 'fix_weakness'
  | 'retest'
  | 'tutor'
  | 'material_rag'
  | 'interview'
  | 'communication'
  | 'goal_created';

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  type: ActivityType;
  title: string;
  details: string;
  score?: number;
  durationSec?: number;
  topic?: string;
}

