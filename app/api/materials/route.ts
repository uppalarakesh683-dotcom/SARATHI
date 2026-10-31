import { NextRequest, NextResponse } from 'next/server';
import { processUploadedDocument } from '@/lib/rag/ingestion';
import { searchVectorStore } from '@/lib/rag/vector-store';
import { SEED_MATERIALS } from '@/data/seed/materials';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');

  if (q) {
    const results = searchVectorStore(q, 3);
    return NextResponse.json({ results });
  }

  return NextResponse.json({ materials: [] });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, text, type = 'text/plain' } = body;

    if (!name || !text) {
      return NextResponse.json({ error: 'Name and text content are required.' }, { status: 400 });
    }

    const doc = processUploadedDocument(name, type, text.length, text);
    return NextResponse.json({ material: doc });
  } catch (e) {
    return NextResponse.json({ error: 'Material processing failed.' }, { status: 500 });
  }
}

