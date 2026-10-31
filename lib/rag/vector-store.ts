import { DocumentChunk } from '@/types/material';
import { getDatabase, saveDatabase } from '@/lib/db/client';
import { generateEmbedding, cosineSimilarity } from './embeddings';
import { SearchResult } from './types';

export function getAllChunks(materialIdFilter?: string): DocumentChunk[] {
  const db = getDatabase();
  const allChunks: DocumentChunk[] = [];

  db.materials.forEach((mat) => {
    if (materialIdFilter && mat.id !== materialIdFilter) {
      return;
    }
    if (mat.chunks && mat.status === 'ready') {
      allChunks.push(...mat.chunks);
    }
  });

  return allChunks;
}

export function searchVectorStore(
  query: string,
  topK = 3,
  materialIdFilter?: string,
  topicFilter?: string
): SearchResult[] {
  const queryEmbedding = generateEmbedding(query);
  const chunks = getAllChunks(materialIdFilter);

  const scored: SearchResult[] = [];

  for (const chunk of chunks) {
    if (topicFilter && chunk.topic.toLowerCase() !== topicFilter.toLowerCase()) {
      continue;
    }

    let chunkVec = chunk.embeddingVector;
    if (!chunkVec || chunkVec.length === 0) {
      chunkVec = generateEmbedding(chunk.content);
      chunk.embeddingVector = chunkVec;
    }

    const similarity = cosineSimilarity(queryEmbedding, chunkVec);
    scored.push({ chunk, similarity });
  }

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, topK);
}

export function insertDocumentChunks(chunks: DocumentChunk[]): void {
  const db = getDatabase();
  if (chunks.length > 0) {
    const parentId = chunks[0].documentId;
    const mat = db.materials.find((m) => m.id === parentId);
    if (mat) {
      mat.chunks = chunks;
      mat.chunkCount = chunks.length;
      saveDatabase(db);
    }
  }
}
