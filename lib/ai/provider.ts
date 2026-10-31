import { LearningMode, ChatMessage } from '@/types/ai';
import { retrieveRelevantContext } from '@/lib/rag/retrieval';
import { buildTutorSystemPrompt, StudentTargetContext } from './prompts';
import { executeAICompletion, AIServiceError, ChatMessageParam } from './ai-service';

export interface AIResponsePayload {
  content: string;
  sources: {
    documentName: string;
    topic: string;
    pageNumber?: number;
    snippet: string;
    relevance: number;
  }[];
  suggestedPrompts: string[];
  isMaterialGrounded?: boolean;
}

export class AIProviderError extends Error {
  code: 'AI_NOT_CONFIGURED' | 'AI_REQUEST_FAILED';
  constructor(code: 'AI_NOT_CONFIGURED' | 'AI_REQUEST_FAILED', message: string) {
    super(message);
    this.code = code;
    this.name = 'AIProviderError';
  }
}

export async function askSarathiTutor(
  userQuery: string,
  mode: LearningMode = 'explain',
  history: { role: string; content: string }[] | ChatMessage[] = [],
  useMaterials = false,
  materialIdFilter?: string,
  studentTarget?: StudentTargetContext
): Promise<AIResponsePayload> {
  // Step 1: If useMaterials is enabled, perform RAG retrieval from student's knowledge base
  let ragResult = { sources: [] as any[], contextBlock: '', hasContext: false };

  if (useMaterials) {
    try {
      ragResult = retrieveRelevantContext(userQuery, 3, materialIdFilter);
    } catch (err) {
      console.warn('RAG retrieval skipped:', err);
    }

    // If student requested material grounding but no matching content exists
    if (!ragResult.hasContext) {
      return {
        content:
          "I couldn't find enough information in your uploaded materials to answer this confidently.\n\nWould you like me to answer using my general academic knowledge instead?",
        sources: [],
        suggestedPrompts: [
          'Ask SARATHI using general knowledge',
          'Search for a different concept in my notes',
        ],
        isMaterialGrounded: true,
      };
    }
  }

  // Step 2: Format conversation history
  const formattedHistory: ChatMessageParam[] = history.map((m: any) => {
    const isUser = m.role === 'user' || m.sender === 'user';
    return {
      role: isUser ? ('user' as const) : ('assistant' as const),
      content: String(m.content || ''),
    };
  });

  let systemPrompt = buildTutorSystemPrompt(mode, ragResult.contextBlock, studentTarget);

  // If using materials and context was found, add strict grounding instructions
  if (useMaterials && ragResult.hasContext) {
    systemPrompt += `\n\nSTRICT MATERIAL GROUNDING RULES:
1. Base your answer primarily on the provided source excerpts above.
2. Explain the material clearly and accurately without inventing unsupported claims.
3. If the provided excerpts do not contain enough information to address a specific aspect of the question, clearly say: "I couldn't find enough information in your uploaded materials to answer this confidently."
4. Reference the specific document name and page number when citing concepts.`;
  }

  // Step 3: Call Resilient Multi-Provider AI Service
  try {
    const messages: ChatMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...formattedHistory.slice(-8),
      { role: 'user', content: userQuery },
    ];

    const result = await executeAICompletion({
      messages,
      temperature: useMaterials ? 0.15 : mode === 'exam' || mode === 'practice' ? 0.2 : 0.35,
      maxTokens: 1800,
      timeoutMs: 22000,
    });

    if (result.text && result.text.trim().length > 0) {
      return {
        content: result.text.trim(),
        sources: ragResult.sources,
        suggestedPrompts: generateDynamicFollowUps(userQuery, mode, useMaterials),
        isMaterialGrounded: useMaterials,
      };
    }
  } catch (err: any) {
    console.error('[Tutor Provider] Completion failed:', err?.message || err);

    if (err instanceof AIServiceError && err.code === 'AI_NOT_CONFIGURED') {
      throw new AIProviderError(
        'AI_NOT_CONFIGURED',
        "AI service isn't configured yet. Please configure GROQ_API_KEY in .env.local."
      );
    }
  }

  throw new AIProviderError(
    'AI_REQUEST_FAILED',
    "SARATHI is currently experiencing high load. Please try again in a few moments."
  );
}

function generateDynamicFollowUps(
  query: string,
  currentMode: LearningMode,
  usingMaterials = false
): string[] {
  if (usingMaterials) {
    return [
      'Explain this using more details from my notes',
      'Give me an example from this material',
      'Generate a practice question from this topic',
    ];
  }

  const cleanQuery = query.trim().replace(/[?!.]+$/, '');
  const subjectTopic = cleanQuery.length > 30 ? cleanQuery.slice(0, 30) + '...' : cleanQuery;

  if (currentMode === 'practice') {
    return [
      `Explain the detailed step-by-step solution for ${subjectTopic}`,
      'Give me a harder question on this topic',
      'Summarize key formulas and shortcuts for this concept',
    ];
  }

  if (currentMode === 'exam') {
    return [
      `What are the most common student traps in ${subjectTopic}?`,
      'Show me a previous competitive exam question on this concept',
      'Give me a rapid 3-point revision summary',
    ];
  }

  if (currentMode === 'simple') {
    return [
      'Can you give me another real-world analogy for this?',
      'How does this work behind the scenes in simple terms?',
      'Test my basic understanding with a quick question',
    ];
  }

  if (currentMode === 'step_by_step') {
    return [
      'Show me a complete numerical or code walkthrough',
      'Why is step 2 necessary in this derivation?',
      'What happens if the initial assumptions change?',
    ];
  }

  return [
    `Can you give me a concrete example of ${subjectTopic}?`,
    'Explain the underlying theoretical principles in detail',
    'Test my understanding with a realistic assessment question',
  ];
}
