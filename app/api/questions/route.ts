import { NextRequest, NextResponse } from 'next/server';
import { generateQuestions } from '@/lib/questions/generator';
import { SEED_DBMS_QUESTIONS } from '@/data/seed/questions';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const topic = searchParams.get('topic') || undefined;
  const conceptId = searchParams.get('conceptId') || undefined;
  const count = Number(searchParams.get('count') || '5');

  const questions = generateQuestions({ topic, conceptId, count });
  return NextResponse.json({ questions });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const questions = generateQuestions(body);
    return NextResponse.json({ questions });
  } catch (e) {
    return NextResponse.json({ questions: SEED_DBMS_QUESTIONS.slice(0, 5) });
  }
}

