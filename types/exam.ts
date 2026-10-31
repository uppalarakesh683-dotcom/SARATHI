import { Question, MistakeCategory } from './question';

export interface ExamConfig {
  id: string;
  title: string;
  examType: string;
  subject: string;
  topics: string[];
  questionCount: number;
  durationMinutes: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  negativeMarking: boolean;
  negativeMarkRatio: number; // e.g. 0.33 for 1/3 deduction
  sections?: {
    name: string;
    questionIds: string[];
  }[];
}

export interface MistakeAnalysis {
  questionId: string;
  questionText: string;
  conceptId: string;
  conceptName: string;
  selectedAnswers: string[];
  correctAnswers: string[];
  category: MistakeCategory;
  reason: string;
  remedyAction: string;
}

export interface ExamEvaluation {
  totalQuestions: number;
  attempted: number;
  unattempted: number;
  correct: number;
  incorrect: number;
  score: number;
  maxScore: number;
  percentage: number;
  accuracy: number;
  timeSpentSeconds: number;
  mistakes: MistakeAnalysis[];
  conceptScores: Record<
    string,
    {
      conceptName: string;
      total: number;
      correct: number;
      accuracy: number;
    }
  >;
  weakestConcept?: {
    conceptId: string;
    conceptName: string;
    accuracy: number;
    mistakeCount: number;
  };
  recommendations: string[];
}

export interface ExamSession {
  id: string;
  config: ExamConfig;
  questions: Question[];
  answers: Record<string, string[]>;
  markedForReview: string[];
  currentQuestionIndex: number;
  startTime: string;
  endTime?: string;
  timeRemainingSeconds: number;
  isSubmitted: boolean;
  evaluation?: ExamEvaluation;
}

