'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileCheck2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Flag,
  Award,
  Zap,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Brain,
  BookOpen,
  BarChart3,
  Timer,
  Trash2,
  Send,
  Loader2,
  Lightbulb,
  GraduationCap,
  Target,
  X,
  Play,
  Settings as SettingsIcon,
  Check,
  TrendingUp,
  Sparkles,
  Info,
} from 'lucide-react';
import { useProgress } from '@/hooks/use-progress';
import { getDatabase, saveDatabase, addActivity, updateConceptMastery } from '@/lib/db/client';

export interface ExamQuestion {
  id: string;
  topic: string;
  type: 'mcq' | 'msq' | 'numerical' | 'true_false';
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  options?: { id: string; text: string }[];
  correctAnswers: string[];
  explanation: string;
  steps?: { stepNumber: number; title: string; content: string }[];
  methods?: { title: string; type: string; description: string }[];
  mistakeTrap?: string;
}

export interface MockExamConfig {
  id: string;
  examTarget: string;
  examLabel: string;
  scope: 'full' | 'subject' | 'topic' | 'materials';
  scopeDetail: string;
  questionCount: number;
  durationMinutes: number;
  questionTypes: ('mcq' | 'msq' | 'numerical' | 'true_false')[];
  negativeMarking: boolean;
  negativeMarkRatio: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  isOfficialPattern?: boolean;
}

export interface ExamAttemptRecord {
  id: string;
  date: string;
  config: MockExamConfig;
  questions: ExamQuestion[];
  answers: Record<string, string[]>; // questionId -> selected answer(s)
  markedForReview: string[];
  visitedQuestions: string[];
  questionTimings: Record<string, number>; // questionId -> seconds spent
  totalTimeSeconds: number;
  timeUsedSeconds: number;
  score: number;
  maxScore: number;
  percentage: number;
  accuracy: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  negativePenalty: number;
  topicBreakdown: Record<
    string,
    {
      total: number;
      correct: number;
      incorrect: number;
      accuracy: number;
      avgTimeSeconds: number;
    }
  >;
  weakTopics: string[];
  strongTopics: string[];
  diagnosis: {
    knowledge: string;
    accuracy: string;
    timeManagement: string;
    nextAction: string;
  };
}

const STORAGE_KEY_HISTORY = 'sarathi_mock_exam_history';
const STORAGE_KEY_ACTIVE = 'sarathi_mock_exam_active';

