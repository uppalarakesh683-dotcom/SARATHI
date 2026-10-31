import { Question, QuestionType, DifficultyLevel } from '@/types/question';
import { SEED_DBMS_QUESTIONS } from '@/data/seed/questions';

export interface QuestionGenerationParams {
  subject?: string;
  topic?: string;
  conceptId?: string;
  difficulty?: DifficultyLevel | 'mixed';
  type?: QuestionType;
  count?: number;
}

export function generateQuestions(params: QuestionGenerationParams): Question[] {
  const { topic, conceptId, difficulty, count = 5 } = params;

  let pool = [...SEED_DBMS_QUESTIONS];

  if (conceptId) {
    const matched = pool.filter((q) => q.conceptId === conceptId);
    if (matched.length > 0) pool = matched;
  } else if (topic) {
    const matched = pool.filter(
      (q) => q.topic.toLowerCase().includes(topic.toLowerCase()) || q.conceptId.includes(topic.toLowerCase())
    );
    if (matched.length > 0) pool = matched;
  }

  if (difficulty && difficulty !== 'mixed') {
    const diffMatched = pool.filter((q) => q.difficulty === difficulty);
    if (diffMatched.length > 0) pool = diffMatched;
  }

  // Shuffle and pick requested count
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

