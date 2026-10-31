export type InterviewMode = 'technical' | 'coding' | 'hr' | 'viva' | 'mixed';
export type InterviewDifficulty = 'easy' | 'medium' | 'hard';

export interface InterviewFeedback {
  clarityScore: number;
  technicalScore: number;
  completenessScore: number;
  problemSolvingScore?: number;
  answerStrength?: 'strong' | 'partial' | 'weak';
  feedbackNotes: string;
  whatWasGood?: string;
  whatCouldBeImproved?: string;
  idealAnswer?: string;
  keyPointsMissed: string[];
  relatedTopic?: string;
  codeReview?: {
    algorithmApproach?: string;
    timeComplexity?: string;
    spaceComplexity?: string;
    edgeCasesCovered?: boolean;
    codeQualityNotes?: string;
  };
}

export interface InterviewChatMessage {
  id: string;
  speaker: 'interviewer' | 'candidate';
  text: string;
  timestamp: string;
  feedback?: InterviewFeedback;
  codeSnippet?: string;
  codeLanguage?: string;
}

export interface QuestionReviewItem {
  questionIndex: number;
  question: string;
  candidateAnswer: string;
  score: number;
  whatWasGood: string;
  whatCouldBeImproved: string;
  idealAnswer: string;
  relatedTopic: string;
}

export interface InterviewReportData {
  finalScore: number;
  technicalScore: number;
  problemSolvingScore: number;
  communicationScore: number;
  answerQualityScore?: number;
  roleKnowledgeScore?: number;
  codingScore?: number;
  hireRecommendation: 'Strong Hire' | 'Hire' | 'Needs Improvement' | 'Not Ready';
  strengths: string[];
  improvementAreas: string[];
  questionsAnsweredWell?: string[];
  questionsNeedingImprovement?: string[];
  recurringMistakes?: string[];
  recommendedPreparation: string;
  summaryFeedback: string;
  questionReviews?: QuestionReviewItem[];
}

export interface StoredInterviewRecord {
  id: string;
  date: string;
  role: string;
  mode: InterviewMode;
  difficulty: InterviewDifficulty;
  questionCount: number;
  durationMinutes: number;
  report: InterviewReportData;
  transcript: InterviewChatMessage[];
}

