'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Question } from '@/types/question';
import { ExamConfig, ExamSession, ExamEvaluation } from '@/types/exam';
import { evaluateExamSubmission } from '@/lib/evaluation/scoring';
import { getDatabase, saveDatabase, updateConceptMastery, addActivity } from '@/lib/db/client';

export function useExam(initialConfig: ExamConfig, initialQuestions: Question[]) {
  const [session, setSession] = useState<ExamSession>(() => ({
    id: 'exam-session-init',
    config: initialConfig,
    questions: initialQuestions,
    answers: {},
    markedForReview: [],
    currentQuestionIndex: 0,
    startTime: '2026-01-01T00:00:00.000Z',
    timeRemainingSeconds: initialConfig.durationMinutes * 60,
    isSubmitted: false,
  }));

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer countdown
  useEffect(() => {
    if (session.isSubmitted) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setSession((prev) => {
        if (prev.isSubmitted) return prev;
        if (prev.timeRemainingSeconds <= 1) {
          // Auto-submit when time expires
          if (timerRef.current) clearInterval(timerRef.current);
          return autoSubmitExam(prev);
        }
        return {
          ...prev,
          timeRemainingSeconds: prev.timeRemainingSeconds - 1,
        };
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session.isSubmitted]);

  const selectAnswer = useCallback((questionId: string, answerId: string, isMultiSelect = false) => {
    setSession((prev) => {
      const current = prev.answers[questionId] || [];
      let updated: string[];
      if (isMultiSelect) {
        updated = current.includes(answerId)
          ? current.filter((id) => id !== answerId)
          : [...current, answerId];
      } else {
        updated = [answerId];
      }
      return {
        ...prev,
        answers: {
          ...prev.answers,
          [questionId]: updated,
        },
      };
    });
  }, []);

  const clearAnswer = useCallback((questionId: string) => {
    setSession((prev) => {
      const newAnswers = { ...prev.answers };
      delete newAnswers[questionId];
      return {
        ...prev,
        answers: newAnswers,
      };
    });
  }, []);

  const toggleMarkForReview = useCallback((questionId: string) => {
    setSession((prev) => {
      const marked = prev.markedForReview.includes(questionId)
        ? prev.markedForReview.filter((id) => id !== questionId)
        : [...prev.markedForReview, questionId];
      return {
        ...prev,
        markedForReview: marked,
      };
    });
  }, []);

  const goToQuestion = useCallback((index: number) => {
    setSession((prev) => ({
      ...prev,
      currentQuestionIndex: Math.max(0, Math.min(prev.questions.length - 1, index)),
    }));
  }, []);

  const nextQuestion = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      currentQuestionIndex: Math.min(prev.questions.length - 1, prev.currentQuestionIndex + 1),
    }));
  }, []);

  const prevQuestion = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      currentQuestionIndex: Math.max(0, prev.currentQuestionIndex - 1),
    }));
  }, []);

  const submitExam = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSession((prev) => autoSubmitExam(prev));
  }, []);

  return {
    session,
    selectAnswer,
    clearAnswer,
    toggleMarkForReview,
    goToQuestion,
    nextQuestion,
    prevQuestion,
    submitExam,
  };
}

function autoSubmitExam(session: ExamSession): ExamSession {
  const timeSpentSeconds = session.config.durationMinutes * 60 - session.timeRemainingSeconds;
  const evaluation: ExamEvaluation = evaluateExamSubmission(
    session.questions,
    session.answers,
    session.config,
    timeSpentSeconds
  );

  const updatedSession: ExamSession = {
    ...session,
    isSubmitted: true,
    endTime: new Date().toISOString(),
    evaluation,
  };

  // Persist exam session & update concept masteries in database
  if (typeof window !== 'undefined') {
    const db = getDatabase();
    db.examSessions.unshift(updatedSession);

    // Update attempts & concept mastery
    session.questions.forEach((q) => {
      const userAns = session.answers[q.id];
      if (userAns && userAns.length > 0) {
        let isCorrect = false;
        if (q.type === 'numerical' || q.type === 'fill_blank') {
          isCorrect = q.correctAnswers.some(
            (ans) => ans.trim().toLowerCase() === userAns[0]?.trim().toLowerCase()
          );
        } else {
          const sortedUser = [...userAns].sort();
          const sortedCorrect = [...q.correctAnswers].sort();
          isCorrect =
            sortedUser.length === sortedCorrect.length &&
            sortedUser.every((val, index) => val === sortedCorrect[index]);
        }

        db.attempts.unshift({
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          questionId: q.id,
          selectedAnswers: userAns,
          isCorrect,
          timeSpentSec: Math.round(timeSpentSeconds / session.questions.length),
          timestamp: new Date().toISOString(),
        });

        updateConceptMastery(
          q.conceptId,
          isCorrect,
          Math.round(timeSpentSeconds / session.questions.length)
        );
      }
    });

    addActivity({
      type: session.config.title.toLowerCase().includes('diagnostic') ? 'diagnostic' : 'mock_exam',
      title: `${session.config.title} Completed`,
      details: `Score: ${evaluation.score}/${evaluation.maxScore} (${evaluation.percentage}%) • Accuracy: ${evaluation.accuracy}% • ${evaluation.mistakes.length} mistakes identified`,
      score: evaluation.percentage,
      durationSec: timeSpentSeconds,
    });

    saveDatabase(db);
  }

  return updatedSession;
}

