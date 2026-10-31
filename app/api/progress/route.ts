import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/client';

export async function GET() {
  const db = getDatabase();
  return NextResponse.json({
    profile: db.profile,
    conceptMasteries: db.conceptMasteries,
    attemptsCount: db.attempts.length,
    examsCount: db.examSessions.length,
    activityCount: db.activityLog.length,
  });
}

