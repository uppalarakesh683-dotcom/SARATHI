'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Target,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Clock,
  Lightbulb,
  FileText,
  Layers,
  Award,
  Play,
  RotateCcw,
  Loader2,
  BookOpen,
  AlertCircle,
  ChevronRight,
  ListOrdered,
  Zap,
} from 'lucide-react';
import { useProgress } from '@/hooks/use-progress';
import { addActivity, updateConceptMastery } from '@/lib/db/client';

export interface PracticeQuestion {
  id: string;
  topic: string;
  question: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  explanation: string;
  solution: string;
  alternativeApproach?: string;
  quickMethod?: string | null;
  steps?: { stepNumber: number; title: string; content: string }[];
}

export interface PracticeSessionRecord {
  id: string;
  date: string;
  topic: string;
  totalQuestions: number;
  timeLimitMinutes: number;
  timeUsedSeconds: number;
  score: number;
  accuracy: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  questions: PracticeQuestion[];
  answers: Record<string, string>; // questionId -> selectedOptionId
}

const STORAGE_KEY_PRACTICE_HISTORY = 'sarathi_practice_history_v2';

export function PracticeEngine() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topicParam = searchParams.get('topic');

  const { db, profile, sync, isMounted } = useProgress();

  // Primary view states: 'history' | 'setup' | 'active' | 'results' | 'review'
  const [viewState, setViewState] = useState<'history' | 'setup' | 'active' | 'results' | 'review'>('history');

  // History state
  const [practiceHistory, setPracticeHistory] = useState<PracticeSessionRecord[]>([]);

  // -------------------------------------------------------------
  // 1. PRACTICE SETUP STATE
  // -------------------------------------------------------------
  const [selectedTopic, setSelectedTopic] = useState<string>(
    topicParam || profile?.primarySubject || profile?.targetRole || 'Core Concept Drill'
  );
  const [questionCountChoice, setQuestionCountChoice] = useState<'5' | '10' | '15' | '20' | '30' | 'custom'>('5');
  const [customQuestionCount, setCustomQuestionCount] = useState<number>(5);

  const [timeLimitChoice, setTimeLimitChoice] = useState<'5' | '10' | '15' | '30' | '45' | '60' | 'custom'>('10');
  const [customTimeLimit, setCustomTimeLimit] = useState<number>(10);

  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('medium');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('none');

  // Load preferences from Settings on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefCount = localStorage.getItem('sarathi_pref_practice_count');
    if (prefCount && ['5', '10', '15', '20', '30'].includes(prefCount)) {
      setQuestionCountChoice(prefCount as any);
    }
    const prefTime = localStorage.getItem('sarathi_pref_practice_time');
    if (prefTime && ['5', '10', '15', '30', '45', '60'].includes(prefTime)) {
      setTimeLimitChoice(prefTime as any);
    }
  }, []);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // -------------------------------------------------------------
  // 2. ACTIVE PRACTICE SESSION STATE
  // -------------------------------------------------------------
  const [activeQuestions, setActiveQuestions] = useState<PracticeQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({}); // questionId -> optionId
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, boolean>>({}); // questionId -> boolean

  // Timer
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<number>(10 * 60);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(10 * 60);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Hints
  const [hintsCache, setHintsCache] = useState<Record<string, string>>({});
  const [isLoadingHint, setIsLoadingHint] = useState(false);
  const [activeHint, setActiveHint] = useState<string | null>(null);

  // Mistake Explanations
  const [mistakeExplanations, setMistakeExplanations] = useState<Record<string, string>>({});
  const [isLoadingMistakeExplanation, setIsLoadingMistakeExplanation] = useState(false);

  // -------------------------------------------------------------
  // 3. RESULTS & REVIEW STATE
  // -------------------------------------------------------------
  const [currentCompletedSession, setCurrentCompletedSession] = useState<PracticeSessionRecord | null>(null);
  const [reviewIndex, setReviewIndex] = useState(0);

  // -------------------------------------------------------------
  // LOAD PERSISTED PRACTICE HISTORY ON MOUNT
  // -------------------------------------------------------------
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PRACTICE_HISTORY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setPracticeHistory(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to load practice history:', e);
    }
  }, []);

  // Save history helper
  const saveHistory = (record: PracticeSessionRecord) => {
    const updated = [record, ...practiceHistory];
    setPracticeHistory(updated);
    try {
      localStorage.setItem(STORAGE_KEY_PRACTICE_HISTORY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save practice history:', e);
    }
  };

  // -------------------------------------------------------------
  // ACTIVE SESSION TIMER
  // -------------------------------------------------------------
  useEffect(() => {
    if (viewState === 'active') {
      timerRef.current = setInterval(() => {
        setTimeRemainingSeconds((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            handleFinishSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [viewState]);

  // Current question helper
  const currentQ = activeQuestions[currentQuestionIndex];
  const isCurrentSubmitted = currentQ ? Boolean(submittedAnswers[currentQ.id]) : false;
  const currentSelectedOption = currentQ ? userAnswers[currentQ.id] : null;
  const isCurrentCorrect = currentQ && currentSelectedOption ? currentSelectedOption === currentQ.correctOptionId : false;

  // -------------------------------------------------------------
  // START PRACTICE HANDLER (CALLS REAL GROQ AI)
  // -------------------------------------------------------------
  const handleStartPractice = async () => {
    setGenerateError(null);
    setIsGenerating(true);

    const count = questionCountChoice === 'custom' ? customQuestionCount : parseInt(questionCountChoice, 10);
    const timeMins = timeLimitChoice === 'custom' ? customTimeLimit : parseInt(timeLimitChoice, 10);

    // If material selected, extract text
    let materialText = '';
    if (selectedMaterialId !== 'none' && db?.materials) {
      const mat = db.materials.find((m) => m.id === selectedMaterialId);
      if (mat) {
        materialText = mat.chunks?.map((c) => c.content).join('\n\n') || mat.summary || '';
      }
    }

    try {
      const res = await fetch('/api/practice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: selectedTopic.trim(),
          count,
          difficulty,
          timeLimitMinutes: timeMins,
          materialText,
          targetRole: profile?.targetRole || profile?.primarySubject,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.questions || data.questions.length === 0) {
        throw new Error(data.error || 'Failed to generate practice questions.');
      }

      const generatedQuestions: PracticeQuestion[] = data.questions;

      setActiveQuestions(generatedQuestions);
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setSubmittedAnswers({});
      setHintsCache({});
      setActiveHint(null);
      setMistakeExplanations({});

      const totalSeconds = timeMins * 60;
      setTimeLimitSeconds(totalSeconds);
      setTimeRemainingSeconds(totalSeconds);
      setSessionStartTime(Date.now());

      setViewState('active');
    } catch (err: any) {
      console.error('Start practice error:', err);
      setGenerateError(err.message || 'Could not connect to the AI service. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // -------------------------------------------------------------
  // 3. GET HINT (CALLS REAL GROQ AI FOR CURRENT QUESTION)
  // -------------------------------------------------------------
  const handleGetHint = async () => {
    if (!currentQ) return;

    // Check cache first
    if (hintsCache[currentQ.id]) {
      setActiveHint(hintsCache[currentQ.id]);
      return;
    }

    setIsLoadingHint(true);
    setActiveHint(null);

    try {
      const res = await fetch('/api/practice/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQ.question,
          options: currentQ.options,
          topic: currentQ.topic,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate hint.');
      }

      setHintsCache((prev) => ({ ...prev, [currentQ.id]: data.hint }));
      setActiveHint(data.hint);
    } catch (err: any) {
      setActiveHint('Focus on the fundamental definitions and key constraints mentioned in the problem statement.');
    } finally {
      setIsLoadingHint(false);
    }
  };

  // -------------------------------------------------------------
  // 4. SUBMIT ANSWER (NORMAL PRACTICE RIGHT/WRONG)
  // -------------------------------------------------------------
  const handleSubmitAnswer = () => {
    if (!currentQ || !currentSelectedOption) return;

    const isCorrect = currentSelectedOption === currentQ.correctOptionId;

    setSubmittedAnswers((prev) => ({
      ...prev,
      [currentQ.id]: true,
    }));

    // Update real concept mastery in local database
    updateConceptMastery(currentQ.topic, isCorrect, 30);
    sync();

    // If incorrect, automatically request deep "Why was my answer wrong?" comparison
    if (!isCorrect) {
      handleExplainMistake(currentQ, currentSelectedOption);
    }
  };

  // -------------------------------------------------------------
  // 6. MISTAKE EXPLANATION ("Why was my answer wrong?")
  // -------------------------------------------------------------
  const handleExplainMistake = async (q: PracticeQuestion, studentOptId: string) => {
    if (mistakeExplanations[q.id]) return;

    const studentOpt = q.options.find((o) => o.id === studentOptId);
    const correctOpt = q.options.find((o) => o.id === q.correctOptionId);

    setIsLoadingMistakeExplanation(true);

    try {
      const res = await fetch('/api/practice/explain-mistake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q.question,
          studentAnswer: `Option ${studentOptId}: ${studentOpt?.text || ''}`,
          correctAnswer: `Option ${q.correctOptionId}: ${correctOpt?.text || ''}`,
          explanation: q.explanation,
          topic: q.topic,
        }),
      });

      const data = await res.json();
      if (data.success && data.analysis?.whyWrongComparison) {
        setMistakeExplanations((prev) => ({
          ...prev,
          [q.id]: data.analysis.whyWrongComparison,
        }));
      }
    } catch (e) {
      console.warn('Mistake explanation fetch failed:', e);
    } finally {
      setIsLoadingMistakeExplanation(false);
    }
  };

  // -------------------------------------------------------------
  // NAVIGATION (PREVIOUS / NEXT / FINISH)
  // -------------------------------------------------------------
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      setActiveHint(null);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < activeQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setActiveHint(null);
    } else {
      // Reached the end
      handleFinishSession();
    }
  };

  // -------------------------------------------------------------
  // 7. FINISH PRACTICE & CALCULATE REAL RESULTS
  // -------------------------------------------------------------
  const handleFinishSession = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    const timeUsed = Math.max(
      1,
      Math.round((Date.now() - sessionStartTime) / 1000)
    );

    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    activeQuestions.forEach((q) => {
      const userAns = userAnswers[q.id];
      if (!userAns) {
        unansweredCount += 1;
      } else if (userAns === q.correctOptionId) {
        correctCount += 1;
      } else {
        incorrectCount += 1;
      }
    });

    const totalQuestions = activeQuestions.length;
    const attemptedCount = correctCount + incorrectCount;
    const accuracy = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;
    const score = correctCount;

    const record: PracticeSessionRecord = {
      id: `prac-${Date.now()}`,
      date: new Date().toISOString(),
      topic: selectedTopic,
      totalQuestions,
      timeLimitMinutes: Math.round(timeLimitSeconds / 60),
      timeUsedSeconds: timeUsed,
      score,
      accuracy,
      correctCount,
      incorrectCount,
      unansweredCount,
      questions: activeQuestions,
      answers: userAnswers,
    };

    saveHistory(record);
    setCurrentCompletedSession(record);

    addActivity({
      type: 'practice',
      title: `Practice Completed: ${selectedTopic}`,
      details: `Scored ${score}/${totalQuestions} (${accuracy}% accuracy) in ${Math.round(timeUsed / 60)}m ${timeUsed % 60}s.`,
      score: accuracy,
      durationSec: timeUsed,
    });
    sync();

    setViewState('results');
  };

  // Format timer MM:SS
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(Math.max(0, totalSeconds) / 60);
    const secs = Math.max(0, totalSeconds) % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* ======================================================== */}
      {/* 9. NO DUMMY DATA — VIEW 1: HISTORY & EMPTY STATE         */}
      {/* ======================================================== */}
      {viewState === 'history' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-glass">
            <div>
              <span className="px-2.5 py-0.5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-mono tracking-wider uppercase font-semibold">
                AI PRACTICE ENGINE
              </span>
              <h1 className="text-2xl font-extrabold text-white mt-1 flex items-center space-x-2">
                <Target className="w-6 h-6 text-cyan-400" />
                <span>Practice & Assessment Workspace</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Targeted AI-generated practice drills tailored to your subject and pace
              </p>
            </div>

            <button
              onClick={() => setViewState('setup')}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-neon-cyan flex items-center space-x-2 transition-all transform active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>START PRACTICE</span>
            </button>
          </div>

          {/* Genuine Empty State for New Users */}
          {practiceHistory.length === 0 ? (
            <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-4 shadow-glass max-w-xl mx-auto my-8">
              <div className="w-16 h-16 rounded-full bg-slate-800/80 mx-auto flex items-center justify-center text-slate-500">
                <FileText className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">No practice history yet</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Your practice history is empty.
                  <br />
                  Start your first practice session to begin building your performance profile.
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => setViewState('setup')}
                  className="px-8 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-sm shadow-neon-cyan transition-all"
                >
                  START PRACTICE
                </button>
              </div>
            </div>
          ) : (
            /* Real History List */
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>Completed Practice Sessions</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {practiceHistory.length}
                </span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {practiceHistory.map((session) => (
                  <div
                    key={session.id}
                    className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 shadow-glass hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-white line-clamp-1">
                          {session.topic}
                        </h3>
                        <span className="text-xs text-slate-400 font-mono">
                          {new Date(session.date).toLocaleDateString()} &bull; {session.totalQuestions} Questions
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-bold font-mono text-cyan-300">
                          {session.score} / {session.totalQuestions}
                        </span>
                        <span className="text-[11px] block font-mono text-emerald-400">
                          {session.accuracy}% accuracy
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                      <span>Time: {Math.round(session.timeUsedSeconds / 60)}m {session.timeUsedSeconds % 60}s</span>
                      <button
                        onClick={() => {
                          setCurrentCompletedSession(session);
                          setReviewIndex(0);
                          setViewState('review');
                        }}
                        className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center space-x-1"
                      >
                        <span>Review Solutions &rarr;</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. PRACTICE SETUP VIEW                                   */}
      {/* ======================================================== */}
      {viewState === 'setup' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-white">Configure Practice Session</h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Choose question count, time limit, and topic. Generated dynamically using Groq AI.
              </p>
            </div>
            <button
              onClick={() => setViewState('history')}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          {generateError && (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-start space-x-3">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{generateError}</span>
            </div>
          )}

          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-6 shadow-glass">
            {/* Topic Input */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-300 uppercase tracking-wider block">
                Practice Topic or Subject
              </label>
              <input
                type="text"
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                placeholder={
                  profile?.primarySubject
                    ? `e.g. ${profile.primarySubject} core concepts`
                    : profile?.targetRole
                    ? `e.g. ${profile.targetRole} core skills`
                    : 'e.g. Data Structures, Algorithms, System Design'
                }
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-hidden focus:border-cyan-400"
              />

              {/* Uploaded Materials option */}
              {db?.materials && db.materials.length > 0 && (
                <div className="pt-1">
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    Or base questions on your study materials:
                  </label>
                  <select
                    value={selectedMaterialId}
                    onChange={(e) => setSelectedMaterialId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200"
                  >
                    <option value="none">Generate from academic knowledge</option>
                    {db.materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        From Material: {m.name} ({m.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* 1. NUMBER OF QUESTIONS */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                  Number of Questions
                </label>
                {questionCountChoice === 'custom' && (
                  <span className="text-xs font-mono text-cyan-400 font-bold">
                    {customQuestionCount} Questions
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {(['5', '10', '15', '20', '30', 'custom'] as const).map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setQuestionCountChoice(cnt)}
                    className={`py-2.5 rounded-xl border text-xs font-mono font-bold capitalize transition-all ${
                      questionCountChoice === cnt
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-neon-cyan'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {cnt === 'custom' ? 'Custom' : cnt}
                  </button>
                ))}
              </div>

              {questionCountChoice === 'custom' && (
                <div className="pt-2">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={customQuestionCount}
                    onChange={(e) => setCustomQuestionCount(Math.max(1, Math.min(30, parseInt(e.target.value, 10) || 1)))}
                    className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono"
                    placeholder="Enter number (1 to 30)"
                  />
                </div>
              )}
            </div>

            {/* 1. TIME LIMIT */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                  Time Limit
                </label>
                {timeLimitChoice === 'custom' && (
                  <span className="text-xs font-mono text-cyan-400 font-bold">
                    {customTimeLimit} Minutes
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {(['5', '10', '15', '30', '45', '60', 'custom'] as const).map((tl) => (
                  <button
                    key={tl}
                    type="button"
                    onClick={() => setTimeLimitChoice(tl)}
                    className={`py-2.5 rounded-xl border text-xs font-mono font-bold transition-all ${
                      timeLimitChoice === tl
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-neon-cyan'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {tl === 'custom' ? 'Custom' : `${tl}m`}
                  </button>
                ))}
              </div>

              {timeLimitChoice === 'custom' && (
                <div className="pt-2">
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={customTimeLimit}
                    onChange={(e) => setCustomTimeLimit(Math.max(1, Math.min(120, parseInt(e.target.value, 10) || 1)))}
                    className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono"
                    placeholder="Enter minutes (1 to 120)"
                  />
                </div>
              )}
            </div>

            {/* Difficulty */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-300 uppercase tracking-wider block">
                Difficulty
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['easy', 'medium', 'hard', 'mixed'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`py-2 rounded-xl border text-xs font-mono uppercase transition-all ${
                      difficulty === d
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Launch Button */}
            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                disabled={isGenerating || !selectedTopic.trim()}
                onClick={handleStartPractice}
                className="px-8 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-slate-950 font-bold text-sm shadow-neon-cyan flex items-center space-x-2 transition-all transform active:scale-95"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating Questions with Groq AI...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start Practice Session</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. DURING PRACTICE VIEW                                  */}
      {/* ======================================================== */}
      {viewState === 'active' && currentQ && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Top Info Bar: Question X / Total + Time Remaining */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between shadow-glass">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-bold font-mono text-white">
                Question {currentQuestionIndex + 1} / {activeQuestions.length}
              </span>
              <span className="text-slate-500 font-mono">&bull;</span>
              <span className="text-xs font-mono text-cyan-400 hidden sm:inline truncate max-w-xs">
                {currentQ.topic}
              </span>
            </div>

            {/* 2. Real Counting Down Timer */}
            <div className="flex items-center space-x-4">
              <div
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold ${
                  timeRemainingSeconds < 120
                    ? 'bg-rose-950/60 border-rose-800 text-rose-300 animate-pulse'
                    : 'bg-slate-950 border-slate-800 text-cyan-300'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTimer(timeRemainingSeconds)}</span>
              </div>

              <button
                onClick={handleFinishSession}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Finish Session
              </button>
            </div>
          </div>

          {/* Active Question Card */}
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-6 shadow-glass">
            {/* Question Statement */}
            <div className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed">
              {currentQ.question}
            </div>

            {/* Answer Options */}
            <div className="space-y-3">
              {currentQ.options?.map((opt) => {
                const isSelected = currentSelectedOption === opt.id;
                const isCorrectOpt = opt.id === currentQ.correctOptionId;

                let optStyle =
                  'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900';

                if (isCurrentSubmitted) {
                  if (isCorrectOpt) {
                    optStyle = 'bg-emerald-950/70 border-emerald-500 text-emerald-200';
                  } else if (isSelected && !isCorrectOpt) {
                    optStyle = 'bg-rose-950/70 border-rose-500 text-rose-200';
                  } else {
                    optStyle = 'bg-slate-950/40 border-slate-800/40 text-slate-500';
                  }
                } else if (isSelected) {
                  optStyle = 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-neon-cyan';
                }

                return (
                  <button
                    key={opt.id}
                    disabled={isCurrentSubmitted}
                    onClick={() =>
                      setUserAnswers((prev) => ({
                        ...prev,
                        [currentQ.id]: opt.id,
                      }))
                    }
                    className={`w-full text-left p-4 rounded-xl border text-sm transition-all flex items-start space-x-3 cursor-pointer ${optStyle}`}
                  >
                    <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs shrink-0 mt-0.5 font-mono font-bold">
                      {opt.id}
                    </span>
                    <span className="leading-relaxed">{opt.text}</span>
                  </button>
                );
              })}
            </div>

            {/* 3. GET HINT DRAWER */}
            {!isCurrentSubmitted && (
              <div className="pt-2">
                {!activeHint ? (
                  <button
                    type="button"
                    onClick={handleGetHint}
                    disabled={isLoadingHint}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-950/40 hover:bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                  >
                    {isLoadingHint ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating Hint for this question...</span>
                      </>
                    ) : (
                      <>
                        <Lightbulb className="w-4 h-4 text-amber-400" />
                        <span>💡 Get Hint</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-amber-400">
                      <span className="flex items-center space-x-1">
                        <Lightbulb className="w-4 h-4 text-amber-400" />
                        <span>SARATHI Coaching Hint</span>
                      </span>
                      <button
                        onClick={() => setActiveHint(null)}
                        className="text-slate-400 hover:text-white"
                      >
                        Hide
                      </button>
                    </div>
                    <p className="text-xs text-amber-200 leading-relaxed">{activeHint}</p>
                  </div>
                )}
              </div>
            )}

            {/* 4. RIGHT / WRONG FEEDBACK (NORMAL PRACTICE MODE) */}
            {isCurrentSubmitted && (
              <div
                className={`p-5 rounded-2xl border space-y-3 animate-fadeIn ${
                  isCurrentCorrect
                    ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                    : 'bg-rose-950/30 border-rose-500/50 text-rose-200'
                }`}
              >
                <div className="flex items-center space-x-2 font-bold text-base">
                  {isCurrentCorrect ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span className="text-emerald-300">✓ Correct</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-rose-400" />
                      <span className="text-rose-300">✕ Incorrect</span>
                    </>
                  )}
                </div>

                <div className="text-xs text-slate-300 space-y-1">
                  <div>
                    <strong className="text-white">Correct Answer:</strong> Option{' '}
                    {currentQ.correctOptionId} &mdash;{' '}
                    {currentQ.options?.find((o) => o.id === currentQ.correctOptionId)?.text}
                  </div>
                  <div>
                    <strong className="text-white">Explanation:</strong> {currentQ.explanation}
                  </div>
                </div>

                {/* 6. MISTAKE EXPLANATION */}
                {!isCurrentCorrect && (
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-xs">
                    <span className="font-bold font-mono text-rose-400 block">
                      Why was my answer wrong?
                    </span>
                    {isLoadingMistakeExplanation ? (
                      <div className="flex items-center space-x-2 text-slate-400 py-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Analyzing misconception...</span>
                      </div>
                    ) : (
                      <p className="text-slate-300 leading-relaxed">
                        {mistakeExplanations[currentQ.id] ||
                          `You selected Option ${currentSelectedOption}, but Option ${currentQ.correctOptionId} is the formally correct solution.`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Navigation & Submission Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <div className="flex space-x-2">
                <button
                  type="button"
                  disabled={currentQuestionIndex === 0}
                  onClick={handlePreviousQuestion}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                {!isCurrentSubmitted ? (
                  <button
                    type="button"
                    disabled={!currentSelectedOption}
                    onClick={handleSubmitAnswer}
                    className="px-6 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 font-bold text-xs shadow-neon-cyan transition-all"
                  >
                    Submit Answer
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-slate-950 font-bold text-xs shadow-neon-cyan flex items-center space-x-1.5"
                  >
                    <span>
                      {currentQuestionIndex < activeQuestions.length - 1 ? 'Next' : 'Finish Practice'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. FINAL RESULTS VIEW                                    */}
      {/* ======================================================== */}
      {viewState === 'results' && currentCompletedSession && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6 shadow-glass text-center">
            <div className="w-16 h-16 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/80 mx-auto flex items-center justify-center">
              <Award className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-white">Practice Session Completed!</h2>
              <p className="text-xs sm:text-sm text-slate-400">{currentCompletedSession.topic}</p>
            </div>

            {/* Real Calculated Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Score</span>
                <span className="text-2xl font-bold font-mono text-cyan-300">
                  {currentCompletedSession.score} / {currentCompletedSession.totalQuestions}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Accuracy</span>
                <span className="text-2xl font-bold font-mono text-emerald-400">
                  {currentCompletedSession.accuracy}%
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Time Used</span>
                <span className="text-2xl font-bold font-mono text-slate-200">
                  {Math.round(currentCompletedSession.timeUsedSeconds / 60)}m {currentCompletedSession.timeUsedSeconds % 60}s
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Correct</span>
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {currentCompletedSession.correctCount}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Incorrect</span>
                <span className="text-xl font-bold font-mono text-rose-400">
                  {currentCompletedSession.incorrectCount}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Unanswered</span>
                <span className="text-xl font-bold font-mono text-slate-400">
                  {currentCompletedSession.unansweredCount}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => {
                  setReviewIndex(0);
                  setViewState('review');
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-slate-950 font-bold text-xs shadow-neon-cyan flex items-center space-x-1.5"
              >
                <BookOpen className="w-4 h-4" />
                <span>Review Answers</span>
              </button>

              <button
                onClick={() => setViewState('setup')}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center space-x-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Start Another Session</span>
              </button>

              <button
                onClick={() => setViewState('history')}
                className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs"
              >
                Back to Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5 & 8. REVIEW ANSWERS & MULTIPLE SOLUTIONS               */}
      {/* ======================================================== */}
      {viewState === 'review' && currentCompletedSession && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                <span>Review Answers & Solutions</span>
              </h2>
              <p className="text-xs text-slate-400">
                Comprehensive step-by-step solutions, alternative methods, and misconception analysis
              </p>
            </div>

            <button
              onClick={() => setViewState('results')}
              className="text-xs text-cyan-400 hover:underline"
            >
              &larr; Back to Results
            </button>
          </div>

          {/* Jump-to Palette */}
          <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            {currentCompletedSession.questions.map((q, idx) => {
              const studentAns = currentCompletedSession.answers[q.id];
              let btnStyle = 'bg-slate-950 border-slate-800 text-slate-400';
              if (studentAns === q.correctOptionId) {
                btnStyle = 'bg-emerald-950 text-emerald-300 border-emerald-700';
              } else if (studentAns) {
                btnStyle = 'bg-rose-950 text-rose-300 border-rose-700';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setReviewIndex(idx)}
                  className={`w-8 h-8 rounded-lg border text-xs font-mono font-bold flex items-center justify-center transition-all ${btnStyle} ${
                    idx === reviewIndex ? 'ring-2 ring-cyan-400 scale-110 shadow-neon-cyan' : ''
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Active Review Question Card */}
          {currentCompletedSession.questions[reviewIndex] && (() => {
            const revQ = currentCompletedSession.questions[reviewIndex];
            const studentAns = currentCompletedSession.answers[revQ.id];
            const isCorrect = studentAns === revQ.correctOptionId;

            return (
              <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-6 shadow-glass">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs font-mono text-slate-400">
                  <span>Question {reviewIndex + 1} of {currentCompletedSession.questions.length}</span>
                  <span className="text-cyan-400">{revQ.topic}</span>
                </div>

                <div className="text-base font-semibold text-white leading-relaxed">
                  {revQ.question}
                </div>

                {/* Comparison Box */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">
                      Student Answer:
                    </span>
                    <div className="font-semibold">
                      {studentAns ? (
                        isCorrect ? (
                          <span className="text-emerald-400">✓ Option {studentAns}: {revQ.options.find(o => o.id === studentAns)?.text}</span>
                        ) : (
                          <span className="text-rose-400">✕ Option {studentAns}: {revQ.options.find(o => o.id === studentAns)?.text}</span>
                        )
                      ) : (
                        <span className="text-slate-500 italic">Unanswered</span>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">
                      Correct Answer:
                    </span>
                    <div className="font-semibold text-emerald-400">
                      ✓ Option {revQ.correctOptionId}: {revQ.options.find(o => o.id === revQ.correctOptionId)?.text}
                    </div>
                  </div>
                </div>

                {/* Explanation */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                  <span className="font-mono uppercase font-bold text-cyan-400 block">Explanation</span>
                  <p className="text-slate-200 leading-relaxed">{revQ.explanation}</p>
                </div>

                {/* 5. MULTIPLE SOLUTIONS */}
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider block">
                    Multiple Solving Approaches:
                  </span>

                  {/* Standard Solution */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                    <span className="font-mono font-bold text-blue-400 block">Method 1 — Standard Solution</span>
                    <p className="text-slate-300 leading-relaxed">{revQ.solution || revQ.explanation}</p>
                  </div>

                  {/* Alternative Approach */}
                  {revQ.alternativeApproach && (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                      <span className="font-mono font-bold text-purple-400 block">Method 2 — Alternative Approach</span>
                      <p className="text-slate-300 leading-relaxed">{revQ.alternativeApproach}</p>
                    </div>
                  )}

                  {/* Quick Shortcut Method (only when applicable) */}
                  {revQ.quickMethod && (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                      <span className="font-mono font-bold text-amber-400 block">Method 3 — Quick Shortcut Method</span>
                      <p className="text-slate-300 leading-relaxed">{revQ.quickMethod}</p>
                    </div>
                  )}

                  {/* Step-by-Step Derivation */}
                  {revQ.steps && revQ.steps.length > 0 && (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                      <span className="font-mono font-bold text-emerald-400 block">Step-by-Step Solution</span>
                      <div className="space-y-1.5 pl-2 border-l-2 border-slate-800">
                        {revQ.steps.map((st) => (
                          <div key={st.stepNumber} className="space-y-0.5">
                            <span className="font-mono text-cyan-300 font-bold">
                              Step {st.stepNumber}: {st.title}
                            </span>
                            <p className="text-slate-300">{st.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Review Navigation */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <button
                    disabled={reviewIndex === 0}
                    onClick={() => setReviewIndex((prev) => Math.max(0, prev - 1))}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold flex items-center space-x-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>

                  <button
                    disabled={reviewIndex >= currentCompletedSession.questions.length - 1}
                    onClick={() => setReviewIndex((prev) => Math.min(currentCompletedSession.questions.length - 1, prev + 1))}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold flex items-center space-x-1"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
