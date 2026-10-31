import { LearningMode } from '@/types/ai';

const VALID_MODES: Set<string> = new Set([
  'explain',
  'simple',
  'step_by_step',
  'exam',
  'summary',
  'practice',
  'detailed',
  'revision',
]);

export function sanitizeUserPrompt(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '')
    .slice(0, 4000);
}

export function validateLearningMode(mode: unknown): LearningMode {
  if (typeof mode === 'string' && VALID_MODES.has(mode)) {
    return mode as LearningMode;
  }
  return 'explain';
}

export function validateHistory(history: unknown): { role: string; content: string }[] {
  if (!Array.isArray(history)) return [];
  return history
    .filter(
      (item) =>
        item &&
        typeof item === 'object' &&
        typeof item.content === 'string' &&
        item.content.trim().length > 0
    )
    .map((item) => ({
      role: item.role === 'user' || item.sender === 'user' ? 'user' : 'assistant',
      content: String(item.content).slice(0, 4000),
    }))
    .slice(-10); // keep last 10 messages for context
}

export function safeJsonParse<T>(jsonStr: string, fallback: T): T {
  if (!jsonStr || typeof jsonStr !== 'string') return fallback;
  try {
    const cleaned = jsonStr
      .replace(/^```json\s*/im, '')
      .replace(/^```\s*/im, '')
      .replace(/```\s*$/m, '')
      .trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      // Continue to bracket extraction
    }

    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');

    let candidate: string | null = null;
    if (firstBracket !== -1 && lastBracket > firstBracket && (firstBrace === -1 || firstBracket < firstBrace)) {
      candidate = cleaned.substring(firstBracket, lastBracket + 1);
    } else if (firstBrace !== -1 && lastBrace > firstBrace) {
      candidate = cleaned.substring(firstBrace, lastBrace + 1);
    }

    if (candidate) {
      const sanitized = candidate.replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(sanitized);
    }

    return fallback;
  } catch (e) {
    return fallback;
  }
}
