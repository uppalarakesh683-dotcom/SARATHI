import { SarathiDatabase } from '@/lib/db/client';
import { WeaknessReport } from '@/types/progress';

export function detectWeaknesses(db: SarathiDatabase): WeaknessReport[] {
  const reports: WeaknessReport[] = [];

  // Iterate over concept masteries
  Object.values(db.conceptMasteries).forEach((mastery) => {
    // Only analyze if student has actually attempted questions
    if (mastery.attemptsCount > 0) {
      const accuracy = mastery.score; // 0 to 100
      if (accuracy < 70 || mastery.mistakeCount > 0) {
        let severity: 'high' | 'medium' | 'low' = 'low';
        if (accuracy <= 40 || mastery.mistakeCount >= 2) {
          severity = 'high';
        } else if (accuracy <= 65) {
          severity = 'medium';
        }

        let identifiedReason = `Low accuracy (${accuracy}%) with ${mastery.mistakeCount} recorded mistake(s) across ${mastery.attemptsCount} attempts.`;
        if (mastery.conceptId === 'functional_dependencies') {
          identifiedReason =
            'Struggling with Attribute Closures, Candidate Key identification, and BCNF vs 3NF boundary conditions.';
        } else if (mastery.conceptId === 'transactions_concurrency') {
          identifiedReason =
            'Confusion in Precedence Graph cycles, conflict serializability pairs, or 2PL lock release.';
        } else if (mastery.conceptId === 'indexing_btrees') {
          identifiedReason =
            'Calculation errors in internal node fanout bounds or leaf level block pointer capacity.';
        }

        reports.push({
          conceptId: mastery.conceptId,
          conceptName: mastery.conceptName,
          topic: mastery.topic,
          accuracy,
          mistakeCount: mastery.mistakeCount,
          severity,
          identifiedReason,
          remedySummary: `Deep conceptual breakdown + step-by-step example + 3-tiered practice + targeted retest.`,
          prerequisitesToReview: mastery.prerequisites,
        });
      }
    }
  });

  // Sort by severity (high first) then lowest accuracy
  reports.sort((a, b) => {
    const sevScore = { high: 3, medium: 2, low: 1 };
    if (sevScore[b.severity] !== sevScore[a.severity]) {
      return sevScore[b.severity] - sevScore[a.severity];
    }
    return a.accuracy - b.accuracy;
  });

  return reports;
}

