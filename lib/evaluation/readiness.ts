import { SarathiDatabase } from '@/lib/db/client';
import { ReadinessAssessment, NextBestAction } from '@/types/progress';
import { detectWeaknesses } from './weaknesses';

export function calculateReadiness(db: SarathiDatabase): ReadinessAssessment {
  const totalAttempts = db.attempts.length;
  const examCount = db.examSessions.length;
  const interviewCount = db.interviewSessions?.length || 0;

  // Rule: Insufficient data if user has not attempted sufficient questions or any exam/interview
  const totalEvidencePoints = totalAttempts + examCount + interviewCount;

  if (totalEvidencePoints === 0 || (totalAttempts < 3 && examCount === 0 && interviewCount === 0)) {
    const nextBestAction: NextBestAction = {
      id: 'act-diagnostic-initial',
      type: 'diagnostic',
      title: 'Build Your Baseline Readiness',
      description:
        'Complete practice drills, a mock test, or an AI interview to generate authentic assessment evidence.',
      ctaText: 'Start Practice',
      actionRoute: '/practice',
      badge: 'Step 1: Baseline',
    };

    return {
      overallScore: 0,
      status: 'insufficient_data',
      statusMessage:
        'Readiness cannot be calculated yet. Complete practice, mock tests, interviews, or other supported assessments to build your readiness profile.',
      breakdown: {
        accuracy: 0,
        coverage: 0,
        speed: 0,
        consistency: 0,
      },
      weakAreas: [],
      strongAreas: [],
      recentTrend: [],
      factors: [
        'No assessment attempts recorded yet.',
        'Knowledge profile waiting for initial baseline evaluation.',
      ],
      nextBestAction,
    };
  }

  // 1. Practice Accuracy (strictly from real attempts)
  const correctAttempts = db.attempts.filter((a) => a.isCorrect).length;
  const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

  // 2. Syllabus / Concept Coverage (% of concepts with at least 1 attempt)
  const masteriesList = Object.values(db.conceptMasteries);
  const assessedCount = masteriesList.filter((m) => m.attemptsCount > 0).length;
  const coverage =
    masteriesList.length > 0 ? Math.round((assessedCount / masteriesList.length) * 100) : 0;

  // 3. Exam Scores
  const examScores = db.examSessions
    .map((e) => e.evaluation?.percentage)
    .filter((s): s is number => typeof s === 'number');
  const avgExamScore =
    examScores.length > 0
      ? Math.round(examScores.reduce((a, b) => a + b, 0) / examScores.length)
      : null;

  // 4. Interview Scores
  const interviewScores = (db.interviewSessions || [])
    .map((i) => i.overallEvaluation?.finalScore)
    .filter((s): s is number => typeof s === 'number');
  const avgInterviewScore =
    interviewScores.length > 0
      ? Math.round(interviewScores.reduce((a, b) => a + b, 0) / interviewScores.length)
      : null;

  // 5. Speed (strictly from real average seconds vs standard 90s, only if attempts >= 3)
  let speed = 0;
  if (totalAttempts >= 3) {
    const totalTime = db.attempts.reduce((sum, a) => sum + (a.timeSpentSec || 60), 0);
    const avgTime = totalTime / totalAttempts;
    speed = Math.min(100, Math.max(30, Math.round((90 / Math.max(30, avgTime)) * 75)));
  }

  // 6. Consistency (only if >= 2 exams exist, else use practice accuracy)
  let consistency = 0;
  if (examScores.length >= 2) {
    consistency = Math.round(
      100 - Math.min(50, Math.abs(examScores[examScores.length - 1] - examScores[0]))
    );
  } else if (accuracy > 0) {
    consistency = accuracy;
  }

  // 7. Dynamic Weighted Overall Score (ONLY weight active categories with real data)
  let weightedSum = 0;
  let totalWeight = 0;

  if (totalAttempts >= 3) {
    weightedSum += accuracy * 35;
    totalWeight += 35;
  }

  if (avgExamScore !== null) {
    weightedSum += avgExamScore * 40;
    totalWeight += 40;
  }

  if (avgInterviewScore !== null) {
    weightedSum += avgInterviewScore * 25;
    totalWeight += 25;
  }

  // If only practice exists, score is strictly accuracy
  let overallScore = 0;
  if (totalWeight > 0) {
    overallScore = Math.min(100, Math.round(weightedSum / totalWeight));
  } else if (totalAttempts > 0) {
    overallScore = accuracy;
  }

  const weakAreas = detectWeaknesses(db);
  const strongAreas = masteriesList
    .filter((m) => (m.status === 'strong' || m.status === 'mastered') && m.score >= 70)
    .map((m) => m.conceptName);

  // Factors explaining the score
  const subjectOrRole =
    db.profile?.targetRole ||
    db.profile?.primarySubject ||
    db.profile?.targetExamLabel ||
    'Curriculum';

  const factors: string[] = [
    `Overall Accuracy: ${accuracy}% across ${totalAttempts} attempted question(s).`,
  ];

  if (masteriesList.length > 0) {
    factors.push(
      `Curriculum Coverage: ${coverage}% (${assessedCount} of ${masteriesList.length} ${subjectOrRole} topics evaluated).`
    );
  }

  if (examScores.length > 0) {
    factors.push(`Mock Exam Average: ${avgExamScore}% across ${examScores.length} completed exam(s).`);
  }

  if (interviewScores.length > 0) {
    factors.push(`AI Interview Average: ${avgInterviewScore}% across ${interviewScores.length} interview(s).`);
  }

  if (weakAreas.length > 0) {
    factors.push(
      `Identified ${weakAreas.length} weak concept(s) requiring remediation: ${weakAreas[0].conceptName}.`
    );
  } else if (assessedCount > 0) {
    factors.push('Zero critical weaknesses detected across currently assessed modules.');
  }

  // Determine Next Best Action
  let nextBestAction: NextBestAction;

  if (db.activeWeaknessFix && !db.activeWeaknessFix.completed) {
    nextBestAction = {
      id: 'act-continue-fix',
      type: 'fix_weakness',
      title: `Resume Fixing Weakness: ${db.activeWeaknessFix.conceptName}`,
      description: `Complete targeted practice and retest for ${db.activeWeaknessFix.conceptName} to boost readiness.`,
      ctaText: 'Continue Fix My Weakness',
      actionRoute: `/practice?fixConcept=${db.activeWeaknessFix.conceptId}`,
      targetConceptId: db.activeWeaknessFix.conceptId,
      badge: 'Action In Progress',
    };
  } else if (weakAreas.length > 0) {
    const primaryWeakness = weakAreas[0];
    nextBestAction = {
      id: `act-fix-${primaryWeakness.conceptId}`,
      type: 'fix_weakness',
      title: `Fix Primary Weakness: ${primaryWeakness.conceptName}`,
      description: `${primaryWeakness.conceptName} has an accuracy of ${primaryWeakness.accuracy}% (${primaryWeakness.mistakeCount} error(s)). Launch targeted remediation now.`,
      ctaText: 'FIX MY WEAKNESS',
      actionRoute: `/practice?fixConcept=${primaryWeakness.conceptId}`,
      targetConceptId: primaryWeakness.conceptId,
      targetTopic: primaryWeakness.topic,
      badge: 'High Impact',
    };
  } else if (examCount === 0) {
    const targetName = db.profile?.targetExamLabel || db.profile?.targetRole || 'Full Assessment';
    nextBestAction = {
      id: 'act-mock-exam',
      type: 'mock_exam',
      title: `${targetName} Mock Examination`,
      description: 'Validate your preparation under real timed conditions with negative marking.',
      ctaText: 'Start Mock Exam',
      actionRoute: '/exams',
      badge: 'Exam Simulation',
    };
  } else {
    nextBestAction = {
      id: 'act-practice-continue',
      type: 'practice',
      title: 'Targeted Practice Drills',
      description: 'Continue sharpening problem-solving speed and accuracy across your core curriculum.',
      ctaText: 'Continue Practice',
      actionRoute: '/practice',
      badge: 'Skill Mastery',
    };
  }

  const assessmentName =
    db.profile?.targetExamLabel || db.profile?.targetRole || 'your target assessment';

  return {
    overallScore,
    status: 'calculated',
    statusMessage:
      overallScore >= 80
        ? `High Readiness — Well positioned for ${assessmentName}`
        : overallScore >= 60
        ? `Developing Readiness — Targeted revision will accelerate performance in ${assessmentName}`
        : `Foundational Stage — Focus on eliminating core concept gaps in ${assessmentName}`,
    breakdown: {
      accuracy,
      coverage,
      speed,
      consistency,
    },
    weakAreas,
    strongAreas,
    recentTrend: examScores.length > 0 ? examScores : [overallScore],
    factors,
    nextBestAction,
  };
}
