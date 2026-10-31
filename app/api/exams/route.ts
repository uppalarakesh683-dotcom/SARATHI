import { NextRequest, NextResponse } from 'next/server';
import { SEED_DBMS_QUESTIONS } from '@/data/seed/questions';
import { APP_CONFIG } from '@/config/app';

export async function GET() {
  return NextResponse.json({
    domain: APP_CONFIG.defaultDomain,
    questions: SEED_DBMS_QUESTIONS,
  });
}