export function ExamEngine() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeParam = searchParams.get('mode'); // 'diagnostic' | 'full'
  const targetParam = searchParams.get('target');

  const { profile, db, sync, isMounted } = useProgress();

  // Primary view states: 'config' | 'instructions' | 'generating' | 'exam' | 'results' | 'review' | 'history'
  const [viewState, setViewState] = useState<
    'config' | 'instructions' | 'generating' | 'exam' | 'results' | 'review' | 'history'
  >('config');

  // History & active session persistence
  const [examHistory, setExamHistory] = useState<ExamAttemptRecord[]>([]);
  const [currentResult, setCurrentResult] = useState<ExamAttemptRecord | null>(null);
  const [selectedReviewIndex, setSelectedReviewIndex] = useState(0);

  // Resume banner state
  const [hasSavedActiveExam, setHasSavedActiveExam] = useState(false);

  // -------------------------------------------------------------
  // 1. CONFIGURATION STATE
  // -------------------------------------------------------------
  const [scope, setScope] = useState<'full' | 'subject' | 'topic' | 'materials'>('full');
  const [scopeTopic, setScopeTopic] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState('all');

  const [questionCountChoice, setQuestionCountChoice] = useState<'10' | '20' | '30' | '50' | '100' | 'custom'>('10');
  const [customQuestionCount, setCustomQuestionCount] = useState<number>(15);

  const [timeChoice, setTimeChoice] = useState<'10' | '30' | '60' | '90' | '120' | 'custom'>('30');
  const [customTime, setCustomTime] = useState<number>(45);

  const [allowedTypes, setAllowedTypes] = useState<('mcq' | 'msq' | 'numerical' | 'true_false')[]>([
    'mcq',
  ]);
  const [negativeMarking, setNegativeMarking] = useState(true);
  const [negativeRatio, setNegativeRatio] = useState(0.33);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed');
  const [isOfficialPattern, setIsOfficialPattern] = useState(false);

  // -------------------------------------------------------------
  // 2. ACTIVE EXAM STATE (CBT Simulation)
  // -------------------------------------------------------------
  const [activeConfig, setActiveConfig] = useState<MockExamConfig | null>(null);
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string[]>>({});
  const [markedForReview, setMarkedForReview] = useState<string[]>([]);
  const [visitedQuestions, setVisitedQuestions] = useState<string[]>([]);
  const [questionTimings, setQuestionTimings] = useState<Record<string, number>>({});
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Ref for timer & active question elapsed time
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const questionStartTimeRef = useRef<number>(Date.now());

  // Effective question count & duration
  const effectiveQuestionCount = useMemo(() => {
    if (questionCountChoice === 'custom') return Math.max(1, customQuestionCount);
    return parseInt(questionCountChoice, 10);
  }, [questionCountChoice, customQuestionCount]);

  const effectiveDurationMinutes = useMemo(() => {
    if (timeChoice === 'custom') return Math.max(1, customTime);
    return parseInt(timeChoice, 10);
  }, [timeChoice, customTime]);

  // Load history & check for saved active test on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const rawHist = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (rawHist) {
        setExamHistory(JSON.parse(rawHist));
      }

      const rawActive = localStorage.getItem(STORAGE_KEY_ACTIVE);
      if (rawActive) {
        const parsed = JSON.parse(rawActive);
        if (parsed && parsed.questions && parsed.questions.length > 0 && parsed.timeRemainingSeconds > 5) {
          setHasSavedActiveExam(true);
        }
      }
    } catch (e) {
      console.warn('Failed to load exam state from storage:', e);
    }
  }, []);

  // Set default scope topic from profile's primarySubject or target
  useEffect(() => {
    if (profile?.primarySubject && !scopeTopic) {
      setScopeTopic(profile.primarySubject);
    }
  }, [profile, scopeTopic]);

  // Handle Official Pattern toggle for known targets
  const handleApplyOfficialPattern = () => {
    const target = (profile?.targetExamLabel || profile?.targetExam || '').toLowerCase();
    setIsOfficialPattern(true);

    if (target.includes('gate')) {
      setQuestionCountChoice('custom');
      setCustomQuestionCount(65);
      setTimeChoice('custom');
      setCustomTime(180);
      setAllowedTypes(['mcq', 'msq', 'numerical']);
      setNegativeMarking(true);
      setNegativeRatio(0.33);
    } else if (target.includes('cat')) {
      setQuestionCountChoice('custom');
      setCustomQuestionCount(66);
      setTimeChoice('120');
      setAllowedTypes(['mcq', 'numerical']);
      setNegativeMarking(true);
      setNegativeRatio(0.33);
    } else if (target.includes('gre')) {
      setQuestionCountChoice('custom');
      setCustomQuestionCount(40);
      setTimeChoice('custom');
      setCustomTime(70);
      setAllowedTypes(['mcq', 'msq', 'numerical']);
      setNegativeMarking(false);
    } else {
      // General standard CBT pattern
      setQuestionCountChoice('30');
      setTimeChoice('60');
      setAllowedTypes(['mcq']);
      setNegativeMarking(true);
      setNegativeRatio(0.25);
    }
  };

  // -------------------------------------------------------------
  // TIMER & AUTO-SAVE (CBT RULES)
  // -------------------------------------------------------------
  useEffect(() => {
    if (viewState !== 'exam') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          // Time expired -> AUTO SUBMIT
          if (timerRef.current) clearInterval(timerRef.current);
          handleAutoSubmitOnTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [viewState]);

  // Auto-save active state every 5 seconds or whenever answers change
  useEffect(() => {
    if (viewState !== 'exam' || !activeConfig || examQuestions.length === 0) return;

    if (typeof window !== 'undefined') {
      const activeState = {
        config: activeConfig,
        questions: examQuestions,
        currentQuestionIndex,
        userAnswers,
        markedForReview,
        visitedQuestions,
        questionTimings,
        timeRemainingSeconds,
        savedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(activeState));
      } catch (e) {
        console.warn('Auto-save failed:', e);
      }
    }
  }, [
    viewState,
    activeConfig,
    examQuestions,
    currentQuestionIndex,
    userAnswers,
    markedForReview,
    visitedQuestions,
    questionTimings,
    timeRemainingSeconds,
  ]);

  // Track time spent on current question before switching
  const recordQuestionTime = useCallback(() => {
    const currentQ = examQuestions[currentQuestionIndex];
    if (!currentQ) return;
    const now = Date.now();
    const elapsedSeconds = Math.max(1, Math.round((now - questionStartTimeRef.current) / 1000));
    questionStartTimeRef.current = now;

    setQuestionTimings((prev) => ({
      ...prev,
      [currentQ.id]: (prev[currentQ.id] || 0) + elapsedSeconds,
    }));
  }, [examQuestions, currentQuestionIndex]);

  // Resume saved exam
  const handleResumeSavedExam = () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ACTIVE);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setActiveConfig(parsed.config);
      setExamQuestions(parsed.questions);
      setCurrentQuestionIndex(parsed.currentQuestionIndex || 0);
      setUserAnswers(parsed.userAnswers || {});
      setMarkedForReview(parsed.markedForReview || []);
      setVisitedQuestions(parsed.visitedQuestions || []);
      setQuestionTimings(parsed.questionTimings || {});
      setTimeRemainingSeconds(parsed.timeRemainingSeconds || 600);
      setHasSavedActiveExam(false);
      questionStartTimeRef.current = Date.now();
      setViewState('exam');
    } catch (e) {
      console.warn('Failed to restore active exam:', e);
      localStorage.removeItem(STORAGE_KEY_ACTIVE);
      setHasSavedActiveExam(false);
    }
  };

  const handleDiscardSavedExam = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_ACTIVE);
    }
    setHasSavedActiveExam(false);
  };

  // -------------------------------------------------------------
  // START EXAM GENERATION
  // -------------------------------------------------------------
  const handleStartExamFlow = async () => {
    const examTargetName = profile?.targetExamLabel || profile?.targetExam || 'General Assessment';

    const config: MockExamConfig = {
      id: `exam-cfg-${Date.now()}`,
      examTarget: examTargetName,
      examLabel: isOfficialPattern ? `${examTargetName} (Official Pattern)` : `${examTargetName} Mock Exam`,
      scope,
      scopeDetail:
        scope === 'topic' ? scopeTopic.trim() || 'Core Syllabus' : scope === 'subject' ? scopeTopic.trim() || 'Core Subject' : 'Full Syllabus',
      questionCount: effectiveQuestionCount,
      durationMinutes: effectiveDurationMinutes,
      questionTypes: allowedTypes.length > 0 ? allowedTypes : ['mcq'],
      negativeMarking,
      negativeMarkRatio: negativeRatio,
      difficulty,
      isOfficialPattern,
    };

    setActiveConfig(config);
    setViewState('instructions');
  };

  const handleConfirmStartTest = async () => {
    if (!activeConfig) return;
    setIsGenerating(true);
    setGenerateError(null);
    setViewState('generating');

    // Material text snippet if materials scope
    let materialText = '';
    if (activeConfig.scope === 'materials' && db.materials.length > 0) {
      if (selectedMaterialId === 'all') {
        materialText = db.materials.map((m) => `${m.name}: ${m.summary || ''}`).join('\n\n');
      } else {
        const mat = db.materials.find((m) => m.id === selectedMaterialId);
        if (mat) {
          materialText = `${mat.name}:\n${mat.summary || ''}`;
        }
      }
    }

    try {
      const res = await fetch('/api/exam/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examTarget: activeConfig.examTarget,
          scope: activeConfig.scope,
          scopeDetail: activeConfig.scopeDetail,
          questionCount: activeConfig.questionCount,
          questionTypes: activeConfig.questionTypes,
          difficulty: activeConfig.difficulty,
          materialText,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error(data.error || 'Failed to generate authentic exam questions.');
      }

      setExamQuestions(data.questions);
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setMarkedForReview([]);
      setVisitedQuestions([data.questions[0].id]);
      setQuestionTimings({});
      setTimeRemainingSeconds(activeConfig.durationMinutes * 60);
      questionStartTimeRef.current = Date.now();
      setIsGenerating(false);
      setViewState('exam');
    } catch (err: any) {
      console.error('Exam questions generation error:', err);
      setIsGenerating(false);
      setGenerateError(err.message || 'Could not generate exam questions. Please check AI service or connection.');
      setViewState('instructions');
    }
  };

  // -------------------------------------------------------------
  // EXAM NAVIGATION & ACTIONS
  // -------------------------------------------------------------
  const handleSelectAnswer = (optionId: string) => {
    const currentQ = examQuestions[currentQuestionIndex];
    if (!currentQ) return;

    if (currentQ.type === 'msq') {
      // Toggle multi-select
      const current = userAnswers[currentQ.id] || [];
      const updated = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      setUserAnswers((prev) => ({ ...prev, [currentQ.id]: updated }));
    } else {
      // Single select
      setUserAnswers((prev) => ({ ...prev, [currentQ.id]: [optionId] }));
    }
  };

  const handleNumericalAnswer = (val: string) => {
    const currentQ = examQuestions[currentQuestionIndex];
    if (!currentQ) return;
    setUserAnswers((prev) => ({ ...prev, [currentQ.id]: [val] }));
  };

  const handleClearResponse = () => {
    const currentQ = examQuestions[currentQuestionIndex];
    if (!currentQ) return;
    setUserAnswers((prev) => {
      const copy = { ...prev };
      delete copy[currentQ.id];
      return copy;
    });
  };

  const handleToggleMarkForReview = () => {
    const currentQ = examQuestions[currentQuestionIndex];
    if (!currentQ) return;
    setMarkedForReview((prev) =>
      prev.includes(currentQ.id) ? prev.filter((id) => id !== currentQ.id) : [...prev, currentQ.id]
    );
  };

  const handleGoToQuestion = (index: number) => {
    if (index < 0 || index >= examQuestions.length) return;
    recordQuestionTime();
    setCurrentQuestionIndex(index);
    const targetQ = examQuestions[index];
    if (targetQ && !visitedQuestions.includes(targetQ.id)) {
      setVisitedQuestions((prev) => [...prev, targetQ.id]);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < examQuestions.length - 1) {
      handleGoToQuestion(currentQuestionIndex + 1);
    } else {
      setShowSubmitModal(true);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      handleGoToQuestion(currentQuestionIndex - 1);
    }
  };

  // -------------------------------------------------------------
  // EXAM SUBMISSION & EVALUATION
  // -------------------------------------------------------------
  const handleAutoSubmitOnTimeout = () => {
    recordQuestionTime();
    processSubmission();
  };

  const handleConfirmSubmit = () => {
    setShowSubmitModal(false);
    recordQuestionTime();
    processSubmission();
  };

  const processSubmission = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!activeConfig) return;

    const totalTimeSeconds = activeConfig.durationMinutes * 60;
    const timeUsedSeconds = Math.max(1, totalTimeSeconds - timeRemainingSeconds);

    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    let rawScore = 0;
    const maxScore = examQuestions.length * 1.0;
    const penaltyPerIncorrect = activeConfig.negativeMarking ? activeConfig.negativeMarkRatio : 0;

    const topicStats: Record<
      string,
      { total: number; correct: number; incorrect: number; accuracy: number; totalTime: number }
    > = {};

    examQuestions.forEach((q) => {
      const topic = q.topic || 'General';
      if (!topicStats[topic]) {
        topicStats[topic] = { total: 0, correct: 0, incorrect: 0, accuracy: 0, totalTime: 0 };
      }
      topicStats[topic].total += 1;
      topicStats[topic].totalTime += questionTimings[q.id] || 0;

      const userAns = userAnswers[q.id];
      if (!userAns || userAns.length === 0 || (userAns.length === 1 && userAns[0].trim() === '')) {
        unansweredCount += 1;
      } else {
        let isCorrect = false;
        if (q.type === 'numerical') {
          const userNum = userAns[0]?.trim().toLowerCase();
          isCorrect = q.correctAnswers.some((ans) => ans.trim().toLowerCase() === userNum);
        } else {
          const sortedUser = [...userAns].sort();
          const sortedCorrect = [...q.correctAnswers].sort();
          isCorrect =
            sortedUser.length === sortedCorrect.length &&
            sortedUser.every((v, i) => v === sortedCorrect[i]);
        }

        if (isCorrect) {
          correctCount += 1;
          rawScore += 1.0;
          topicStats[topic].correct += 1;
        } else {
          incorrectCount += 1;
          rawScore = Math.max(0, rawScore - penaltyPerIncorrect);
          topicStats[topic].incorrect += 1;
        }

        // Register mastery update in database client
        updateConceptMastery(
          q.topic || 'exam_concept',
          isCorrect,
          questionTimings[q.id] || 30,
          q.topic,
          activeConfig.examTarget
        );
      }
    });

    const accuracy =
      correctCount + incorrectCount > 0
        ? Math.round((correctCount / (correctCount + incorrectCount)) * 100)
        : 0;

    const percentage = maxScore > 0 ? Math.round((rawScore / maxScore) * 100) : 0;
    const negativePenalty = Number((incorrectCount * penaltyPerIncorrect).toFixed(2));

    // Calculate per-topic accuracy & avg time
    const topicBreakdown: ExamAttemptRecord['topicBreakdown'] = {};
    const weakTopics: string[] = [];
    const strongTopics: string[] = [];

    Object.entries(topicStats).forEach(([top, st]) => {
      const topAcc = st.total > 0 ? Math.round((st.correct / st.total) * 100) : 0;
      const avgTime = st.total > 0 ? Math.round(st.totalTime / st.total) : 0;
      topicBreakdown[top] = {
        total: st.total,
        correct: st.correct,
        incorrect: st.incorrect,
        accuracy: topAcc,
        avgTimeSeconds: avgTime,
      };

      if (topAcc < 50 && st.total >= 1) {
        weakTopics.push(top);
      } else if (topAcc >= 80 && st.total >= 1) {
        strongTopics.push(top);
      }
    });

    // SARATHI Diagnosis generation from actual evidence
    const avgTimePerQ =
      examQuestions.length > 0 ? Math.round(timeUsedSeconds / examQuestions.length) : 0;

    const diagnosis = {
      knowledge:
        accuracy >= 80
          ? `Exceptional subject mastery. Your foundational knowledge across tested topics is firm.`
          : accuracy >= 50
          ? `Moderate conceptual grasp. Certain subtopics require targeted revision before the next mock.`
          : `Significant knowledge gaps detected in foundational principles. Focus on remedial learning.`,
      accuracy:
        accuracy >= 80
          ? `High precision (${accuracy}%). Minimal negative marking deductions.`
          : accuracy >= 50
          ? `Fair accuracy (${accuracy}%). ${incorrectCount} negative penalties deducted (-${negativePenalty} marks).`
          : `Critical error rate. ${incorrectCount} incorrect attempts caused significant score erosion.`,
      timeManagement:
        timeRemainingSeconds === 0
          ? `Pacing issue: Ran out of time with ${unansweredCount} questions unattempted.`
          : avgTimePerQ > 120
          ? `Slow pacing (${avgTimePerQ}s per question). Aim to improve problem-solving velocity.`
          : `Balanced pacing (${avgTimePerQ}s per question) with ${Math.round(
              timeRemainingSeconds / 60
            )}m remaining buffer.`,
      nextAction:
        weakTopics.length > 0
          ? `Prioritize targeted practice drills in: ${weakTopics.slice(0, 2).join(', ')}.`
          : `Review any flagged or unattempted questions and challenge yourself with higher difficulty.`,
    };

    const attemptRecord: ExamAttemptRecord = {
      id: `attempt-${Date.now()}`,
      date: new Date().toISOString(),
      config: activeConfig,
      questions: examQuestions,
      answers: userAnswers,
      markedForReview,
      visitedQuestions,
      questionTimings,
      totalTimeSeconds,
      timeUsedSeconds,
      score: Number(rawScore.toFixed(2)),
      maxScore,
      percentage,
      accuracy,
      correctCount,
      incorrectCount,
      unansweredCount,
      negativePenalty,
      topicBreakdown,
      weakTopics,
      strongTopics,
      diagnosis,
    };

    // Save to history & clear active
    if (typeof window !== 'undefined') {
      try {
        const existingRaw = localStorage.getItem(STORAGE_KEY_HISTORY);
        const historyList: ExamAttemptRecord[] = existingRaw ? JSON.parse(existingRaw) : [];
        historyList.unshift(attemptRecord);
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(historyList));
        setExamHistory(historyList);
        localStorage.removeItem(STORAGE_KEY_ACTIVE);
      } catch (e) {
        console.warn('Failed to save attempt to storage:', e);
      }

      // Add to SARATHI central activity log
      addActivity({
        type: 'mock_exam',
        title: `${activeConfig.examLabel} Completed`,
        details: `Score: ${attemptRecord.score}/${attemptRecord.maxScore} (${percentage}%) • Accuracy: ${accuracy}% • ${correctCount} Correct, ${incorrectCount} Incorrect`,
        score: percentage,
        durationSec: timeUsedSeconds,
      });

      sync();
    }

    setCurrentResult(attemptRecord);
    setSelectedReviewIndex(0);
    setViewState('results');
  };

  // -------------------------------------------------------------
  // RETAKE FUNCTIONALITY (Preserves past attempts)
  // -------------------------------------------------------------
  const handleRetakeExam = () => {
    if (!currentResult) return;
    // Set config back to the same config, move to instructions
    setActiveConfig(currentResult.config);
    setViewState('instructions');
  };

  // Format time remaining
  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // -------------------------------------------------------------
  // RENDER: VIEW STATES
  // -------------------------------------------------------------
  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* ─────────────────────────────────────────────────────────────
          1. RESUME ACTIVE TEST BANNER
         ───────────────────────────────────────────────────────────── */}
      {hasSavedActiveExam && viewState === 'config' && (
        <div className="p-4 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 shadow-neon-cyan flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-xs sm:text-sm text-cyan-200">
            <Clock className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <span className="font-bold text-white">Ongoing Mock Test Detected:</span> You have an
              unfinished exam session saved in memory.
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleDiscardSavedExam}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-xs text-slate-300"
            >
              Discard
            </button>
            <button
              onClick={handleResumeSavedExam}
              className="px-4 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase shadow-neon-cyan"
            >
              Resume Test &rarr;
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. CONFIGURATION SCREEN
         ───────────────────────────────────────────────────────────── */}
      {viewState === 'config' && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/30 border border-slate-800 shadow-glass">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-2 px-3 py-0.5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800 text-xs font-mono">
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>EXAMINATION SIMULATION ENGINE</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Mock Examination Setup
              </h1>
              <p className="text-xs sm:text-sm text-slate-300">
                Calibrated computer-based exam simulator with negative marking, question palette, and mistake diagnosis.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setViewState('history')}
                className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-mono text-slate-300 hover:text-white transition-all flex items-center space-x-2"
              >
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Past Attempts ({examHistory.length})</span>
              </button>
            </div>
          </div>

          {/* Exam Target Verification */}
          {(!profile || !profile.targetExamLabel) ? (
            <div className="p-6 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-3">
              <div className="flex items-center space-x-2 text-amber-300 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Learning Target Required</span>
              </div>
              <p className="text-xs text-slate-300">
                Choose your exam or target before starting a mock test so SARATHI can calibrate question difficulty and official patterns.
              </p>
              <div>
                <Link
                  href="/settings"
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase"
                >
                  <SettingsIcon className="w-4 h-4" />
                  <span>Configure Target in Settings</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-slate-500 font-mono text-[11px] uppercase">Selected Exam Target</span>
                <div className="font-bold text-white text-sm flex items-center space-x-2">
                  <Target className="w-4 h-4 text-cyan-400" />
                  <span>{profile.targetExamLabel}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleApplyOfficialPattern}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold transition-all ${
                    isOfficialPattern
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {isOfficialPattern ? '✓ Official Pattern Applied' : 'Apply Official Pattern'}
                </button>
                <Link href="/settings" className="text-xs text-cyan-400 hover:underline">
                  Change
                </Link>
              </div>
            </div>
          )}

          {/* Configuration Form Card */}
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-8 shadow-glass">
            {/* 1. TEST SCOPE / EXAM MODE */}
            <div className="space-y-3">
              <label className="text-xs font-mono text-slate-300 uppercase tracking-wider block">
                1. Test Scope & Exam Mode
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'full', label: 'Full Mock', desc: 'Complete Target Syllabus' },
                  { id: 'subject', label: 'Sectional Mock', desc: 'Specific Subject Module' },
                  { id: 'topic', label: 'Topic Mock', desc: 'Granular Topic Focus' },
                  { id: 'materials', label: 'Material Mock', desc: 'From Uploaded Notes' },
                ].map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => {
                      setScope(sc.id as any);
                      setIsOfficialPattern(false);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      scope === sc.id
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-neon-cyan'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs sm:text-sm text-white">{sc.label}</div>
                    <div className="text-[11px] text-slate-400 mt-1">{sc.desc}</div>
                  </button>
                ))}
              </div>

              {/* Topic / Subject Input field if sectional or topic */}
              {(scope === 'topic' || scope === 'subject') && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 mt-2">
                  <label className="text-xs font-mono text-slate-400">
                    {scope === 'topic' ? 'Enter Focus Topic Name:' : 'Enter Subject or Section Name:'}
                  </label>
                  <input
                    type="text"
                    value={scopeTopic}
                    onChange={(e) => setScopeTopic(e.target.value)}
                    placeholder={
                      scope === 'topic'
                        ? 'e.g. Normalization, B-Trees, Dynamic Programming'
                        : 'e.g. Database Systems, Computer Networks'
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm focus:border-cyan-400 focus:outline-hidden"
                  />
                </div>
              )}

              {/* Material Selector if materials scope */}
              {scope === 'materials' && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 mt-2">
                  <label className="text-xs font-mono text-slate-400">Select Uploaded Material:</label>
                  {db.materials.length === 0 ? (
                    <div className="text-xs text-amber-400">
                      No study materials found. Please upload documents in{' '}
                      <Link href="/materials" className="underline font-bold">
                        My Materials
                      </Link>{' '}
                      first.
                    </div>
                  ) : (
                    <select
                      value={selectedMaterialId}
                      onChange={(e) => setSelectedMaterialId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm focus:border-cyan-400 focus:outline-hidden"
                    >
                      <option value="all">All Uploaded Materials ({db.materials.length})</option>
                      {db.materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.type.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            {/* 2. NUMBER OF QUESTIONS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                  2. Number of Questions
                </label>
                <span className="text-xs font-mono text-cyan-400 font-bold">
                  {effectiveQuestionCount} Questions
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                {(['10', '20', '30', '50', '100', 'custom'] as const).map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setQuestionCountChoice(cnt)}
                    className={`py-2.5 rounded-xl border text-xs font-mono font-bold capitalize transition-all ${
                      questionCountChoice === cnt
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {cnt === 'custom' ? 'Custom' : `${cnt} Qs`}
                  </button>
                ))}
              </div>
              {questionCountChoice === 'custom' && (
                <div className="flex items-center space-x-3 pt-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={customQuestionCount}
                    onChange={(e) => setCustomQuestionCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-32 px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono"
                  />
                  <span className="text-xs text-slate-400">Questions (1 to 100)</span>
                </div>
              )}
            </div>

            {/* 3. TIME DURATION */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                  3. Examination Time Limit
                </label>
                <span className="text-xs font-mono text-cyan-400 font-bold">
                  {effectiveDurationMinutes} Minutes
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                {(['10', '30', '60', '90', '120', 'custom'] as const).map((tm) => (
                  <button
                    key={tm}
                    type="button"
                    onClick={() => setTimeChoice(tm)}
                    className={`py-2.5 rounded-xl border text-xs font-mono font-bold capitalize transition-all ${
                      timeChoice === tm
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {tm === 'custom' ? 'Custom' : `${tm} Mins`}
                  </button>
                ))}
              </div>
              {timeChoice === 'custom' && (
                <div className="flex items-center space-x-3 pt-2">
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={customTime}
                    onChange={(e) => setCustomTime(Math.max(5, parseInt(e.target.value, 10) || 5))}
                    className="w-32 px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono"
                  />
                  <span className="text-xs text-slate-400">Minutes (5 to 300)</span>
                </div>
              )}
            </div>

            {/* 4. QUESTION TYPES & NEGATIVE MARKING */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-slate-800">
              {/* Question Types */}
              <div className="space-y-3">
                <label className="text-xs font-mono text-slate-300 uppercase tracking-wider block">
                  Question Types
                </label>
                <div className="space-y-2">
                  {[
                    { id: 'mcq', label: 'Single-correct MCQ' },
                    { id: 'msq', label: 'Multiple-correct MSQ' },
                    { id: 'numerical', label: 'Numerical Answer (NAT)' },
                    { id: 'true_false', label: 'True / False' },
                  ].map((t) => {
                    const isChecked = allowedTypes.includes(t.id as any);
                    return (
                      <label
                        key={t.id}
                        className="flex items-center space-x-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 cursor-pointer hover:bg-slate-900"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              if (allowedTypes.length > 1) {
                                setAllowedTypes(allowedTypes.filter((x) => x !== t.id));
                              }
                            } else {
                              setAllowedTypes([...allowedTypes, t.id as any]);
                            }
                          }}
                          className="w-4 h-4 rounded text-cyan-400 focus:ring-0 bg-slate-900 border-slate-700"
                        />
                        <span>{t.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Negative Marking & Difficulty */}
              <div className="space-y-4">
                <div className="space-y-3">
                  <label className="text-xs font-mono text-slate-300 uppercase tracking-wider block">
                    Negative Marking
                  </label>
                  <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setNegativeMarking(!negativeMarking)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        negativeMarking ? 'bg-cyan-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          negativeMarking ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className="text-xs text-slate-300">
                      {negativeMarking ? 'Enabled (-0.33 per incorrect MCQ)' : 'Disabled (No penalty)'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-mono text-slate-300 uppercase tracking-wider block">
                    Difficulty Level
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['easy', 'medium', 'hard', 'mixed'] as const).map((df) => (
                      <button
                        key={df}
                        type="button"
                        onClick={() => setDifficulty(df)}
                        className={`py-2 rounded-lg border text-xs font-mono capitalize ${
                          difficulty === df
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        {df}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Proceed to Instructions */}
            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                onClick={handleStartExamFlow}
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-neon-cyan flex items-center space-x-2"
              >
                <span>PROCEED TO INSTRUCTIONS</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. REAL EXAM INSTRUCTIONS SCREEN
         ───────────────────────────────────────────────────────────── */}
      {viewState === 'instructions' && activeConfig && (
        <div className="max-w-3xl mx-auto rounded-2xl bg-slate-900/80 border border-slate-800 p-6 sm:p-10 space-y-8 shadow-glass animate-fadeIn">
          <div className="space-y-3 pb-4 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-md bg-purple-950 text-purple-300 border border-purple-800 text-xs font-mono">
                {activeConfig.isOfficialPattern ? 'OFFICIAL EXAM SPECIFICATION' : 'SARATHI PRACTICE RULES'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Mock Test Instructions
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Please read the applicable evaluation and navigation rules carefully before launching your examination.
            </p>
          </div>

          {/* Test Specs Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Questions</span>
              <div className="text-xl font-bold font-mono text-cyan-300">
                {activeConfig.questionCount}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Time Allowed</span>
              <div className="text-xl font-bold font-mono text-cyan-300">
                {activeConfig.durationMinutes} Mins
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Marking Scheme</span>
              <div className="text-xl font-bold font-mono text-emerald-400">+1.00 / Q</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Negative Marking</span>
              <div className="text-xl font-bold font-mono text-rose-400">
                {activeConfig.negativeMarking ? `-${activeConfig.negativeMarkRatio} / Q` : 'None'}
              </div>
            </div>
          </div>

          {/* Rules List */}
          <div className="space-y-3 p-5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 leading-relaxed">
            <div className="font-bold text-white text-sm">CBT Navigation & Evaluation Protocol:</div>
            <ul className="space-y-2 list-disc list-inside text-slate-300">
              <li>
                <strong>No Answer Reveal:</strong> Hints, immediate correctness feedback, and solutions are strictly disabled during the exam.
              </li>
              <li>
                <strong>Question Palette:</strong> You may navigate freely between questions using the Question Palette on the right sidebar.
              </li>
              <li>
                <strong>Mark for Review:</strong> Flag questions you want to inspect before final submission.
              </li>
              <li>
                <strong>Numerical Questions:</strong> In NAT questions, type the exact value. NAT questions carry <em>no negative marking</em>.
              </li>
              <li>
                <strong>Auto-Submit on Timeout:</strong> When the countdown timer hits 00:00, the test will automatically lock and submit your recorded responses.
              </li>
              <li>
                <strong>Auto-Save:</strong> Your answers and elapsed timings are saved automatically. Do not close or refresh your browser tab.
              </li>
            </ul>
          </div>

          {generateError && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{generateError}</span>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setViewState('config')}
              className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Setup</span>
            </button>

            <button
              onClick={handleConfirmStartTest}
              className="px-8 py-3.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-neon-cyan flex items-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>I'M READY — START TEST</span>
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. GENERATING QUESTIONS SCREEN
         ───────────────────────────────────────────────────────────── */}
      {viewState === 'generating' && (
        <div className="max-w-md mx-auto py-20 text-center space-y-4">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto" />
          <h2 className="text-xl font-bold text-white">Assembling Authentic Exam Paper...</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Calibrating questions, distractors, numerical boundaries, and multi-step solutions for{' '}
            <span className="text-cyan-300">{activeConfig?.examLabel}</span>.
          </p>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. ACTIVE EXAM SCREEN (PROFESSIONAL CBT SIMULATOR)
         ───────────────────────────────────────────────────────────── */}
      {viewState === 'exam' && examQuestions.length > 0 && (
        <div className="space-y-4">
          {/* Top Sticky Header */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-glass flex items-center justify-between gap-4 sticky top-2 z-30 backdrop-blur-md">
            <div className="flex items-center space-x-3">
              <span className="px-2.5 py-0.5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] sm:text-xs font-mono font-bold uppercase">
                MOCK TEST
              </span>
              <span className="text-xs sm:text-sm font-bold text-white">
                Question {currentQuestionIndex + 1} of {examQuestions.length}
              </span>
            </div>

            {/* Countdown Timer */}
            <div className="flex items-center space-x-3">
              <div
                className={`px-4 py-1.5 rounded-xl border text-sm sm:text-base font-mono font-black flex items-center space-x-2 ${
                  timeRemainingSeconds < 120
                    ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse'
                    : 'bg-slate-950 border-slate-800 text-cyan-300'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{formatTime(timeRemainingSeconds)}</span>
              </div>

              <button
                onClick={() => setShowSubmitModal(true)}
                className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase shadow-md transition-all"
              >
                Submit Test
              </button>
            </div>
          </div>

          {/* Main Grid: 3 cols Question + 1 col Palette */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left: Question Arena (3 cols) */}
            <div className="lg:col-span-3 rounded-2xl bg-slate-900/60 border border-slate-800 p-6 sm:p-8 space-y-6 flex flex-col justify-between min-h-[550px] shadow-glass">
              {(() => {
                const q = examQuestions[currentQuestionIndex];
                if (!q) return null;
                const userSelected = userAnswers[q.id] || [];
                const isMarked = markedForReview.includes(q.id);

                return (
                  <div className="space-y-6">
                    {/* Header info */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="px-2.5 py-0.5 rounded bg-slate-950 text-slate-300 font-mono border border-slate-800">
                          {q.topic}
                        </span>
                        <span className="text-slate-500">&bull;</span>
                        <span className="text-[10px] font-mono uppercase text-slate-400">
                          {q.type.toUpperCase()}
                        </span>
                        <span className="text-slate-500">&bull;</span>
                        <span className="text-[10px] font-mono text-cyan-400">
                          +1.00 / {activeConfig?.negativeMarking && q.type !== 'numerical' ? `-${activeConfig.negativeMarkRatio}` : '0.00'}
                        </span>
                      </div>

                      <button
                        onClick={handleToggleMarkForReview}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors flex items-center space-x-1.5 ${
                          isMarked
                            ? 'bg-purple-950 text-purple-300 border-purple-500'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        <Flag className="w-3.5 h-3.5" />
                        <span>{isMarked ? 'Marked for Review' : 'Mark for Review'}</span>
                      </button>
                    </div>

                    {/* Question Statement */}
                    <div className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed whitespace-pre-wrap">
                      {q.question}
                    </div>

                    {/* Options or Numerical Input */}
                    {q.options && q.options.length > 0 ? (
                      <div className="space-y-3 pt-2">
                        {q.options.map((opt) => {
                          const isSelected = userSelected.includes(opt.id);
                          return (
                            <button
                              key={opt.id}
                              onClick={() => handleSelectAnswer(opt.id)}
                              className={`w-full text-left p-4 rounded-xl border text-xs sm:text-sm transition-all flex items-start space-x-3.5 ${
                                isSelected
                                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-neon-cyan'
                                  : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-${
                                  q.type === 'msq' ? 'md' : 'full'
                                } border border-current flex items-center justify-center text-xs font-mono shrink-0 mt-0.5 font-bold ${
                                  isSelected ? 'bg-cyan-400 text-slate-950' : ''
                                }`}
                              >
                                {opt.id}
                              </span>
                              <span className="leading-relaxed">{opt.text}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-3 pt-4">
                        <label className="text-xs font-mono text-slate-400 block">
                          Enter Numerical Value:
                        </label>
                        <input
                          type="text"
                          value={userSelected[0] || ''}
                          onChange={(e) => handleNumericalAnswer(e.target.value)}
                          placeholder="e.g. 57 or 0.25"
                          className="w-full sm:w-72 px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-base focus:border-cyan-400 focus:outline-hidden"
                        />
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Bottom Nav Controls */}
              <div className="pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={handleClearResponse}
                  disabled={
                    !examQuestions[currentQuestionIndex] ||
                    !userAnswers[examQuestions[currentQuestionIndex].id]?.length
                  }
                  className="text-xs text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:hover:text-slate-500"
                >
                  Clear Response
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePrev}
                    disabled={currentQuestionIndex === 0}
                    className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 disabled:opacity-30 text-xs font-semibold text-slate-300"
                  >
                    &larr; Previous
                  </button>

                  {currentQuestionIndex < examQuestions.length - 1 ? (
                    <button
                      onClick={handleNext}
                      className="px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white"
                    >
                      Next &rarr;
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowSubmitModal(true)}
                      className="px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase shadow-md"
                    >
                      Submit Exam
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Question Palette (1 col) */}
            <div className="lg:col-span-1 rounded-2xl bg-slate-900/60 border border-slate-800 p-5 space-y-6 shadow-glass">
              {/* Question Palette Header */}
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                <span className="font-mono uppercase text-[11px] font-bold text-slate-200">
                  Question Palette
                </span>
                <span className="font-mono text-cyan-400">
                  {Object.keys(userAnswers).length}/{examQuestions.length} Answered
                </span>
              </div>

              {/* 5-State Grid */}
              <div className="grid grid-cols-5 gap-2">
                {examQuestions.map((q, idx) => {
                  const hasAnswered = !!userAnswers[q.id]?.length;
                  const isMarked = markedForReview.includes(q.id);
                  const isVisited = visitedQuestions.includes(q.id);
                  const isCurrent = idx === currentQuestionIndex;

                  let badgeStyle = 'bg-slate-950 text-slate-400 border-slate-800'; // Unvisited

                  if (hasAnswered && isMarked) {
                    badgeStyle = 'bg-purple-950 text-purple-200 border-purple-400 ring-1 ring-cyan-400';
                  } else if (isMarked) {
                    badgeStyle = 'bg-purple-950 text-purple-300 border-purple-500';
                  } else if (hasAnswered) {
                    badgeStyle = 'bg-cyan-500/20 text-cyan-300 border-cyan-400';
                  } else if (isVisited) {
                    badgeStyle = 'bg-amber-950/40 text-amber-300 border-amber-600/40';
                  }

                  if (isCurrent) {
                    badgeStyle += ' ring-2 ring-white font-black';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => handleGoToQuestion(idx)}
                      className={`h-9 rounded-lg font-mono text-xs font-bold border transition-all ${badgeStyle}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* 5-State Palette Legend */}
              <div className="pt-3 border-t border-slate-800 space-y-2 text-[10px] font-mono text-slate-400">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span>Unanswered</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                    <span>Marked</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400 ring-1 ring-cyan-400" />
                    <span>Answered + Marked</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                    <span>Unvisited</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full border border-white" />
                    <span>Current</span>
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                onClick={() => setShowSubmitModal(true)}
                className="w-full py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-neon-cyan transition-all"
              >
                SUBMIT MOCK TEST
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUBMIT CONFIRMATION MODAL
         ───────────────────────────────────────────────────────────── */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 animate-fadeIn shadow-2xl">
            <h3 className="text-lg font-bold text-white">SUBMIT MOCK TEST?</h3>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Total Questions:</span>
                <span className="font-mono">{examQuestions.length}</span>
              </div>
              <div className="flex justify-between text-cyan-300">
                <span>Answered:</span>
                <span className="font-mono">
                  {Object.keys(userAnswers).length} / {examQuestions.length}
                </span>
              </div>
              <div className="flex justify-between text-amber-300">
                <span>Unanswered:</span>
                <span className="font-mono">
                  {examQuestions.length - Object.keys(userAnswers).length}
                </span>
              </div>
              <div className="flex justify-between text-purple-300">
                <span>Marked for Review:</span>
                <span className="font-mono">{markedForReview.length}</span>
              </div>
              <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                <span>Time Remaining:</span>
                <span className="font-mono text-cyan-400">{formatTime(timeRemainingSeconds)}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to submit? Once submitted, your answers will be locked and SARATHI will compute your marks, time analysis, and mistake diagnoses.
            </p>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs"
              >
                Continue Test
              </button>
              <button
                onClick={handleConfirmSubmit}
                className="px-6 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase shadow-neon-cyan"
              >
                Submit Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. RESULT & POST-EXAM ANALYSIS SCREEN
         ───────────────────────────────────────────────────────────── */}
      {viewState === 'results' && currentResult && (
        <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
          {/* Top Score Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/30 border border-slate-800 shadow-glass">
            <div>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-mono font-bold uppercase">
                MOCK TEST COMPLETED
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                Mock Test Result
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Completed in {Math.floor(currentResult.timeUsedSeconds / 60)}m{' '}
                {currentResult.timeUsedSeconds % 60}s &bull; Buffer remaining:{' '}
                {Math.floor((currentResult.totalTimeSeconds - currentResult.timeUsedSeconds) / 60)}m
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center min-w-[110px]">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Score</span>
                <div className="text-2xl font-bold font-mono text-cyan-300">
                  {currentResult.score} / {currentResult.maxScore}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center min-w-[110px]">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Accuracy</span>
                <div className="text-2xl font-bold font-mono text-emerald-400">
                  {currentResult.accuracy}%
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[11px] font-mono text-slate-400">Correct</span>
              <div className="text-2xl font-bold text-emerald-400">{currentResult.correctCount}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[11px] font-mono text-slate-400">Incorrect</span>
              <div className="text-2xl font-bold text-rose-400">{currentResult.incorrectCount}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[11px] font-mono text-slate-400">Unanswered</span>
              <div className="text-2xl font-bold text-slate-400">{currentResult.unansweredCount}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[11px] font-mono text-slate-400">Negative Penalty</span>
              <div className="text-2xl font-bold text-amber-400">
                -{currentResult.negativePenalty}
              </div>
            </div>
          </div>

          {/* 15. TOPIC PERFORMANCE ANALYSIS */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 shadow-glass">
            <h3 className="text-sm font-mono uppercase text-slate-300 tracking-wider">
              TOPIC PERFORMANCE BREAKDOWN
            </h3>
            <div className="space-y-3">
              {Object.entries(currentResult.topicBreakdown).map(([top, st]) => (
                <div
                  key={top}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <span className="font-bold text-white text-sm">{top}</span>
                    <div className="text-slate-400">
                      Score: {st.correct} / {st.total} questions &bull; Avg Pacing:{' '}
                      {st.avgTimeSeconds}s / Q
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span
                      className={`text-sm font-mono font-bold ${
                        st.accuracy >= 70
                          ? 'text-emerald-400'
                          : st.accuracy >= 50
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {st.accuracy}%
                    </span>
                    <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          st.accuracy >= 70
                            ? 'bg-emerald-400'
                            : st.accuracy >= 50
                            ? 'bg-amber-400'
                            : 'bg-rose-400'
                        }`}
                        style={{ width: `${st.accuracy}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 16. TIME ANALYSIS */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 shadow-glass">
            <div className="flex items-center space-x-2 text-sm font-mono uppercase text-slate-300 tracking-wider">
              <Timer className="w-4 h-4 text-cyan-400" />
              <span>TIME MANAGEMENT INTELLIGENCE</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 uppercase block font-mono text-[10px]">
                  Average Time / Question
                </span>
                <span className="text-lg font-bold font-mono text-cyan-300">
                  {Math.round(currentResult.timeUsedSeconds / currentResult.questions.length)}s
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 uppercase block font-mono text-[10px]">
                  Time Remaining
                </span>
                <span className="text-lg font-bold font-mono text-white">
                  {Math.round(
                    (currentResult.totalTimeSeconds - currentResult.timeUsedSeconds) / 60
                  )}m
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 uppercase block font-mono text-[10px]">
                  Total Examination Time
                </span>
                <span className="text-lg font-bold font-mono text-white">
                  {Math.round(currentResult.totalTimeSeconds / 60)}m
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-cyan-200 leading-relaxed">
              <strong>Time Observation:</strong> {currentResult.diagnosis.timeManagement}
            </div>
          </div>

          {/* 22 & 23. WEAKNESS DETECTION & STRONG AREAS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Needs Attention */}
            {currentResult.weakTopics.length > 0 ? (
              <div className="p-6 rounded-2xl bg-rose-950/30 border border-rose-500/40 space-y-4 shadow-glass">
                <div className="flex items-center space-x-2 text-rose-300 font-mono text-xs uppercase font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>NEEDS ATTENTION</span>
                </div>
                <div className="space-y-2">
                  {currentResult.weakTopics.map((top) => (
                    <div
                      key={top}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-rose-800/40 text-xs"
                    >
                      <span className="font-bold text-white">{top}</span>
                      <span className="text-rose-400 font-mono">
                        {currentResult.topicBreakdown[top]?.accuracy}% Acc
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-300">
                  You should review these topics before attempting another full mock test.
                </p>
                <Link
                  href={`/practice?topic=${encodeURIComponent(currentResult.weakTopics[0])}`}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs uppercase shadow-md"
                >
                  <Zap className="w-4 h-4" />
                  <span>PRACTICE THIS TOPIC</span>
                </Link>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs text-slate-400 shadow-glass">
                <span className="text-xs font-mono uppercase text-slate-300 font-bold">
                  NEEDS ATTENTION
                </span>
                <p>No critical weak concepts detected. Great consistency across all sections!</p>
              </div>
            )}

            {/* Strong Areas */}
            {currentResult.strongTopics.length > 0 ? (
              <div className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-4 shadow-glass">
                <div className="flex items-center space-x-2 text-emerald-300 font-mono text-xs uppercase font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>STRONG AREA</span>
                </div>
                <div className="space-y-2">
                  {currentResult.strongTopics.map((top) => (
                    <div
                      key={top}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-emerald-800/40 text-xs"
                    >
                      <span className="font-bold text-white">{top}</span>
                      <span className="text-emerald-400 font-mono">
                        {currentResult.topicBreakdown[top]?.accuracy}% Acc
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-300">
                  High mastery demonstrated in these topics under timed test pressure.
                </p>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs text-slate-400 shadow-glass">
                <span className="text-xs font-mono uppercase text-slate-300 font-bold">
                  STRONG AREA
                </span>
                <p>Keep practicing to build your first 80%+ mastery topics under exam conditions.</p>
              </div>
            )}
          </div>

          {/* 24. POST-EXAM SARATHI DIAGNOSIS */}
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-purple-950/30 via-slate-900 to-slate-900 border border-purple-500/40 space-y-6 shadow-glass">
            <div className="flex items-center space-x-2 text-purple-400 text-xs font-mono uppercase font-bold">
              <Brain className="w-4 h-4" />
              <span>YOUR EXAM DIAGNOSIS</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="font-bold text-slate-200">Knowledge:</span>
                <p className="text-slate-400 leading-relaxed">{currentResult.diagnosis.knowledge}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="font-bold text-slate-200">Accuracy & Negative Penalty:</span>
                <p className="text-slate-400 leading-relaxed">{currentResult.diagnosis.accuracy}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="font-bold text-slate-200">Time Management:</span>
                <p className="text-slate-400 leading-relaxed">
                  {currentResult.diagnosis.timeManagement}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="font-bold text-slate-200">Next Recommended Action:</span>
                <p className="text-cyan-300 leading-relaxed">{currentResult.diagnosis.nextAction}</p>
              </div>
            </div>
          </div>

          {/* Navigation Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
            <button
              onClick={() => {
                setSelectedReviewIndex(0);
                setViewState('review');
              }}
              className="px-6 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-neon-cyan flex items-center space-x-2"
            >
              <Eye className="w-4 h-4" />
              <span>REVIEW ALL ANSWERS</span>
            </button>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleRetakeExam}
                className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center space-x-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake Mock Test</span>
              </button>

              <Link
                href="/dashboard"
                className="px-5 py-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-semibold text-xs"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          7. QUESTION REVIEW SCREEN (DETAILED SOLUTIONS & DIAGNOSES)
         ───────────────────────────────────────────────────────────── */}
      {viewState === 'review' && currentResult && (
        <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-glass">
            <div>
              <button
                onClick={() => setViewState('results')}
                className="text-xs text-slate-400 hover:text-white flex items-center space-x-1 mb-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Exam Result Summary</span>
              </button>
              <h2 className="text-xl font-bold text-white">Review Answers & Detailed Solutions</h2>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono text-slate-400">Jump to Question:</span>
              <select
                value={selectedReviewIndex}
                onChange={(e) => setSelectedReviewIndex(parseInt(e.target.value, 10))}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono"
              >
                {currentResult.questions.map((_, idx) => (
                  <option key={idx} value={idx}>
                    Question {idx + 1}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Review Card */}
          {(() => {
            const q = currentResult.questions[selectedReviewIndex];
            if (!q) return null;
            const studentAns = currentResult.answers[q.id] || [];
            const isUnanswered = studentAns.length === 0;

            let isCorrect = false;
            if (!isUnanswered) {
              if (q.type === 'numerical') {
                isCorrect = q.correctAnswers.some(
                  (a) => a.trim().toLowerCase() === studentAns[0]?.trim().toLowerCase()
                );
              } else {
                const s1 = [...studentAns].sort();
                const s2 = [...q.correctAnswers].sort();
                isCorrect = s1.length === s2.length && s1.every((v, i) => v === s2[i]);
              }
            }

            return (
              <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6 shadow-glass">
                {/* Status Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white font-mono text-sm">
                      Question {selectedReviewIndex + 1} of {currentResult.questions.length}
                    </span>
                    <span className="text-slate-500">&bull;</span>
                    <span className="px-2.5 py-0.5 rounded bg-slate-950 text-slate-300 font-mono text-xs border border-slate-800">
                      {q.topic}
                    </span>
                  </div>

                  <div>
                    {isCorrect ? (
                      <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500 text-xs font-bold font-mono inline-flex items-center space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>CORRECT (+1.00)</span>
                      </span>
                    ) : isUnanswered ? (
                      <span className="px-3 py-1 rounded-full bg-slate-950 text-slate-400 border border-slate-700 text-xs font-bold font-mono inline-flex items-center space-x-1.5">
                        <span>UNANSWERED (0.00)</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-rose-950 text-rose-300 border border-rose-500 text-xs font-bold font-mono inline-flex items-center space-x-1.5">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>
                          INCORRECT (-{currentResult.config.negativeMarkRatio || 0.33})
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Problem Statement */}
                <div className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed whitespace-pre-wrap">
                  {q.question}
                </div>

                {/* Options display */}
                {q.options && q.options.length > 0 ? (
                  <div className="space-y-2.5 pt-2">
                    {q.options.map((opt) => {
                      const isStudentSelected = studentAns.includes(opt.id);
                      const isKey = q.correctAnswers.includes(opt.id);

                      let borderStyle = 'border-slate-800 bg-slate-950/80 text-slate-300';
                      if (isKey) {
                        borderStyle = 'border-emerald-500 bg-emerald-950/30 text-emerald-200';
                      } else if (isStudentSelected && !isKey) {
                        borderStyle = 'border-rose-500 bg-rose-950/30 text-rose-200';
                      }

                      return (
                        <div
                          key={opt.id}
                          className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-start space-x-3 ${borderStyle}`}
                        >
                          <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                            {opt.id}
                          </span>
                          <div className="flex-1 leading-relaxed">
                            {opt.text}
                            {isKey && (
                              <span className="ml-2 text-[10px] font-mono text-emerald-400 font-bold uppercase">
                                ✓ Correct Answer
                              </span>
                            )}
                            {isStudentSelected && !isKey && (
                              <span className="ml-2 text-[10px] font-mono text-rose-400 font-bold uppercase">
                                ✗ Your Response
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <div className="text-slate-400">
                      Your Entered Answer:{' '}
                      <strong className="text-white font-mono">{studentAns[0] || 'None'}</strong>
                    </div>
                    <div className="text-emerald-400">
                      Correct Numerical Key:{' '}
                      <strong className="font-mono">{q.correctAnswers.join(', ')}</strong>
                    </div>
                  </div>
                )}

                {/* 20. WHY WAS I WRONG? (For incorrect attempts) */}
                {!isCorrect && !isUnanswered && (
                  <div className="p-5 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-3 text-xs">
                    <div className="flex items-center space-x-2 text-rose-300 font-bold uppercase font-mono">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>WHY WAS I WRONG?</span>
                    </div>
                    <div className="space-y-1.5 text-slate-300 leading-relaxed">
                      <div>
                        <strong>Your Response:</strong> {studentAns.join(', ')} &bull;{' '}
                        <strong>Correct Key:</strong> {q.correctAnswers.join(', ')}
                      </div>
                      <p>
                        {q.mistakeTrap ||
                          `You may have miscalculated or confused the core operational rule of this topic.`}
                      </p>
                    </div>
                  </div>
                )}

                {/* 18. DETAILED STEP-BY-STEP SOLUTION */}
                <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4 text-xs">
                  <div className="flex items-center space-x-2 text-cyan-300 font-bold uppercase font-mono">
                    <Lightbulb className="w-4 h-4 text-cyan-400" />
                    <span>Comprehensive Solution & Reasoning</span>
                  </div>

                  <p className="text-slate-300 leading-relaxed">{q.explanation}</p>

                  {q.steps && q.steps.length > 0 && (
                    <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                      <div className="font-bold text-slate-200">Step-by-Step Derivation:</div>
                      {q.steps.map((st) => (
                        <div key={st.stepNumber} className="space-y-0.5">
                          <div className="font-mono font-bold text-cyan-300">
                            Step {st.stepNumber}: {st.title}
                          </div>
                          <p className="text-slate-400 leading-relaxed pl-3 border-l-2 border-slate-800">
                            {st.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 19. DIFFERENT SOLVING METHODS */}
                  {q.methods && q.methods.length > 0 && (
                    <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                      <div className="font-bold text-slate-200">Alternative Valid Approaches:</div>
                      {q.methods.map((m, mIdx) => (
                        <div key={mIdx} className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                          <span className="font-bold text-purple-300 font-mono text-[11px]">
                            {m.title} ({m.type.toUpperCase()})
                          </span>
                          <p className="text-slate-400 leading-relaxed">{m.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 21. LEARN THIS TOPIC (Connects directly to AI Tutor) */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                  <Link
                    href={`/tutor?teachPrompt=${encodeURIComponent(
                      `Teach me this concept based on my exam review:\n\nTopic: ${q.topic}\nQuestion: "${q.question}"\nMy Answer: ${studentAns.join(', ') || 'Unanswered'}\nCorrect Answer: ${q.correctAnswers.join(', ')}\nExplanation: ${q.explanation}\n\nPlease teach me this topic from fundamentals step-by-step and show me how to solve similar problems effortlessly.`
                    )}`}
                    className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-purple-950 hover:bg-purple-900 border border-purple-700 text-purple-200 text-xs font-bold"
                  >
                    <Brain className="w-4 h-4 text-purple-400" />
                    <span>LEARN THIS TOPIC IN AI TUTOR &rarr;</span>
                  </Link>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedReviewIndex((prev) => Math.max(0, prev - 1))}
                      disabled={selectedReviewIndex === 0}
                      className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 text-xs"
                    >
                      &larr; Prev Question
                    </button>
                    <button
                      onClick={() =>
                        setSelectedReviewIndex((prev) =>
                          Math.min(currentResult.questions.length - 1, prev + 1)
                        )
                      }
                      disabled={selectedReviewIndex === currentResult.questions.length - 1}
                      className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 text-xs"
                    >
                      Next Question &rarr;
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          8. MOCK TEST HISTORY SCREEN
         ───────────────────────────────────────────────────────────── */}
      {viewState === 'history' && (
        <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-glass">
            <div>
              <button
                onClick={() => setViewState('config')}
                className="text-xs text-slate-400 hover:text-white flex items-center space-x-1 mb-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Setup</span>
              </button>
              <h2 className="text-xl font-bold text-white">Mock Test History</h2>
              <p className="text-xs text-slate-400">All real exam simulation attempts recorded by SARATHI.</p>
            </div>

            <button
              onClick={() => setViewState('config')}
              className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase shadow-neon-cyan"
            >
              Take New Mock Test
            </button>
          </div>

          {examHistory.length === 0 ? (
            <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-3 shadow-glass">
              <FileCheck2 className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-lg font-bold text-slate-300">No mock tests completed yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Take your first mock test to start building your exam performance history.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setViewState('config')}
                  className="px-6 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase shadow-neon-cyan"
                >
                  START FIRST MOCK TEST
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {examHistory.map((hist, idx) => (
                <div
                  key={hist.id}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-glass"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-sm">
                        {hist.config.examLabel}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-cyan-300 border border-slate-800 uppercase">
                        {hist.config.scope}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(hist.date).toLocaleDateString()} at{' '}
                      {new Date(hist.date).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      &bull; {hist.questions.length} Questions &bull;{' '}
                      {Math.round(hist.timeUsedSeconds / 60)}m spent
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <span className="text-base font-bold font-mono text-cyan-300 block">
                        {hist.score} / {hist.maxScore}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400">
                        {hist.accuracy}% Acc
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setCurrentResult(hist);
                        setSelectedReviewIndex(0);
                        setViewState('results');
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs"
                    >
                      View Report
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
