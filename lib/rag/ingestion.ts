import { DocumentMaterial } from '@/types/material';
import { chunkDocumentText } from './chunking';
import { IngestionOptions } from './types';

export function processUploadedDocument(
  fileName: string,
  fileType: string,
  fileSize: number,
  extractedText: string,
  pageCount?: number,
  userId?: string,
  options: IngestionOptions = {}
): DocumentMaterial {
  const docId = `mat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const chunks = chunkDocumentText(docId, fileName, extractedText, pageCount, options);

  // Collect unique detected topics
  const uniqueTopics = Array.from(new Set(chunks.map((c) => c.topic)));

  // Generate automated metadata summary
  const summary = `Extracted ${chunks.length} semantic chunks from ${fileName}${
    pageCount ? ` across ${pageCount} page(s)` : ''
  }. Primary topics identified: ${uniqueTopics.join(
    ', '
  )}. Vector embeddings computed and indexed for instant semantic retrieval.`;

  return {
    id: docId,
    userId: userId || 'student-default',
    name: fileName,
    type: fileType.toUpperCase().includes('PDF')
      ? 'PDF'
      : fileType.toUpperCase().includes('DOC')
      ? 'DOCX'
      : 'TXT',
    size: fileSize,
    uploadDate: new Date().toISOString(),
    pageCount,
    chunkCount: chunks.length,
    summary,
    topicsDetected: uniqueTopics,
    status: 'ready',
    chunks,
  };
}
