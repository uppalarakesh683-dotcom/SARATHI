import { DocumentChunk } from '@/types/material';
import { generateEmbedding } from './embeddings';
import { IngestionOptions } from './types';

/**
 * Splits extracted document text into overlapping chunks
 * with automatic topic detection and dense vector embedding generation.
 */
export function chunkDocumentText(
  documentId: string,
  documentName: string,
  rawText: string,
  pageCount?: number,
  options: IngestionOptions = {}
): DocumentChunk[] {
  const chunkSize = options.chunkSize || 140; // words per chunk
  const chunkOverlap = options.chunkOverlap || 30; // words overlap

  // Normalize line breaks and clean whitespace
  const normalizedText = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .trim();

  // Split into paragraphs
  const paragraphs = normalizedText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 25);

  const chunks: DocumentChunk[] = [];
  let chunkIdx = 1;

  if (paragraphs.length <= 1) {
    // Single block: split by word count with sliding overlap
    const words = normalizedText.split(/\s+/).filter(Boolean);
    const step = Math.max(20, chunkSize - chunkOverlap);

    for (let i = 0; i < words.length; i += step) {
      const slice = words.slice(i, i + chunkSize).join(' ');
      if (slice.trim().length > 30) {
        const estimatedPage = pageCount && words.length > 0
          ? Math.min(pageCount, Math.max(1, Math.ceil(((i + chunkSize / 2) / words.length) * pageCount)))
          : undefined;

        const topic = detectChunkTopic(slice, documentName);
        chunks.push({
          id: `${documentId}-chunk-${chunkIdx++}`,
          documentId,
          documentName,
          topic,
          pageNumber: estimatedPage,
          content: slice,
          embeddingVector: generateEmbedding(slice),
        });
      }
    }
  } else {
    // Process paragraphs with word length budgeting
    let currentWords: string[] = [];
    let currentTopic = '';

    paragraphs.forEach((para, pIdx) => {
      const pWords = para.split(/\s+/).filter(Boolean);

      if (currentWords.length + pWords.length <= chunkSize) {
        currentWords.push(...pWords);
        if (!currentTopic) currentTopic = detectChunkTopic(para, documentName);
      } else {
        if (currentWords.length > 0) {
          const content = currentWords.join(' ');
          const estimatedPage = pageCount
            ? Math.min(pageCount, Math.max(1, Math.ceil(((pIdx) / paragraphs.length) * pageCount)))
            : undefined;

          chunks.push({
            id: `${documentId}-chunk-${chunkIdx++}`,
            documentId,
            documentName,
            topic: currentTopic || detectChunkTopic(content, documentName),
            pageNumber: estimatedPage,
            content,
            embeddingVector: generateEmbedding(content),
          });
        }

        // Start new chunk with overlap from end of previous words
        const overlapSlice = currentWords.slice(-chunkOverlap);
        currentWords = [...overlapSlice, ...pWords];
        currentTopic = detectChunkTopic(para, documentName);
      }
    });

    if (currentWords.length > 0) {
      const content = currentWords.join(' ');
      chunks.push({
        id: `${documentId}-chunk-${chunkIdx++}`,
        documentId,
        documentName,
        topic: currentTopic || detectChunkTopic(content, documentName),
        pageNumber: pageCount || 1,
        content,
        embeddingVector: generateEmbedding(content),
      });
    }
  }

  return chunks;
}

/**
 * Heuristic topic classifier for study notes & CS textbooks
 */
export function detectChunkTopic(content: string, fallbackName = 'Study Material'): string {
  const lower = content.toLowerCase();

  // DBMS
  if (lower.includes('functional depend') || lower.includes('closure') || lower.includes('armstrong')) {
    return 'Functional Dependencies';
  }
  if (lower.includes('normal form') || lower.includes('bcnf') || lower.includes('3nf') || lower.includes('2nf') || lower.includes('1nf')) {
    return 'Normalization';
  }
  if (lower.includes('transact') || lower.includes('acid') || lower.includes('serializ') || lower.includes('2pl')) {
    return 'Transactions & Concurrency';
  }
  if (lower.includes('b+') || lower.includes('b-tree') || lower.includes('index') || lower.includes('fanout')) {
    return 'Indexing & B+ Trees';
  }
  if (lower.includes('sql') || lower.includes('select') || lower.includes('join') || lower.includes('group by')) {
    return 'SQL Queries';
  }
  if (lower.includes('relational algebra') || lower.includes('tuple relational') || lower.includes('cartesian')) {
    return 'Relational Algebra';
  }

  // OS & Algorithms & General CS
  if (lower.includes('deadlock') || lower.includes('semaphore') || lower.includes('process scheduling') || lower.includes('paging')) {
    return 'Operating Systems';
  }
  if (lower.includes('binary search') || lower.includes('sorting') || lower.includes('graph') || lower.includes('dynamic programming')) {
    return 'Data Structures & Algorithms';
  }
  if (lower.includes('inheritance') || lower.includes('polymorphism') || lower.includes('encapsulation') || lower.includes('class')) {
    return 'Object Oriented Programming';
  }
  if (lower.includes('tcp') || lower.includes('udp') || lower.includes('osi layer') || lower.includes('ip address')) {
    return 'Computer Networks';
  }

  // Derive from filename if possible
  const cleanName = fallbackName.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]/g, ' ');
  return cleanName.length > 3 ? cleanName : 'Core Concepts';
}

