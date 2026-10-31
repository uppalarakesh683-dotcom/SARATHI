import { DocumentChunk, DocumentMaterial } from '@/types/material';

export type { DocumentChunk, DocumentMaterial };

export interface IngestionOptions {
  chunkSize?: number; // target words per chunk
  chunkOverlap?: number; // words overlap
}

export interface SearchResult {
  chunk: DocumentChunk;
  similarity: number;
}

export interface RetrievedContext {
  contextBlock: string;
  sources: {
    documentName: string;
    topic: string;
    pageNumber?: number;
    snippet: string;
    relevance: number;
  }[];
  hasContext: boolean;
}

