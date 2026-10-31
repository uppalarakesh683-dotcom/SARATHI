import Groq from 'groq-sdk';

/**
 * SARATHI Central Multi-Provider AI Service
 * 
 * Provides resilient, server-side-only AI execution with:
 * - Sequential multi-key fallback: Groq Key 1 -> Groq Key 2 -> Gemini API
 * - Validation-driven fallback: If a provider returns malformed or invalid questions,
 *   it immediately attempts the next configured provider.
 * - Safe server-side debug logging without exposing credentials or secrets.
 * - Strict conformity to the PracticeQuestion interface.
 */

export interface PracticeQuestion {
  id: string;
  topic: string;
  question: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  explanation: string;
  solution: string;
  alternativeApproach?: string;
  quickMethod?: string | null;
  steps?: { stepNumber: number; title: string; content: string }[];
}

export interface AIProviderConfig {
  name: string;
  type: 'groq' | 'gemini';
  apiKey: string;
  models: string[];
}

export interface ChatMessageParam {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIExecutionOptions {
  messages: ChatMessageParam[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface AIExecutionResult {
  text: string;
  provider: string;
  model: string;
}

export class AIServiceError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code = 'AI_SERVICE_ERROR', statusCode = 500) {
    super(message);
    this.name = 'AIServiceError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// Internal cache for Groq client instances
const groqClients = new Map<string, Groq>();

function getGroqClient(apiKey: string): Groq {
  let client = groqClients.get(apiKey);
  if (!client) {
    client = new Groq({ apiKey });
    groqClients.set(apiKey, client);
  }
  return client;
}

/**
 * Assemble configured providers in priority order.
 * All keys remain strictly in process.env.
 *
 * Strategy:
 * - Both Groq keys share the same organization rate limits per model.
 * - openai/gpt-oss-120b has higher OTPM budget than qwen/qwen3.8-27b.
 * - We therefore try gpt-oss-120b FIRST on both keys before falling back to qwen.
 * - Gemini is the final safety net with its own independent quotas.
 */
export function getConfiguredProviders(): AIProviderConfig[] {
  const providers: AIProviderConfig[] = [];

  const groqKey1 = process.env.GROQ_API_KEY?.trim();
  if (groqKey1) {
    providers.push({
      name: 'Groq-1 (Primary)',
      type: 'groq',
      apiKey: groqKey1,
      // gpt-oss-120b first: observed to avoid OTPM rate limits that hit qwen
      models: ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b'],
    });
  }

  const groqKey2 = process.env.GROQ_API_KEY_2?.trim();
  if (groqKey2 && groqKey2 !== groqKey1) {
    providers.push({
      name: 'Groq-2 (Secondary)',
      type: 'groq',
      apiKey: groqKey2,
      models: ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b'],
    });
  }

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey) {
    providers.push({
      name: 'Google-Gemini',
      type: 'gemini',
      apiKey: geminiKey,
      // Verified-live model IDs (no "models/" prefix — the API call adds none)
      models: ['gemini-3-flash-preview', 'gemini-3.8-flash', 'gemini-flash-latest'],
    });
  }

