import { NextRequest, NextResponse } from 'next/server';
import { executeAICompletion, AIServiceError } from '@/lib/ai/ai-service';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentName, textContent } = body;

    if (!textContent || typeof textContent !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Document text content is required for summarization.' },
        { status: 400 }
      );
    }

    // Truncate to first ~3500 words to respect prompt token boundaries
    const sampleText = textContent.slice(0, 14000);

    const prompt = `You are SARATHI, an expert academic synthesizer.
Generate an exhaustive, high-yield academic summary of the following student study material (${documentName || 'Document'}).

Structure your output into these EXACT markdown sections:

# Comprehensive Summary: ${documentName || 'Study Material'}

## 1. Overview
(Clear executive synthesis of the material's domain, scope, and primary purpose)

## 2. Important Concepts
(The core theorems, conceptual pillars, and fundamental ideas explained clearly)

## 3. Key Definitions
(Essential terminology with precise formal and intuitive definitions)

## 4. Important Formulas & Equations
(Critical mathematical, relational, or algorithmic formulas formatted in LaTeX)

## 5. Exam-Focused Points & Traps
(High-yield exam patterns, edge cases, recurring student mistakes, and scoring tips)

## 6. Quick Revision Checklist
(Bullet-point rapid review checklist for last-minute revision)

---
DOCUMENT TEXT EXCERPTS:
"""
${sampleText}
"""

Base the summary STRICTLY on the provided text above. Do not invent details not supported by the document.`;

    const aiResult = await executeAICompletion({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.25,
      maxTokens: 2200,
      timeoutMs: 25000,
    });

    return NextResponse.json({
      success: true,
      summary: aiResult.text.trim(),
    });
  } catch (error: any) {
    console.error('[Materials Summarize] Error:', error?.message || error);

    const isConfigError = error instanceof AIServiceError && error.code === 'AI_NOT_CONFIGURED';
    const statusCode = isConfigError ? 503 : 500;
    const userMessage = isConfigError
      ? "AI service isn't configured yet. Please configure your API key in .env.local."
      : "Couldn't generate document summary at this moment. Please try again.";

    return NextResponse.json(
      { success: false, error: userMessage },
      { status: statusCode }
    );
  }
}
