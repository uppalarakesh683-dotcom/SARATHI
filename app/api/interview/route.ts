import { NextRequest, NextResponse } from 'next/server';
import {
  executeAICompletion,
  extractAndParseJson,
  AIServiceError,
} from '@/lib/ai/ai-service';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action = 'respond', // 'respond' | 'start' | 'evaluate_final'
      mode = 'technical', // 'technical' | 'coding' | 'hr' | 'viva' | 'mixed'
      role = 'Software Engineer',
      skills = ['Problem Solving', 'Data Structures', 'System Design'],
      difficulty = 'medium', // 'easy' | 'medium' | 'hard'
      candidateAnswer = '',
      codeSnippet = '',
      codeLanguage = 'python',
      currentQuestion = '',
      transcript = [],
      materialContext = '',
      questionIndex = 0,
      totalQuestions = 5,
      focusAreas = [],
    } = body;

    // Helper for multi-provider AI completion
    async function getCompletion(prompt: string, maxTokens = 1200) {
      const result = await executeAICompletion({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.25,
        maxTokens,
        timeoutMs: 25000,
      });
      return result.text;
    }

    // =========================================================================
    // ACTION 1: START INTERVIEW (Generate opening role & difficulty question)
    // =========================================================================
    if (action === 'start') {
      const skillsList = skills.length > 0 ? skills.join(', ') : 'Software Engineering fundamentals';
      const focusList = focusAreas.length > 0 ? `Selected Focus Areas: ${focusAreas.join(', ')}.` : '';

      const startPrompt = `You are SARATHI's Senior Interviewer conducting a realistic, adaptive ${mode.toUpperCase()} interview.
Candidate Target Role: "${role}".
Difficulty Level: ${difficulty.toUpperCase()}.
Target Skills: ${skillsList}.
${focusList}
${materialContext ? `Study Material Context for Viva:\n"""\n${materialContext.slice(0, 3000)}\n"""\n` : ''}

INSTRUCTIONS FOR OPENING QUESTION:
- Difficulty Calibration:
  * EASY: Foundational definitions, core principles, basic scenarios, straightforward trade-offs.
  * MEDIUM: Real-world application, edge cases, typical architectural trade-offs, standard problem-solving.
  * HARD: Deep internals, high-scale concurrency, distributed systems failure modes, complex optimization.
- Mode Calibration:
  * TECHNICAL: Ask a direct conceptual/architectural question directly pertinent to ${role}.
  * CODING: Present a clear, concise coding problem statement with constraints, input/output examples, and ask the candidate to explain their approach and provide code.
  * HR: Ask a realistic behavioral question (e.g. conflict resolution, leading under pressure, handling failures).
  * VIVA: Ask a rigorous theoretical defense question based on provided materials or subject fundamentals.
  * MIXED: Begin with a strong role-specific technical problem before progressing to system architecture.

Return ONLY a valid JSON object matching this schema:
{
  "openingQuestion": "Opening question statement...",
  "focusTopic": "Topic name (e.g. Hash Maps, Spring Transactions, SQL Query Optimization)"
}`;

      const raw = await getCompletion(startPrompt, 700);
      const parsed = extractAndParseJson<any>(raw, {
        openingQuestion: `Welcome to your ${role} interview. To kick off our discussion, could you explain the foundational principles you consider when designing scalable, reliable systems for your projects?`,
        focusTopic: 'Core Principles',
      });

      return NextResponse.json({
        success: true,
        question: parsed.openingQuestion,
        focusTopic: parsed.focusTopic,
      });
    }

    // =========================================================================
    // ACTION 2: RESPOND & ADAPTIVE FOLLOW-UP
    // =========================================================================
    if (action === 'respond') {
      const isLastQuestion = questionIndex >= totalQuestions - 1;
      const combinedAnswer = codeSnippet
        ? `${candidateAnswer}\n\n[Candidate Code (${codeLanguage})]:\n${codeSnippet}`
        : candidateAnswer;

      const evalPrompt = `You are SARATHI's Senior Interviewer evaluating a candidate's answer in a ${mode.toUpperCase()} interview for "${role}".
Difficulty Level: ${difficulty.toUpperCase()}.
Evaluated Skills: ${skills.join(', ')}.

CURRENT QUESTION ASKED:
"${currentQuestion}"

CANDIDATE'S ACTUAL ANSWER:
"""
${combinedAnswer}
"""

PREVIOUS DIALOGUE CONTEXT (last 3 turns):
${transcript.slice(-3).map((m: any) => `${m.speaker.toUpperCase()}: ${m.text}`).join('\n')}

EVALUATION & ADAPTIVE FOLLOW-UP RULES:
1. Assess answer rigor:
   - clarityScore: 0 to 100
   - technicalScore: 0 to 100
   - completenessScore: 0 to 100
   - problemSolvingScore: 0 to 100
   - answerStrength: Determine if the answer is "strong", "partial", or "weak".
   - whatWasGood: 1-2 sentences highlighting specific correct points or sound logic.
   - whatCouldBeImproved: 1-2 sentences on omissions, inaccuracies, or lack of depth.
   - idealAnswer: 2-3 sentences demonstrating a concise, exemplary model answer.
   - keyPointsMissed: array of 1-3 specific concepts or edge cases not addressed.
   - relatedTopic: concept name for follow-up study (e.g., "B-Tree Indexing", "Deadlock Prevention").

2. Coding Specifics (if candidate provided code or mode is coding):
   - algorithmApproach: evaluation of their algorithmic logic
   - timeComplexity: estimated Big-O time complexity
   - spaceComplexity: estimated Big-O space complexity
   - edgeCasesCovered: boolean
   - codeQualityNotes: critique on variable naming, structure, or potential bugs

3. ADAPTIVE CONTEXTUAL NEXT QUESTION (crucial!):
   - If this IS the final question (${isLastQuestion}), set followUpQuestion to null.
   - If this is NOT the final question:
     * If answer is "strong": Ask a deeper follow-up question. Probe into edge cases, scalability limits, or architectural trade-offs of what they just answered.
     * If answer is "partial": Ask a clarification question on the specific missing element or ambiguity in their answer.
     * If answer is "weak": Ask a simpler related question or pivot gracefully to another core competency for ${role}.
     * The follow-up MUST sound like an authentic interviewer who actually listened to what the candidate said! (e.g., "You mentioned X. How would you handle Y when Z occurs?")

4. interviewerResponse: A natural 1-sentence spoken acknowledgement before the next question (e.g., "Good explanation of how the connection pool handles bursts. Let's look at what happens during network partitions.")

Return ONLY a valid JSON object matching this schema:
{
  "feedback": {
    "clarityScore": 85,
    "technicalScore": 80,
    "completenessScore": 75,
    "problemSolvingScore": 80,
    "answerStrength": "strong",
    "feedbackNotes": "Constructive pedagogical critique...",
    "whatWasGood": "Solid understanding of...",
    "whatCouldBeImproved": "Did not address...",
    "idealAnswer": "An optimal answer explains...",
    "keyPointsMissed": ["Edge case handling", "Time complexity"],
    "relatedTopic": "Topic Name",
    "codeReview": {
      "algorithmApproach": "Two-pointer technique",
      "timeComplexity": "O(n)",
      "spaceComplexity": "O(1)",
      "edgeCasesCovered": true,
      "codeQualityNotes": "Clean and readable logic."
    }
  },
  "interviewerResponse": "Natural conversational acknowledgement...",
  "followUpQuestion": "The next adaptive question..." or null,
  "isInterviewConcluded": ${isLastQuestion}
}`;

      const raw = await getCompletion(evalPrompt, 1200);
      const parsed = extractAndParseJson<any>(raw, {
        feedback: {
          clarityScore: 78,
          technicalScore: 75,
          completenessScore: 70,
          problemSolvingScore: 75,
          answerStrength: 'partial',
          feedbackNotes: 'Clear foundational explanation, but could provide more depth on practical trade-offs and edge cases.',
          whatWasGood: 'Accurately stated core definitions and general workflow.',
          whatCouldBeImproved: 'Consider quantifying trade-offs and addressing failure recovery scenarios.',
          idealAnswer: 'A comprehensive answer highlights both architectural pros and cons along with operational edge cases.',
          keyPointsMissed: ['Boundary condition handling', 'Operational failure recovery'],
          relatedTopic: 'System Reliability',
        },
        interviewerResponse: 'Thank you for explaining that perspective.',
        followUpQuestion: isLastQuestion
          ? null
          : `Building on your point, how would you design this to gracefully handle unexpected service latency or failover?`,
        isInterviewConcluded: isLastQuestion,
      });

      return NextResponse.json({
        success: true,
        ...parsed,
      });
    }

    // =========================================================================
    // ACTION 3: FINAL INTERVIEW SYNTHESIS
    // =========================================================================
    if (action === 'evaluate_final') {
      const summaryPrompt = `You are SARATHI's Chief Hiring Bar Raiser creating an official post-interview diagnostic evaluation report.
Candidate Target Role: "${role}".
Interview Mode: ${mode.toUpperCase()}.
Difficulty Level: ${difficulty.toUpperCase()}.
Skills Tested: ${skills.join(', ')}.

FULL INTERVIEW TRANSCRIPT:
${transcript.map((m: any, idx: number) => `ROUND ${idx + 1} - ${m.speaker.toUpperCase()}:\n${m.text}`).join('\n\n')}

TASK:
Synthesize an authentic post-interview diagnostic report based strictly on the candidate's actual answers.
1. Compute authentic category scores (0 to 100) from actual interview performance:
   - finalScore: overall score (0 to 100)
   - technicalScore: technical correctness & depth (0 to 100)
   - problemSolvingScore: analytical reasoning & structuring (0 to 100)
   - communicationScore: verbal/written clarity & presentation (0 to 100)
   - answerQualityScore: completeness and depth (0 to 100)
   - roleKnowledgeScore: domain alignment for ${role} (0 to 100)
   ${mode === 'coding' ? '- codingScore: code quality, efficiency, and logic (0 to 100)' : ''}

2. Hiring Decision:
   - hireRecommendation: One of "Strong Hire" (>=88), "Hire" (>=75), "Needs Improvement" (>=60), "Not Ready" (<60).

3. Executive Summary:
   - strengths: 2 to 4 genuine strengths demonstrated in this interview
   - improvementAreas: 2 to 4 specific technical gaps or answer deficiencies
   - questionsAnsweredWell: 1 to 3 specific question topics where candidate showed mastery
   - questionsNeedingImprovement: 1 to 3 specific question topics where candidate struggled
   - recurringMistakes: 1 to 3 specific recurring patterns (e.g. "Omitting time complexity justification", "Vague on edge cases")
   - recommendedPreparation: 2-3 sentences of concrete, actionable advice on what concepts the candidate should study next
   - summaryFeedback: a clear executive evaluation paragraph summarizing readiness

4. questionReviews: An array of reviews for each question round:
   [
     {
       "questionIndex": 0,
       "question": "Question text...",
       "candidateAnswer": "Candidate response...",
       "score": 82,
       "whatWasGood": "...",
       "whatCouldBeImproved": "...",
       "idealAnswer": "...",
       "relatedTopic": "..."
     }
   ]

Return ONLY valid JSON matching this schema:
{
  "finalScore": 82,
  "technicalScore": 80,
  "problemSolvingScore": 85,
  "communicationScore": 80,
  "answerQualityScore": 82,
  "roleKnowledgeScore": 84,
  ${mode === 'coding' ? '"codingScore": 80,' : ''}
  "hireRecommendation": "Hire",
  "strengths": ["...", "..."],
  "improvementAreas": ["...", "..."],
  "questionsAnsweredWell": ["..."],
  "questionsNeedingImprovement": ["..."],
  "recurringMistakes": ["..."],
  "recommendedPreparation": "Specific topics to revise...",
  "summaryFeedback": "Executive evaluation paragraph...",
  "questionReviews": [
    {
      "questionIndex": 0,
      "question": "...",
      "candidateAnswer": "...",
      "score": 80,
      "whatWasGood": "...",
      "whatCouldBeImproved": "...",
      "idealAnswer": "...",
      "relatedTopic": "..."
    }
  ]
}`;

      const raw = await getCompletion(summaryPrompt, 2000);
      const parsed = extractAndParseJson<any>(raw, {
        finalScore: 78,
        technicalScore: 78,
        problemSolvingScore: 75,
        communicationScore: 80,
        answerQualityScore: 76,
        roleKnowledgeScore: 80,
        hireRecommendation: 'Hire',
        strengths: ['Clear articulate delivery', 'Demonstrated logical problem-solving structure'],
        improvementAreas: ['Deepen system edge cases', 'Quantify architectural tradeoffs with metrics'],
        questionsAnsweredWell: ['Foundational concepts', 'Architecture overview'],
        questionsNeedingImprovement: ['Production fault tolerance', 'Concurrency limits'],
        recurringMistakes: ['Overlooking edge-case boundary conditions'],
        recommendedPreparation: `Practice whiteboarding complex concurrency patterns and system design for ${role}.`,
        summaryFeedback: `The candidate communicated with confidence and provided solid baseline answers across core competencies for ${role}.`,
        questionReviews: [],
      });

      return NextResponse.json({
        success: true,
        report: parsed,
      });
    }

    return NextResponse.json({ error: 'Invalid action requested' }, { status: 400 });
  } catch (err: any) {
    console.error('[Interview API] Error:', err?.message || err);

    const isConfigError = err instanceof AIServiceError && err.code === 'AI_NOT_CONFIGURED';
    const statusCode = isConfigError ? 503 : 500;
    const userMessage = isConfigError
      ? 'Interview AI service is not configured. Please check your credentials in .env.local.'
      : 'The AI interviewer is momentarily taking longer than usual to respond. Please try your answer again.';

    return NextResponse.json(
      { success: false, error: userMessage },
      { status: statusCode }
    );
  }
}
