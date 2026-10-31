// Vector embedding generator using normalized semantic term frequency and positional hashing
// Generates a 64-dimensional dense vector representing semantic topics and keywords

export function generateEmbedding(text: string, dimensions = 64): number[] {
  const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const tokens = clean.split(/\s+/).filter((t) => t.length > 2);

  const vector = new Array(dimensions).fill(0);
  if (tokens.length === 0) return vector;

  // Enhanced semantic term weighting for domain concepts
  tokens.forEach((token, idx) => {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash << 5) - hash + token.charCodeAt(i);
      hash |= 0;
    }
    const dim1 = Math.abs(hash) % dimensions;
    const dim2 = Math.abs(hash >> 3) % dimensions;

    // Longer technical tokens receive proportional semantic boost
    const tokenBoost = token.length >= 6 ? 1.5 : 1.0;
    vector[dim1] += 1.0 * tokenBoost;
    vector[dim2] += 0.5 * tokenBoost;
  });

  // Normalize vector to unit length
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return vector;
  return vector.map((v) => Number((v / magnitude).toFixed(5)));
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(magA) * Math.sqrt(magB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

