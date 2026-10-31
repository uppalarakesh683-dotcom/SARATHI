import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided in request.' },
        { status: 400 }
      );
    }

    const fileName = file.name || 'unnamed_document';
    const fileSize = file.size;
    const extension = fileName.split('.').pop()?.toLowerCase();

    // Max 25 MB file limit
    if (fileSize > 25 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 25 MB limit.' },
        { status: 400 }
      );
    }

    if (!extension || !['pdf', 'docx', 'txt'].includes(extension)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unsupported file type. Please upload a PDF, DOCX, or TXT file.',
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = '';
    let pageCount: number | undefined = undefined;

    if (extension === 'pdf') {
      try {
        // Dynamic import for pdf-parse
        const pdfParse = require('pdf-parse');
        const pdfData = await pdfParse(buffer);
        extractedText = pdfData.text || '';
        pageCount = pdfData.numpages || undefined;
      } catch (pdfErr) {
        console.error('PDF extraction failed:', pdfErr);
        return NextResponse.json(
          { success: false, error: "Couldn't process this PDF file." },
          { status: 422 }
        );
      }
    } else if (extension === 'docx') {
      try {
        const mammoth = require('mammoth');
        const docxResult = await mammoth.extractRawText({ buffer });
        extractedText = docxResult.value || '';
        // Approximate pages for docx: ~350 words per page
        const wordCount = extractedText.split(/\s+/).filter(Boolean).length;
        pageCount = Math.max(1, Math.ceil(wordCount / 350));
      } catch (docxErr) {
        console.error('DOCX extraction failed:', docxErr);
        return NextResponse.json(
          { success: false, error: "Couldn't process this DOCX file." },
          { status: 422 }
        );
      }
    } else if (extension === 'txt') {
      extractedText = buffer.toString('utf-8');
      const wordCount = extractedText.split(/\s+/).filter(Boolean).length;
      pageCount = Math.max(1, Math.ceil(wordCount / 400));
    }

    // Clean text
    extractedText = extractedText
      .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '')
      .trim();

    if (!extractedText || extractedText.length < 15) {
      return NextResponse.json(
        {
          success: false,
          error: 'Document contains insufficient or unreadable text content.',
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      fileName,
      fileType: extension.toUpperCase(),
      fileSize,
      extractedText,
      pageCount,
    });
  } catch (error: any) {
    console.error('File extraction handler error:', error);
    return NextResponse.json(
      { success: false, error: "Couldn't process this file." },
      { status: 500 }
    );
  }
}

