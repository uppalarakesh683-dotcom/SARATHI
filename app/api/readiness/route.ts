import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/client';
import { calculateReadiness } from '@/lib/evaluation/readiness';

export async function GET() {
  const db = getDatabase();
  const readiness = calculateReadiness(db);
  return NextResponse.json({ readiness });
}

