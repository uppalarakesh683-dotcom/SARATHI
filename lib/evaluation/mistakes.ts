import { Question, MistakeCategory } from '@/types/question';
import { MistakeAnalysis } from '@/types/exam';

export function analyzeMistakeReason(
  question: Question,
  selectedAnswers: string[]
): MistakeAnalysis {
  let category: MistakeCategory = 'conceptual_gap';
  let reason = 'The chosen option contradicts core principles of this concept.';
  let remedyAction = 'Review fundamental properties and closure algorithms.';

  const selectedFirst = selectedAnswers[0];
  const optionExpl = question.whyIncorrect && selectedFirst ? question.whyIncorrect[selectedFirst] : null;

  if (optionExpl) {
    reason = optionExpl;
    if (optionExpl.toLowerCase().includes('syntax') || optionExpl.toLowerCase().includes('violates sql')) {
      category = 'wrong_approach';
      remedyAction = 'Review query syntax constraints and clause execution order.';
    } else if (optionExpl.toLowerCase().includes('misses') || optionExpl.toLowerCase().includes('part of')) {
      category = 'incomplete_knowledge';
      remedyAction = 'Ensure exhaustive checking of all candidate keys or dependencies.';
    } else if (optionExpl.toLowerCase().includes('calculate') || optionExpl.toLowerCase().includes('arithmetic')) {
      category = 'calculation_error';
      remedyAction = 'Double-check formulas and numerical values step-by-step.';
    } else {
      category = 'conceptual_gap';
      remedyAction = `Study ${question.topic}: ${question.subtopic} rules.`;
    }
  } else if (question.type === 'numerical') {
    category = 'calculation_error';
    reason = `Entered ${selectedFirst}, but expected ${question.correctAnswers.join(' or ')}.`;
    remedyAction = 'Verify formula application: fanout, block pointer count, and ceiling/floor bounds.';
  } else {
    category = 'misinterpretation';
    reason = `Selected answer deviated from the correct property: ${question.whyCorrect || question.explanation}`;
    remedyAction = 'Read question constraints carefully (e.g., universal quantification vs existential).';
  }

  return {
    questionId: question.id,
    questionText: question.question,
    conceptId: question.conceptId,
    conceptName: question.topic,
    selectedAnswers,
    correctAnswers: question.correctAnswers,
    category,
    reason,
    remedyAction,
  };
}

