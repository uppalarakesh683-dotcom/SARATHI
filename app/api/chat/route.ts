import { NextRequest, NextResponse } from 'next/server';
import { askSarathiTutor, AIProviderError } from '@/lib/ai/provider';
import {
  sanitizeUserPrompt,
  validateLearningMode,
  validateHistory,
} from '@/lib/ai/validation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawQuery = body.query || body.message;
    const rawMode = body.mode || body.learningMode;
    const rawHistory = body.history || [];
    const useMaterials = Boolean(body.useMaterials);
    const materialId = typeof body.materialId === 'string' ? body.materialId : undefined;

    const query = sanitizeUserPrompt(rawQuery);
    if (!query) {
      return NextResponse.json(
        { error: 'INVALID_QUERY', message: 'Question or prompt is required.' },
        { status: 400 }
      );
    }

    const mode = validateLearningMode(rawMode);
    const history = validateHistory(rawHistory);
    const studentTarget = body.studentTarget && typeof body.studentTarget === 'object'
      ? {
          role: body.studentTarget.role,
          skills: Array.isArray(body.studentTarget.skills) ? body.studentTarget.skills : undefined,
          examTarget: body.studentTarget.examTarget,
        }
      : undefined;

    const result = await askSarathiTutor(query, mode, history, useMaterials, materialId, studentTarget);

    return NextResponse.json({
      success: true,
      content: result.content,
      sources: result.sources || [],
      suggestedPrompts: result.suggestedPrompts || [],
      isMaterialGrounded: result.isMaterialGrounded || false,
      mode,
    });
  } catch (error: any) {
    if (error instanceof AIProviderError) {
      if (error.code === 'AI_NOT_CONFIGURED') {
        return NextResponse.json(
          { error: 'AI_NOT_CONFIGURED', message: error.message },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: 'AI_REQUEST_FAILED', message: error.message },
        { status: 500 }
      );
    }

    console.error('API /api/chat error:', error);
    return NextResponse.json(
      {
        error: 'AI_REQUEST_FAILED',
        message: "SARATHI couldn't complete that response.",
      },
      { status: 500 }
    );
  }
}
