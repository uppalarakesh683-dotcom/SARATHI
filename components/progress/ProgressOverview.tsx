'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  ArrowRight,
  RotateCcw,
  ShieldAlert,
  Mic,
  MessageSquare,
  Sparkles,
  Zap,
  BookOpen,
  Brain,
  FileText,
  PenTool,
  BarChart3,
  Check,
  AlertTriangle,
  Layers,
  ChevronRight,
  Flame,
  Calendar,
} from 'lucide-react';
import { useProgress } from '@/hooks/use-progress';
import { StoredInterviewRecord } from '@/types/interview';
import { CommunicationAssessmentRecord } from '@/types/communication';
import { ExamAttemptRecord } from '@/components/exams/ExamEngine';
import { PracticeSessionRecord } from '@/components/practice/PracticeEngine';

const STORAGE_KEY_PRACTICE = 'sarathi_practice_history_v2';
const STORAGE_KEY_EXAMS = 'sarathi_mock_exam_history';
const STORAGE_KEY_INTERVIEWS = 'sarathi_interview_history_v2';
const STORAGE_KEY_COMMUNICATION = 'sarathi_communication_history_v2';

export function ProgressOverview() {
  const { db, profile, readiness, conceptMasteries, attempts, activityLog, resetAll } =
    useProgress();

  // Local storage state
  const [practiceHistory, setPracticeHistory] = useState<PracticeSessionRecord[]>([]);
  const [examHistory, setExamHistory] = useState<ExamAttemptRecord[]>([]);
  const [interviewHistory, setInterviewHistory] = useState<StoredInterviewRecord[]>([]);
  const [commHistory, setCommHistory] = useState<CommunicationAssessmentRecord[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Filter for practice section: 'all' | 'recent' | 'matrix'
  const [practiceFilter, setPracticeFilter] = useState<'all' | 'recent' | 'matrix'>('all');

  // Load all authentic assessment histories from storage
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
      console.warn('Failed to load progress telemetry:', e);
    } finally {
      setIsDataLoaded(true);
    }
  }, []);

  // Aggregated Practice counts
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

  const practiceAccuracy = totalPracticeQuestions > 0
    ? Math.round((correctPracticeCount / totalPracticeQuestions) * 100)
    : 0;

  // Mock Exam Metrics
  const totalMockExams = examHistory.length > 0 ? examHistory.length : db.examSessions.length;
  const latestExam = examHistory[0] || null;
  const bestExamScore = useMemo(() => {
    if (examHistory.length === 0) return 0;
    return Math.max(...examHistory.map((e) => e.percentage || 0));
  }, [examHistory]);

  const avgExamScore = useMemo(() => {
    if (examHistory.length === 0) return 0;
    const sum = examHistory.reduce((acc, curr) => acc + (curr.percentage || 0), 0);
    return Math.round(sum / examHistory.length);
  }, [examHistory]);

  // AI Interview Metrics
  const totalInterviews = interviewHistory.length > 0 ? interviewHistory.length : db.interviewSessions.length;
  const latestInterview = interviewHistory[0] || null;
  const avgInterviewScore = useMemo(() => {
    if (interviewHistory.length === 0) return 0;
    const sum = interviewHistory.reduce((acc, curr) => acc + (curr.report?.finalScore || 0), 0);
    return Math.round(sum / interviewHistory.length);
  }, [interviewHistory]);

  // Communication Metrics
  const totalCommAssessments = commHistory.length;
  const avgCommScore = useMemo(() => {
    if (commHistory.length === 0) return 0;
    const sum = commHistory.reduce((acc, curr) => acc + (curr.rubric?.overallScore || 0), 0);
    return Math.round(sum / commHistory.length);
  }, [commHistory]);

  // Tutor Sessions & Materials
  const totalTutorSessions = db.chatSessions.length;
  const totalMaterials = db.materials.length;

  // NO DUMMY DATA CHECK:
  // Is there ANY real activity across practice, exams, interviews, communication, tutor, or materials?
  const hasAnyActivity =
    totalPracticeQuestions > 0 ||
    totalMockExams > 0 ||
    totalInterviews > 0 ||
    totalCommAssessments > 0 ||
    totalTutorSessions > 0 ||
    totalMaterials > 0 ||
    activityLog.length > 0;

  // Real Performance Trend Chronology (Combined attempts ordered by date)
  const performanceTrend = useMemo(() => {
    const points: { label: string; score: number; type: string; date: string }[] = [];

    practiceHistory.forEach((p, idx) => {
      points.push({
        label: `Practice: ${p.topic.slice(0, 16)}`,
        score: p.accuracy,
        type: 'Practice',
        date: p.date,
      });
    });

    examHistory.forEach((e) => {
      points.push({
        label: `Exam: ${e.config?.examLabel || 'Mock Exam'}`,
        score: e.percentage,
        type: 'Mock Exam',
        date: e.date,
      });
    });

    interviewHistory.forEach((i) => {
      points.push({
        label: `Interview: ${i.role}`,
        score: i.report?.finalScore || 0,
        type: 'Interview',
        date: i.date,
      });
    });

    // Sort chronologically ascending
    return points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [practiceHistory, examHistory, interviewHistory]);

  // Authentic Strengths and Weak Areas synthesis from actual data
  const { realStrengths, realWeaknesses } = useMemo(() => {
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // From Topic Mastery
    Object.values(conceptMasteries).forEach((c) => {
      if (c.attemptsCount >= 2 && c.score >= 70) {
        strengths.push(`${c.conceptName} (${c.score}% accuracy)`);
      } else if (c.attemptsCount >= 2 && c.score < 55) {
        weaknesses.push(`${c.conceptName} (${c.score}% accuracy)`);
      }
    });

    // From Mock Exams
    examHistory.forEach((e) => {
      if (e.strongTopics && e.strongTopics.length > 0) {
        e.strongTopics.forEach((t) => {
          if (!strengths.includes(t)) strengths.push(t);
        });
      }
      if (e.weakTopics && e.weakTopics.length > 0) {
        e.weakTopics.forEach((t) => {
          if (!weaknesses.includes(t)) weaknesses.push(t);
        });
      }
    });

    // From Interviews
    interviewHistory.forEach((i) => {
      if (i.report?.strengths) {
        i.report.strengths.slice(0, 2).forEach((s) => {
          if (!strengths.includes(s)) strengths.push(s);
        });
      }
      if (i.report?.improvementAreas) {
        i.report.improvementAreas.slice(0, 2).forEach((w) => {
          if (!weaknesses.includes(w)) weaknesses.push(w);
        });
      }
    });

    return {
      realStrengths: strengths.slice(0, 5),
      realWeaknesses: weaknesses.slice(0, 5),
    };
  }, [conceptMasteries, examHistory, interviewHistory]);

  // Recommended Next Action based on real performance evidence
  const recommendedAction = useMemo(() => {
    if (realWeaknesses.length > 0) {
      const targetTopic = realWeaknesses[0].split('(')[0].trim();
      return {
        title: `Target Weak Area: ${targetTopic}`,
        description: `Your recent evaluations show lower accuracy in ${targetTopic}. Complete a focused drill or revision to reinforce this concept.`,
        actionLabel: `Practice ${targetTopic}`,
        href: `/practice?topic=${encodeURIComponent(targetTopic)}`,
      };
    }

    if (totalMockExams === 0) {
      return {
        title: 'Benchmark with a CBT Mock Exam',
        description: 'You haven’t taken an official pattern mock test yet. Take a diagnostic test to measure your exam timing and accuracy.',
        actionLabel: 'Take a Mock Test',
        href: '/exams',
      };
    }

    if (totalInterviews === 0) {
      const role = profile?.targetRole || 'Software Engineer';
      return {
        title: `Practice Technical Interview for ${role}`,
        description: `Test your spoken articulation, technical depth, and algorithmic approach with an interactive AI interview.`,
        actionLabel: 'Start AI Interview',
        href: '/interview',
      };
    }

    return {
      title: 'Deepen Concepts in AI Tutor',
      description: 'Explore step-by-step breakdowns, exam-level scenarios, and theory grounded in your materials.',
      actionLabel: 'Open AI Tutor',
      href: '/tutor',
    };
  }, [realWeaknesses, totalMockExams, totalInterviews, profile]);

  if (!isDataLoaded) {
    return (
      <div className="p-12 text-center text-slate-400 font-mono text-xs flex items-center justify-center space-x-2">
        <Clock className="w-4 h-4 animate-spin text-cyan-400" />
        <span>Loading actual progress metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* ─────────────────────────────────────────────────────────────
          TOP HEADER
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/30 border border-slate-800 shadow-glass">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>AUTHENTIC PERFORMANCE TELEMETRY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Your Learning & Career Progress
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Real data aggregated from practice drills, CBT mock tests, conversational AI interviews, and study materials for{' '}
            <strong className="text-cyan-300">{profile?.targetRole || profile?.targetExamLabel || 'your target goals'}</strong>.
          </p>
        </div>

        <button
          onClick={resetAll}
          className="px-3.5 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-rose-300 hover:bg-slate-900 border border-slate-800 flex items-center space-x-1.5 transition-colors self-start sm:self-auto"
          title="Reset all progress telemetry"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Progress</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          EMPTY STATE (MANDATORY RULE: ZERO DUMMY DATA)
         ───────────────────────────────────────────────────────────── */}
      {!hasAnyActivity ? (
        <div className="p-10 sm:p-14 rounded-2xl bg-slate-900/50 border border-slate-800 text-center space-y-5 shadow-glass max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-full bg-slate-800/80 text-slate-500 flex items-center justify-center mx-auto">
            <TrendingUp className="w-8 h-8 text-cyan-400" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Your Progress</h2>
            <p className="text-sm text-slate-300 leading-relaxed font-light">
              You haven&apos;t completed any learning activities yet.
            </p>
            <p className="text-xs text-slate-500">
              Start your first learning activity to begin building your progress history.
            </p>
          </div>

          {/* 4 Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <Link
              href="/tutor"
              className="p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs border border-slate-800 flex items-center justify-center space-x-2 transition-all hover:border-cyan-500/50"
            >
              <Brain className="w-4 h-4 text-cyan-400" />
              <span>Start Learning</span>
            </Link>

            <Link
              href="/practice"
              className="p-3.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs shadow-neon-cyan flex items-center justify-center space-x-2 transition-all"
            >
              <Zap className="w-4 h-4" />
              <span>Take Practice</span>
            </Link>

            <Link
              href="/exams"
              className="p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs border border-slate-800 flex items-center justify-center space-x-2 transition-all hover:border-purple-500/50"
            >
              <Award className="w-4 h-4 text-purple-400" />
              <span>Start Mock Test</span>
            </Link>

            <Link
              href="/interview"
              className="p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs border border-slate-800 flex items-center justify-center space-x-2 transition-all hover:border-emerald-500/50"
            >
              <Mic className="w-4 h-4 text-emerald-400" />
              <span>Start AI Interview</span>
            </Link>
          </div>
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────
            ACTIVE PROGRESS DASHBOARD
           ───────────────────────────────────────────────────────────── */
        <div className="space-y-8">
          {/* SECTION A: OVERALL PROGRESS METRIC CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Learning Sessions</span>
              <div className="text-2xl font-bold font-mono text-white">{totalTutorSessions}</div>
              <span className="text-[10px] text-slate-500">AI Tutor chats</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Practice Qs</span>
              <div className="text-2xl font-bold font-mono text-cyan-300">{totalPracticeQuestions}</div>
              <span className="text-[10px] text-slate-500">{practiceAccuracy}% accuracy</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Mock Exams</span>
              <div className="text-2xl font-bold font-mono text-purple-300">{totalMockExams}</div>
              <span className="text-[10px] text-slate-500">
                {totalMockExams > 0 ? `Avg: ${avgExamScore}%` : 'None yet'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase">AI Interviews</span>
              <div className="text-2xl font-bold font-mono text-emerald-400">{totalInterviews}</div>
              <span className="text-[10px] text-slate-500">
                {totalInterviews > 0 ? `Avg: ${avgInterviewScore}%` : 'None yet'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Communication</span>
              <div className="text-2xl font-bold font-mono text-amber-300">{totalCommAssessments}</div>
              <span className="text-[10px] text-slate-500">
                {totalCommAssessments > 0 ? `Avg: ${avgCommScore}%` : 'None yet'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Materials</span>
              <div className="text-2xl font-bold font-mono text-sky-400">{totalMaterials}</div>
              <span className="text-[10px] text-slate-500">Documents studied</span>
            </div>
          </div>

          {/* SECTION B: PERFORMANCE TREND & STRENGTHS/WEAKNESSES */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Performance Trend Chart (2 columns) */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-glass">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-mono uppercase text-slate-200 font-bold tracking-wider flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                    <span>Assessment Performance Trend</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Chronological score evolution across your practice drills, exams, and interviews.
                  </p>
                </div>
              </div>

              {performanceTrend.length < 2 ? (
                <div className="py-12 text-center space-y-2">
                  <Clock className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400 font-mono">
                    Complete more assessments to see your performance trend.
                  </p>
                  <span className="text-[11px] text-slate-500">
                    Requires at least 2 evaluated sessions to plot progression.
                  </span>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  {/* Visual Trend Bars */}
                  <div className="h-44 flex items-end gap-2.5 pt-6 pb-2 border-b border-slate-800">
                    {performanceTrend.slice(-10).map((pt, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                        <span className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          {pt.score}%
                        </span>
                        <div
                          className={`w-full rounded-t-lg transition-all group-hover:brightness-125 ${
                            pt.type === 'Mock Exam'
                              ? 'bg-purple-500'
                              : pt.type === 'Interview'
                              ? 'bg-emerald-500'
                              : 'bg-cyan-500'
                          }`}
                          style={{ height: `${Math.max(pt.score, 12)}%` }}
                        />
                        <span className="text-[9px] font-mono text-slate-500 truncate max-w-[48px]">
                          {`#${idx + 1}`}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" />
                        <span>Practice</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                        <span>Mock Exam</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        <span>Interview</span>
                      </span>
                    </div>

                    <span>Showing last {Math.min(performanceTrend.length, 10)} sessions</span>
                  </div>
                </div>
              )}
            </div>

            {/* Strengths & Weak Areas (1 column) */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 shadow-glass">
              <h3 className="text-sm font-mono uppercase text-slate-200 font-bold tracking-wider flex items-center space-x-2">
                <Target className="w-4 h-4 text-cyan-400" />
                <span>Evidence-Backed Diagnostic Areas</span>
              </h3>

              {/* Strengths */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase text-emerald-400 font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Demonstrated Strengths</span>
                </span>

                {realStrengths.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    Complete more practice questions and mock tests to identify your strengths.
                  </p>
                ) : (
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {realStrengths.map((s, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="text-emerald-400">&bull;</span>
                        <span className="font-medium text-slate-200">{s}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Needs Improvement */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-[11px] font-mono uppercase text-amber-400 font-bold flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Needs Improvement</span>
                </span>

                {realWeaknesses.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    No recurring weak areas identified yet.
                  </p>
                ) : (
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {realWeaknesses.map((w, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="text-amber-400">&bull;</span>
                        <span className="font-medium text-slate-200">{w}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* SECTION C: PRACTICE PERFORMANCE */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 shadow-glass">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h3 className="text-sm font-mono uppercase text-slate-200 font-bold tracking-wider flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span>Practice Drills Performance</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  {totalPracticeQuestions} questions attempted &bull; {correctPracticeCount} correct &bull; {practiceAccuracy}% overall accuracy
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center space-x-1 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setPracticeFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    practiceFilter === 'all' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All History
                </button>
                <button
                  type="button"
                  onClick={() => setPracticeFilter('recent')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    practiceFilter === 'recent' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Recent Sessions
                </button>
                <button
                  type="button"
                  onClick={() => setPracticeFilter('matrix')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    practiceFilter === 'matrix' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Topic Mastery Matrix
                </button>
              </div>
            </div>

            {/* Practice Filter Views */}
            {practiceFilter === 'matrix' ? (
              /* Topic Mastery Matrix Table */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono">
                      <th className="pb-3 font-medium">Concept / Topic</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium text-center">Attempts</th>
                      <th className="pb-3 font-medium text-center">Mistakes</th>
                      <th className="pb-3 font-medium text-right">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {Object.values(conceptMasteries).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500 font-mono">
                          No topic data yet. Practice specific concepts to build your mastery matrix.
                        </td>
                      </tr>
                    ) : (
                      Object.values(conceptMasteries).map((item) => (
                        <tr key={item.conceptId} className="hover:bg-slate-800/30">
                          <td className="py-3 font-semibold text-slate-200">{item.conceptName}</td>
                          <td className="py-3">
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded capitalize ${
                                item.status === 'mastered'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : item.status === 'strong'
                                  ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                  : item.status === 'developing'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : item.status === 'beginner'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : 'bg-slate-950 text-slate-500 border border-slate-800'
                              }`}
                            >
                              {item.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 text-center font-mono text-slate-300">
                            {item.attemptsCount}
                          </td>
                          <td className="py-3 text-center font-mono text-rose-400">
                            {item.mistakeCount}
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-cyan-300">
                            {item.score}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Recent / All Sessions List */
              <div className="space-y-3">
                {practiceHistory.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs font-mono">
                    No practice drills recorded yet.{' '}
                    <Link href="/practice" className="text-cyan-400 hover:underline">
                      Start your first practice session &rarr;
                    </Link>
                  </div>
                ) : (
                  practiceHistory
                    .slice(0, practiceFilter === 'recent' ? 3 : 10)
                    .map((sess) => (
                      <div
                        key={sess.id}
                        className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="font-bold text-slate-200">{sess.topic}</div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {new Date(sess.date).toLocaleDateString([], { month: 'short', day: 'numeric' })} &bull;{' '}
                            {sess.totalQuestions} Questions &bull; {sess.correctCount} Correct, {sess.incorrectCount} Incorrect
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 font-mono block">Accuracy</span>
                            <span className="font-bold font-mono text-cyan-300 text-sm">{sess.accuracy}%</span>
                          </div>
                          <Link
                            href="/practice"
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-semibold"
                          >
                            Practice Again
                          </Link>
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}
          </div>

          {/* SECTION D: MOCK TEST PERFORMANCE */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 shadow-glass">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-sm font-mono uppercase text-slate-200 font-bold tracking-wider flex items-center space-x-2">
                  <Award className="w-4 h-4 text-purple-400" />
                  <span>CBT Mock Test Performance</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Full-length examination simulations under strict official timers and negative marking.
                </p>
              </div>

              <Link
                href="/exams"
                className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs uppercase shadow-neon-purple flex items-center space-x-1.5"
              >
                <span>Take a Mock Test</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {examHistory.length === 0 ? (
              <div className="p-8 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-3">
                <Award className="w-8 h-8 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-white">No mock tests completed yet.</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Benchmark your preparation with a full-length timed mock test formatted after your target exam.
                </p>
                <Link
                  href="/exams"
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 text-xs font-semibold"
                >
                  Start First Mock Test &rarr;
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 3 Metric Pills */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Tests Taken</span>
                    <strong className="text-white text-lg font-mono">{examHistory.length}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Best Score</span>
                    <strong className="text-purple-300 text-lg font-mono">{bestExamScore}%</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Average Score</span>
                    <strong className="text-cyan-300 text-lg font-mono">{avgExamScore}%</strong>
                  </div>
                </div>

                {/* Exam List */}
                <div className="space-y-2 pt-2">
                  {examHistory.slice(0, 5).map((ex) => (
                    <div
                      key={ex.id}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-white">{ex.config?.examLabel || 'Mock Exam Attempt'}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {new Date(ex.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} &bull;{' '}
                          Score: {ex.score}/{ex.maxScore} ({ex.percentage}%) &bull; Accuracy: {ex.accuracy}%
                        </div>
                      </div>

                      <Link
                        href="/exams"
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-semibold"
                      >
                        Review Test
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECTION E: AI INTERVIEW PROGRESS */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 shadow-glass">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-sm font-mono uppercase text-slate-200 font-bold tracking-wider flex items-center space-x-2">
                  <Mic className="w-4 h-4 text-emerald-400" />
                  <span>AI Mock Interview Progress</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Adaptive role-based verbal interviews and hiring diagnostic evaluations.
                </p>
              </div>

              <Link
                href="/interview"
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase shadow-neon-emerald flex items-center space-x-1.5"
              >
                <span>Start AI Interview</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {interviewHistory.length === 0 ? (
              <div className="p-8 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-3">
                <Mic className="w-8 h-8 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-white">No AI interviews completed yet.</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Practice spoken and technical questions with our adaptive AI interviewer to assess your interview readiness.
                </p>
                <Link
                  href="/interview"
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 text-xs font-semibold"
                >
                  Start Your First Interview &rarr;
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 3 Metric Pills */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Interviews</span>
                    <strong className="text-white text-lg font-mono">{interviewHistory.length}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Latest Verdict</span>
                    <strong className="text-emerald-400 text-sm font-mono block truncate">
                      {latestInterview?.report?.hireRecommendation || 'Evaluated'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Average Score</span>
                    <strong className="text-cyan-300 text-lg font-mono">{avgInterviewScore}/100</strong>
                  </div>
                </div>

                {/* Interview List */}
                <div className="space-y-2 pt-2">
                  {interviewHistory.slice(0, 5).map((iv) => (
                    <div
                      key={iv.id}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white">{iv.role}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-900 text-cyan-400 text-[10px] font-mono uppercase">
                            {iv.mode}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-300 text-[10px] font-mono uppercase">
                            {iv.difficulty || 'Medium'}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {new Date(iv.date).toLocaleDateString([], { month: 'short', day: 'numeric' })} &bull;{' '}
                          Score: {iv.report.finalScore}/100 &bull; {iv.questionCount} rounds
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase ${
                            iv.report.hireRecommendation === 'Strong Hire'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : iv.report.hireRecommendation === 'Hire'
                              ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {iv.report.hireRecommendation}
                        </span>

                        <Link
                          href="/interview"
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-semibold"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECTION F: COMMUNICATION PROGRESS */}
          {totalCommAssessments > 0 && (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-glass">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-mono uppercase text-slate-200 font-bold tracking-wider flex items-center space-x-2">
                    <PenTool className="w-4 h-4 text-amber-400" />
                    <span>Professional Communication Diagnostics</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Rubric scores across emails, technical explanations, and STAR behavioral answers.
                  </p>
                </div>
                <Link href="/interview" className="text-xs text-cyan-400 hover:underline">
                  Practice Writing &rarr;
                </Link>
              </div>

              <div className="space-y-2">
                {commHistory.slice(0, 4).map((cm) => (
                  <div
                    key={cm.id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white">{cm.scenarioTitle}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-300 text-[10px] font-mono uppercase">
                          {cm.type}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        Grammar: {cm.rubric.grammar}% &bull; Clarity: {cm.rubric.clarity}% &bull; Tone: {cm.rubric.professionalTone}%
                      </div>
                    </div>

                    <span className="text-sm font-bold font-mono text-cyan-300">
                      {cm.rubric.overallScore}/100
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION G: RECOMMENDED NEXT STEP (ACTIONABLE) */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-glass">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>RECOMMENDED NEXT STEP</span>
              </span>
              <h3 className="text-lg font-bold text-white">{recommendedAction.title}</h3>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                {recommendedAction.description}
              </p>
            </div>

            <Link
              href={recommendedAction.href}
              className="px-6 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-neon-cyan flex items-center space-x-2 shrink-0 transition-transform active:scale-95"
            >
              <span>{recommendedAction.actionLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
