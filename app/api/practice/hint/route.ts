import { NextRequest, NextResponse } from 'next/server';
import { executeAICompletion, AIServiceError } from '@/lib/ai/ai-service';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, options, topic } = body;

    if (!question) {
      return NextResponse.json(
        { success: false, error: 'Question text is required to generate a hint.' },
        { status: 400 }
      );
    }

    const prompt = `You are SARATHI, an expert academic mentor.
A student is currently trying to solve the following question and requested a hint:

QUESTION:
"${question}"

OPTIONS:
${JSON.stringify(options || [])}

TOPIC: ${topic || 'Computer Science / Engineering'}

STRICT RULES:
1. Provide a concise, intuitive hint (1 to 2 sentences).
2. The hint must guide the student's reasoning toward the underlying concept, theorem, or method.
3. NEVER reveal the correct option letter (A, B, C, or D).
4. NEVER reveal the exact final answer.
5. Do NOT use introductory filler like "Here is a hint:". Provide the hint directly.`;

    const aiResult = await executeAICompletion({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      maxTokens: 300,
      timeoutMs: 15000,
    });

    const hint = aiResult.text.trim();

    return NextResponse.json({
      success: true,
      hint: hint || 'Consider the core definitions and examine constraints on each option.',
    });
  } catch (err: any) {
    console.error('[Practice Hint] Error:', err?.message || err);

    return NextResponse.json(
      {
        success: false,
        error: 'Unable to retrieve a hint right now. Consider reviewing the problem conditions carefully.',
      },
      { status: 500 }
    );
  }
}
