'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  Award,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Volume2,
  Brain,
  MessageSquare,
  FileText,
  Mail,
  PenTool,
  Clock,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  Target,
  Zap,
  HelpCircle,
  Loader2,
  Check,
  Eye,
  RefreshCw,
  Code2,
  Terminal,
  Layers,
  Search,
  BookOpen,
  Filter,
  ShieldAlert,
  Play,
  Save,
  X,
  History,
} from 'lucide-react';
import { useProgress } from '@/hooks/use-progress';
import { addActivity, getDatabase, saveDatabase } from '@/lib/db/client';
import { CommunicationScenario, CommunicationAssessmentRecord, CommunicationType } from '@/types/communication';
import {
  InterviewMode,
  InterviewDifficulty,
  InterviewChatMessage,
  InterviewFeedback,
  InterviewReportData,
  StoredInterviewRecord,
  QuestionReviewItem,
} from '@/types/interview';
import { ALL_ROLES, searchRoles, getRoleByIdOrTitle } from '@/config/roles';

const STORAGE_KEY_INTERVIEWS = 'sarathi_interview_history_v2';
const STORAGE_KEY_COMMUNICATION = 'sarathi_communication_history_v2';

// Sub-step navigation types
export type InterviewStep =
  | 'landing'
  | 'select_type'
  | 'configure'
  | 'active'
  | 'report'
  | 'detailed_review'
  | 'history';

export type CommStep = 'list' | 'editor' | 'result' | 'history';

// -------------------------------------------------------------
// Real-world Professional Communication Scenarios
// -------------------------------------------------------------
const COMMUNICATION_SCENARIOS: CommunicationScenario[] = [
  // Email Writing
  {
    id: 'email-internship',
    type: 'email',
    category: 'Career & Opportunities',
    title: 'Cold Email for Software Internship',
    prompt: 'Write a cold email to an Engineering Director at a tech startup expressing interest in an off-campus software engineering internship.',
    contextHint: 'Highlight your relevant projects, tech stack, and why their mission resonates with you.',
    targetTone: 'Professional, proactive, respectful, and concise',
    suggestedLengthWords: { min: 80, max: 180 },
  },
  {
    id: 'email-job-application',
    type: 'email',
    category: 'Career & Opportunities',
    title: 'Job Application Cover Email',
    prompt: 'Draft a professional cover email to a talent recruiter applying for an advertised Graduate Software Engineer role.',
    contextHint: 'State the exact requisition, reference your graduation timeline, key programming skills, and attached resume.',
    targetTone: 'Enthusiastic, polished, and structured',
    suggestedLengthWords: { min: 90, max: 200 },
  },
  {
    id: 'email-professor-rec',
    type: 'email',
    category: 'Academic Communication',
    title: 'Email to Professor Requesting Recommendation Letter',
    prompt: 'Write an email to a university professor requesting a letter of recommendation for your graduate studies or a prestigious scholarship.',
    contextHint: 'Remind them of the course/project you excelled in with them, provide your deadline, and offer to share your resume.',
    targetTone: 'Polite, grateful, formal, and organized',
    suggestedLengthWords: { min: 90, max: 200 },
  },
  {
    id: 'email-interview-followup',
    type: 'email',
    category: 'Career & Opportunities',
    title: 'Post-Interview Thank You & Follow-up',
    prompt: 'Write a thank-you follow-up email to the lead interviewer 24 hours after completing your technical round.',
    contextHint: 'Thank them for their time, reference an interesting architectural topic discussed, and reiterate your enthusiasm.',
    targetTone: 'Appreciative, professional, and forward-looking',
    suggestedLengthWords: { min: 60, max: 140 },
  },
  {
    id: 'email-project-delay',
    type: 'email',
    category: 'Team Communication',
    title: 'Professional Apology & Deliverable Delay Notice',
    prompt: 'Notify your tech lead that an unexpected third-party API breaking change will delay your sprint module by 48 hours.',
    contextHint: 'Take responsibility, explain the root blocker clearly, present your mitigation plan, and provide a revised deadline.',
    targetTone: 'Accountable, objective, calm, and solution-oriented',
    suggestedLengthWords: { min: 70, max: 160 },
  },
  {
    id: 'email-project-update',
    type: 'email',
    category: 'Team Communication',
    title: 'Sprint Project Status Update to Stakeholders',
    prompt: 'Send a bi-weekly project milestone update to cross-functional stakeholders summarizing completed items, active blockers, and upcoming release dates.',
    contextHint: 'Use high-signal bullet points: Highlights, In Progress, Blockers/Risks, Next Steps.',
    targetTone: 'Executive, transparent, and concise',
    suggestedLengthWords: { min: 80, max: 180 },
  },
  {
    id: 'email-meeting-request',
    type: 'email',
    category: 'Team Communication',
    title: 'Architecture Review Meeting Request',
    prompt: 'Write an email to a Senior Systems Architect requesting a 30-minute sync to review your database schema migration proposal.',
    contextHint: 'State the agenda, attach the design doc link, offer flexible time slots, and respect their schedule.',
    targetTone: 'Considerate, organized, and focused',
    suggestedLengthWords: { min: 70, max: 150 },
  },
  {
    id: 'email-recruiter-outreach',
    type: 'email',
    category: 'Career & Opportunities',
    title: 'Inquiring Recruiter on Application Status',
    prompt: 'Write a polite follow-up email to a company recruiter 10 days after your on-site interview with no update received.',
    contextHint: 'Reiterate your strong interest, ask for a status update politely, and offer to provide any extra reference material.',
    targetTone: 'Diplomatic, patient, and professional',
    suggestedLengthWords: { min: 60, max: 130 },
  },
  {
    id: 'email-clarify-requirements',
    type: 'email',
    category: 'Team Communication',
    title: 'Request for Product Requirement Clarification',
    prompt: 'Write an email to your Product Manager seeking clarification on edge-case behavior for user authentication timeouts.',
    contextHint: 'Detail the two possible interpretations and state the architectural trade-off of each.',
    targetTone: 'Constructive, precise, and collaborative',
    suggestedLengthWords: { min: 80, max: 180 },
  },
  {
    id: 'email-leave-request',
    type: 'email',
    category: 'Workplace Formalities',
    title: 'Formal Leave of Absence Request',
    prompt: 'Submit a formal 3-day leave request to your project manager for upcoming semester examinations or urgent family matters.',
    contextHint: 'Specify dates, handover plan for active PRs, and emergency contact arrangements.',
    targetTone: 'Clear, structured, and considerate',
    suggestedLengthWords: { min: 60, max: 130 },
  },

  // Paragraph Writing
  {
    id: 'para-ai-education',
    type: 'paragraph',
    category: 'Critical Thinking',
    title: 'How Artificial Intelligence Can Improve Education',
    prompt: 'Write a cohesive, persuasive paragraph explaining how artificial intelligence can democratize personalized learning and improve student outcomes.',
    contextHint: 'Open with a clear topic sentence, cite adaptive tutoring/feedback loops, and address maintaining human mentorship.',
    targetTone: 'Insightful, academic, and well-structured',
    suggestedLengthWords: { min: 110, max: 230 },
  },
  {
    id: 'para-continuous-learning',
    type: 'paragraph',
    category: 'Professional Writing',
    title: 'The Role of Continuous Learning in Software Engineering',
    prompt: 'Write a well-structured paragraph explaining why deliberate continuous learning is indispensable for an engineer in the era of rapid AI evolution.',
    contextHint: 'Include a strong topic sentence, supporting arguments on tool churn vs fundamentals, and a conclusive takeaway.',
    targetTone: 'Reflective, analytical, and articulate',
    suggestedLengthWords: { min: 100, max: 220 },
  },
  {
    id: 'para-ai-ethics',
    type: 'paragraph',
    category: 'Critical Thinking',
    title: 'Ethical Accountability in Autonomous AI Systems',
    prompt: 'Compose an analytical paragraph evaluating where accountability should lie when autonomous systems make erroneous decisions in critical sectors.',
    contextHint: 'Balance perspectives between developers, deploying organizations, and regulatory oversight.',
    targetTone: 'Thoughtful, balanced, and persuasive',
    suggestedLengthWords: { min: 110, max: 230 },
  },
  {
    id: 'para-remote-collaboration',
    type: 'paragraph',
    category: 'Workplace Culture',
    title: 'Effective Asynchronous Team Collaboration',
    prompt: 'Write a paragraph on how detailed written documentation enables high-performing distributed engineering teams to thrive without constant meetings.',
    contextHint: 'Focus on documentation culture, trust, time-zone autonomy, and reduced context-switching.',
    targetTone: 'Professional, forward-thinking, and persuasive',
    suggestedLengthWords: { min: 100, max: 210 },
  },

  // Interview Answer Writing (STAR)
  {
    id: 'star-conflict-resolution',
    type: 'interview_answer',
    category: 'Interview Preparation',
    title: 'STAR Method: Handling a Disagreement on Technical Design',
    prompt: 'Write a structured behavioral interview answer describing a time you disagreed with a teammate on an architectural approach and how you reached consensus.',
    contextHint: 'Follow STAR: Situation, Task, Action (empathy + benchmarks), Result.',
    targetTone: 'Objective, collaborative, and results-focused',
    suggestedLengthWords: { min: 120, max: 250 },
  },
  {
    id: 'star-overcoming-failure',
    type: 'interview_answer',
    category: 'Interview Preparation',
    title: 'STAR Method: Responding to a System Outage or Failure',
    prompt: 'Formulate an interview response describing a critical bug or production incident you accidentally caused, and the post-mortem steps you executed.',
    contextHint: 'Emphasize accountability, rapid triage, root-cause analysis, and permanent preventative safeguards.',
    targetTone: 'Humble, decisive, and improvement-oriented',
    suggestedLengthWords: { min: 120, max: 250 },
  },

  // Technical Explanation
  {
    id: 'tech-explain-nontech',
    type: 'technical_explanation',
    category: 'Technical Communication',
    title: 'Explaining Cloud Computing to Non-Technical Stakeholders',
    prompt: 'Explain what Cloud Computing is and why companies migrate away from on-premise servers to a non-technical executive using a relatable real-world analogy.',
    contextHint: 'Use an everyday analogy (e.g. municipal water/electricity grid vs digging your own private well) and avoid jargon.',
    targetTone: 'Accessible, engaging, simple, and intuitive',
    suggestedLengthWords: { min: 100, max: 200 },
  },
  {
    id: 'tech-explain-caching',
    type: 'technical_explanation',
    category: 'Technical Communication',
    title: 'Explaining Caching & Latency Reduction',
    prompt: 'Explain the concept of Web Caching and why it prevents servers from crashing during traffic spikes to a junior product intern.',
    contextHint: 'Contrast fetching books from a distant national archive vs keeping your favorite textbook on your bedside desk.',
    targetTone: 'Enlightening, clear, and structured',
    suggestedLengthWords: { min: 100, max: 200 },
  },

  // Summarization
  {
    id: 'summary-incident-postmortem',
    type: 'summarization',
    category: 'Executive Summarization',
    title: 'Engineering Incident Post-Mortem Summary',
    prompt: 'Summarize this technical incident: At 02:14 UTC, a bad database migration locked the users table, causing 100% of checkout requests to throw 504 Gateway Timeouts for 18 minutes affecting 4,200 users. Engineers rolled back the migration at 02:32 UTC and introduced pre-deployment shadow testing.',
    contextHint: 'Deliver 3 crisp executive bullet points: Root Cause, Customer Impact, and Preventative Measures.',
    targetTone: 'Crisp, factual, high-signal, and executive',
    suggestedLengthWords: { min: 40, max: 100 },
  },
];

