export type LearningMode =
  | 'explain'
  | 'simple'
  | 'step_by_step'
  | 'exam'
  | 'summary'
  | 'practice'
  | 'detailed'
  | 'revision';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'sarathi' | 'system';
  content: string;
  timestamp: string;
  learningMode?: LearningMode;
  contextSources?: {
    documentName: string;
    snippet: string;
    relevance: number;
    topic?: string;
    pageNumber?: number;
  }[];
  suggestedPrompts?: string[];
  interactivePayload?: {
    type: 'question' | 'code' | 'summary' | 'concept_card';
    data: any;
  };
  isError?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  learningMode: LearningMode;
  messages: ChatMessage[];
  activeTopic?: string;
}

export interface InterviewMessage {
  id: string;
  speaker: 'interviewer' | 'candidate';
  text: string;
  timestamp: string;
  feedback?: {
    clarityScore: number;
    technicalScore: number;
    completenessScore: number;
    feedbackNotes: string;
    keyPointsMissed: string[];
  };
}

export interface InterviewSession {
  id: string;
  roleTitle: string; // e.g. "Senior Backend Engineer - Database Systems (GATE CSE / Placement)"
  type: 'technical' | 'coding' | 'hr' | 'viva';
  status: 'active' | 'completed';
  currentQuestionIndex: number;
  questions: string[];
  transcript: InterviewMessage[];
  overallEvaluation?: {
    finalScore: number;
    strengths: string[];
    improvementAreas: string[];
    hireRecommendation: 'Strong Hire' | 'Hire' | 'Needs Improvement' | 'Not Ready';
    summaryFeedback: string;
  };
}
