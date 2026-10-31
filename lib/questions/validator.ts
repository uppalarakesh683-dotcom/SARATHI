import { Question } from '@/types/question';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateQuestion(q: Question): ValidationResult {
  const errors: string[] = [];

  if (!q.question || q.question.trim().length < 10) {
    errors.push('Question statement is too short or empty.');
  }

  if (!q.correctAnswers || q.correctAnswers.length === 0) {
    errors.push('Question must have at least one valid correct answer.');
  }

  if (q.type === 'mcq' || q.type === 'msq') {
    if (!q.options || q.options.length < 2) {
      errors.push('Multiple choice questions must have at least 2 options.');
    } else {
      const optionTexts = q.options.map((o) => o.text.trim().toLowerCase());
      const uniqueTexts = new Set(optionTexts);
      if (uniqueTexts.size !== optionTexts.length) {
        errors.push('Duplicate options detected.');
      }

      // Check that correctAnswers correspond to valid option IDs
      const validOptionIds = new Set(q.options.map((o) => o.id));
      const hasInvalidCorrect = q.correctAnswers.some((ans) => !validOptionIds.has(ans));
      if (hasInvalidCorrect) {
        errors.push('Correct answer references an option ID that does not exist.');
      }
    }
  }

  if (!q.explanation || q.explanation.trim().length < 10) {
    errors.push('Detailed explanation is required.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

