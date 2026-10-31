'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Award,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Target,
  ShieldCheck,
  TrendingUp,
  Zap,
  BookOpen,
  Sparkles,
  Layers,
  Mic,
  FileText,
  Check,
  XCircle,
  Info,
  Brain,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { useProgress } from '@/hooks/use-progress';
import { StoredInterviewRecord } from '@/types/interview';
import { CommunicationAssessmentRecord } from '@/types/communication';
import { ExamAttemptRecord } from '@/components/exams/ExamEngine';
import { PracticeSessionRecord } from '@/components/practice/PracticeEngine';
import { getRoleByIdOrTitle, ALL_ROLES } from '@/config/roles';

const STORAGE_KEY_PRACTICE = 'sarathi_practice_history_v2';
const STORAGE_KEY_EXAMS = 'sarathi_mock_exam_history';
const STORAGE_KEY_INTERVIEWS = 'sarathi_interview_history_v2';
const STORAGE_KEY_COMMUNICATION = 'sarathi_communication_history_v2';

export interface EvaluatedSkill {
  name: string;
  score: number | null; // null indicates insufficient evidence
  level: 'Ready' | 'Competent' | 'Developing' | 'Novice' | 'Insufficient evidence';
  evidenceSource: string;
  status: 'Evaluated' | 'Untested';
  attemptsCount: number;
}

export interface AssessmentCheckpoint {
  id: string;
  date: string;
  type: 'Practice' | 'Mock Exam' | 'AI Interview' | 'Communication';
  title: string;
  score: number;
}

