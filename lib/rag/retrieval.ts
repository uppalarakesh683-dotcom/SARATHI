import { searchVectorStore } from './vector-store';
import { RetrievedContext, SearchResult } from './types';

export function retrieveRelevantContext(
  query: string,
  topK = 3,
  materialIdFilter?: string
): RetrievedContext {
  const results: SearchResult[] = searchVectorStore(query, topK, materialIdFilter);

  // Minimum threshold to prevent irrelevant noise
  const validResults = results.filter((r) => r.similarity >= 0.12);

  if (validResults.length === 0) {
    return {
      contextBlock: '',
      sources: [],
      hasContext: false,
    };
  }

  const sources = validResults.map((r) => ({
    documentName: r.chunk.documentName,
    topic: r.chunk.topic,
    pageNumber: r.chunk.pageNumber,
    snippet:
      r.chunk.content.length > 220
        ? r.chunk.content.substring(0, 220) + '...'
        : r.chunk.content,
    relevance: Math.round(r.similarity * 100),
  }));

  const contextBlock = validResults
    .map(
      (r, idx) =>
        `[Document Source ${idx + 1}: ${r.chunk.documentName}${
          r.chunk.pageNumber ? ` — Page ${r.chunk.pageNumber}` : ''
        } | Topic: ${r.chunk.topic} (Similarity: ${(r.similarity * 100).toFixed(1)}%)]\n${
          r.chunk.content
        }`
    )
    .join('\n\n---\n\n');

  return {
    contextBlock,
    sources,
    hasContext: true,
  };
}
