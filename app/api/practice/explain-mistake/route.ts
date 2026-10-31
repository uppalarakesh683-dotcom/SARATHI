import { NextRequest, NextResponse } from 'next/server';
import { executeAICompletion, extractAndParseJson } from '@/lib/ai/ai-service';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, studentAnswer, correctAnswer, topic, difficulty } = body;

    if (!question || !studentAnswer) {
      return NextResponse.json(
        { success: false, error: 'Question and student answer are required.' },
        { status: 400 }
      );
    }

    const prompt = `You are SARATHI, an expert diagnostic academic tutor.
A student just attempted a practice question and gave an incorrect answer.

QUESTION:
"${question}"

STUDENT ANSWER:
"${studentAnswer}"

CORRECT ANSWER:
"${correctAnswer || 'See problem statement'}"

TOPIC: ${topic || 'Computer Science / Engineering'}
DIFFICULTY: ${difficulty || 'Medium'}

Provide a rigorous pedagogical diagnostic response in JSON format.
Your output MUST be valid JSON matching this schema:
{
  "whyWrongComparison": "Direct comparison between the student's selected approach and the correct theorem/approach, explaining the exact conceptual gap or trap they fell into.",
  "keyMisconception": "One-sentence diagnosis of the underlying misconception.",
  "remedyAdvice": "Actionable advice on what rule, condition, or step to remember in the exam."
}
Do NOT include markdown code blocks or additional text. Return ONLY the raw JSON object.`;

    const aiResult = await executeAICompletion({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      maxTokens: 800,
      timeoutMs: 16000,
    });

    let analysis: any = {};
    try {
      analysis = extractAndParseJson(aiResult.text);
    } catch {
      analysis = {
        whyWrongComparison: `You selected "${studentAnswer}", but the correct answer is "${correctAnswer}". Review the definition and edge cases for this concept.`,
        keyMisconception: 'Conceptual mismatch with formal definitions.',
        remedyAdvice: 'Double check prerequisite rules and verify every condition before selecting.',
      };
    }

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (err: any) {
    console.error('[Practice Explain Mistake] Error:', err?.message || err);

    return NextResponse.json(
      {
        success: false,
        error: 'Diagnostic feedback is momentarily unavailable. Please check the step-by-step solution.',
      },
      { status: 500 }
    );
  }
}
