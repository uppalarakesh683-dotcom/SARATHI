import { NextRequest, NextResponse } from 'next/server';
import {
  generateExamQuestionsWithFallback,
  AIServiceError,
  ExamQuestion,
} from '@/lib/ai/ai-service';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      examTarget = 'General Assessment',
      scope = 'full',
      scopeDetail = '',
      questionCount = 10,
      questionTypes = ['mcq'],
      difficulty = 'mixed',
      materialText = '',
    } = body;

    const count = Math.min(30, Math.max(1, Number(questionCount) || 10));

    console.log('[Exam Debug] === New Mock Exam Request Received ===');
    console.log(`[Exam Debug] Target: "${examTarget}", Scope: "${scope}", Detail: "${scopeDetail}"`);
    console.log(`[Exam Debug] Count: ${count}, Types: ${questionTypes.join(', ')}, Difficulty: "${difficulty}"`);

    const result = await generateExamQuestionsWithFallback({
      examTarget,
      scope,
      scopeDetail,
      questionCount: count,
      questionTypes,
      difficulty,
      materialText,
    });

    const questions: ExamQuestion[] = result.questions;

    // Strict validation before returning to frontend
    const isValid =
      Array.isArray(questions) &&
      questions.length > 0 &&
      questions.every(
        (q) =>
          typeof q.id === 'string' &&
          typeof q.topic === 'string' &&
          typeof q.question === 'string' &&
          q.question.length > 0 &&
          Array.isArray(q.correctAnswers) &&
          q.correctAnswers.length > 0 &&
          typeof q.explanation === 'string'
      );

    if (!isValid) {
      console.error('[Exam Debug] Final validation check failed on generated questions.');
      return NextResponse.json(
        {
          success: false,
          error: 'Exam generation is temporarily unavailable. Please try again.',
        },
        { status: 500 }
      );
    }

    console.log(`[Exam Debug] Success: Delivering ${questions.length} questions generated via ${result.providerUsed} (${result.modelUsed})`);

    return NextResponse.json({
      success: true,
      questions,
      count: questions.length,
      examTarget,
    });
  } catch (err: any) {
    console.error('[Exam Debug] Exam generation endpoint error:', err?.message || err);

    const isConfigurationError = err instanceof AIServiceError && err.code === 'AI_NOT_CONFIGURED';
    const statusCode = isConfigurationError ? 503 : 500;
    const userFriendlyMessage = 'Exam generation is temporarily unavailable. Please try again.';

    return NextResponse.json(
      { success: false, error: userFriendlyMessage },
      { status: statusCode }
    );
  }
}
