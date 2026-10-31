import { NextRequest, NextResponse } from 'next/server';
import {
  generatePracticeQuestionsWithFallback,
  AIServiceError,
  PracticeQuestion,
} from '@/lib/ai/ai-service';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      topic = 'Core Concept Drill',
      count = 5,
      difficulty = 'medium',
      timeLimitMinutes = 10,
      materialText,
      targetRole,
    } = body;

    const numQuestions = Math.min(30, Math.max(1, Number(count) || 5));

    // STEP 2: Safe server-side debug logging
    console.log('[Practice Debug] === New Practice Request Received ===');
    console.log(`[Practice Debug] Selected topic: "${topic}"`);
    console.log(`[Practice Debug] Selected difficulty: "${difficulty}"`);
    console.log(`[Practice Debug] Selected question count: ${numQuestions}`);
    console.log(`[Practice Debug] Selected time: ${timeLimitMinutes} minutes`);
    if (targetRole) {
      console.log(`[Practice Debug] Target role: "${targetRole}"`);
    }

    // Call the central multi-provider service with sequential failover
    const result = await generatePracticeQuestionsWithFallback({
      topic,
      count: numQuestions,
      difficulty,
      materialText,
      targetRole,
    });

    const questions: PracticeQuestion[] = result.questions;

    // STEP 7: Strict validation before returning to frontend
    const isValid =
      Array.isArray(questions) &&
      questions.length > 0 &&
      questions.every(
        (q) =>
          typeof q.id === 'string' &&
          typeof q.topic === 'string' &&
          typeof q.question === 'string' &&
          q.question.length > 0 &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          q.options.every((o) => typeof o.id === 'string' && typeof o.text === 'string') &&
          typeof q.correctOptionId === 'string' &&
          ['A', 'B', 'C', 'D'].includes(q.correctOptionId) &&
          typeof q.explanation === 'string' &&
          typeof q.solution === 'string'
      );

    if (!isValid) {
      console.error('[Practice Debug] Final validation check failed on generated questions.');
      return NextResponse.json(
        {
          success: false,
          error: 'Practice generation is temporarily unavailable. Please try again.',
        },
        { status: 500 }
      );
    }

    console.log(`[Practice Debug] Success: Delivering ${questions.length} questions generated via ${result.providerUsed} (${result.modelUsed})`);

    // STEP 10: Clean API response structure
    return NextResponse.json({
      success: true,
      topic,
      count: questions.length,
      questions,
    });
  } catch (err: any) {
    console.error('[Practice Debug] Practice generation endpoint failed:', err?.message || err);

    const isConfigurationError = err instanceof AIServiceError && err.code === 'AI_NOT_CONFIGURED';
    const statusCode = isConfigurationError ? 503 : 500;
    const userFriendlyMessage = 'Practice generation is temporarily unavailable. Please try again.';

    return NextResponse.json(
      {
        success: false,
        error: userFriendlyMessage,
      },
      { status: statusCode }
    );
  }
}
