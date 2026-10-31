import { NextRequest, NextResponse } from 'next/server';
import { evaluateExamSubmission } from '@/lib/evaluation/scoring';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { questions, answers, config, timeSpentSeconds = 600 } = body;

    if (!questions || !answers || !config) {
      return NextResponse.json({ error: 'Missing evaluation payload.' }, { status: 400 });
    }

    const evaluation = evaluateExamSubmission(questions, answers, config, timeSpentSeconds);
    return NextResponse.json({ evaluation });
  } catch (e) {
    return NextResponse.json({ error: 'Evaluation failed.' }, { status: 500 });
  }
}

