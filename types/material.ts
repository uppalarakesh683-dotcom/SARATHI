export interface DocumentChunk {
  id: string;
  documentId: string;
  documentName: string;
  topic: string;
  pageNumber?: number;
  content: string;
  embeddingVector?: number[]; // 64-dimensional semantic dense vector
}

export interface DocumentMaterial {
  id: string;
  userId?: string;
  name: string;
  type: 'PDF' | 'DOCX' | 'TXT' | string;
  size: number; // in bytes
  uploadDate: string;
  pageCount?: number;
  chunkCount: number;
  summary?: string;
  topicsDetected: string[];
  status: 'ready' | 'processing' | 'error';
  errorMessage?: string;
  chunks: DocumentChunk[];
}