export function ReadinessScore() {
  const { db, profile, conceptMasteries, attempts, weaknesses } = useProgress();

  // Local storage telemetry states
  const [practiceHistory, setPracticeHistory] = useState<PracticeSessionRecord[]>([]);
  const [examHistory, setExamHistory] = useState<ExamAttemptRecord[]>([]);
  const [interviewHistory, setInterviewHistory] = useState<StoredInterviewRecord[]>([]);
  const [commHistory, setCommHistory] = useState<CommunicationAssessmentRecord[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Load actual telemetry from storage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const rawPractice = localStorage.getItem(STORAGE_KEY_PRACTICE);
      if (rawPractice) {
        const parsed = JSON.parse(rawPractice);
        if (Array.isArray(parsed)) setPracticeHistory(parsed);
      }

      const rawExams = localStorage.getItem(STORAGE_KEY_EXAMS);
      if (rawExams) {
        const parsed = JSON.parse(rawExams);
        if (Array.isArray(parsed)) setExamHistory(parsed);
      }

      const rawInterviews = localStorage.getItem(STORAGE_KEY_INTERVIEWS);
      if (rawInterviews) {
        const parsed = JSON.parse(rawInterviews);
        if (Array.isArray(parsed)) setInterviewHistory(parsed);
      }

      const rawComm = localStorage.getItem(STORAGE_KEY_COMMUNICATION);
      if (rawComm) {
        const parsed = JSON.parse(rawComm);
        if (Array.isArray(parsed)) setCommHistory(parsed);
      }
    } catch (e) {
      console.warn('Failed to load readiness telemetry:', e);
    } finally {
      setIsDataLoaded(true);
    }
  }, []);

  // -------------------------------------------------------------
  // 1. Target Role & Target Skills Identification
  // -------------------------------------------------------------
  const activeRoleTitle = useMemo(() => {
    return profile?.targetRole || profile?.primarySubject || profile?.targetExamLabel || null;
  }, [profile]);

  const targetSkillsList: string[] = useMemo(() => {
    if (profile?.targetSkills && profile.targetSkills.length > 0) {
      return profile.targetSkills;
    }
    if (activeRoleTitle) {
      const roleDef = getRoleByIdOrTitle(activeRoleTitle);
      if (roleDef && roleDef.defaultSkills.length > 0) {
        return roleDef.defaultSkills;
      }
    }
    // Fallback foundational skills if target not set
    return ['Data Structures', 'Algorithms', 'System Design', 'Databases', 'Problem Solving', 'Communication'];
  }, [profile, activeRoleTitle]);

  // -------------------------------------------------------------
  // 2. Real Category Computations (Strictly Real Data)
  // -------------------------------------------------------------

  // Dimension 1: Knowledge & Concepts (Practice)
  const totalPracticeQuestions = useMemo(() => {
    if (practiceHistory.length > 0) {
      return practiceHistory.reduce((sum, s) => sum + (s.totalQuestions || 0), 0);
    }
    return attempts.length;
  }, [practiceHistory, attempts]);

  const correctPracticeCount = useMemo(() => {
    if (practiceHistory.length > 0) {
      return practiceHistory.reduce((sum, s) => sum + (s.correctCount || 0), 0);
    }
    return attempts.filter((a) => a.isCorrect).length;
  }, [practiceHistory, attempts]);

  const practiceAccuracy: number | null = useMemo(() => {
    if (totalPracticeQuestions === 0) return null;
    return Math.round((correctPracticeCount / totalPracticeQuestions) * 100);
  }, [totalPracticeQuestions, correctPracticeCount]);

  // Dimension 2: Mock Test Performance
  const totalMockExams = useMemo(() => {
    return examHistory.length > 0 ? examHistory.length : db.examSessions.length;
  }, [examHistory, db.examSessions]);

  const avgExamScore: number | null = useMemo(() => {
    if (totalMockExams === 0) return null;
    if (examHistory.length > 0) {
      const sum = examHistory.reduce((acc, curr) => acc + (curr.percentage || 0), 0);
      return Math.round(sum / examHistory.length);
    }
    if (db.examSessions.length > 0) {
      const sum = db.examSessions.reduce((acc, curr) => acc + (curr.evaluation?.percentage || 0), 0);
      return Math.round(sum / db.examSessions.length);
    }
    return null;
  }, [totalMockExams, examHistory, db.examSessions]);

  // Dimension 3: AI Interview Performance
  const totalInterviews = useMemo(() => {
    return interviewHistory.length > 0 ? interviewHistory.length : db.interviewSessions.length;
  }, [interviewHistory, db.interviewSessions]);

  const avgInterviewScore: number | null = useMemo(() => {
    if (totalInterviews === 0) return null;
    if (interviewHistory.length > 0) {
      const sum = interviewHistory.reduce((acc, curr) => acc + (curr.report?.finalScore || 0), 0);
      return Math.round(sum / interviewHistory.length);
    }
    if (db.interviewSessions.length > 0) {
      const sum = db.interviewSessions.reduce((acc, curr) => acc + (curr.overallEvaluation?.finalScore || 0), 0);
      return Math.round(sum / db.interviewSessions.length);
    }
    return null;
  }, [totalInterviews, interviewHistory, db.interviewSessions]);

  // Dimension 4: Communication Skills
  const totalCommAssessments = commHistory.length;

  const avgCommScore: number | null = useMemo(() => {
    if (totalCommAssessments === 0) return null;
    const sum = commHistory.reduce((acc, curr) => acc + (curr.rubric?.overallScore || 0), 0);
    return Math.round(sum / totalCommAssessments);
  }, [totalCommAssessments, commHistory]);

  // -------------------------------------------------------------
  // 3. Target Skills Evaluation Mapping (Evidence-Backed)
  // -------------------------------------------------------------
  const evaluatedSkills: EvaluatedSkill[] = useMemo(() => {
    return targetSkillsList.map((skill) => {
      const cleanSkill = skill.toLowerCase().trim();

      let totalSkillAttempts = 0;
      let totalSkillCorrect = 0;
      const sourcesUsed: string[] = [];

      // Check Practice history
      for (const session of practiceHistory) {
        if (session.topic.toLowerCase().includes(cleanSkill)) {
          totalSkillAttempts += session.totalQuestions || 0;
          totalSkillCorrect += session.correctCount || 0;
          if (!sourcesUsed.includes('Practice Session')) sourcesUsed.push('Practice Session');
        }
      }

      // Check Concept Masteries in DB
      for (const mastery of Object.values(conceptMasteries)) {
        if (
          mastery.conceptName.toLowerCase().includes(cleanSkill) ||
          mastery.topic.toLowerCase().includes(cleanSkill)
        ) {
          totalSkillAttempts += mastery.attemptsCount;
          totalSkillCorrect += mastery.correctCount;
          if (!sourcesUsed.includes('Concept Mastery')) sourcesUsed.push('Concept Mastery');
        }
      }

      // Check Exam Questions
      for (const exam of examHistory) {
        for (const q of exam.questions || []) {
          if (q.topic.toLowerCase().includes(cleanSkill)) {
            totalSkillAttempts += 1;
            const userAnswers = exam.answers[q.id] || [];
            const isCorrect =
              userAnswers.length === q.correctAnswers.length &&
              userAnswers.every((a) => q.correctAnswers.includes(a));
            if (isCorrect) totalSkillCorrect += 1;
            if (!sourcesUsed.includes('Mock Exam')) sourcesUsed.push('Mock Exam');
          }
        }
      }

      // Check AI Interview question reviews
      for (const interview of interviewHistory) {
        for (const qr of interview.report?.questionReviews || []) {
          if (
            (qr.relatedTopic && qr.relatedTopic.toLowerCase().includes(cleanSkill)) ||
            (interview.role && interview.role.toLowerCase().includes(cleanSkill))
          ) {
            totalSkillAttempts += 1;
            if (qr.score >= 70) totalSkillCorrect += 1;
            if (!sourcesUsed.includes('AI Interview')) sourcesUsed.push('AI Interview');
          }
        }
      }

      if (totalSkillAttempts === 0) {
        return {
          name: skill,
          score: null,
          level: 'Insufficient evidence',
          evidenceSource: 'No assessments yet',
          status: 'Untested',
          attemptsCount: 0,
        };
      }

      const score = Math.round((totalSkillCorrect / totalSkillAttempts) * 100);
      let level: EvaluatedSkill['level'] = 'Developing';
      if (score >= 80) level = 'Ready';
      else if (score >= 65) level = 'Competent';
      else if (score >= 45) level = 'Developing';
      else level = 'Novice';

      return {
        name: skill,
        score,
        level,
        evidenceSource: sourcesUsed.join(', '),
        status: 'Evaluated',
        attemptsCount: totalSkillAttempts,
      };
    });
  }, [targetSkillsList, practiceHistory, conceptMasteries, examHistory, interviewHistory]);

  // Dimension 5: Target Skill Coverage (%)
  const evaluatedSkillsCount = useMemo(() => {
    return evaluatedSkills.filter((s) => s.status === 'Evaluated').length;
  }, [evaluatedSkills]);

  const skillCoveragePercent = useMemo(() => {
    if (targetSkillsList.length === 0) return 0;
    return Math.round((evaluatedSkillsCount / targetSkillsList.length) * 100);
  }, [evaluatedSkillsCount, targetSkillsList]);

  // -------------------------------------------------------------
  // 4. Overall Evidence Count & Dynamic Weighted Readiness Score
  // -------------------------------------------------------------
  const totalEvidencePoints =
    totalPracticeQuestions + totalMockExams + totalInterviews + totalCommAssessments;

  // Real categories active count
  const activeDimensions = useMemo(() => {
    let count = 0;
    if (practiceAccuracy !== null) count++;
    if (avgExamScore !== null) count++;
    if (avgInterviewScore !== null) count++;
    if (avgCommScore !== null) count++;
    if (evaluatedSkillsCount > 0) count++;
    return count;
  }, [practiceAccuracy, avgExamScore, avgInterviewScore, avgCommScore, evaluatedSkillsCount]);

  // Dynamic weights normalized across active categories
  const overallReadinessScore: number | null = useMemo(() => {
    if (totalEvidencePoints === 0) return null;

    let weightedSum = 0;
    let totalWeight = 0;

    // Standard theoretical weights:
    // Mock Exam: 35%, Practice: 25%, AI Interview: 25%, Communication: 10%, Skill Coverage: 5%
    if (avgExamScore !== null) {
      weightedSum += avgExamScore * 35;
      totalWeight += 35;
    }
    if (practiceAccuracy !== null) {
      weightedSum += practiceAccuracy * 25;
      totalWeight += 25;
    }
    if (avgInterviewScore !== null) {
      weightedSum += avgInterviewScore * 25;
      totalWeight += 25;
    }
    if (avgCommScore !== null) {
      weightedSum += avgCommScore * 10;
      totalWeight += 10;
    }
    if (evaluatedSkillsCount > 0) {
      weightedSum += skillCoveragePercent * 5;
      totalWeight += 5;
    }

    if (totalWeight === 0) return null;
    return Math.min(100, Math.round(weightedSum / totalWeight));
  }, [
    totalEvidencePoints,
    avgExamScore,
    practiceAccuracy,
    avgInterviewScore,
    avgCommScore,
    evaluatedSkillsCount,
    skillCoveragePercent,
  ]);

  // Readiness Status Description
  const readinessTier = useMemo(() => {
    if (overallReadinessScore === null) return null;
    if (overallReadinessScore >= 90) {
      return {
        label: 'High Probability of Success',
        color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800',
        advice: 'Outstanding multidimensional competency. Continue light revision and simulated high-pressure tests.',
      };
    }
    if (overallReadinessScore >= 80) {
      return {
        label: 'Target Ready',
        color: 'text-cyan-300 bg-cyan-950/60 border-cyan-800',
        advice: 'Strong conceptual base and steady execution. Target any remaining untested skills before interview rounds.',
      };
    }
    if (overallReadinessScore >= 65) {
      return {
        label: 'Competent',
        color: 'text-blue-300 bg-blue-950/60 border-blue-800',
        advice: 'Solid foundation across core topics. Focus on improving mock test speed and technical interview depth.',
      };
    }
    if (overallReadinessScore >= 45) {
      return {
        label: 'Developing',
        color: 'text-amber-300 bg-amber-950/60 border-amber-800',
        advice: 'Early competency demonstrated. Prioritize deliberate practice on identified weak areas to build consistency.',
      };
    }
    return {
      label: 'Foundational',
      color: 'text-rose-300 bg-rose-950/60 border-rose-800',
      advice: 'Baseline stage. Work through core concept drills and review detailed solutions to eliminate misunderstandings.',
    };
  }, [overallReadinessScore]);

  // -------------------------------------------------------------
  // 5. Strengths and Areas to Improve (Strictly Real Evidence)
  // -------------------------------------------------------------
  const realStrengths: string[] = useMemo(() => {
    const list: string[] = [];
    // From evaluated target skills
    evaluatedSkills
      .filter((s) => s.status === 'Evaluated' && s.score !== null && s.score >= 70)
      .forEach((s) => list.push(`${s.name} (${s.score}% accuracy across ${s.attemptsCount} items)`));

    // From concept masteries
    Object.values(conceptMasteries)
      .filter((m) => (m.status === 'strong' || m.status === 'mastered') && m.score >= 75)
      .forEach((m) => {
        const item = `${m.conceptName} (${m.score}% mastery)`;
        if (!list.includes(item)) list.push(item);
      });

    return list;
  }, [evaluatedSkills, conceptMasteries]);

  const realAreasToImprove: string[] = useMemo(() => {
    const list: string[] = [];
    // From evaluated target skills
    evaluatedSkills
      .filter((s) => s.status === 'Evaluated' && s.score !== null && s.score < 60)
      .forEach((s) => list.push(`${s.name} (Current accuracy: ${s.score}% — needs targeted practice)`));

    // From DB weaknesses
    weaknesses.forEach((w) => {
      const item = `${w.conceptName} (Accuracy: ${w.accuracy}%, ${w.mistakeCount} error(s))`;
      if (!list.includes(item)) list.push(item);
    });

    return list;
  }, [evaluatedSkills, weaknesses]);

  // -------------------------------------------------------------
  // 6. Chronological Readiness Trend (Strictly Real Assessment Checkpoints)
  // -------------------------------------------------------------
  const trendCheckpoints: AssessmentCheckpoint[] = useMemo(() => {
    const points: AssessmentCheckpoint[] = [];

    practiceHistory.forEach((p) => {
      points.push({
        id: p.id,
        date: p.date,
        type: 'Practice',
        title: p.topic || 'Practice Session',
        score: p.accuracy,
      });
    });

    examHistory.forEach((e) => {
      points.push({
        id: e.id,
        date: e.date,
        type: 'Mock Exam',
        title: e.config.examTarget || 'Full Mock Exam',
        score: e.percentage,
      });
    });

    interviewHistory.forEach((i) => {
      points.push({
        id: i.id,
        date: i.date,
        type: 'AI Interview',
        title: `${i.role} (${i.mode})`,
        score: i.report?.finalScore || 0,
      });
    });

    commHistory.forEach((c) => {
      points.push({
        id: c.id,
        date: c.date,
        type: 'Communication',
        title: c.scenarioTitle || 'Communication Drill',
        score: c.rubric?.overallScore || 0,
      });
    });

    // Sort chronologically
    points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return points;
  }, [practiceHistory, examHistory, interviewHistory, commHistory]);

  // -------------------------------------------------------------
  // 7. Recommended Next Action (Strictly Data-Backed)
  // -------------------------------------------------------------
  const recommendedNextAction = useMemo(() => {
    // Priority 1: No Mock Exams
    if (totalMockExams === 0) {
      return {
        title: 'Validate Under Exam Conditions',
        description: 'Your exam performance has no evidence yet. Take a timed Mock Test with negative marking to evaluate real-time exam pacing.',
        ctaText: 'Take Mock Test',
        href: '/exams',
        badge: 'Critical Evidence Missing',
      };
    }

    // Priority 2: No AI Interviews
    if (totalInterviews === 0) {
      const roleStr = activeRoleTitle ? ` for ${activeRoleTitle}` : '';
      return {
        title: 'Simulate Technical Interview',
        description: `Your interview readiness has no evidence yet. Complete an interactive AI Interview${roleStr} to test verbal clarity and technical depth.`,
        ctaText: 'Start AI Interview',
        href: '/interview',
        badge: 'Critical Evidence Missing',
      };
    }

    // Priority 3: Clear weak area exists
    if (realAreasToImprove.length > 0) {
      const topWeakness = weaknesses[0];
      const targetName = topWeakness ? topWeakness.conceptName : 'your lowest-scoring topic';
      const targetParam = topWeakness ? `?fixConcept=${encodeURIComponent(topWeakness.conceptId)}` : '';
      return {
        title: `Remediate Weakness: ${targetName}`,
        description: `Your diagnostic data shows lower accuracy in ${targetName}. Launch targeted drills and review worked solutions to boost this score.`,
        ctaText: 'Practice Weakness',
        href: `/practice${targetParam}`,
        badge: 'Remediation Priority',
      };
    }

    // Priority 4: Untested skills remain
    const firstUntested = evaluatedSkills.find((s) => s.status === 'Untested');
    if (firstUntested) {
      return {
        title: `Expand Skill Coverage: ${firstUntested.name}`,
        description: `${firstUntested.name} has not been assessed yet. Take a focused practice drill to prove competency in this required target skill.`,
        ctaText: `Practice ${firstUntested.name}`,
        href: `/practice?topic=${encodeURIComponent(firstUntested.name)}`,
        badge: 'Coverage Drill',
      };
    }

    // Priority 5: No communication assessment
    if (totalCommAssessments === 0) {
      return {
        title: 'Assess Professional Communication',
        description: 'Communication skills have not been evaluated yet. Complete a workplace email or technical writing scenario to calibrate professional tone.',
        ctaText: 'Practice Communication',
        href: '/interview',
        badge: 'Enhancement',
      };
    }

    // Default: Continue high-level mock simulations
    return {
      title: 'Full-Scale Benchmark Simulation',
      description: 'You have generated evidence across all target categories! Take a comprehensive mock test to maintain endurance and peak readiness.',
      ctaText: 'Start Full Mock Exam',
      href: '/exams',
      badge: 'Peak Maintenance',
    };
  }, [
    totalMockExams,
    totalInterviews,
    realAreasToImprove,
    weaknesses,
    evaluatedSkills,
    totalCommAssessments,
    activeRoleTitle,
  ]);

  // Determine Student State: New vs Developing vs Established
  const studentState: 'new' | 'developing' | 'established' = useMemo(() => {
    if (totalEvidencePoints === 0) return 'new';
    if (activeDimensions >= 4 || totalEvidencePoints >= 6) return 'established';
    return 'developing';
  }, [totalEvidencePoints, activeDimensions]);

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto px-4 sm:px-6 py-4">
      {/* ------------------------------------------------------------- */}
      {/* Navigation Header */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            className="inline-flex items-center px-3.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-all shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
            <span>← Back to Dashboard</span>
          </Link>
          {activeRoleTitle && (
            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <span>Target:</span>
              <span className="font-semibold text-cyan-300 px-2 py-0.5 rounded-md bg-cyan-950/70 border border-cyan-800/60 font-mono">
                {activeRoleTitle}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href="/profile"
            className="text-xs text-slate-400 hover:text-cyan-300 transition-colors flex items-center space-x-1 font-mono"
          >
            <Target className="w-3.5 h-3.5 text-cyan-400" />
            <span>Profile Settings</span>
          </Link>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Hero Banner with Dynamic Overall Readiness */}
      {/* ------------------------------------------------------------- */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 shadow-glass relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2.5">
              <span className="px-2.5 py-0.5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-mono uppercase tracking-wider">
                EVIDENCE-BASED EVALUATION
              </span>
              {studentState === 'developing' && (
                <span className="px-2.5 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-800 text-[10px] font-mono uppercase">
                  Developing Profile
                </span>
              )}
              {studentState === 'established' && (
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-[10px] font-mono uppercase">
                  Established Profile
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-3">
              <Award className="w-8 h-8 text-cyan-400 shrink-0" />
              <span>Target Readiness Index</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Answers the question:{' '}
              <span className="italic text-slate-200">
                &ldquo;Based on my actual activity and assessment evidence, how prepared am I for my selected target?&rdquo;
              </span>
            </p>

            {activeRoleTitle ? (
              <p className="text-xs text-slate-400">
                Target Role / Exam:{' '}
                <strong className="text-cyan-300 font-semibold">{activeRoleTitle}</strong>.
                Evaluated against {targetSkillsList.length} required target competencies.
              </p>
            ) : (
              <p className="text-xs text-amber-300/80 flex items-center space-x-1.5 pt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>No target role configured. Go to Profile Settings to set your specific career or exam goal.</span>
              </p>
            )}
          </div>

          {/* Overall Score Box if Real Data Exists */}
          {overallReadinessScore !== null && readinessTier ? (
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-950/90 border border-slate-800 min-w-[200px] text-center shadow-inner space-y-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                Overall Readiness
              </span>
              <div className="flex items-baseline space-x-1">
                <span className="text-4xl sm:text-5xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400">
                  {overallReadinessScore}%
                </span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${readinessTier.color}`}>
                {readinessTier.label}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {activeDimensions} of 5 dimensions calibrated
              </span>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 text-center min-w-[200px] space-y-1.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                Readiness Score
              </span>
              <span className="text-xs font-mono text-slate-400 font-semibold block">
                Awaiting Initial Baseline
              </span>
              <span className="text-[10px] text-slate-600 block">0 assessment attempts</span>
            </div>
          )}
        </div>

        {/* Ambient Top Glow Line */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent pointer-events-none" />
      </div>

      {/* ============================================================= */}
      {/* STATE 1: NEW STUDENT (ZERO ASSESSMENT EVIDENCE)              */}
      {/* ============================================================= */}
      {studentState === 'new' && (
        <div className="space-y-8">
          {/* Honest Empty State Card */}
          <div className="p-8 sm:p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-6 shadow-glass max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-800/80 text-cyan-400 flex items-center justify-center mx-auto shadow-sm">
              <Target className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Readiness cannot be calculated yet.
              </h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                Complete practice, mock tests, interviews, or other supported assessments to build your readiness profile.
              </p>
            </div>

            {/* Three Primary CTA Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <Link
                href="/practice"
                className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs sm:text-sm shadow-neon-cyan transition-all"
              >
                <BookOpen className="w-4 h-4" />
                <span>Start Practice</span>
              </Link>
              <Link
                href="/exams"
                className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm border border-slate-700 transition-all"
              >
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Take Mock Test</span>
              </Link>
              <Link
                href="/interview"
                className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm border border-slate-700 transition-all"
              >
                <Mic className="w-4 h-4 text-purple-400" />
                <span>Start AI Interview</span>
              </Link>
            </div>
          </div>

          {/* Transparent Formula & Criteria Explanation */}
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5">
            <div className="flex items-center space-x-2.5">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-mono uppercase tracking-wider text-white font-bold">
                How SARATHI Calculates Your Readiness
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Unlike generic test platforms that display arbitrary readiness percentages, SARATHI adheres to a strict{' '}
              <strong className="text-slate-200">Zero Dummy Data rule</strong>. Your score is mathematically synthesized
              across 5 real performance pillars as you complete assessments:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-cyan-400">Mock Exams</span>
                  <span className="text-[10px] font-mono text-slate-500">35% weight</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Timed simulation under exam pressure, negative marking, and pace efficiency.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-purple-400">AI Interviews</span>
                  <span className="text-[10px] font-mono text-slate-500">25% weight</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Verbal explanations, technical problem solving, coding reasoning, and viva accuracy.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-blue-400">Practice Drills</span>
                  <span className="text-[10px] font-mono text-slate-500">25% weight</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Accuracy across question sets, step-by-step problem mastery, and hint usage.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-emerald-400">Communication</span>
                  <span className="text-[10px] font-mono text-slate-500">10% weight</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Professional emails, concise documentation, grammar, and technical articulation.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-amber-400">Skill Coverage</span>
                  <span className="text-[10px] font-mono text-slate-500">5% weight</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Percentage of target syllabus and role-required competencies with verified attempts.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-xs text-cyan-200 flex items-center space-x-2.5">
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                Untested categories are never assigned placeholder numbers. As you take your first assessment, your profile will immediately activate.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* STATE 2 & 3: DEVELOPING OR ESTABLISHED STUDENT               */}
      {/* ============================================================= */}
      {studentState !== 'new' && (
        <div className="space-y-8">
          {/* Missing Evidence Callout for Developing State */}
          {studentState === 'developing' && (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200">
              <div className="flex items-start sm:items-center space-x-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                <span>
                  <strong>Developing Profile:</strong> Score calculated from {totalEvidencePoints} completed assessment(s).{' '}
                  {activeDimensions < 5 && (
                    <span>
                      {5 - activeDimensions} dimension(s) still need evidence to unlock full multi-dimensional validation.
                    </span>
                  )}
                </span>
              </div>
              <Link
                href={recommendedNextAction.href}
                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-mono font-bold uppercase transition-all shrink-0"
              >
                <span>{recommendedNextAction.ctaText}</span>
                <ArrowRight className="w-3 h-3 ml-1.5" />
              </Link>
            </div>
          )}

          {/* ----------------------------------------------------------- */}
          {/* 5 Dimensional Readiness Categories Breakdown                */}
          {/* ----------------------------------------------------------- */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-mono uppercase text-slate-300 font-bold tracking-wider flex items-center space-x-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Readiness Dimensions</span>
              </h2>
              <span className="text-xs text-slate-500 font-mono">
                {activeDimensions} of 5 active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* 1. Knowledge & Concepts */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400 uppercase">Knowledge</span>
                    <BookOpen className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono">
                    {practiceAccuracy !== null ? (
                      <span className="text-blue-300">{practiceAccuracy}%</span>
                    ) : (
                      <span className="text-xs font-sans text-slate-500">Insufficient evidence</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-400 rounded-full transition-all duration-500"
                      style={{ width: `${practiceAccuracy || 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    {totalPracticeQuestions > 0
                      ? `${correctPracticeCount}/${totalPracticeQuestions} correct in practice`
                      : 'No practice data yet'}
                  </span>
                </div>

                <Link
                  href="/practice"
                  className="text-[11px] font-mono text-blue-400 hover:text-blue-300 inline-flex items-center space-x-1 pt-1"
                >
                  <span>Practice Drills</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {/* 2. Mock Test Performance */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400 uppercase">Exam Pacing</span>
                    <Clock className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono">
                    {avgExamScore !== null ? (
                      <span className="text-cyan-300">{avgExamScore}%</span>
                    ) : (
                      <span className="text-xs font-sans text-slate-500">Insufficient evidence</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${avgExamScore || 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    {totalMockExams > 0
                      ? `${totalMockExams} mock exam(s) completed`
                      : 'No mock exams taken'}
                  </span>
                </div>

                <Link
                  href="/exams"
                  className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 inline-flex items-center space-x-1 pt-1"
                >
                  <span>Mock Exam Engine</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {/* 3. AI Interview Performance */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400 uppercase">AI Interview</span>
                    <Mic className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono">
                    {avgInterviewScore !== null ? (
                      <span className="text-purple-300">{avgInterviewScore}%</span>
                    ) : (
                      <span className="text-xs font-sans text-slate-500">Insufficient evidence</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-400 rounded-full transition-all duration-500"
                      style={{ width: `${avgInterviewScore || 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    {totalInterviews > 0
                      ? `${totalInterviews} interview session(s)`
                      : 'No interviews conducted'}
                  </span>
                </div>

                <Link
                  href="/interview"
                  className="text-[11px] font-mono text-purple-400 hover:text-purple-300 inline-flex items-center space-x-1 pt-1"
                >
                  <span>AI Interviewer</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {/* 4. Communication Skills */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400 uppercase">Communication</span>
                    <FileText className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono">
                    {avgCommScore !== null ? (
                      <span className="text-emerald-300">{avgCommScore}%</span>
                    ) : (
                      <span className="text-xs font-sans text-slate-500">Insufficient evidence</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${avgCommScore || 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    {totalCommAssessments > 0
                      ? `${totalCommAssessments} assessment(s) evaluated`
                      : 'No communication drills'}
                  </span>
                </div>

                <Link
                  href="/interview"
                  className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 inline-flex items-center space-x-1 pt-1"
                >
                  <span>Communication Hub</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {/* 5. Target Skill Coverage */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400 uppercase">Skill Coverage</span>
                    <Target className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono">
                    <span className="text-amber-300">{skillCoveragePercent}%</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${skillCoveragePercent}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    {evaluatedSkillsCount} of {targetSkillsList.length} skills evaluated
                  </span>
                </div>

                <Link
                  href="/profile"
                  className="text-[11px] font-mono text-amber-400 hover:text-amber-300 inline-flex items-center space-x-1 pt-1"
                >
                  <span>Target Skills</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* Target Skill Readiness Breakdown Table                      */}
          {/* ----------------------------------------------------------- */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-mono uppercase text-white font-bold tracking-wider flex items-center space-x-2">
                  <Target className="w-4 h-4 text-cyan-400" />
                  <span>Target Competency Matrix ({activeRoleTitle || 'General Target'})</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Real evaluation across competencies required for your chosen target. Untested skills explicitly report insufficient evidence.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400 self-start sm:self-auto">
                {evaluatedSkillsCount}/{targetSkillsList.length} Tested
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                    <th className="py-3 px-3">Skill / Competency</th>
                    <th className="py-3 px-3">Readiness Level</th>
                    <th className="py-3 px-3">Accuracy / Score</th>
                    <th className="py-3 px-3">Evidence Source</th>
                    <th className="py-3 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {evaluatedSkills.map((skill, idx) => {
                    const isEvaluated = skill.status === 'Evaluated';
                    return (
                      <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-3 px-3 font-semibold text-white">
                          {skill.name}
                        </td>
                        <td className="py-3 px-3 font-mono">
                          {skill.level === 'Ready' && (
                            <span className="inline-flex items-center text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Ready
                            </span>
                          )}
                          {skill.level === 'Competent' && (
                            <span className="inline-flex items-center text-cyan-300">
                              <Check className="w-3.5 h-3.5 mr-1" />
                              Competent
                            </span>
                          )}
                          {skill.level === 'Developing' && (
                            <span className="inline-flex items-center text-amber-300">
                              <Zap className="w-3.5 h-3.5 mr-1" />
                              Developing
                            </span>
                          )}
                          {skill.level === 'Novice' && (
                            <span className="inline-flex items-center text-rose-400">
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                              Novice
                            </span>
                          )}
                          {skill.level === 'Insufficient evidence' && (
                            <span className="text-slate-500 font-mono text-[11px]">
                              Insufficient evidence
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold">
                          {skill.score !== null ? (
                            <span
                              className={
                                skill.score >= 70
                                  ? 'text-emerald-300'
                                  : skill.score >= 50
                                  ? 'text-amber-300'
                                  : 'text-rose-300'
                              }
                            >
                              {skill.score}%
                            </span>
                          ) : (
                            <span className="text-slate-600 font-normal">--</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-400">
                          {skill.evidenceSource}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                              isEvaluated
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                                : 'bg-slate-800 text-slate-500 border border-slate-700'
                            }`}
                          >
                            {skill.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* Strengths & Areas to Improve Grid                           */}
          {/* ----------------------------------------------------------- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-mono uppercase text-emerald-400 font-bold tracking-wider flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Demonstrated Strengths</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-500">
                  {realStrengths.length} Identified
                </span>
              </div>

              {realStrengths.length > 0 ? (
                <div className="space-y-2">
                  {realStrengths.map((str, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 flex items-start space-x-2.5"
                    >
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{str}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-center text-xs text-slate-400">
                  Complete more assessments to identify strengths and improvement areas.
                </div>
              )}
            </div>

            {/* Areas to Improve */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-mono uppercase text-rose-400 font-bold tracking-wider flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Targeted Areas to Improve</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-500">
                  {realAreasToImprove.length} Identified
                </span>
              </div>

              {realAreasToImprove.length > 0 ? (
                <div className="space-y-2">
                  {realAreasToImprove.map((weak, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 flex items-start space-x-2.5"
                    >
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{weak}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-center text-xs text-slate-400">
                  Complete more assessments to identify strengths and improvement areas.
                </div>
              )}
            </div>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* Readiness Trend Checkpoints                                 */}
          {/* ----------------------------------------------------------- */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-mono uppercase text-white font-bold tracking-wider flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span>Readiness Progression Trend</span>
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                {trendCheckpoints.length} Checkpoint(s)
              </span>
            </div>

            {trendCheckpoints.length >= 2 ? (
              <div className="space-y-2.5">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 font-mono uppercase text-[10px]">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Assessment Type</th>
                        <th className="py-2.5 px-3">Topic / Subject</th>
                        <th className="py-2.5 px-3 text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {trendCheckpoints.slice(-6).map((pt, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/20">
                          <td className="py-2.5 px-3 font-mono text-slate-400">
                            {new Date(pt.date).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold ${
                                pt.type === 'Mock Exam'
                                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                                  : pt.type === 'AI Interview'
                                  ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                  : pt.type === 'Communication'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : 'bg-blue-950 text-blue-300 border border-blue-800'
                              }`}
                            >
                              {pt.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-300 font-medium truncate max-w-xs">
                            {pt.title}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            <span
                              className={
                                pt.score >= 70
                                  ? 'text-emerald-300'
                                  : pt.score >= 50
                                  ? 'text-cyan-300'
                                  : 'text-amber-300'
                              }
                            >
                              {pt.score}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-slate-950/40 border border-slate-800 text-center text-xs text-slate-400">
                Complete at least 2 assessments to view your readiness trend.
              </div>
            )}
          </div>

          {/* ----------------------------------------------------------- */}
          {/* Recommended Next Action Card                                */}
          {/* ----------------------------------------------------------- */}
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-950 border border-cyan-500/30 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-glass">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold uppercase">
                  RECOMMENDED NEXT ACTION
                </span>
                <span className="text-[10px] font-mono text-purple-300">
                  {recommendedNextAction.badge}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                {recommendedNextAction.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {recommendedNextAction.description}
              </p>
            </div>

            <div className="shrink-0">
              <Link
                href={recommendedNextAction.href}
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-sm tracking-wide shadow-neon-cyan transition-all"
              >
                <span>{recommendedNextAction.ctaText}</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