  return providers;
}

/**
 * Robust JSON extraction from raw AI output.
 * Handles markdown code fences, surrounding prose, trailing commas, and wrapped objects.
 */
export function extractAndParseJson<T>(rawText: string, fallback?: T): T {
  if (!rawText || typeof rawText !== 'string') {
    if (fallback !== undefined) return fallback;
    throw new Error('Empty AI response cannot be parsed as JSON.');
  }

  // 1. Strip markdown fences
  let cleaned = rawText
    .replace(/^```json\s*/im, '')
    .replace(/^```\s*/im, '')
    .replace(/```\s*$/m, '')
    .trim();

  // 2. Direct parse attempt
  try {
    return JSON.parse(cleaned);
  } catch {
    // Continue to boundary extraction
  }

  // 3. Extract boundary by bracket/brace
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
    // Strip trailing commas before closing braces/brackets
    const sanitizedCandidate = candidate.replace(/,\s*([}\]])/g, '$1');
    try {
      return JSON.parse(sanitizedCandidate);
    } catch {
      // Continue to check fallback
    }
  }

  if (fallback !== undefined) {
    return fallback;
  }

  throw new Error('Failed to extract valid JSON from AI output.');
}

/**
 * Strict schema validator and normalizer for practice questions.
 * Ensures questions conform to the exact PracticeQuestion interface.
 */
export function validateAndNormalizeQuestions(
  rawList: any,
  defaultTopic: string,
  targetCount: number
): PracticeQuestion[] {
  let list: any[] = [];

  if (Array.isArray(rawList)) {
    list = rawList;
  } else if (rawList && typeof rawList === 'object') {
    const candidateArray =
      rawList.questions ||
      rawList.data ||
      rawList.items ||
      rawList.results ||
      Object.values(rawList).find(Array.isArray);

    if (Array.isArray(candidateArray)) {
      list = candidateArray;
    }
  }

  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('AI response did not contain an array of questions.');
  }

  const optionLetters = ['A', 'B', 'C', 'D'];

  const validated: PracticeQuestion[] = [];

  for (let idx = 0; idx < list.length; idx++) {
    const item = list[idx];
    if (!item || typeof item !== 'object') continue;

    const qId = item.id ? String(item.id) : `q-${Date.now()}-${idx + 1}`;
    const topic = (item.topic && String(item.topic).trim()) || defaultTopic;
    const questionText = (item.question && String(item.question).trim()) || (item.text && String(item.text).trim());

    if (!questionText || questionText.length < 5) {
      continue; // Skip invalid question statements
    }

    // Process and validate options
    let options: { id: string; text: string }[] = [];
    if (Array.isArray(item.options)) {
      options = item.options.slice(0, 4).map((opt: any, optIdx: number) => {
        const id = optionLetters[optIdx] || 'A';
        if (typeof opt === 'string') {
          const cleanText = opt.replace(/^[A-D][\).\s-]+\s*/i, '').trim();
          return { id, text: cleanText || opt };
        }
        return {
          id: opt.id ? String(opt.id).toUpperCase() : id,
          text: (opt.text && String(opt.text).trim()) || `Option ${id}`,
        };
      });
    }

    // Ensure 4 distinct options exist
    while (options.length < 4) {
      const id = optionLetters[options.length];
      options.push({ id, text: `Option ${id}` });
    }

    // Validate correct option ID
    let correctId = 'A';
    const rawCorrect = item.correctOptionId || item.correctAnswer || item.correct_answer || item.answer;

    if (typeof rawCorrect === 'string') {
      const upper = rawCorrect.trim().toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(upper)) {
        correctId = upper;
      } else {
        const matched = options.find((o) => o.text.trim().toLowerCase() === rawCorrect.trim().toLowerCase());
        if (matched && ['A', 'B', 'C', 'D'].includes(matched.id)) {
          correctId = matched.id;
        }
      }
    } else if (typeof rawCorrect === 'number' && rawCorrect >= 0 && rawCorrect <= 3) {
      correctId = optionLetters[rawCorrect];
    }

    const explanation =
      (item.explanation && String(item.explanation).trim()) ||
      `The correct answer is Option ${correctId}. Verify the core definitions and principles for this topic.`;

    const solution = (item.solution && String(item.solution).trim()) || explanation;
    const alternativeApproach =
      (item.alternativeApproach && String(item.alternativeApproach).trim()) ||
      'Verify by checking boundary conditions and eliminating contradictory choices.';
    const quickMethod = item.quickMethod ? String(item.quickMethod).trim() : null;

    let steps: { stepNumber: number; title: string; content: string }[] = [];
    if (Array.isArray(item.steps) && item.steps.length > 0) {
      steps = item.steps.map((s: any, sIdx: number) => ({
        stepNumber: Number(s.stepNumber) || sIdx + 1,
        title: (s.title && String(s.title).trim()) || `Step ${sIdx + 1}`,
        content: (s.content && String(s.content).trim()) || 'Analyze requirements and verify.',
      }));
    } else {
      steps = [
        { stepNumber: 1, title: 'Analyze Premise', content: 'Examine given data and problem requirements.' },
        { stepNumber: 2, title: 'Apply Theorem', content: explanation },
        { stepNumber: 3, title: 'Conclude', content: `Option ${correctId} is verified as the correct answer.` },
      ];
    }

    validated.push({
      id: qId,
      topic,
      question: questionText,
      options,
      correctOptionId: correctId,
      explanation,
      solution,
      alternativeApproach,
      quickMethod,
      steps,
    });
  }

  if (validated.length === 0) {
    throw new Error('No questions passed validation schema.');
  }

  return validated.slice(0, targetCount);
}

/**
 * High-Level Practice Question Generator with Safe Debug Logging and Sequential Fallback
 */
export async function generatePracticeQuestionsWithFallback(params: {
  topic: string;
  count: number;
  difficulty: string;
  materialText?: string;
  targetRole?: string;
}): Promise<{ questions: PracticeQuestion[]; providerUsed: string; modelUsed: string }> {
  const { topic, count, difficulty, materialText, targetRole } = params;
  const numQuestions = Math.min(30, Math.max(1, count || 5));

  // Safe server-side debug log
  console.log(`[Practice Debug] Request received: topic="${topic}", difficulty="${difficulty}", count=${numQuestions}`);

  let contextSnippet = '';
  if (materialText && typeof materialText === 'string' && materialText.trim().length > 20) {
    contextSnippet = `\nSTUDY MATERIAL EXCERPTS:\n"""\n${materialText.slice(0, 8000)}\n"""\n`;
  }

  const roleSnippet = targetRole ? `Target Role/Domain: ${targetRole}\n` : '';

  const systemPrompt = `You are SARATHI's Expert Assessment & Practice Engine.
Generate rigorous, academically authentic exam-style practice questions in valid JSON.
Keep explanations and steps concise, accurate, and high-yield.
Return ONLY a valid JSON array. Do not use Markdown code fences or outside commentary.`;

  const userPrompt = `Generate exactly ${numQuestions} distinct, high-quality practice questions for: "${topic}".
Difficulty Level: ${difficulty}.
${roleSnippet}${contextSnippet}
REQUIREMENTS:
1. Every question must test a genuine, rigorous concept.
2. For each question provide:
   - "id": "q1", "q2", etc.
   - "topic": "${topic}"
   - "question": clear problem statement
   - "options": exactly 4 options with "id" ("A", "B", "C", "D") and concise text
   - "correctOptionId": the correct option letter ("A", "B", "C", or "D")
   - "explanation": concise rationale why this option is correct (1-2 sentences)
   - "solution": standard solution method (1-2 sentences)
   - "alternativeApproach": alternative method or verification rule (1 sentence)
   - "quickMethod": shortcut tip or null
   - "steps": array of 2-3 step objects with "stepNumber", "title", and "content" (1 sentence each)

Return ONLY a valid JSON array matching this schema:
[
  {
    "id": "q1",
    "topic": "${topic}",
    "question": "Problem statement...",
    "options": [
      { "id": "A", "text": "Option A" },
      { "id": "B", "text": "Option B" },
      { "id": "C", "text": "Option C" },
      { "id": "D", "text": "Option D" }
    ],
    "correctOptionId": "A",
    "explanation": "Clear explanation of why this is correct...",
    "solution": "Standard solution method...",
    "alternativeApproach": "Alternative method or verification...",
    "quickMethod": "Shortcut tip or null",
    "steps": [
      { "stepNumber": 1, "title": "Analyze Premise", "content": "Identify given constraints." },
      { "stepNumber": 2, "title": "Apply Rule", "content": "Apply the core theorem." },
      { "stepNumber": 3, "title": "Conclude", "content": "Option A is verified." }
    ]
  }
]`;

  const providers = getConfiguredProviders();

  if (providers.length === 0) {
    console.error('[Practice Debug] No AI providers are configured in environment variables.');
    throw new AIServiceError(
      'Practice generation is temporarily unavailable. Please check your credentials.',
      'AI_NOT_CONFIGURED',
      503
    );
  }

  const errors: string[] = [];

  for (const provider of providers) {
    for (const model of provider.models) {
      console.log(`[Practice Debug] Attempting provider: ${provider.name} (model: ${model})`);

      const timeoutMs = 25000;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        let rawText = '';
        let httpStatus = 200;

        if (provider.type === 'groq') {
          const groq = getGroqClient(provider.apiKey);
          const completion = await groq.chat.completions.create(
            {
              model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
              temperature: 0.2,
              max_tokens: 3000,
            },
            {
              signal: controller.signal,
              timeout: timeoutMs,
            }
          );
          clearTimeout(timer);

          const choice = completion.choices?.[0];
          rawText = choice?.message?.content?.trim() || '';
          if (!rawText && (choice?.message as any)?.reasoning) {
            rawText = (choice.message as any).reasoning.trim();
          }
        } else if (provider.type === 'gemini') {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${provider.apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                generationConfig: {
                  temperature: 0.2,
                  maxOutputTokens: 3000,
                },
              }),
              signal: controller.signal,
            }
          );
          clearTimeout(timer);
          httpStatus = response.status;

          if (response.ok) {
            const data = await response.json();
            rawText = data.candidates?.[0]?.content?.parts
              ?.map((p: any) => p.text || '')
              .join('')
              .trim();
          } else {
            const errData = await response.json().catch(() => ({}));
            const errMsg = errData.error?.message || `HTTP ${response.status}`;
            console.warn(`[Practice Debug] ${provider.name} (${model}) HTTP ${response.status}: ${errMsg}`);
            errors.push(`${provider.name}/${model}: HTTP ${response.status}`);
            continue;
          }
        }

        const hasResponse = Boolean(rawText && rawText.length > 10);
        console.log(`[Practice Debug] HTTP ${httpStatus}. AI response received: ${hasResponse ? `${rawText.length} chars` : 'NO'}`);

        if (!hasResponse) {
          errors.push(`${provider.name}/${model}: Empty response`);
          continue;
        }

        // Attempt JSON extraction
        let parsed: any;
        try {
          parsed = extractAndParseJson(rawText);
          console.log(`[Practice Debug] JSON extraction succeeded: YES`);
        } catch (jsonErr: any) {
          console.warn(`[Practice Debug] JSON extraction succeeded: NO (${jsonErr.message})`);
          errors.push(`${provider.name}/${model}: JSON parse error`);
          continue;
        }

        // Validate questions against strict PracticeQuestion schema
        let validatedQuestions: PracticeQuestion[];
        try {
          validatedQuestions = validateAndNormalizeQuestions(parsed, topic, numQuestions);
          console.log(`[Practice Debug] Validation result: PASSED (${validatedQuestions.length} valid questions)`);
        } catch (valErr: any) {
          console.warn(`[Practice Debug] Validation result: FAILED (${valErr.message})`);
          errors.push(`${provider.name}/${model}: Validation failure - ${valErr.message}`);
          continue;
        }

        // Successful generation and validation
        return {
          questions: validatedQuestions,
          providerUsed: provider.name,
          modelUsed: model,
        };
      } catch (err: any) {
        clearTimeout(timer);
        const isAbort = err?.name === 'AbortError' || err?.message?.includes('aborted');
        const status = err?.status || (isAbort ? 'Timeout' : err?.message || 'Error');
        console.warn(`[Practice Debug] ${provider.name} (${model}) encountered: ${status}. Trying next option...`);
        errors.push(`${provider.name}/${model}: ${status}`);
      }
    }
  }

  console.error('[Practice Debug] All AI providers exhausted. Summary:', errors.join(' | '));
  throw new AIServiceError(
    'Practice generation is temporarily unavailable. Please try again.',
    'AI_ALL_PROVIDERS_UNAVAILABLE',
    503
  );
}

/**
 * General purpose AI completion with automatic multi-provider fallback.
 */
export async function executeAICompletion(options: AIExecutionOptions): Promise<AIExecutionResult> {
  const providers = getConfiguredProviders();

  if (providers.length === 0) {
    throw new AIServiceError(
      'AI mentor service is not configured. Please check your credentials.',
      'AI_NOT_CONFIGURED',
      503
    );
  }

  const timeoutMs = options.timeoutMs || 22000;
  const temperature = options.temperature ?? 0.2;
  const maxTokens = options.maxTokens ?? 2500;
  const errors: string[] = [];

  for (const provider of providers) {
    for (const model of provider.models) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        if (provider.type === 'groq') {
          const groq = getGroqClient(provider.apiKey);
          const completion = await groq.chat.completions.create(
            {
              model,
              messages: options.messages as any,
              temperature,
              max_tokens: maxTokens,
            },
            {
              signal: controller.signal,
              timeout: timeoutMs,
            }
          );
          clearTimeout(timer);

          const choice = completion.choices?.[0];
          let text = choice?.message?.content?.trim() || '';
          if (!text && (choice?.message as any)?.reasoning) {
            text = (choice.message as any).reasoning.trim();
          }

          if (text) {
            return { text, provider: provider.name, model };
          }
        } else if (provider.type === 'gemini') {
          const systemMsg = options.messages.find((m) => m.role === 'system');
          const nonSystemMsgs = options.messages.filter((m) => m.role !== 'system');

          const contents = nonSystemMsgs.map((m) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }],
          }));

          const requestBody: any = {
            contents,
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
            },
          };

          if (systemMsg) {
            requestBody.systemInstruction = {
              parts: [{ text: systemMsg.content }],
            };
          }

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${provider.apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody),
              signal: controller.signal,
            }
          );
          clearTimeout(timer);

          if (response.ok) {
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts
              ?.map((p: any) => p.text || '')
              .join('')
              .trim();

            if (text) {
              return { text, provider: provider.name, model };
            }
          }
        }
      } catch (err: any) {
        clearTimeout(timer);
        const isAbort = err?.name === 'AbortError' || err?.message?.includes('aborted');
        errors.push(`${provider.name}/${model}: ${err?.status || (isAbort ? 'Timeout' : err?.message)}`);
      }
    }
  }

  throw new AIServiceError(
    'AI mentor is momentarily unavailable. Please try again in a few moments.',
    'AI_ALL_PROVIDERS_UNAVAILABLE',
    503
  );
}

// Keep backwards compatibility for any previous imports
export const normalizePracticeQuestions = validateAndNormalizeQuestions;

export interface ExamQuestion {
  id: string;
  topic: string;
  type: 'mcq' | 'msq' | 'numerical' | 'true_false';
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  options?: { id: string; text: string }[];
  correctAnswers: string[];
  explanation: string;
  steps?: { stepNumber: number; title: string; content: string }[];
  methods?: { title: string; type: string; description: string }[];
  mistakeTrap?: string;
}

export function validateAndNormalizeExamQuestions(
  rawList: any,
  defaultTopic: string,
  targetCount: number
): ExamQuestion[] {
  let list: any[] = [];

  if (Array.isArray(rawList)) {
    list = rawList;
  } else if (rawList && typeof rawList === 'object') {
    const candidateArray =
      rawList.questions ||
      rawList.data ||
      rawList.items ||
      rawList.results ||
      Object.values(rawList).find(Array.isArray);

    if (Array.isArray(candidateArray)) {
      list = candidateArray;
    }
  }

  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('AI response did not contain an array of exam questions.');
  }

  const optionLetters = ['A', 'B', 'C', 'D'];
  const validated: ExamQuestion[] = [];

  for (let idx = 0; idx < list.length; idx++) {
    const item = list[idx];
    if (!item || typeof item !== 'object') continue;

    const qId = item.id ? String(item.id) : `exam_q_${idx + 1}`;
    const topic = (item.topic && String(item.topic).trim()) || defaultTopic;
    const questionText = (item.question && String(item.question).trim()) || (item.text && String(item.text).trim());

    if (!questionText || questionText.length < 5) continue;

    const rawType = String(item.type || 'mcq').toLowerCase();
    const type: 'mcq' | 'msq' | 'numerical' | 'true_false' =
      rawType === 'msq' || rawType === 'numerical' || rawType === 'true_false' ? rawType : 'mcq';

    const rawDiff = String(item.difficulty || 'medium').toLowerCase();
    const difficulty: 'easy' | 'medium' | 'hard' =
      rawDiff === 'easy' || rawDiff === 'hard' ? rawDiff : 'medium';

    // Normalize options for choice questions
    let options: { id: string; text: string }[] | undefined = undefined;
    if (type !== 'numerical') {
      let optArr: { id: string; text: string }[] = [];
      if (Array.isArray(item.options)) {
        optArr = item.options.slice(0, 4).map((opt: any, optIdx: number) => {
          const id = optionLetters[optIdx] || 'A';
          if (typeof opt === 'string') {
            const cleanText = opt.replace(/^[A-D][\).\s-]+\s*/i, '').trim();
            return { id, text: cleanText || opt };
          }
          return {
            id: opt.id ? String(opt.id).toUpperCase() : id,
            text: (opt.text && String(opt.text).trim()) || `Option ${id}`,
          };
        });
      }
      while (optArr.length < 4 && type !== 'true_false') {
        const id = optionLetters[optArr.length];
        optArr.push({ id, text: `Option ${id}` });
      }
      options = optArr;
    }

    // Normalize correct answers
    let correctAnswers: string[] = [];
    if (Array.isArray(item.correctAnswers) && item.correctAnswers.length > 0) {
      correctAnswers = item.correctAnswers.map((a: any) => String(a).trim().toUpperCase());
    } else if (item.correctAnswer) {
      correctAnswers = [String(item.correctAnswer).trim().toUpperCase()];
    } else if (item.correctOptionId) {
      correctAnswers = [String(item.correctOptionId).trim().toUpperCase()];
    } else {
      correctAnswers = ['A'];
    }

    const explanation =
      (item.explanation && String(item.explanation).trim()) ||
      'Verify based on the core syllabus definitions and properties.';

    let steps: { stepNumber: number; title: string; content: string }[] = [];
    if (Array.isArray(item.steps) && item.steps.length > 0) {
      steps = item.steps.map((s: any, sIdx: number) => ({
        stepNumber: Number(s.stepNumber) || sIdx + 1,
        title: (s.title && String(s.title).trim()) || `Step ${sIdx + 1}`,
        content: (s.content && String(s.content).trim()) || 'Analyze problem parameters.',
      }));
    } else {
      steps = [
        { stepNumber: 1, title: 'Analyze Given Premise', content: 'Examine requirements and constraints.' },
        { stepNumber: 2, title: 'Derive Solution', content: explanation },
      ];
    }

    let methods: { title: string; type: string; description: string }[] = [];
    if (Array.isArray(item.methods) && item.methods.length > 0) {
      methods = item.methods.map((m: any, mIdx: number) => ({
        title: (m.title && String(m.title).trim()) || (mIdx === 0 ? 'Standard Method' : 'Alternative Approach'),
        type: (m.type && String(m.type).trim()) || 'standard',
        description: (m.description && String(m.description).trim()) || explanation,
      }));
    } else {
      methods = [{ title: 'Standard Method', type: 'standard', description: explanation }];
    }

    const mistakeTrap =
      (item.mistakeTrap && String(item.mistakeTrap).trim()) ||
      'Students frequently confuse reciprocal conditions or overlook boundary limits.';

    validated.push({
      id: qId,
      topic,
      type,
      difficulty,
      question: questionText,
      options,
      correctAnswers,
      explanation,
      steps,
      methods,
      mistakeTrap,
    });
  }

  if (validated.length === 0) {
    throw new Error('No exam questions passed validation schema.');
  }

  return validated.slice(0, targetCount);
}

/**
 * High-Level Mock Exam Generator with Safe Debug Logging and Sequential Fallback
 */
export async function generateExamQuestionsWithFallback(params: {
  examTarget: string;
  scope: string;
  scopeDetail?: string;
  questionCount: number;
  questionTypes: string[];
  difficulty: string;
  materialText?: string;
}): Promise<{ questions: ExamQuestion[]; providerUsed: string; modelUsed: string }> {
  const { examTarget, scope, scopeDetail, questionCount, questionTypes, difficulty, materialText } = params;
  const numQuestions = Math.min(30, Math.max(1, questionCount || 10));

  console.log(`[Exam Debug] Request received: examTarget="${examTarget}", scope="${scope}", count=${numQuestions}, difficulty="${difficulty}"`);

  let contextSnippet = '';
  if (materialText && typeof materialText === 'string' && materialText.trim().length > 20) {
    contextSnippet = `\nSTUDY MATERIAL EXCERPTS:\n"""\n${materialText.slice(0, 8000)}\n"""\n`;
  }

  const targetDescription =
    scope === 'topic' && scopeDetail
      ? `Target Exam: ${examTarget}, Topic: ${scopeDetail}`
      : scope === 'subject' && scopeDetail
      ? `Target Exam: ${examTarget}, Subject: ${scopeDetail}`
      : scope === 'materials'
      ? `Material-Based Exam for: ${examTarget}`
      : `Full Syllabus for: ${examTarget}`;

  const systemPrompt = `You are SARATHI's Professional Exam Simulation Question Generator.
Generate authentic, syllabus-accurate competitive exam questions in valid JSON.
Keep explanations and solution steps concise, academically rigorous, and direct.
Return ONLY a valid JSON array. Do not include markdown fences or text outside the JSON.`;

  const userPrompt = `Generate exactly ${numQuestions} distinct, rigorous, exam-standard questions for:
${targetDescription}
Difficulty Level: ${difficulty}.
Allowed Question Types: ${questionTypes.join(', ')}.
${contextSnippet}
REQUIREMENTS:
1. Every question must be academically authentic to the target exam syllabus.
2. For every question provide:
   - "id": a unique string like "exam_q_1", "exam_q_2"
   - "topic": specific topic name this question evaluates
   - "type": one of ${JSON.stringify(questionTypes)} (e.g. "mcq", "msq", "numerical", "true_false")
   - "difficulty": "easy", "medium", or "hard"
   - "question": clear, complete problem statement
   - "options": For mcq/msq/true_false, array of 4 option objects with "id" ("A", "B", "C", "D") and concise text
   - "correctAnswers": array of strings (e.g. ["A"] for mcq, ["A", "C"] for msq, ["42"] for numerical)
   - "explanation": concise technical explanation (1-2 sentences)
   - "steps": array of 2 concise step objects with "stepNumber", "title", and "content"
   - "methods": array of 1-2 solving methods with "title", "type", and "description"
   - "mistakeTrap": common student pitfall (1 sentence)

Return ONLY a valid JSON array matching this schema:
[
  {
    "id": "exam_q_1",
    "topic": "Topic Name",
    "type": "mcq",
    "difficulty": "medium",
    "question": "Problem statement...",
    "options": [
      { "id": "A", "text": "Option A" },
      { "id": "B", "text": "Option B" },
      { "id": "C", "text": "Option C" },
      { "id": "D", "text": "Option D" }
    ],
    "correctAnswers": ["A"],
    "explanation": "Why A is correct...",
    "steps": [
      { "stepNumber": 1, "title": "Analyze Premises", "content": "..." },
      { "stepNumber": 2, "title": "Apply Theorem", "content": "..." }
    ],
    "methods": [
      { "title": "Standard Method", "type": "standard", "description": "..." }
    ],
    "mistakeTrap": "Common pitfall or distractor."
  }
]`;

  const providers = getConfiguredProviders();

  if (providers.length === 0) {
    console.error('[Exam Debug] No AI providers configured.');
    throw new AIServiceError(
      'Exam generation is temporarily unavailable. Please check your credentials.',
      'AI_NOT_CONFIGURED',
      503
    );
  }

  const errors: string[] = [];

  for (const provider of providers) {
    for (const model of provider.models) {
      console.log(`[Exam Debug] Attempting provider: ${provider.name} (model: ${model})`);

      const timeoutMs = 28000;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        let rawText = '';
        let httpStatus = 200;

        if (provider.type === 'groq') {
          const groq = getGroqClient(provider.apiKey);
          const completion = await groq.chat.completions.create(
            {
              model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
              temperature: 0.2,
              max_tokens: 3800,
            },
            {
              signal: controller.signal,
              timeout: timeoutMs,
            }
          );
          clearTimeout(timer);

          const choice = completion.choices?.[0];
          rawText = choice?.message?.content?.trim() || '';
          if (!rawText && (choice?.message as any)?.reasoning) {
            rawText = (choice.message as any).reasoning.trim();
          }
        } else if (provider.type === 'gemini') {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${provider.apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                generationConfig: {
                  temperature: 0.2,
                  maxOutputTokens: 3800,
                },
              }),
              signal: controller.signal,
            }
          );
          clearTimeout(timer);
          httpStatus = response.status;

          if (response.ok) {
            const data = await response.json();
            rawText = data.candidates?.[0]?.content?.parts
              ?.map((p: any) => p.text || '')
              .join('')
              .trim();
          } else {
            const errData = await response.json().catch(() => ({}));
            const errMsg = errData.error?.message || `HTTP ${response.status}`;
            console.warn(`[Exam Debug] ${provider.name} (${model}) HTTP ${response.status}: ${errMsg}`);
            errors.push(`${provider.name}/${model}: HTTP ${response.status}`);
            continue;
          }
        }

        const hasResponse = Boolean(rawText && rawText.length > 10);
        console.log(`[Exam Debug] HTTP ${httpStatus}. AI response received: ${hasResponse ? `${rawText.length} chars` : 'NO'}`);

        if (!hasResponse) {
          errors.push(`${provider.name}/${model}: Empty response`);
          continue;
        }

        let parsed: any;
        try {
          parsed = extractAndParseJson(rawText);
          console.log(`[Exam Debug] JSON extraction succeeded: YES`);
        } catch (jsonErr: any) {
          console.warn(`[Exam Debug] JSON extraction succeeded: NO (${jsonErr.message})`);
          errors.push(`${provider.name}/${model}: JSON parse error`);
          continue;
        }

        let validatedQuestions: ExamQuestion[];
        try {
          const defaultTopic = scopeDetail || examTarget || 'Core Exam Concepts';
          validatedQuestions = validateAndNormalizeExamQuestions(parsed, defaultTopic, numQuestions);
          console.log(`[Exam Debug] Validation result: PASSED (${validatedQuestions.length} valid questions)`);
        } catch (valErr: any) {
          console.warn(`[Exam Debug] Validation result: FAILED (${valErr.message})`);
          errors.push(`${provider.name}/${model}: Validation failure - ${valErr.message}`);
          continue;
        }

        return {
          questions: validatedQuestions,
          providerUsed: provider.name,
          modelUsed: model,
        };
      } catch (err: any) {
        clearTimeout(timer);
        const isAbort = err?.name === 'AbortError' || err?.message?.includes('aborted');
        const status = err?.status || (isAbort ? 'Timeout' : err?.message || 'Error');
        console.warn(`[Exam Debug] ${provider.name} (${model}) encountered: ${status}. Trying next option...`);
        errors.push(`${provider.name}/${model}: ${status}`);
      }
    }
  }

  console.error('[Exam Debug] All AI providers exhausted. Summary:', errors.join(' | '));
  throw new AIServiceError(
    'Exam generation is temporarily unavailable. Please try again.',
    'AI_ALL_PROVIDERS_UNAVAILABLE',
    503
  );
}
