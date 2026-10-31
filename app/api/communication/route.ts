import { NextRequest, NextResponse } from 'next/server';
import {
  executeAICompletion,
  extractAndParseJson,
  AIServiceError,
} from '@/lib/ai/ai-service';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      type = 'paragraph', // 'paragraph' | 'email' | 'interview_answer' | 'summarization' | 'technical_explanation'
      scenarioTitle = 'Professional Communication',
      promptText = '',
      submission = '',
    } = body;

    if (!submission || typeof submission !== 'string' || submission.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'Please enter a response to evaluate.' },
        { status: 400 }
      );
    }

    const evaluationPrompt = `You are SARATHI's Expert Communication, Writing, and Professional Language Assessor.
Evaluate the following student submission thoroughly and constructively.

TASK TYPE: ${type.toUpperCase()}
SCENARIO / PROMPT TITLE: "${scenarioTitle}"
TASK PROMPT / REQUIREMENT:
"${promptText}"

STUDENT'S SUBMISSION:
"""
${submission}
"""

EVALUATION RUBRIC & INSTRUCTIONS:
1. Score each metric from 0 to 100 based strictly on the text provided:
   - grammar: grammatical accuracy, punctuation, tense consistency, subject-verb agreement
   - vocabulary: richness, word choice precision, avoiding repetitive filler words
   - clarity: ease of comprehension, directness, avoiding ambiguity
   - structure: paragraph flow, intro/body/conclusion, logical progression, formatting
   - coherence: logical transitions between sentences, topical focus
   - professionalTone: appropriate formality, politeness, business/academic etiquette
   - relevance: direct alignment with the prompt requirements
   - overallScore: weighted score (0-100) reflecting overall effectiveness

2. Provide:
   - feedbackSummary: a comprehensive constructive overview explaining why this score was awarded
   - strengths: 2 to 4 positive writing elements observed
   - areasToImprove: 2 to 4 specific weaknesses (e.g. passive voice overreliance, weak opening, run-on sentences)
   - corrections: an array of 2 to 5 specific line-level writing corrections:
     * "originalSnippet": exact phrase from student's text
     * "suggestedImprovement": how to fix it
     * "reason": pedagogical explanation of WHY this is an issue (grammar rule, tone adjustment, conciseness)
     * "betterVersion": corrected sentence
   - polishedVersion: a fully rewritten, exemplary version of the student's submission that preserves their original intent while executing it at an executive/native professional standard.

Return ONLY a valid JSON object matching this schema:
{
  "rubric": {
    "grammar": 80,
    "vocabulary": 75,
    "clarity": 85,
    "structure": 78,
    "coherence": 80,
    "professionalTone": 82,
    "relevance": 90,
    "overallScore": 81
  },
  "feedbackSummary": "...",
  "strengths": ["...", "..."],
  "areasToImprove": ["...", "..."],
  "corrections": [
    {
      "originalSnippet": "...",
      "suggestedImprovement": "...",
      "reason": "...",
      "betterVersion": "..."
    }
  ],
  "polishedVersion": "..."
}`;

    const aiResult = await executeAICompletion({
      messages: [{ role: 'user', content: evaluationPrompt }],
      temperature: 0.2,
      maxTokens: 1800,
      timeoutMs: 22000,
    });

    const parsed = extractAndParseJson<any>(aiResult.text, null);

    if (!parsed || !parsed.rubric) {
      throw new Error('Failed to parse communication evaluation.');
    }

    return NextResponse.json({
      success: true,
      assessment: parsed,
    });
  } catch (err: any) {
    console.error('[Communication API] Error:', err?.message || err);

    const isConfigError = err instanceof AIServiceError && err.code === 'AI_NOT_CONFIGURED';
    const statusCode = isConfigError ? 503 : 500;
    const userMessage = isConfigError
      ? 'Communication AI service is not configured. Please check your credentials in .env.local.'
      : 'SARATHI was unable to assess your submission at this moment. Please try again.';

    return NextResponse.json(
      { success: false, error: userMessage },
      { status: statusCode }
    );
  }
}