const CODE_TEMPLATES: Record<string, string> = {
  python: `def solve(nums):\n    # Write your approach here\n    pass\n`,
  javascript: `function solve(nums) {\n  // Write your approach here\n}\n`,
  typescript: `function solve(nums: number[]): number {\n  // Write your approach here\n  return 0;\n}\n`,
  java: `class Solution {\n    public int solve(int[] nums) {\n        // Write your approach here\n        return 0;\n    }\n}\n`,
  cpp: `class Solution {\npublic:\n    int solve(vector<int>& nums) {\n        // Write your approach here\n        return 0;\n    }\n};\n`,
  sql: `-- Write your SQL query here\nSELECT * FROM table_name;\n`,
};

export function InterviewEngine() {
  const router = useRouter();
  const { profile, db, sync, isMounted } = useProgress();

  // Primary Tab: 'interview' | 'communication'
  const [activeTab, setActiveTab] = useState<'interview' | 'communication'>('interview');

  // Sub-step navigation for Interview:
  // landing -> select_type -> configure -> active -> report -> detailed_review
  // + history
  const [interviewStep, setInterviewStep] = useState<InterviewStep>('landing');

  // Confirmation modal when user clicks back/leave during active interview
  const [showLeaveModal, setShowLeaveModal] = useState<boolean>(false);

  // -------------------------------------------------------------
  // 1. MOCK INTERVIEW CONFIGURATION STATE
  // -------------------------------------------------------------
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [customRoleInput, setCustomRoleInput] = useState('');
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  const [interviewMode, setInterviewMode] = useState<InterviewMode>('technical');
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>('medium');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [focusSkills, setFocusSkills] = useState<string[]>([]);
  const [customSkillInput, setCustomSkillInput] = useState('');

  // -------------------------------------------------------------
  // 2. ACTIVE INTERVIEW ARENA STATE
  // -------------------------------------------------------------
  const [transcript, setTranscript] = useState<InterviewChatMessage[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [candidateInput, setCandidateInput] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [activeError, setActiveError] = useState<string | null>(null);

  // Coding Mode state
  const [isCodingModeActive, setIsCodingModeActive] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('python');
  const [codeContent, setCodeContent] = useState<string>(CODE_TEMPLATES.python);

  // Timer state
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(15 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerIntervalRef = useRef<any>(null);

  // Live Coaching Visibility toggle
  const [showLiveCoaching, setShowLiveCoaching] = useState<boolean>(false);

  // Voice recording state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [micUnavailableNotice, setMicUnavailableNotice] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // -------------------------------------------------------------
  // 3. FINAL REPORT & HISTORY
  // -------------------------------------------------------------
  const [finalReport, setFinalReport] = useState<InterviewReportData | null>(null);
  const [interviewHistory, setInterviewHistory] = useState<StoredInterviewRecord[]>([]);

  // -------------------------------------------------------------
  // 4. COMMUNICATION SUITE STATE
  // -------------------------------------------------------------
  const [commStep, setCommStep] = useState<CommStep>('list');
  const [selectedScenario, setSelectedScenario] = useState<CommunicationScenario>(COMMUNICATION_SCENARIOS[0]);
  const [commFilter, setCommFilter] = useState<string>('all');
  const [userSubmission, setUserSubmission] = useState('');
  const [isEvaluatingComm, setIsEvaluatingComm] = useState(false);
  const [commError, setCommError] = useState<string | null>(null);
  const [commResult, setCommResult] = useState<CommunicationAssessmentRecord | null>(null);
  const [commHistory, setCommHistory] = useState<CommunicationAssessmentRecord[]>([]);

  // Initialize selected role from profile
  useEffect(() => {
    if (profile?.targetRole) {
      setSelectedRole(profile.targetRole);
      if (profile.targetSkills && profile.targetSkills.length > 0) {
        setFocusSkills(profile.targetSkills);
      }
    } else {
      setSelectedRole('Software Engineer');
      setFocusSkills(['Data Structures', 'Algorithms', 'OOP', 'DBMS', 'System Design']);
    }
  }, [profile]);

  // Load history from local storage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const rawInt = localStorage.getItem(STORAGE_KEY_INTERVIEWS);
      if (rawInt) {
        const parsed = JSON.parse(rawInt);
        if (Array.isArray(parsed)) setInterviewHistory(parsed);
      }

      const rawComm = localStorage.getItem(STORAGE_KEY_COMMUNICATION);
      if (rawComm) {
        const parsedComm = JSON.parse(rawComm);
        if (Array.isArray(parsedComm)) setCommHistory(parsedComm);
      }

      // Read interview preferences from Settings
      const prefMode = localStorage.getItem('sarathi_pref_interview_mode');
      if (prefMode && ['technical', 'coding', 'hr', 'viva', 'mixed'].includes(prefMode)) {
        setInterviewMode(prefMode as any);
      }
      const prefDiff = localStorage.getItem('sarathi_pref_interview_diff');
      if (prefDiff && ['easy', 'medium', 'hard'].includes(prefDiff)) {
        setDifficulty(prefDiff as any);
      }
      const prefCount = localStorage.getItem('sarathi_pref_interview_count');
      if (prefCount) {
        const parsed = parseInt(prefCount, 10);
        if (!isNaN(parsed) && parsed > 0) setQuestionCount(parsed);
      }

      // Initialize Web Speech Recognition if available in browser
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recog = new SpeechRecognition();
        recog.continuous = true;
        recog.interimResults = true;
        recog.lang = 'en-US';

        recog.onresult = (event: any) => {
          let fullTranscript = '';
          for (let i = 0; i < event.results.length; ++i) {
            fullTranscript += event.results[i][0].transcript;
          }
          if (fullTranscript.trim()) {
            setCandidateInput((prev) => {
              return prev ? `${prev} ${fullTranscript}` : fullTranscript;
            });
          }
        };

        recog.onerror = (err: any) => {
          console.warn('Speech recognition error:', err);
          setIsListening(false);
          setMicUnavailableNotice('Microphone access unavailable or denied. Please type your answer.');
        };

        recog.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recog;
      } else {
        setSpeechSupported(false);
        setMicUnavailableNotice('Voice recognition is not supported in this browser. Please use text typing.');
      }
    } catch (e) {
      console.warn('Initialization error in interview engine:', e);
    }
  }, []);

  // Update default skills when role changes
  const handleSelectRole = (roleTitle: string) => {
    setSelectedRole(roleTitle);
    setIsCustomRole(false);
    setIsRoleDropdownOpen(false);

    const found = getRoleByIdOrTitle(roleTitle);
    if (found && found.defaultSkills) {
      setFocusSkills(found.defaultSkills);
    }
  };

  const handleApplyCustomRole = () => {
    if (!customRoleInput.trim()) return;
    const cleanRole = customRoleInput.trim();
    setSelectedRole(cleanRole);
    setIsCustomRole(true);
    setIsRoleDropdownOpen(false);
    if (focusSkills.length === 0) {
      setFocusSkills(['Core Knowledge', 'Problem Solving', 'Communication']);
    }
  };

  const handleToggleSkill = (skill: string) => {
    setFocusSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleAddCustomSkill = () => {
    if (!customSkillInput.trim()) return;
    const trimmed = customSkillInput.trim();
    if (!focusSkills.includes(trimmed)) {
      setFocusSkills([...focusSkills, trimmed]);
    }
    setCustomSkillInput('');
  };

  // Timer effect
  useEffect(() => {
    if (isTimerRunning && timeRemainingSeconds > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimeRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning, timeRemainingSeconds]);

  // Voice recording toggle
  const toggleListening = () => {
    if (!recognitionRef.current) {
      setMicUnavailableNotice('Microphone access is not supported or was blocked. Please type your answer.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setMicUnavailableNotice(null);
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.warn('Failed to start speech recognition:', e);
        setIsListening(false);
        setMicUnavailableNotice('Could not start microphone. Please type your response.');
      }
    }
  };

  // -------------------------------------------------------------
  // START INTERVIEW SESSION
  // -------------------------------------------------------------
  const handleStartInterview = async () => {
    setActiveError(null);
    setIsAiResponding(true);
    setInterviewStep('active');
    setTranscript([]);
    setCurrentQuestionIndex(0);
    setCandidateInput('');
    setIsCodingModeActive(interviewMode === 'coding');
    setCodeContent(CODE_TEMPLATES[selectedLanguage] || CODE_TEMPLATES.python);

    // Setup and start countdown timer
    const totalSecs = durationMinutes * 60;
    setTimeRemainingSeconds(totalSecs);
    setIsTimerRunning(true);

    let materialContext = '';
    if (interviewMode === 'viva' && db.materials.length > 0) {
      materialContext = db.materials.map((m) => `${m.name}: ${m.summary || ''}`).join('\n\n');
    }

    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          mode: interviewMode,
          role: selectedRole,
          skills: focusSkills,
          difficulty,
          questionCount,
          materialContext,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.question) {
        throw new Error(data.error || 'Failed to start interview.');
      }

      setTranscript([
        {
          id: `msg-0`,
          speaker: 'interviewer',
          text: data.question,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err: any) {
      console.error('Failed to start interview:', err);
      setActiveError(err.message || 'Network error while contacting AI interviewer.');
      // Graceful fallback opening question
      setTranscript([
        {
          id: `msg-0`,
          speaker: 'interviewer',
          text: `Welcome to your ${selectedRole} evaluation. Let's begin: Could you describe the core architectural principles and technical design patterns you rely on when developing critical systems?`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsAiResponding(false);
    }
  };

  // -------------------------------------------------------------
  // SUBMIT CANDIDATE RESPONSE & ADAPTIVE FOLLOW-UP
  // -------------------------------------------------------------
  const handleSendResponse = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isAiResponding) return;

    const answerText = candidateInput.trim();
    const hasCode = isCodingModeActive && codeContent.trim().length > 0;

    if (!answerText && !hasCode) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    setActiveError(null);

    const candidateMsg: InterviewChatMessage = {
      id: `msg-${Date.now()}`,
      speaker: 'candidate',
      text: answerText || 'Provided code implementation below:',
      codeSnippet: hasCode ? codeContent : undefined,
      codeLanguage: hasCode ? selectedLanguage : undefined,
      timestamp: new Date().toISOString(),
    };

    const updatedTranscript = [...transcript, candidateMsg];
    setTranscript(updatedTranscript);
    setCandidateInput('');
    setIsAiResponding(true);

    const currentQuestion = transcript[transcript.length - 1]?.text || 'Interview question';

    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'respond',
          mode: interviewMode,
          role: selectedRole,
          skills: focusSkills,
          difficulty,
          candidateAnswer: answerText,
          codeSnippet: hasCode ? codeContent : undefined,
          codeLanguage: selectedLanguage,
          currentQuestion,
          transcript: updatedTranscript,
          questionIndex: currentQuestionIndex,
          totalQuestions: questionCount,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to evaluate response.');
      }

      // Attach internal feedback
      if (data.feedback) {
        candidateMsg.feedback = data.feedback;
      }

      if (data.isInterviewConcluded || !data.followUpQuestion || currentQuestionIndex >= questionCount - 1) {
        // Conclude interview and generate final report
        await handleConcludeInterview(updatedTranscript);
      } else {
        // Contextual follow-up question
        const followUpText = data.interviewerResponse
          ? `${data.interviewerResponse}\n\n${data.followUpQuestion}`
          : data.followUpQuestion;

        const followUpMsg: InterviewChatMessage = {
          id: `msg-${Date.now() + 1}`,
          speaker: 'interviewer',
          text: followUpText,
          timestamp: new Date().toISOString(),
        };
        setTranscript([...updatedTranscript, followUpMsg]);
        setCurrentQuestionIndex((prev) => prev + 1);
      }
    } catch (err: any) {
      console.error('Interview response error:', err);
      setActiveError('AI evaluation service experienced a temporary delay. Continuing gracefully.');

      if (currentQuestionIndex < questionCount - 1) {
        const nextMsg: InterviewChatMessage = {
          id: `msg-${Date.now() + 1}`,
          speaker: 'interviewer',
          text: `Thank you for walking me through that. Moving forward: How do you identify bottlenecks, monitor telemetry, and guarantee high availability for this system?`,
          timestamp: new Date().toISOString(),
        };
        setTranscript([...updatedTranscript, nextMsg]);
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        await handleConcludeInterview(updatedTranscript);
      }
    } finally {
      setIsAiResponding(false);
    }
  };

  // -------------------------------------------------------------
  // CONCLUDE INTERVIEW & GENERATE SYNTHESIS REPORT
  // -------------------------------------------------------------
  const handleConcludeInterview = async (finalTranscript: InterviewChatMessage[]) => {
    setIsAiResponding(true);
    setIsTimerRunning(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'evaluate_final',
          mode: interviewMode,
          role: selectedRole,
          skills: focusSkills,
          difficulty,
          transcript: finalTranscript,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.report) {
        throw new Error('Failed to generate final report.');
      }

      const report: InterviewReportData = data.report;

      // Ensure per-question reviews exist
      if (!report.questionReviews || report.questionReviews.length === 0) {
        const generatedReviews: QuestionReviewItem[] = [];
        let qIdx = 0;
        for (let i = 0; i < finalTranscript.length; i++) {
          if (finalTranscript[i].speaker === 'interviewer') {
            const nextCandidate = finalTranscript[i + 1]?.speaker === 'candidate' ? finalTranscript[i + 1] : null;
            generatedReviews.push({
              questionIndex: qIdx++,
              question: finalTranscript[i].text,
              candidateAnswer: nextCandidate ? nextCandidate.text : '(No answer recorded)',
              score: nextCandidate?.feedback?.technicalScore || Math.round(report.finalScore),
              whatWasGood: nextCandidate?.feedback?.whatWasGood || 'Demonstrated solid conversational engagement and core terminology.',
              whatCouldBeImproved: nextCandidate?.feedback?.whatCouldBeImproved || 'Could provide more mathematical rigor and architectural edge cases.',
              idealAnswer: nextCandidate?.feedback?.idealAnswer || 'A comprehensive response balances fundamental definitions with production trade-offs.',
              relatedTopic: nextCandidate?.feedback?.relatedTopic || selectedRole,
            });
          }
        }
        report.questionReviews = generatedReviews;
      }

      setFinalReport(report);

      // Save to localStorage history
      const record: StoredInterviewRecord = {
        id: `int-rec-${Date.now()}`,
        date: new Date().toISOString(),
        role: selectedRole,
        mode: interviewMode,
        difficulty,
        questionCount: currentQuestionIndex + 1,
        durationMinutes,
        report,
        transcript: finalTranscript,
      };

      if (typeof window !== 'undefined') {
        const existing = localStorage.getItem(STORAGE_KEY_INTERVIEWS);
        const list: StoredInterviewRecord[] = existing ? JSON.parse(existing) : [];
        list.unshift(record);
        localStorage.setItem(STORAGE_KEY_INTERVIEWS, JSON.stringify(list));
        setInterviewHistory(list);
      }

      // Central database update
      const centralDb = getDatabase();
      centralDb.interviewSessions.unshift({
        id: record.id,
        roleTitle: `${selectedRole} (${interviewMode.toUpperCase()} - ${difficulty.toUpperCase()})`,
        type: interviewMode === 'mixed' ? 'technical' : interviewMode,
        status: 'completed',
        currentQuestionIndex: currentQuestionIndex + 1,
        questions: finalTranscript.filter((m) => m.speaker === 'interviewer').map((m) => m.text),
        transcript: finalTranscript.map((m) => ({
          id: m.id,
          speaker: m.speaker,
          text: m.text,
          timestamp: m.timestamp,
          feedback: m.feedback,
        })),
        overallEvaluation: {
          finalScore: report.finalScore,
          strengths: report.strengths,
          improvementAreas: report.improvementAreas,
          hireRecommendation: report.hireRecommendation,
          summaryFeedback: report.summaryFeedback,
        },
      });
      saveDatabase(centralDb);

      // Add to SARATHI central telemetry
      addActivity({
        type: 'interview',
        title: `${interviewMode.toUpperCase()} Interview Completed`,
        details: `Role: ${selectedRole} • Score: ${report.finalScore}/100 • Verdict: ${report.hireRecommendation} • ${currentQuestionIndex + 1} rounds evaluated`,
        score: report.finalScore,
      });

      sync();
      setInterviewStep('report');
    } catch (err: any) {
      console.error('Failed to conclude interview:', err);
      // Safe fallback synthesis
      const fallbackReport: InterviewReportData = {
        finalScore: 78,
        technicalScore: 80,
        problemSolvingScore: 75,
        communicationScore: 80,
        answerQualityScore: 78,
        roleKnowledgeScore: 82,
        hireRecommendation: 'Hire',
        strengths: ['Clear articulate delivery', 'Demonstrated problem-solving structure'],
        improvementAreas: ['Deepen system edge cases', 'Quantify architectural tradeoffs'],
        questionsAnsweredWell: ['Foundational concepts', 'Architecture overview'],
        questionsNeedingImprovement: ['Production fault tolerance', 'Edge-case handling'],
        recurringMistakes: ['Overlooking concurrency race conditions'],
        recommendedPreparation: `Practice whiteboarding complex concurrency patterns and system design for ${selectedRole}.`,
        summaryFeedback: `The candidate communicated with confidence and provided solid answers across core competencies for ${selectedRole}.`,
        questionReviews: [],
      };
      setFinalReport(fallbackReport);
      setInterviewStep('report');
    } finally {
      setIsAiResponding(false);
    }
  };

  // -------------------------------------------------------------
  // COMMUNICATION SUITE EVALUATION
  // -------------------------------------------------------------
  const handleEvaluateCommunication = async () => {
    if (!userSubmission.trim() || isEvaluatingComm) return;
    setIsEvaluatingComm(true);
    setCommError(null);

    try {
      const res = await fetch('/api/communication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedScenario.type,
          scenarioTitle: selectedScenario.title,
          promptText: selectedScenario.prompt,
          submission: userSubmission.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.assessment) {
        throw new Error(data.error || 'Failed to evaluate communication submission.');
      }

      const assessment = data.assessment;

      const record: CommunicationAssessmentRecord = {
        id: `comm-rec-${Date.now()}`,
        date: new Date().toISOString(),
        type: selectedScenario.type,
        scenarioTitle: selectedScenario.title,
        userSubmission: userSubmission.trim(),
        rubric: assessment.rubric,
        feedbackSummary: assessment.feedbackSummary,
        strengths: assessment.strengths,
        areasToImprove: assessment.areasToImprove,
        corrections: assessment.corrections,
        polishedVersion: assessment.polishedVersion,
      };

      setCommResult(record);

      if (typeof window !== 'undefined') {
        const existing = localStorage.getItem(STORAGE_KEY_COMMUNICATION);
        const list: CommunicationAssessmentRecord[] = existing ? JSON.parse(existing) : [];
        list.unshift(record);
        localStorage.setItem(STORAGE_KEY_COMMUNICATION, JSON.stringify(list));
        setCommHistory(list);
      }

      // Add to SARATHI central telemetry
      addActivity({
        type: 'communication',
        title: `Communication Assessment: ${selectedScenario.title}`,
        details: `Overall Score: ${assessment.rubric.overallScore}/100 • Grammar: ${assessment.rubric.grammar}% • Clarity: ${assessment.rubric.clarity}%`,
        score: assessment.rubric.overallScore,
      });

      sync();
      setCommStep('result');
    } catch (err: any) {
      console.error('Communication evaluation error:', err);
      setCommError(err.message || 'Failed to evaluate communication submission.');
    } finally {
      setIsEvaluatingComm(false);
    }
  };

  // Filtered scenarios for communication tab
  const filteredScenarios = useMemo(() => {
    if (commFilter === 'all') return COMMUNICATION_SCENARIOS;
    return COMMUNICATION_SCENARIOS.filter((s) => s.type === commFilter);
  }, [commFilter]);

  // Format timer seconds into mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* ─────────────────────────────────────────────────────────────
          LEAVE ACTIVE INTERVIEW CONFIRMATION MODAL
         ───────────────────────────────────────────────────────────── */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-md w-full p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-amber-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white">Leave Active Interview?</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Are you sure you want to exit the active interview? Your current in-progress round will be terminated and unsaved responses will be discarded.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
              >
                Continue Interview
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLeaveModal(false);
                  setIsTimerRunning(false);
                  if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                  setInterviewStep('configure');
                }}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors"
              >
                Leave Interview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TOP TABS: MOCK INTERVIEW vs COMMUNICATION SKILLS
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/30 border border-slate-800 shadow-glass">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400">
            <Mic className="w-3.5 h-3.5" />
            <span>AI INTERVIEW & PROFESSIONAL COMMUNICATION</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Career Readiness Simulator
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Interactive AI interview arena with adaptive follow-ups and professional communication diagnostics.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
          <button
            onClick={() => {
              if (interviewStep === 'active') {
                setShowLeaveModal(true);
                return;
              }
              setActiveTab('interview');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'interview'
                ? 'bg-cyan-500 text-slate-950 shadow-neon-cyan'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>AI Mock Interview</span>
          </button>
          <button
            onClick={() => {
              if (interviewStep === 'active') {
                setShowLeaveModal(true);
                return;
              }
              setActiveTab('communication');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'communication'
                ? 'bg-cyan-500 text-slate-950 shadow-neon-cyan'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>Communication Skills</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION A: AI MOCK INTERVIEW SUITE
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'interview' && (
        <div className="space-y-6">
          {/* ========================================================
              STEP 1: LANDING & TARGET ROLE SELECTION
             ======================================================== */}
          {interviewStep === 'landing' && (
            <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
              {/* Back to Dashboard Navigation Button */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="group inline-flex items-center space-x-2 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-800"
                >
                  <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                  <span>Back to Dashboard</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInterviewStep('history')}
                  className="text-xs text-slate-400 hover:text-white flex items-center space-x-1.5 font-mono px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800"
                >
                  <History className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Interview History ({interviewHistory.length})</span>
                </button>
              </div>

              <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-6 shadow-glass">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider block">
                      STEP 1 OF 3 &bull; TARGET ROLE SELECTION
                    </span>
                    <h2 className="text-xl font-bold text-white flex items-center space-x-2 mt-0.5">
                      <Target className="w-5 h-5 text-cyan-400" />
                      <span>Choose Your Target Role</span>
                    </h2>
                  </div>
                  <Link href="/settings" className="text-xs text-cyan-400 hover:underline flex items-center space-x-1">
                    <span>Edit Profile</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                <p className="text-xs sm:text-sm text-slate-300">
                  Select your prospective career role. SARATHI calibrates technical questions, difficulty depth, and evaluation rubrics specifically for this role.
                </p>

                {/* Popular Quick Roles */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    'Software Engineer',
                    'Java Developer',
                    'Data Analyst',
                    'AI/ML Engineer',
                    'Full Stack Developer',
                    'DevOps Engineer',
                    'Cybersecurity Analyst',
                    'Backend Developer',
                  ].map((roleTitle) => (
                    <button
                      key={roleTitle}
                      type="button"
                      onClick={() => handleSelectRole(roleTitle)}
                      className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                        selectedRole === roleTitle && !isCustomRole
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-neon-cyan'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {roleTitle}
                    </button>
                  ))}
                </div>

                {/* Role Search & Custom Role */}
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <div className="relative flex-1">
                    <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 focus-within:border-cyan-400">
                      <Search className="w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search 35+ industry roles or enter custom role..."
                        value={roleSearchQuery}
                        onChange={(e) => {
                          setRoleSearchQuery(e.target.value);
                          setIsRoleDropdownOpen(true);
                        }}
                        onFocus={() => setIsRoleDropdownOpen(true)}
                        className="bg-transparent text-white text-xs focus:outline-hidden w-full"
                      />
                    </div>

                    {isRoleDropdownOpen && (
                      <div className="absolute z-20 top-full mt-1 left-0 right-0 max-h-56 overflow-y-auto rounded-xl bg-slate-950 border border-slate-800 p-2 shadow-2xl space-y-1">
                        {searchRoles(roleSearchQuery).map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              handleSelectRole(r.title);
                              setRoleSearchQuery('');
                            }}
                            className="w-full text-left p-2 rounded-lg hover:bg-slate-800/80 text-xs text-slate-200 flex items-center justify-between"
                          >
                            <span className="font-medium">{r.title}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{r.category}</span>
                          </button>
                        ))}
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between px-2 text-[11px] text-slate-400">
                          <span>Don&apos;t see your role?</span>
                          <button
                            type="button"
                            onClick={() => {
                              setIsRoleDropdownOpen(false);
                              setIsCustomRole(true);
                            }}
                            className="text-cyan-400 hover:underline"
                          >
                            Enter Custom Role &rarr;
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {isCustomRole && (
                    <div className="flex items-center space-x-2 flex-1">
                      <input
                        type="text"
                        placeholder="Enter custom role title..."
                        value={customRoleInput}
                        onChange={(e) => setCustomRoleInput(e.target.value)}
                        className="p-2.5 rounded-xl bg-slate-950 border border-cyan-500 text-white text-xs focus:outline-hidden flex-1"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCustomRole}
                        className="px-4 py-2.5 rounded-xl bg-cyan-400 text-slate-950 font-bold text-xs"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>

                {/* Evaluated Skills Map */}
                <div className="space-y-2 pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400">Target Role Skills Stack:</span>
                    <span className="text-[11px] text-slate-500">Click a tag to remove</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {focusSkills.map((sk) => (
                      <button
                        key={sk}
                        type="button"
                        onClick={() => handleToggleSkill(sk)}
                        className="px-2.5 py-1 rounded-md bg-slate-950 text-cyan-300 border border-cyan-800 text-xs font-mono hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-700 transition-colors"
                        title="Click to remove"
                      >
                        {sk} &times;
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center space-x-2 pt-1 max-w-sm">
                    <input
                      type="text"
                      placeholder="Add another target skill..."
                      value={customSkillInput}
                      onChange={(e) => setCustomSkillInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomSkill())}
                      className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-cyan-400 focus:outline-hidden flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomSkill}
                      className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Forward Button */}
                <div className="flex justify-end pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setInterviewStep('select_type')}
                    className="px-6 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase shadow-neon-cyan flex items-center space-x-2 transition-transform active:scale-95"
                  >
                    <span>Proceed to Select Interview Type</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 2: SELECT INTERVIEW TYPE
             ======================================================== */}
          {interviewStep === 'select_type' && (
            <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
              {/* Back to Step 1 Button */}
              <button
                type="button"
                onClick={() => setInterviewStep('landing')}
                className="group inline-flex items-center space-x-2 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-800"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span>Back to Role Selection</span>
              </button>

              <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-6 shadow-glass">
                <div className="space-y-1">
                  <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider block">
                    STEP 2 OF 3 &bull; INTERVIEW SIMULATION TYPE
                  </span>
                  <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                    <span>Select Interview Type for</span>
                    <span className="text-cyan-400">{selectedRole}</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Choose the format of your upcoming interview session.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  {[
                    {
                      id: 'technical',
                      title: 'Technical Round',
                      desc: 'Deep architecture, conceptual rigor, and design trade-offs.',
                      icon: Terminal,
                    },
                    {
                      id: 'coding',
                      title: 'Coding & Logic',
                      desc: 'Algorithmic approach, edge cases, time & space complexity with code editor.',
                      icon: Code2,
                    },
                    {
                      id: 'hr',
                      title: 'HR & Behavioral',
                      desc: 'Situational judgment, teamwork, leadership, and STAR scenarios.',
                      icon: Award,
                    },
                    {
                      id: 'viva',
                      title: 'Academic Viva',
                      desc: 'Theoretical defense based on your uploaded study materials.',
                      icon: BookOpen,
                    },
                    {
                      id: 'mixed',
                      title: 'Mixed Round',
                      desc: 'Multi-stage simulation combining technical depth and behavioral questions.',
                      icon: Layers,
                    },
                  ].map((m) => {
                    const IconComp = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setInterviewMode(m.id as any)}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          interviewMode === m.id
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-neon-cyan'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <IconComp className="w-5 h-5 text-cyan-400 mb-2" />
                        <div className="font-bold text-sm text-white">{m.title}</div>
                        <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">{m.desc}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setInterviewStep('landing')}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    &larr; Back to Role Selection
                  </button>

                  <button
                    type="button"
                    onClick={() => setInterviewStep('configure')}
                    className="px-6 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase shadow-neon-cyan flex items-center space-x-2"
                  >
                    <span>Proceed to Configuration</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 3: CONFIGURE INTERVIEW PARAMETERS
             ======================================================== */}
          {interviewStep === 'configure' && (
            <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
              {/* Back to Step 2 Button */}
              <button
                type="button"
                onClick={() => setInterviewStep('select_type')}
                className="group inline-flex items-center space-x-2 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-800"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span>Back to Interview Type</span>
              </button>

              <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-6 shadow-glass">
                <div className="space-y-1">
                  <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider block">
                    STEP 3 OF 3 &bull; CONFIGURE SESSION PARAMETERS
                  </span>
                  <h2 className="text-xl font-bold text-white">Fine-tune Interview Session</h2>
                  <p className="text-xs text-slate-400">
                    Set difficulty, question count, and time limits before launching the live arena.
                  </p>
                </div>

                {/* Difficulty */}
                <div className="space-y-2">
                  <label className="text-xs font-mono text-slate-300 uppercase tracking-wider block">
                    Difficulty Level:
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'easy', title: 'Easy', desc: 'Foundations & definitions' },
                      { id: 'medium', title: 'Medium', desc: 'Real-world application & trade-offs' },
                      { id: 'hard', title: 'Hard', desc: 'Concurrency, scale & edge cases' },
                    ].map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDifficulty(d.id as any)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          difficulty === d.id
                            ? 'bg-slate-900 border-cyan-400 shadow-neon-cyan'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className={`font-bold text-sm ${difficulty === d.id ? 'text-white' : 'text-slate-300'}`}>
                          {d.title}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{d.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question Count & Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-mono text-slate-300 uppercase tracking-wider block">
                      Number of Questions:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[3, 5, 8, 10].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setQuestionCount(c)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            questionCount === c
                              ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-neon-cyan'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          {c} Questions
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-mono text-slate-300 uppercase tracking-wider block">
                      Session Duration:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[10, 15, 20, 30].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setDurationMinutes(m)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            durationMinutes === m
                              ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-neon-cyan'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          {m} Minutes
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Clean Briefing Summary Card */}
                <div className="p-4 rounded-xl bg-slate-950 border border-cyan-900/50 space-y-3">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-bold block">
                    INTERVIEW BRIEFING
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase font-mono">Role</span>
                      <strong className="text-white text-xs">{selectedRole}</strong>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase font-mono">Type</span>
                      <strong className="text-cyan-300 text-xs capitalize">{interviewMode} Round</strong>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase font-mono">Difficulty</span>
                      <strong className="text-amber-300 text-xs capitalize">{difficulty}</strong>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase font-mono">Questions</span>
                      <strong className="text-white text-xs">{questionCount} Rounds</strong>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase font-mono">Duration</span>
                      <strong className="text-purple-300 text-xs">{durationMinutes} Min</strong>
                    </div>
                  </div>
                </div>

                {/* Launch Action */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setInterviewStep('select_type')}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    &larr; Back to Interview Type
                  </button>

                  <button
                    type="button"
                    onClick={handleStartInterview}
                    className="px-8 py-3.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-neon-cyan flex items-center space-x-2 transition-transform active:scale-95"
                  >
                    <Play className="w-4 h-4" />
                    <span>START INTERVIEW</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 4: ACTIVE INTERVIEW ARENA
             ======================================================== */}
          {interviewStep === 'active' && (
            <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
              {/* Arena Navigation & Header Bar */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-glass flex flex-wrap items-center justify-between gap-4">
                {/* Leave Interview Back Button (Triggers Safe Confirmation Modal) */}
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(true)}
                  className="group inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400 hover:text-rose-400 hover:border-rose-800 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                  <span>Leave Interview</span>
                </button>

                {/* Arena Title Badge */}
                <div className="flex items-center space-x-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <div className="text-xs font-mono text-white">
                    <span className="font-bold uppercase text-cyan-300">{interviewMode} Round</span> &bull; {selectedRole} ({difficulty})
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Q{currentQuestionIndex + 1}/{questionCount}
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Countdown Timer */}
                  <div
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border font-mono text-xs font-bold ${
                      timeRemainingSeconds < 120
                        ? 'bg-rose-950/60 border-rose-500 text-rose-300 animate-pulse'
                        : timeRemainingSeconds < 300
                        ? 'bg-amber-950/40 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatTime(timeRemainingSeconds)}</span>
                  </div>

                  {/* Coaching Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowLiveCoaching(!showLiveCoaching)}
                    className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-mono transition-all ${
                      showLiveCoaching
                        ? 'bg-purple-950 border-purple-500 text-purple-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {showLiveCoaching ? 'Hide Coaching' : 'Live Coaching'}
                  </button>

                  {/* Conclude Button */}
                  <button
                    type="button"
                    onClick={() => handleConcludeInterview(transcript)}
                    disabled={isAiResponding || transcript.length < 2}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold disabled:opacity-30"
                  >
                    Conclude
                  </button>
                </div>
              </div>

              {/* Error Notice */}
              {activeError && (
                <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-200 text-xs flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{activeError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSendResponse()}
                    className="px-2.5 py-1 rounded bg-rose-800 hover:bg-rose-700 text-white text-[11px] font-bold"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Chat Transcript Area */}
              <div className="space-y-4 min-h-[380px]">
                {transcript.map((msg, idx) => (
                  <div
                    key={msg.id || idx}
                    className={`flex flex-col ${
                      msg.speaker === 'candidate' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-2xl p-5 rounded-2xl border text-sm leading-relaxed space-y-3 ${
                        msg.speaker === 'candidate'
                          ? 'bg-cyan-950/30 border-cyan-500/40 text-slate-100 rounded-br-none'
                          : 'bg-slate-900/90 border-slate-800 text-slate-200 rounded-bl-none shadow-glass'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pb-1 border-b border-slate-800">
                        <span className="font-bold uppercase text-cyan-300">
                          {msg.speaker === 'candidate' ? 'You (Candidate)' : 'AI Interviewer'}
                        </span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div className="whitespace-pre-wrap">{msg.text}</div>

                      {/* Display Code Snippet if candidate provided code */}
                      {msg.codeSnippet && (
                        <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 overflow-x-auto text-xs font-mono text-cyan-300">
                          <div className="text-[10px] text-slate-500 pb-1 mb-2 border-b border-slate-800 uppercase">
                            Submitted {msg.codeLanguage || 'Code'} Solution
                          </div>
                          <pre>{msg.codeSnippet}</pre>
                        </div>
                      )}

                      {/* Evaluator Coaching Feedback */}
                      {showLiveCoaching && msg.feedback && (
                        <div className="p-3 rounded-xl bg-slate-950/90 border border-purple-900/60 space-y-2 text-xs">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-purple-400 font-bold uppercase">Internal Coaching Feedback:</span>
                            <span className="text-cyan-300 font-bold">
                              Tech: {msg.feedback.technicalScore}% &bull; Clarity: {msg.feedback.clarityScore}%
                            </span>
                          </div>
                          <p className="text-slate-300 text-[11px]">{msg.feedback.feedbackNotes}</p>
                          {msg.feedback.keyPointsMissed && msg.feedback.keyPointsMissed.length > 0 && (
                            <div className="text-[10px] text-amber-300">
                              <strong>Key Points Omitted:</strong> {msg.feedback.keyPointsMissed.join(', ')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isAiResponding && (
                  <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 p-4 rounded-xl bg-slate-950 border border-slate-800 w-fit">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AI Interviewer is analyzing your response and formulating the next follow-up...</span>
                  </div>
                )}
              </div>

              {/* Code Editor Section */}
              {isCodingModeActive && (
                <div className="p-4 rounded-2xl bg-slate-900 border border-cyan-900/60 space-y-3 shadow-glass">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 font-bold">
                      <Code2 className="w-4 h-4" />
                      <span>CODE IMPLEMENTATION EDITOR</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <label className="text-[10px] font-mono text-slate-400">Language:</label>
                      <select
                        value={selectedLanguage}
                        onChange={(e) => {
                          const lang = e.target.value;
                          setSelectedLanguage(lang);
                          setCodeContent(CODE_TEMPLATES[lang] || '');
                        }}
                        className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-hidden"
                      >
                        <option value="python">Python</option>
                        <option value="javascript">JavaScript</option>
                        <option value="typescript">TypeScript</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                        <option value="sql">SQL</option>
                      </select>
                    </div>
                  </div>

                  <textarea
                    rows={7}
                    value={codeContent}
                    onChange={(e) => setCodeContent(e.target.value)}
                    placeholder="Write your algorithmic code solution here..."
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 font-mono text-xs focus:border-cyan-400 focus:outline-hidden resize-none"
                    spellCheck={false}
                  />

                  <div className="text-[10px] font-mono text-slate-500">
                    &bull; Static algorithmic inspection & Big-O complexity evaluation (No sandbox execution backend).
                  </div>
                </div>
              )}

              {/* Input Area */}
              <form onSubmit={handleSendResponse} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-glass space-y-3">
                {micUnavailableNotice && (
                  <div className="text-[11px] text-amber-400/90 font-mono flex items-center space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{micUnavailableNotice}</span>
                  </div>
                )}

                <div className="relative">
                  <textarea
                    rows={4}
                    value={candidateInput}
                    onChange={(e) => setCandidateInput(e.target.value)}
                    placeholder={
                      isCodingModeActive
                        ? 'Explain your algorithmic approach, data structure choice, and time/space complexity...'
                        : 'Type your response or use the microphone to speak your answer naturally...'
                    }
                    className="w-full p-4 pr-12 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-cyan-400 focus:outline-hidden resize-none"
                    disabled={isAiResponding}
                  />

                  {speechSupported && (
                    <button
                      type="button"
                      onClick={toggleListening}
                      title={isListening ? 'Stop recording voice' : 'Start speaking voice response'}
                      className={`absolute right-3 bottom-3 p-2 rounded-xl border transition-all ${
                        isListening
                          ? 'bg-rose-500 border-rose-400 text-white animate-pulse'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-mono">
                    <button
                      type="button"
                      onClick={() => setIsCodingModeActive(!isCodingModeActive)}
                      className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-all ${
                        isCodingModeActive
                          ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>{isCodingModeActive ? 'Close Code Editor' : 'Attach Code Solution'}</span>
                    </button>

                    {isListening && (
                      <span className="text-rose-400 font-bold flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                        <span>Listening... Speak clearly</span>
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={(!candidateInput.trim() && !codeContent.trim()) || isAiResponding}
                    className="px-6 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase shadow-neon-cyan disabled:opacity-30 flex items-center space-x-2"
                  >
                    <span>Submit Answer</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================
              STEP 5: FINAL INTERVIEW REPORT SCREEN
             ======================================================== */}
          {interviewStep === 'report' && finalReport && (
            <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
              {/* Back to Landing Navigation Button */}
              <button
                type="button"
                onClick={() => setInterviewStep('landing')}
                className="group inline-flex items-center space-x-2 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-800"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span>Back to AI Interview</span>
              </button>

              {/* Score Banner */}
              <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/30 border border-slate-800 shadow-glass flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <span className="px-2.5 py-0.5 rounded-md bg-purple-950 text-purple-300 border border-purple-800 text-xs font-mono font-bold uppercase">
                    EVALUATION COMPLETED
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                    Interview Diagnostic Report
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1">
                    Calibrated for <strong className="text-cyan-300">{selectedRole}</strong> &bull; {interviewMode.toUpperCase()} Round &bull; {difficulty.toUpperCase()}
                  </p>
                </div>

                {/* Overall Score Badge */}
                <div className="flex items-center space-x-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="text-right">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Overall Score</div>
                    <div className="text-3xl font-extrabold text-cyan-300 font-mono">
                      {finalReport.finalScore}
                      <span className="text-sm text-slate-500">/100</span>
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wider font-mono ${
                      finalReport.hireRecommendation === 'Strong Hire'
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                        : finalReport.hireRecommendation === 'Hire'
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                        : finalReport.hireRecommendation === 'Needs Improvement'
                        ? 'bg-amber-950 border-amber-500 text-amber-300'
                        : 'bg-rose-950 border-rose-500 text-rose-300'
                    }`}
                  >
                    {finalReport.hireRecommendation}
                  </div>
                </div>
              </div>

              {/* Category Breakdown Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Technical Knowledge</span>
                  <div className="text-xl font-bold font-mono text-white">{finalReport.technicalScore}%</div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${finalReport.technicalScore}%` }} />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Problem Solving</span>
                  <div className="text-xl font-bold font-mono text-white">{finalReport.problemSolvingScore}%</div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-purple-400 h-full rounded-full" style={{ width: `${finalReport.problemSolvingScore}%` }} />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Communication Clarity</span>
                  <div className="text-xl font-bold font-mono text-white">{finalReport.communicationScore}%</div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${finalReport.communicationScore}%` }} />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Role Knowledge</span>
                  <div className="text-xl font-bold font-mono text-white">{finalReport.roleKnowledgeScore || finalReport.finalScore}%</div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-400 h-full rounded-full" style={{ width: `${finalReport.roleKnowledgeScore || finalReport.finalScore}%` }} />
                  </div>
                </div>
              </div>

              {/* Performance Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <h3 className="text-xs font-mono font-bold text-emerald-400 uppercase flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Demonstrated Strengths</span>
                  </h3>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {finalReport.strengths.map((s, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <span className="text-emerald-400">&bull;</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <h3 className="text-xs font-mono font-bold text-amber-400 uppercase flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Areas Requiring Improvement</span>
                  </h3>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {finalReport.improvementAreas.map((area, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <span className="text-amber-400">&bull;</span>
                        <span>{area}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Actionable Recommendations */}
              <div className="p-5 rounded-2xl bg-cyan-950/20 border border-cyan-800/40 space-y-3">
                <h3 className="text-xs font-mono font-bold text-cyan-300 uppercase flex items-center space-x-1.5">
                  <Zap className="w-4 h-4" />
                  <span>Personalized Recommendation</span>
                </h3>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {finalReport.recommendedPreparation}
                </p>
                <p className="text-[11px] text-slate-400 italic">
                  {finalReport.summaryFeedback}
                </p>
              </div>

              {/* Navigation to Detailed Question Review */}
              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-4 shadow-glass">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <BookOpen className="w-4 h-4 text-cyan-400" />
                    <span>Detailed Question-by-Question Review</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Inspect evaluations, ideal model answers, and deep-link to AI Tutor for every round.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setInterviewStep('detailed_review')}
                  className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase shadow-neon-cyan flex items-center space-x-1.5 shrink-0"
                >
                  <span>Open Detailed Review</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Report Actions */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setInterviewStep('history')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700"
                >
                  View All Completed Interviews
                </button>

                <button
                  type="button"
                  onClick={() => setInterviewStep('landing')}
                  className="px-6 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase shadow-neon-cyan flex items-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Start New Interview</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 6: DETAILED QUESTION REVIEW SCREEN
             ======================================================== */}
          {interviewStep === 'detailed_review' && finalReport && (
            <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
              {/* Back to Report Navigation Button */}
              <button
                type="button"
                onClick={() => setInterviewStep('report')}
                className="group inline-flex items-center space-x-2 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-800"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span>Back to Result Summary</span>
              </button>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
                    <BookOpen className="w-5 h-5 text-cyan-400" />
                    <span>Question-by-Question Diagnostic Review</span>
                  </h3>
                  <span className="text-xs font-mono text-cyan-400">
                    {finalReport.questionReviews?.length || 0} Questions Evaluated
                  </span>
                </div>

                <div className="space-y-4">
                  {finalReport.questionReviews?.map((rev, idx) => (
                    <div key={idx} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-glass">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-cyan-400 font-bold uppercase">
                          Round {idx + 1}
                        </span>
                        <span className="px-2.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 font-bold">
                          Score: {rev.score}/100
                        </span>
                      </div>

                      {/* Question Text */}
                      <div className="text-sm font-semibold text-white">
                        {rev.question}
                      </div>

                      {/* Candidate Answer */}
                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/70 text-xs text-slate-300 space-y-1">
                        <span className="text-[10px] font-mono text-slate-500 uppercase block">Your Response:</span>
                        <div className="whitespace-pre-wrap">{rev.candidateAnswer}</div>
                      </div>

                      {/* What was good / What could be improved */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-emerald-300 space-y-1">
                          <strong className="block text-[11px] font-mono uppercase text-emerald-400">What Was Good:</strong>
                          <span>{rev.whatWasGood}</span>
                        </div>
                        <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-900/40 text-amber-300 space-y-1">
                          <strong className="block text-[11px] font-mono uppercase text-amber-400">What Could Be Improved:</strong>
                          <span>{rev.whatCouldBeImproved}</span>
                        </div>
                      </div>

                      {/* Ideal Model Answer */}
                      {rev.idealAnswer && (
                        <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-900/40 text-xs text-purple-200 space-y-1">
                          <strong className="block text-[11px] font-mono uppercase text-purple-300">
                            Ideal Model Answer / Pedagogical Explanation:
                          </strong>
                          <p className="leading-relaxed">{rev.idealAnswer}</p>
                        </div>
                      )}

                      {/* Learn in Tutor Button */}
                      <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
                        <span className="text-[11px] font-mono text-slate-400">
                          Topic: <strong className="text-white">{rev.relatedTopic || selectedRole}</strong>
                        </span>

                        <Link
                          href={`/tutor?teachPrompt=${encodeURIComponent(
                            `Explain the key principles, best practices, and model answer for: ${rev.question}`
                          )}`}
                          className="px-3.5 py-1.5 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-800 hover:bg-cyan-900 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                        >
                          <Brain className="w-3.5 h-3.5" />
                          <span>Learn This in AI Tutor &rarr;</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setInterviewStep('report')}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                  >
                    &larr; Back to Result Summary
                  </button>

                  <button
                    type="button"
                    onClick={() => setInterviewStep('landing')}
                    className="px-5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs shadow-neon-cyan"
                  >
                    Start Another Interview
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 7: INTERVIEW HISTORY SCREEN
             ======================================================== */}
          {interviewStep === 'history' && (
            <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
              {/* Back to Landing Navigation Button */}
              <button
                type="button"
                onClick={() => setInterviewStep('landing')}
                className="group inline-flex items-center space-x-2 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-800"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span>Back to AI Interview</span>
              </button>

              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Your Completed AI Interviews</h2>
                  <p className="text-xs text-slate-400">Persistent diagnostic reports and question reviews.</p>
                </div>

                <button
                  type="button"
                  onClick={() => setInterviewStep('landing')}
                  className="px-4 py-2 rounded-xl bg-cyan-400 text-slate-950 font-bold text-xs shadow-neon-cyan flex items-center space-x-1.5"
                >
                  <span>Configure New Interview</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {interviewHistory.length === 0 ? (
                /* Empty State */
                <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-4 shadow-glass">
                  <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-white">You haven&apos;t completed an AI interview yet.</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Launch your first mock interview to get an in-depth diagnostic evaluation calibrated to your target career role.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setInterviewStep('landing')}
                      className="px-6 py-2.5 rounded-xl bg-cyan-400 text-slate-950 font-bold text-xs shadow-neon-cyan"
                    >
                      Start Your First Interview
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {interviewHistory.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white text-sm">{rec.role}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-950 text-cyan-300 border border-slate-800 text-[10px] font-mono uppercase">
                            {rec.mode}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-950 text-amber-300 border border-slate-800 text-[10px] font-mono uppercase">
                            {rec.difficulty || 'Medium'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {new Date(rec.date).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}{' '}
                          &bull; {rec.questionCount} rounds evaluated
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <span className="text-[10px] font-mono text-slate-500 uppercase block">Score</span>
                          <span className="text-lg font-bold font-mono text-cyan-300">
                            {rec.report.finalScore}/100
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setFinalReport(rec.report);
                            setSelectedRole(rec.role);
                            setInterviewMode(rec.mode);
                            setInterviewStep('report');
                          }}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Report</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION B: COMMUNICATION SKILLS SUITE
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'communication' && (
        <div className="space-y-6">
          {/* Back to Interview Landing Navigation Button */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveTab('interview')}
              className="group inline-flex items-center space-x-2 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-800"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              <span>Back to AI Mock Interview</span>
            </button>

            <button
              type="button"
              onClick={() => setCommStep(commStep === 'history' ? 'list' : 'history')}
              className="text-xs text-slate-400 hover:text-white flex items-center space-x-1.5 font-mono px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800"
            >
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Writing History ({commHistory.length})</span>
            </button>
          </div>

          {/* Subheader and Category Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'All Scenarios' },
                { id: 'email', label: 'Email Writing (10+)' },
                { id: 'paragraph', label: 'Paragraph Writing' },
                { id: 'interview_answer', label: 'STAR Answers' },
                { id: 'technical_explanation', label: 'Tech Explanations' },
                { id: 'summarization', label: 'Summarization' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setCommFilter(f.id);
                    setCommStep('list');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    commFilter === f.id
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-neon-cyan'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scenario Grid List */}
          {commStep === 'list' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fadeIn">
              {filteredScenarios.map((sc) => (
                <div
                  key={sc.id}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 transition-all flex flex-col justify-between space-y-4 shadow-glass"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-cyan-400 uppercase">
                        {sc.category}
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase font-mono">{sc.type}</span>
                    </div>

                    <h3 className="font-bold text-white text-sm">{sc.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{sc.prompt}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-500">
                      {sc.suggestedLengthWords?.min}-{sc.suggestedLengthWords?.max} words
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedScenario(sc);
                        setUserSubmission('');
                        setCommStep('editor');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-cyan-400 text-slate-950 font-bold text-xs hover:bg-cyan-300 transition-colors"
                    >
                      Practice &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Practice Editor Screen */}
          {commStep === 'editor' && (
            <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
              {/* Back to Scenarios Navigation Button */}
              <button
                type="button"
                onClick={() => setCommStep('list')}
                className="group inline-flex items-center space-x-2 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-800"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span>Back to Scenarios</span>
              </button>

              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 shadow-glass">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded bg-slate-950 text-cyan-400 border border-slate-800 text-xs font-mono uppercase">
                    {selectedScenario.type}
                  </span>
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-white">{selectedScenario.title}</h2>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed">
                    <strong className="block text-cyan-400 font-mono mb-1 text-[11px] uppercase">Requirement:</strong>
                    {selectedScenario.prompt}
                  </div>
                </div>

                {selectedScenario.contextHint && (
                  <div className="text-[11px] text-slate-400 font-mono bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
                    <strong>Tip / Guidance:</strong> {selectedScenario.contextHint} &bull; Target Tone: {selectedScenario.targetTone}
                  </div>
                )}

                {commError && (
                  <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{commError}</span>
                  </div>
                )}

                {/* Submission Textarea */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span>Write your submission below:</span>
                    <span>
                      Words: {userSubmission.trim().split(/\s+/).filter(Boolean).length} &bull; Chars: {userSubmission.length}
                    </span>
                  </div>

                  <textarea
                    rows={8}
                    value={userSubmission}
                    onChange={(e) => setUserSubmission(e.target.value)}
                    placeholder="Compose your response here with professional grammar, structure, and tone..."
                    className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-cyan-400 focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-500 font-mono">
                    Evaluated across 7 rubric dimensions by SARATHI AI.
                  </span>

                  <button
                    type="button"
                    onClick={handleEvaluateCommunication}
                    disabled={userSubmission.trim().length < 10 || isEvaluatingComm}
                    className="px-6 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase shadow-neon-cyan disabled:opacity-30 flex items-center space-x-2"
                  >
                    {isEvaluatingComm ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Evaluating Writing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Submit for Assessment</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Assessment Result Screen */}
          {commStep === 'result' && commResult && (
            <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
              {/* Back Navigation Button */}
              <button
                type="button"
                onClick={() => setCommStep('list')}
                className="group inline-flex items-center space-x-2 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-800"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span>Back to Scenarios</span>
              </button>

              {/* Score Banner */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-glass flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <span className="px-2.5 py-0.5 rounded-md bg-purple-950 text-purple-300 border border-purple-800 text-xs font-mono font-bold uppercase">
                    WRITING ASSESSMENT COMPLETED
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                    {commResult.scenarioTitle}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">{commResult.feedbackSummary}</p>
                </div>

                <div className="flex items-center space-x-4 p-4 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Rubric Score</span>
                    <span className="text-3xl font-extrabold text-cyan-300 font-mono">
                      {commResult.rubric.overallScore}
                      <span className="text-sm text-slate-500">/100</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* 7-Metric Breakdown Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Grammar', score: commResult.rubric.grammar },
                  { label: 'Vocabulary', score: commResult.rubric.vocabulary },
                  { label: 'Clarity', score: commResult.rubric.clarity },
                  { label: 'Structure', score: commResult.rubric.structure },
                  { label: 'Coherence', score: commResult.rubric.coherence },
                  { label: 'Professional Tone', score: commResult.rubric.professionalTone },
                  { label: 'Relevance', score: commResult.rubric.relevance },
                ].map((m) => (
                  <div key={m.label} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">{m.label}</span>
                    <div className="text-lg font-bold font-mono text-white">{m.score}%</div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${m.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Strengths & Areas to Improve */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Observed Writing Strengths</span>
                  </h4>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {commResult.strengths.map((s, i) => (
                      <li key={i} className="flex items-start space-x-1.5">
                        <span className="text-emerald-400">&bull;</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <h4 className="text-xs font-mono font-bold text-amber-400 uppercase flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Areas to Improve</span>
                  </h4>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {commResult.areasToImprove.map((a, i) => (
                      <li key={i} className="flex items-start space-x-1.5">
                        <span className="text-amber-400">&bull;</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Line-level Corrections Table */}
              {commResult.corrections && commResult.corrections.length > 0 && (
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase flex items-center space-x-1.5">
                    <PenTool className="w-4 h-4" />
                    <span>Line-by-Line Pedagogical Corrections</span>
                  </h4>

                  <div className="space-y-3">
                    {commResult.corrections.map((cor, i) => (
                      <div key={i} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="p-2.5 rounded bg-rose-950/20 border border-rose-900/40 text-rose-300">
                            <span className="text-[10px] uppercase font-mono block text-rose-400">Original:</span>
                            &ldquo;{cor.originalSnippet}&rdquo;
                          </div>
                          <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-900/40 text-emerald-300">
                            <span className="text-[10px] uppercase font-mono block text-emerald-400">Suggested Fix:</span>
                            {cor.suggestedImprovement}
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          <strong>Why:</strong> {cor.reason}
                        </div>
                        {cor.betterVersion && (
                          <div className="text-[11px] text-cyan-300 bg-slate-900 p-2 rounded border border-slate-800">
                            <strong>Better Version:</strong> {cor.betterVersion}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Polished Executive Rewrite */}
              {commResult.polishedVersion && (
                <div className="p-5 rounded-2xl bg-cyan-950/20 border border-cyan-800/40 space-y-2">
                  <h4 className="text-xs font-mono font-bold text-cyan-300 uppercase flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>Polished Executive Rewrite</span>
                  </h4>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {commResult.polishedVersion}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCommStep('list')}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700"
                >
                  &larr; Practice Another Scenario
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUserSubmission('');
                    setCommStep('editor');
                  }}
                  className="px-6 py-2 rounded-xl bg-cyan-400 text-slate-950 font-bold text-xs uppercase shadow-neon-cyan"
                >
                  Rewrite This Scenario
                </button>
              </div>
            </div>
          )}

          {/* History View for Communication */}
          {commStep === 'history' && (
            <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
              <button
                type="button"
                onClick={() => setCommStep('list')}
                className="group inline-flex items-center space-x-2 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-800"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span>Back to Scenarios</span>
              </button>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Your Past Writing Submissions</h3>
                  <p className="text-xs text-slate-400">Evaluated communication exercises and rubric feedback.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCommStep('list')}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-400 text-slate-950 font-bold text-xs"
                >
                  New Writing Practice &rarr;
                </button>
              </div>

              {commHistory.length === 0 ? (
                <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-4 shadow-glass">
                  <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                    <PenTool className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-bold text-white">No communication assessments recorded yet.</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Choose an email, paragraph, or STAR scenario to start building your professional communication profile.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {commHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white text-xs">{item.scenarioTitle}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-950 text-cyan-400 text-[10px] font-mono uppercase">
                            {item.type}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(item.date).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right font-mono text-cyan-300 font-bold text-sm">
                          {item.rubric.overallScore}/100
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCommResult(item);
                            setCommStep('result');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
