import { Question } from '@/types/question';
import { ExamConfig, ExamEvaluation, MistakeAnalysis } from '@/types/exam';
import { analyzeMistakeReason } from './mistakes';

export function evaluateExamSubmission(
  questions: Question[],
  answers: Record<string, string[]>,
  config: ExamConfig,
  timeSpentSeconds: number
): ExamEvaluation {
  let attempted = 0;
  let correct = 0;
  let incorrect = 0;
  let rawScore = 0;
  const maxScore = questions.length * 1; // 1 mark per question base
  const negativeDeduction = config.negativeMarking ? (config.negativeMarkRatio || 0.33) : 0;

  const mistakes: MistakeAnalysis[] = [];
  const conceptScores: Record<
    string,
    { conceptName: string; total: number; correct: number; accuracy: number }
  > = {};

  questions.forEach((q) => {
    const conceptKey = q.conceptId || 'general';
    if (!conceptScores[conceptKey]) {
      conceptScores[conceptKey] = {
        conceptName: q.topic || conceptKey,
        total: 0,
        correct: 0,
        accuracy: 0,
      };
    }
    conceptScores[conceptKey].total += 1;

    const userAns = answers[q.id];
    if (userAns && userAns.length > 0) {
      attempted += 1;

      // Check correctness
      let isAnswerCorrect = false;
      if (q.type === 'numerical' || q.type === 'fill_blank') {
        const rawUser = userAns[0]?.trim().toLowerCase();
        isAnswerCorrect = q.correctAnswers.some((ans) => ans.trim().toLowerCase() === rawUser);
      } else {
        // MCQ / MSQ
        const sortedUser = [...userAns].sort();
        const sortedCorrect = [...q.correctAnswers].sort();
        isAnswerCorrect =
          sortedUser.length === sortedCorrect.length &&
          sortedUser.every((val, index) => val === sortedCorrect[index]);
      }

      if (isAnswerCorrect) {
        correct += 1;
        rawScore += 1;
        conceptScores[conceptKey].correct += 1;
      } else {
        incorrect += 1;
        rawScore = Math.max(0, rawScore - negativeDeduction);

        // Analyze mistake reason
        const mistakeAnalysis = analyzeMistakeReason(q, userAns);
        mistakes.push(mistakeAnalysis);
      }
    }
  });

  const unattempted = questions.length - attempted;
  const percentage = maxScore > 0 ? Math.round((Math.max(0, rawScore) / maxScore) * 100) : 0;
  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

  // Calculate concept accuracies
  Object.keys(conceptScores).forEach((k) => {
    const item = conceptScores[k];
    item.accuracy = item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0;
  });

  // Identify weakest concept with at least 1 mistake or low accuracy
  let weakestConcept: ExamEvaluation['weakestConcept'] = undefined;
  let lowestAccuracy = 101;

  Object.entries(conceptScores).forEach(([cId, data]) => {
    if (data.accuracy < lowestAccuracy && data.total > 0) {
      lowestAccuracy = data.accuracy;
      weakestConcept = {
        conceptId: cId,
        conceptName: data.conceptName,
        accuracy: data.accuracy,
        mistakeCount: data.total - data.correct,
      };
    }
  });

  // Recommendations based on real evaluation
  const recommendations: string[] = [];
  if (weakestConcept && weakestConcept.accuracy < 60) {
    recommendations.push(
      `Priority Focus: Strengthen "${weakestConcept.conceptName}" through targeted remedial study.`
    );
  }
  if (accuracy < 50) {
    recommendations.push(
      'Conceptual gap identified. Review foundational definitions and rules before attempting timed mocks.'
    );
  } else if (unattempted > questions.length * 0.3) {
    recommendations.push(
      'Time management alert: Over 30% of questions left unattempted. Practice speed drills.'
    );
  } else {
    recommendations.push(
      'Good baseline accuracy. Retest weak concepts to solidify mastery.'
    );
  }

  return {
    totalQuestions: questions.length,
    attempted,
    unattempted,
    correct,
    incorrect,
    score: Number(rawScore.toFixed(2)),
    maxScore,
    percentage,
    accuracy,
    timeSpentSeconds,
    mistakes,
    conceptScores,
    weakestConcept,
    recommendations,
  };
}

