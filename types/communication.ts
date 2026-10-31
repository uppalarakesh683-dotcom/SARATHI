export type CommunicationType =
  | 'paragraph'
  | 'email'
  | 'interview_answer'
  | 'summarization'
  | 'technical_explanation';

export interface CommunicationScenario {
  id: string;
  type: CommunicationType;
  title: string;
  category: string;
  prompt: string;
  contextHint?: string;
  targetTone?: string;
  suggestedLengthWords?: { min: number; max: number };
}

export interface WritingCorrection {
  originalSnippet: string;
  suggestedImprovement: string;
  reason: string;
  betterVersion: string;
}

export interface CommunicationRubric {
  grammar: number; // 0 - 100
  vocabulary: number; // 0 - 100
  clarity: number; // 0 - 100
  structure: number; // 0 - 100
  coherence: number; // 0 - 100
  professionalTone: number; // 0 - 100
  relevance: number; // 0 - 100
  overallScore: number; // 0 - 100
}

export interface CommunicationAssessmentRecord {
  id: string;
  date: string;
  type: CommunicationType;
  scenarioTitle: string;
  userSubmission: string;
  rubric: CommunicationRubric;
  feedbackSummary: string;
  strengths: string[];
  areasToImprove: string[];
  corrections: WritingCorrection[];
  polishedVersion: string;
  timeSpentSeconds?: number;
}

