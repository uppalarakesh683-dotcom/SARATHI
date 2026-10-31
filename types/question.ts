export type QuestionType =
  | 'mcq'
  | 'msq'
  | 'true_false'
  | 'fill_blank'
  | 'numerical'
  | 'short_answer'
  | 'coding';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export type MistakeCategory =
  | 'conceptual_gap'
  | 'misunderstanding'
  | 'wrong_approach'
  | 'calculation_error'
  | 'careless_mistake'
  | 'misinterpretation'
  | 'incomplete_knowledge';

export interface QuestionOption {
  id: string;
  text: string;
}

export interface QuestionHint {
  level: 1 | 2 | 3;
  title: string; // e.g. "Conceptual Clue", "Direction & Strategy", "Strong Clue"
  hint: string;
}

export interface SolutionStep {
  stepNumber: number;
  title: string;
  content: string;
}

export interface SolvingMethod {
  title: string; // e.g. "Method 1 — Standard Approach"
  type: 'standard' | 'alternative' | 'shortcut';
  description: string;
}

export interface Question {
  id: string;
  subject: string;
  topic: string;
  subtopic: string;
  conceptId: string;
  type: QuestionType;
  difficulty: DifficultyLevel;
  question: string;
  codeSnippet?: string;
  options?: QuestionOption[];
  correctAnswers: string[]; // Option IDs or exact string/number
  explanation: string;
  whyCorrect: string;
  whyIncorrect?: Record<string, string>; // Option ID -> explanation
  hint?: string;
  hints?: QuestionHint[];
  steps?: SolutionStep[];
  methods?: SolvingMethod[];
  sourceDocumentName?: string;
  sourcePageNumber?: number;
  tags: string[];
  sourceMaterialId?: string;
}

export interface QuestionAttempt {
  id: string;
  questionId: string;
  selectedAnswers: string[];
  isCorrect: boolean;
  timeSpentSec: number;
  mistakeCategory?: MistakeCategory;
  mistakeReason?: string;
  timestamp: string;
}

