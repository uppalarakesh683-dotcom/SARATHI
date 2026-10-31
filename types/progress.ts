export type MasteryLevel =
  | 'not_assessed'
  | 'beginner'
  | 'developing'
  | 'strong'
  | 'mastered';

export interface ConceptMastery {
  conceptId: string;
  conceptName: string;
  subject: string;
  topic: string;
  status: MasteryLevel;
  score: number; // 0 - 100
  attemptsCount: number;
  correctCount: number;
  mistakeCount: number;
  lastAttempted?: string;
  prerequisites: string[];
  subtopics: string[];
  description: string;
}

export interface WeaknessReport {
  conceptId: string;
  conceptName: string;
  topic: string;
  accuracy: number;
  mistakeCount: number;
  severity: 'high' | 'medium' | 'low';
  identifiedReason: string;
  remedySummary: string;
  prerequisitesToReview: string[];
}

export interface NextBestAction {
  id: string;
  type:
    | 'diagnostic'
    | 'fix_weakness'
    | 'retest'
    | 'practice'
    | 'mock_exam'
    | 'review_notes';
  title: string;
  description: string;
  ctaText: string;
  actionRoute: string;
  targetTopic?: string;
  targetConceptId?: string;
  badge?: string;
}

export interface ReadinessAssessment {
  overallScore: number; // 0 - 100
  status: 'insufficient_data' | 'calculated';
  statusMessage: string;
  breakdown: {
    accuracy: number;
    coverage: number;
    speed: number;
    consistency: number;
  };
  weakAreas: WeaknessReport[];
  strongAreas: string[];
  recentTrend: number[];
  factors: string[];
  nextBestAction: NextBestAction;
}

