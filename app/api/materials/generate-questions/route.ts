import { NextRequest, NextResponse } from 'next/server';
import {
  executeAICompletion,
  extractAndParseJson,
  normalizePracticeQuestions,
  AIServiceError,
} from '@/lib/ai/ai-service';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentName, textContent, count = 3, difficulty = 'medium' } = body;

    if (!textContent || typeof textContent !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Document content is required to generate practice questions.' },
        { status: 400 }
      );
    }

    const numQuestions = Math.min(20, Math.max(1, Number(count) || 3));
    const sampleText = textContent.slice(0, 12000);

    const prompt = `You are SARATHI's Assessment & Practice Engine.
Generate exactly ${numQuestions} high-quality, exam-style practice questions based EXCLUSIVELY on the provided study material (${documentName || 'Document'}).
Difficulty Level: ${difficulty}.

Return ONLY a valid JSON array matching this exact schema (no markdown fences, no explanatory prefix):
[
  {
    "id": "q1",
    "question": "Clear problem statement testing a concept from the text",
    "options": [
      { "id": "A", "text": "Option A" },
      { "id": "B", "text": "Option B" },
      { "id": "C", "text": "Option C" },
      { "id": "D", "text": "Option D" }
    ],
    "correctOptionId": "A",
    "explanation": "Detailed explanation citing why A is correct and why other options are false based on the text.",
    "difficulty": "${difficulty}"
  }
]

STUDY MATERIAL:
"""
${sampleText}
"""`;

    const aiResult = await executeAICompletion({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      maxTokens: 2000,
      timeoutMs: 22000,
    });

    const parsed = extractAndParseJson<any>(aiResult.text);
    const questions = normalizePracticeQuestions(parsed, documentName || 'Study Material', numQuestions);

    return NextResponse.json({
      success: true,
      questions,
    });
  } catch (error: any) {
    console.error('[Materials Generate Questions] Error:', error?.message || error);

    const isConfigError = error instanceof AIServiceError && error.code === 'AI_NOT_CONFIGURED';
    const statusCode = isConfigError ? 503 : 500;
    const userMessage = isConfigError
      ? "AI service isn't configured yet. Please configure your API key in .env.local."
      : "Couldn't generate practice questions from this material at this moment. Please try again.";

    return NextResponse.json(
      { success: false, error: userMessage },
      { status: statusCode }
    );
  }
}
