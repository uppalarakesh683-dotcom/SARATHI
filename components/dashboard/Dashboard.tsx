'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ArrowRight,
  Target,
  Brain,
  FileCheck2,
  TrendingUp,
  AlertCircle,
  Clock,
  Compass,
  CheckCircle2,
  Zap,
  BookOpen,
  GraduationCap,
  Briefcase,
  Layers,
  ChevronLeft,
  X,
  FileText,
  RotateCcw,
  MessageSquare,
  PenTool,
  Search,
} from 'lucide-react';
import { useProgress } from '@/hooks/use-progress';
import { APP_CONFIG } from '@/config/app';
import { ExamType, LearnerLevel } from '@/types/user';
import { searchRoles, ALL_ROLES, getRoleByIdOrTitle } from '@/config/roles';

interface UnfinishedActivity {
  id: string;
  source: 'tutor' | 'material' | 'practice' | 'exam' | 'interview' | 'communication';
  subject: string;
  topic: string;
  materialName?: string;
  lastActivity: string;
  progress: string;
  actionRoute: string;
  actionLabel: string;
}

export function Dashboard() {
  const router = useRouter();
  const { profile, readiness, weaknesses, conceptMasteries, activityLog, db, saveProfile, isMounted } =
    useProgress();

  const isNewStudent = isMounted ? (!profile || !profile.completedOnboarding) : true;

  // Wizard state for first-time setup
  const [isWizardActive, setIsWizardActive] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);

  // Wizard Form Fields
  const [selectedGoal, setSelectedGoal] = useState<ExamType>('competitive');
  const [specificTarget, setSpecificTarget] = useState('GATE');
  const [subjectTrack, setSubjectTrack] = useState('');
  const [selectedRole, setSelectedRole] = useState('Software Engineer');
  const [roleSearch, setRoleSearch] = useState('');
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [customRoleText, setCustomRoleText] = useState('');
  const [calibratedSkills, setCalibratedSkills] = useState<string[]>([
    'Data Structures',
    'Algorithms',
    'OOP',
    'Databases',
    'System Design',
  ]);
  const [level, setLevel] = useState<LearnerLevel>('intermediate');
  const [dailyMinutes, setDailyMinutes] = useState(60);
  const [studentName, setStudentName] = useState('');

  // View All Modal state for multiple unfinished learning items
  const [showAllActivitiesModal, setShowAllActivitiesModal] = useState(false);

  // Real telemetry state
  const [latestMockTest, setLatestMockTest] = useState<any | null>(null);
  const [latestInterview, setLatestInterview] = useState<any | null>(null);
  const [latestCommunication, setLatestCommunication] = useState<any | null>(null);

  // Deterministic greeting to prevent SSR hydration mismatch
  const [greeting, setGreeting] = useState('Welcome');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    // Read real completed results from local storage
    if (typeof window !== 'undefined') {
      try {
        const rawExam = localStorage.getItem('sarathi_mock_exam_history');
        if (rawExam) {
          const list = JSON.parse(rawExam);
          if (Array.isArray(list) && list.length > 0) setLatestMockTest(list[0]);
        } else if (db.examSessions && db.examSessions.length > 0) {
          setLatestMockTest(db.examSessions[0]);
        }

        const rawInt = localStorage.getItem('sarathi_interview_history_v2');
        if (rawInt) {
          const list = JSON.parse(rawInt);
          if (Array.isArray(list) && list.length > 0) setLatestInterview(list[0]);
        }

        const rawComm = localStorage.getItem('sarathi_communication_history_v2');
        if (rawComm) {
          const list = JSON.parse(rawComm);
          if (Array.isArray(list) && list.length > 0) setLatestCommunication(list[0]);
        }
      } catch (e) {
        console.warn('Failed to load telemetry in dashboard:', e);
      }
    }
  }, [db.examSessions]);

  // Extract real unfinished learning activities from actual student data
  const unfinishedActivities: UnfinishedActivity[] = useMemo(() => {
    if (!isMounted) return [];
    const activities: UnfinishedActivity[] = [];

    // 1. Check real AI Tutor chat sessions
    try {
      let sessions = db.chatSessions || [];
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('sarathi_tutor_sessions_v2');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) sessions = parsed;
        }
      }

      sessions.forEach((s) => {
        if (s.messages && s.messages.length > 0) {
          activities.push({
            id: `tutor-${s.id}`,
            source: 'tutor',
            subject: profile?.primarySubject || profile?.targetRole || profile?.targetExamLabel || 'General',
            topic: s.activeTopic || s.title || 'Interactive Tutoring',
            lastActivity: s.updatedAt || s.createdAt,
            progress: `${s.messages.length} message(s) exchanged`,
            actionRoute: `/tutor?sessionId=${s.id}`,
            actionLabel: 'CONTINUE TUTORING',
          });
        }
      });
    } catch (e) {
      console.warn('Failed reading tutor sessions for dashboard:', e);
    }

    // 2. Check uploaded study materials
    if (db.materials && db.materials.length > 0) {
      db.materials.forEach((m) => {
        activities.push({
          id: `mat-${m.id}`,
          source: 'material',
          subject: profile?.primarySubject || profile?.targetExamLabel || 'Study Notes',
          topic: m.topicsDetected?.[0] || m.name,
          materialName: m.name,
          lastActivity: m.uploadDate,
          progress: m.summary ? 'Grounded & Summarized' : 'Ready for study',
          actionRoute: `/materials?materialId=${m.id}`,
          actionLabel: 'STUDY MATERIAL',
        });
      });
    }

    // 3. Check practice history
    try {
      if (typeof window !== 'undefined') {
        const rawPractice = localStorage.getItem('sarathi_practice_history_v2');
        if (rawPractice) {
          const pList = JSON.parse(rawPractice);
          if (Array.isArray(pList) && pList.length > 0) {
            pList.slice(0, 3).forEach((p: any) => {
              activities.push({
                id: `prac-${p.id}`,
                source: 'practice',
                subject: profile?.targetRole || profile?.primarySubject || 'Practice Drill',
                topic: p.topic,
                lastActivity: p.date,
                progress: `${p.correctCount}/${p.totalQuestions} questions correct (${p.accuracy}%)`,
                actionRoute: `/practice?topic=${encodeURIComponent(p.topic)}`,
                actionLabel: 'CONTINUE PRACTICE',
              });
            });
          }
        }
      }
    } catch (e) {
      console.warn('Failed reading practice history for dashboard:', e);
    }

    // 4. Check mock test history for weak areas that need review
    try {
      if (typeof window !== 'undefined') {
        const rawExams = localStorage.getItem('sarathi_mock_exam_history');
        if (rawExams) {
          const exList = JSON.parse(rawExams);
          if (Array.isArray(exList) && exList.length > 0) {
            const latest = exList[0];
            if (latest.weakTopics && latest.weakTopics.length > 0) {
              activities.push({
                id: `exam-weak-${latest.id}`,
                source: 'exam',
                subject: latest.config?.examLabel || 'Mock Exam',
                topic: `Needs Review: ${latest.weakTopics[0]}`,
                lastActivity: latest.date,
                progress: `Accuracy: ${latest.topicBreakdown?.[latest.weakTopics[0]]?.accuracy || 0}% in exam`,
                actionRoute: `/practice?topic=${encodeURIComponent(latest.weakTopics[0])}`,
                actionLabel: 'REMEDY WEAK TOPIC',
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed reading exam history for dashboard:', e);
    }

    // Sort by last activity descending
    activities.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());

    return activities;
  }, [isMounted, db.chatSessions, db.materials, profile]);

  // Primary active unfinished activity (if any)
  const primaryUnfinished = unfinishedActivities[0] || null;

  // Dynamic targets based on selected goal
  const getDynamicTargetOptions = (goal: ExamType) => {
    switch (goal) {
      case 'competitive':
        return ['GATE (Computer Science)', 'UPSC', 'CAT', 'GRE', 'Other'];
      case 'university':
        return ['B.Tech / BCA Semester Exam', 'M.Tech / MCA Semester Exam', 'University Midterm', 'Comprehensive Viva'];
      case 'placement':
        return ['Software Engineer Coding', 'Technical Interview Prep', 'Campus Aptitude & Core CS', 'FAANG Track'];
      case 'interview':
        return ['Backend Systems Engineer', 'System Design & Distributed Systems', 'Data Engineering', 'Full Stack Developer'];
      case 'certification':
        return ['AWS Cloud Practitioner', 'Azure Fundamentals', 'Google Cloud Engineer', 'PostgreSQL Certified Professional'];
      case 'skill':
        return ['Relational Database Internals', 'Advanced Algorithms', 'Modern Full-Stack', 'Computer Networking'];
      default:
        return ['GATE', 'Semester Exam', 'Coding Placement'];
    }
  };

  const handleFinishWizard = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = studentName.trim() || 'Student';
    const targetLabel = subjectTrack.trim()
      ? `${specificTarget} — ${subjectTrack.trim()}`
      : specificTarget;

    const finalRole = isCustomRole ? customRoleText.trim() || 'Custom Role' : selectedRole;

    saveProfile({
      id: `usr-${Date.now()}`,
      name: finalName,
      email: 'student@sarathi.ai',
      targetExam: selectedGoal,
      targetExamLabel: targetLabel,
      targetRole: finalRole,
      targetSkills: calibratedSkills,
      careerGoal: finalRole,
      primarySubject: subjectTrack.trim() || undefined,
      currentLevel: level,
      targetDate: '2026-03-01',
      dailyStudyMinutes: dailyMinutes,
      completedOnboarding: true,
      totalStudyMinutes: 0,
      streakDays: 1,
      createdAt: new Date().toISOString(),
    });

    setIsWizardActive(false);
    router.push('/dashboard');
  };

  const formatActivityDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return 'Recently';
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ─────────────────────────────────────────────────────────────
          STATE A: FIRST-TIME STUDENT (EXPLORATION & VALUE PROPOSITION)
         ───────────────────────────────────────────────────────────── */}
      {isNewStudent && !isWizardActive && (
        <div className="space-y-8">
          {/* Welcome Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/30 border border-slate-800 p-8 sm:p-12 shadow-glass text-center sm:text-left">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-xs font-mono text-cyan-300">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Personalized Learning & Assessment Platform</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Welcome to SARATHI
              </h1>
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-light">
                Your AI learning, examination, and interview companion. Calibrate your target exam, target career role, and skill map to receive personalized tutoring, practice, and mock simulations.
              </p>
            </div>
          </div>

          {/* Three Primary Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Action 1: Set Target & Role */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-cyan-500/30 hover:border-cyan-400/60 transition-all flex flex-col justify-between space-y-6 shadow-glass group">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Target className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Target by Exam & Role</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Select your academic exam and your target career role to calibrate your personalized curriculum.
                </p>
              </div>

              <button
                onClick={() => {
                  setIsWizardActive(true);
                  setWizardStep(1);
                }}
                className="w-full py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs tracking-wider uppercase transition-all shadow-neon-cyan flex items-center justify-center space-x-2"
              >
                <span>Set Target & Role</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Action 2: Ask SARATHI */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-6 shadow-glass group">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Brain className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Ask SARATHI</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Learn concepts step-by-step with analogies, formulas, and grounded study material synthesis.
                </p>
              </div>

              <Link
                href="/tutor"
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center space-x-2"
              >
                <span>Ask SARATHI</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Action 3: Practice */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-6 shadow-glass group">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileCheck2 className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Practice & Test</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Test yourself with targeted questions, worked multi-method solutions, and full CBT mock exams.
                </p>
              </div>

              <Link
                href="/practice"
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center space-x-2"
              >
                <span>Practice Now</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STATE B: ONBOARDING WIZARD (EXAM + TARGET BY ROLE + SKILLS)
         ───────────────────────────────────────────────────────────── */}
      {isNewStudent && isWizardActive && (
        <div className="max-w-2xl mx-auto rounded-2xl bg-slate-900/80 border border-slate-800 p-6 sm:p-10 shadow-glass space-y-8 animate-fadeIn">
          {/* Wizard Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <button
              onClick={() => {
                if (wizardStep > 1) {
                  setWizardStep(wizardStep - 1);
                } else {
                  setIsWizardActive(false);
                }
              }}
              className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <span className="text-xs font-mono text-cyan-400">Step {wizardStep} of 6</span>
          </div>

          <form onSubmit={handleFinishWizard} className="space-y-6">
            {/* STEP 1: YOUR GOAL */}
            {wizardStep === 1 && (
              <div className="space-y-5 animate-fadeIn">
                <div className="space-y-1">
                  <span className="text-xs font-mono text-cyan-400 uppercase font-semibold">
                    STEP 1 &bull; YOUR GOAL
                  </span>
                  <h2 className="text-2xl font-bold text-white">What are you preparing for?</h2>
                  <p className="text-xs text-slate-400">
                    Select your primary learning destination so SARATHI can calibrate your path.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'competitive', label: 'Competitive Exam', desc: 'GATE, UPSC, CAT, GRE, etc.' },
                    { id: 'university', label: 'University Exam', desc: 'Semester exams & university assessments' },
                    { id: 'placement', label: 'Campus Placement', desc: 'Campus hiring drives & coding rounds' },
                    { id: 'interview', label: 'Technical Interview', desc: 'Software engineering & viva rounds' },
                    { id: 'certification', label: 'Certification', desc: 'Cloud, Database, or Professional certs' },
                    { id: 'skill', label: 'Skill Development', desc: 'Deep technical fundamentals' },
                  ].map((goal) => (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => {
                        setSelectedGoal(goal.id as ExamType);
                        const dynamicOps = getDynamicTargetOptions(goal.id as ExamType);
                        setSpecificTarget(dynamicOps[0]);
                      }}
                      className={`text-left p-4 rounded-xl border text-xs sm:text-sm transition-all ${
                        selectedGoal === goal.id
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-xs'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="font-semibold">{goal.label}</div>
                      <div className="text-[11px] text-slate-500 mt-1">{goal.desc}</div>
                    </button>
                  ))}
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setWizardStep(2)}
                    className="px-6 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase shadow-neon-cyan flex items-center space-x-2"
                  >
                    <span>Continue to Target</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: YOUR ACADEMIC / EXAM TARGET */}
            {wizardStep === 2 && (
              <div className="space-y-5 animate-fadeIn">
                <div className="space-y-1">
                  <span className="text-xs font-mono text-cyan-400 uppercase font-semibold">
                    STEP 2 &bull; ACADEMIC / EXAM TARGET
                  </span>
                  <h2 className="text-2xl font-bold text-white">Select Your Examination or Track</h2>
                  <p className="text-xs text-slate-400">
                    Tailored specifically for your selected destination.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {getDynamicTargetOptions(selectedGoal).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSpecificTarget(opt)}
                      className={`text-left p-3.5 rounded-xl border text-xs font-medium transition-all ${
                        specificTarget === opt
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-xs font-mono text-slate-300">Primary Subject (Optional)</label>
                  <input
                    type="text"
                    value={subjectTrack}
                    onChange={(e) => setSubjectTrack(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-white focus:outline-hidden focus:border-cyan-400"
                    placeholder="e.g. Data Structures, Computer Networks, Linear Algebra"
                  />
                </div>

                <div className="flex justify-between items-center pt-4">
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    &larr; Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardStep(3)}
                    className="px-6 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase shadow-neon-cyan flex items-center space-x-2"
                  >
                    <span>Continue to Target Role</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: TARGET BY ROLE (MAJOR FEATURE) */}
            {wizardStep === 3 && (
              <div className="space-y-5 animate-fadeIn">
                <div className="space-y-1">
                  <span className="text-xs font-mono text-cyan-400 uppercase font-semibold">
                    STEP 3 &bull; TARGET BY ROLE
                  </span>
                  <h2 className="text-2xl font-bold text-white">What role are you targeting?</h2>
                  <p className="text-xs text-slate-400">
                    SARATHI calibrates interview simulations and skill practice to your exact career ambition.
                  </p>
                </div>

                {/* Role Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={roleSearch}
                    onChange={(e) => setRoleSearch(e.target.value)}
                    placeholder="Search roles (e.g. Data Analyst, Java Developer, Cloud Engineer)..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs sm:text-sm focus:border-cyan-400 focus:outline-hidden"
                  />
                </div>

                {/* Popular Roles Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {(roleSearch.trim() ? searchRoles(roleSearch) : ALL_ROLES.slice(0, 9)).map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setSelectedRole(r.title);
                        setIsCustomRole(false);
                        setCalibratedSkills(r.defaultSkills);
                      }}
                      className={`p-3 rounded-xl border text-left text-xs transition-all ${
                        selectedRole === r.title && !isCustomRole
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-white">{r.title}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{r.category}</div>
                    </button>
                  ))}
                </div>

                {/* Custom Role Option */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCustomRole}
                      onChange={(e) => setIsCustomRole(e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-400 bg-slate-900 border-slate-700"
                    />
                    <span>Other / Custom Role</span>
                  </label>

                  {isCustomRole && (
                    <input
                      type="text"
                      value={customRoleText}
                      onChange={(e) => setCustomRoleText(e.target.value)}
                      placeholder="e.g. AI Product Engineer, Blockchain Architect"
                      className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                    />
                  )}
                </div>

                <div className="flex justify-between items-center pt-4">
                  <button
                    type="button"
                    onClick={() => setWizardStep(2)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    &larr; Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardStep(4)}
                    className="px-6 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase shadow-neon-cyan flex items-center space-x-2"
                  >
                    <span>Continue to Comfort Level</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: CURRENT LEVEL */}
            {wizardStep === 4 && (
              <div className="space-y-5 animate-fadeIn">
                <div className="space-y-1">
                  <span className="text-xs font-mono text-cyan-400 uppercase font-semibold">
                    STEP 4 &bull; CURRENT LEVEL
                  </span>
                  <h2 className="text-2xl font-bold text-white">How comfortable are you with this field?</h2>
                  <p className="text-xs text-slate-400">
                    This sets your initial diagnostic baseline questions.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    { id: 'beginner', title: 'Beginner', desc: 'Starting fresh or needing a complete foundational recap.' },
                    { id: 'intermediate', title: 'Intermediate', desc: 'Familiar with core concepts, aiming to sharpen problem-solving.' },
                    { id: 'advanced', title: 'Advanced', desc: 'Strong grasp, looking for high-difficulty questions and exam mastery.' },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setLevel(lvl.id as LearnerLevel)}
                      className={`w-full text-left p-4 rounded-xl border text-xs sm:text-sm transition-all flex items-start space-x-3 ${
                        level === lvl.id
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-xs'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center shrink-0 mt-0.5">
                        {level === lvl.id && <div className="w-2 h-2 rounded-full bg-cyan-400" />}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{lvl.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{lvl.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-4">
                  <button
                    type="button"
                    onClick={() => setWizardStep(3)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    &larr; Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardStep(5)}
                    className="px-6 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase shadow-neon-cyan flex items-center space-x-2"
                  >
                    <span>Continue to Study Time</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: STUDY TIME */}
            {wizardStep === 5 && (
              <div className="space-y-5 animate-fadeIn">
                <div className="space-y-1">
                  <span className="text-xs font-mono text-cyan-400 uppercase font-semibold">
                    STEP 5 &bull; STUDY TIME
                  </span>
                  <h2 className="text-2xl font-bold text-white">How much time can you study each day?</h2>
                  <p className="text-xs text-slate-400">
                    SARATHI will pace your practice drills and revision accordingly.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { minutes: 30, label: '30 minutes / day' },
                    { minutes: 60, label: '1 hour / day' },
                    { minutes: 120, label: '2 hours / day' },
                    { minutes: 180, label: '3+ hours / day' },
                  ].map((opt) => (
                    <button
                      key={opt.minutes}
                      type="button"
                      onClick={() => setDailyMinutes(opt.minutes)}
                      className={`p-4 rounded-xl border text-center text-xs sm:text-sm font-semibold transition-all ${
                        dailyMinutes === opt.minutes
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-xs'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-4">
                  <button
                    type="button"
                    onClick={() => setWizardStep(4)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    &larr; Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardStep(6)}
                    className="px-6 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase shadow-neon-cyan flex items-center space-x-2"
                  >
                    <span>Continue to Finish</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 6: CREATE LEARNING PATH */}
            {wizardStep === 6 && (
              <div className="space-y-5 animate-fadeIn">
                <div className="space-y-1">
                  <span className="text-xs font-mono text-cyan-400 uppercase font-semibold">
                    STEP 6 &bull; CREATE LEARNING PATH
                  </span>
                  <h2 className="text-2xl font-bold text-white">Almost Ready! What is your name?</h2>
                  <p className="text-xs text-slate-400">
                    Personalize your SARATHI learning workspace.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-slate-300">Your Name</label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-cyan-400"
                    required
                  />
                </div>

                {/* Summary Box */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                  <div className="font-semibold text-slate-200">Summary of Configuration:</div>
                  <div className="text-slate-400">Exam Target: <strong className="text-cyan-300">{specificTarget}</strong></div>
                  <div className="text-slate-400">Target Role: <strong className="text-white">{isCustomRole ? customRoleText || 'Custom' : selectedRole}</strong></div>
                  {subjectTrack.trim() && (
                    <div className="text-slate-400">Subject: <strong className="text-slate-200">{subjectTrack}</strong></div>
                  )}
                  <div className="text-slate-400">Level: <strong className="text-slate-200 capitalize">{level}</strong> &bull; Pace: <strong className="text-slate-200">{dailyMinutes} mins/day</strong></div>
                </div>

                <div className="flex justify-between items-center pt-4">
                  <button
                    type="button"
                    onClick={() => setWizardStep(5)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    &larr; Back
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-slate-950 font-bold text-sm tracking-wide shadow-neon-cyan flex items-center space-x-2"
                  >
                    <span>BUILD MY SARATHI PATH</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STATE C: CONFIGURED / RETURNING STUDENT PERSONALIZED DASHBOARD
         ───────────────────────────────────────────────────────────── */}
      {!isNewStudent && (
        <div className="space-y-8 animate-fadeIn">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/30 border border-slate-800 shadow-glass">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {greeting}, {profile?.name || 'Student'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300">
                Personalized learning & assessment workspace &bull; Target Role:{' '}
                <span className="text-cyan-300 font-semibold">{profile?.targetRole || 'Configured Role'}</span>
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <div className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] font-mono text-slate-400 block">Pace</span>
                <span className="text-xs font-bold text-slate-200">
                  {profile?.dailyStudyMinutes || 60}m / day
                </span>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] font-mono text-slate-400 block">Level</span>
                <span className="text-xs font-bold text-cyan-300 capitalize">
                  {profile?.currentLevel || 'Intermediate'}
                </span>
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────
              SECTION 7: TARGET DASHBOARD ("YOUR TARGET")
             ───────────────────────────────────────────────────────── */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 shadow-glass">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-mono uppercase text-cyan-400">
                <Target className="w-4 h-4" />
                <span>YOUR TARGET CALIBRATION</span>
              </div>
              <Link href="/settings" className="text-xs text-cyan-400 hover:underline">
                Update Target & Skills &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Career Goal */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Career Goal / Target Role</span>
                <div className="text-base font-bold text-white flex items-center space-x-2">
                  <Briefcase className="w-4 h-4 text-cyan-400" />
                  <span>{profile?.targetRole || 'Software Engineer'}</span>
                </div>
              </div>

              {/* Exam Goal */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Academic / Exam Goal</span>
                <div className="text-base font-bold text-cyan-300 flex items-center space-x-2">
                  <GraduationCap className="w-4 h-4 text-purple-400" />
                  <span>{profile?.targetExamLabel || 'Configured Assessment'}</span>
                </div>
              </div>

              {/* Pace */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Daily Commitment</span>
                <div className="text-base font-bold text-emerald-400 flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>{profile?.dailyStudyMinutes || 60} Minutes / Day</span>
                </div>
              </div>
            </div>

            {/* Focus Skills */}
            {profile?.targetSkills && profile.targetSkills.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <span className="text-[11px] font-mono text-slate-400">Calibrated Focus Skills:</span>
                <div className="flex flex-wrap gap-1.5">
                  {profile.targetSkills.map((sk) => (
                    <span
                      key={sk}
                      className="px-2.5 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-slate-800 text-[11px] font-mono"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ─────────────────────────────────────────────────────────
              SECTION 8: CONTINUE LEARNING (STRICT REAL ACTIVITY DRIVEN)
             ───────────────────────────────────────────────────────── */}
          {primaryUnfinished ? (
            <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-500/40 shadow-neon-cyan relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-2 max-w-xl">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                      CONTINUE LEARNING
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Last studied: {formatActivityDate(primaryUnfinished.lastActivity)}
                    </span>
                  </div>

                  <h2 className="text-2xl font-bold text-white">
                    {primaryUnfinished.topic}
                  </h2>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {primaryUnfinished.subject}
                    </span>
                    {primaryUnfinished.materialName && (
                      <>
                        <span>&bull;</span>
                        <span className="text-slate-300">
                          Doc: {primaryUnfinished.materialName}
                        </span>
                      </>
                    )}
                    <span>&bull;</span>
                    <span className="text-cyan-300 font-mono">
                      Progress: {primaryUnfinished.progress}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  {unfinishedActivities.length > 1 && (
                    <button
                      onClick={() => setShowAllActivitiesModal(true)}
                      className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all whitespace-nowrap"
                    >
                      View All ({unfinishedActivities.length})
                    </button>
                  )}

                  <Link
                    href={primaryUnfinished.actionRoute}
                    className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-sm tracking-wide shadow-neon-cyan whitespace-nowrap"
                  >
                    <span>CONTINUE</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-glass relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-2 max-w-xl">
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-mono font-bold uppercase tracking-wider">
                    START YOUR LEARNING JOURNEY
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    You haven't started a learning session yet.
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Start your first learning session and SARATHI will remember where you left off.
                  </p>
                </div>

                <Link
                  href="/tutor"
                  className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-neon-cyan whitespace-nowrap"
                >
                  <span>START LEARNING</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────
              FOUR CORE LEARNING TILES (TUTOR, PRACTICE, EXAM, INTERVIEW)
             ───────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. AI TUTOR CARD */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 shadow-glass flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-xs font-mono text-purple-400 uppercase">
                  <Brain className="w-4 h-4" />
                  <span>AI Tutor</span>
                </div>
                <h3 className="text-base font-bold text-white">Ask SARATHI</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Interactive guidance on {profile?.targetRole || 'your chosen role'}, conceptual simplification, and material RAG.
                </p>
              </div>

              <Link
                href="/tutor"
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider text-center block transition-all"
              >
                OPEN AI TUTOR
              </Link>
            </div>

            {/* 2. PRACTICE CARD */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 shadow-glass flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 uppercase">
                  <Target className="w-4 h-4" />
                  <span>Practice</span>
                </div>
                <h3 className="text-base font-bold text-white">Practice Drills</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {activityLog.length > 0
                    ? `Adaptive problem drills calibrated to your performance (${activityLog.length} session(s) recorded).`
                    : 'Targeted problems with multi-method solutions and dynamic hints.'}
                </p>
              </div>

              <Link
                href="/practice"
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider text-center block transition-all"
              >
                PRACTICE NOW
              </Link>
            </div>

            {/* 3. MOCK EXAM CARD */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 shadow-glass flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-xs font-mono text-blue-400 uppercase">
                  <FileCheck2 className="w-4 h-4" />
                  <span>Mock Exam</span>
                </div>

                {latestMockTest ? (
                  <>
                    <h3 className="text-base font-bold text-white">Latest Mock Test</h3>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                      <div className="font-semibold text-slate-200 truncate">
                        {latestMockTest.config?.examLabel || latestMockTest.title || 'Completed Mock Test'}
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="font-mono text-cyan-300 font-bold">
                          {latestMockTest.score}/{latestMockTest.maxScore}
                        </span>
                        <span className="font-mono text-emerald-400">
                          {latestMockTest.accuracy}% Acc
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-base font-bold text-white">Mock Test</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      No mock test results yet. Simulate timed conditions with negative marking.
                    </p>
                  </>
                )}
              </div>

              <Link
                href="/exams"
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider text-center block transition-all"
              >
                {latestMockTest ? 'NEW MOCK EXAM' : 'START MOCK EXAM'}
              </Link>
            </div>

            {/* 4. AI INTERVIEW & COMMUNICATION CARD */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 shadow-glass flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400 uppercase">
                  <MessageSquare className="w-4 h-4" />
                  <span>AI Interview</span>
                </div>

                {latestInterview ? (
                  <>
                    <h3 className="text-base font-bold text-white">Latest Interview</h3>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                      <div className="font-semibold text-white truncate">
                        {latestInterview.role} ({latestInterview.mode})
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-emerald-400 font-bold">
                          {latestInterview.report?.hireRecommendation || 'Completed'}
                        </span>
                        <span className="font-mono text-cyan-300">
                          {latestInterview.report?.finalScore || 0}%
                        </span>
                      </div>
                    </div>
                  </>
                ) : latestCommunication ? (
                  <>
                    <h3 className="text-base font-bold text-white">Communication</h3>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                      <div className="font-semibold text-white truncate">
                        {latestCommunication.scenarioTitle}
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Score:</span>
                        <span className="font-mono text-cyan-300 font-bold">
                          {latestCommunication.rubric?.overallScore || 0}/100
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-base font-bold text-white">Interview Prep</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      No interview sessions completed yet. Practice conversational rounds and writing.
                    </p>
                  </>
                )}
              </div>

              <Link
                href="/interview"
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider text-center block transition-all"
              >
                OPEN INTERVIEW ARENA
              </Link>
            </div>
          </div>

          {/* TWO LOWER SECTIONS: LEARNING PROGRESS & READINESS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Learning Progress Section */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 shadow-glass">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-mono uppercase text-slate-300 tracking-wider">
                  Learning Progress
                </h3>
                <Link href="/progress" className="text-xs text-cyan-400 hover:underline">
                  Full Details &rarr;
                </Link>
              </div>

              {activityLog.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <Clock className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">
                    Your progress will appear here after your first activity.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase block font-mono">Sessions</span>
                      <span className="text-xl font-bold font-mono text-white">{activityLog.length}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase block font-mono">Mastered Topics</span>
                      <span className="text-xl font-bold font-mono text-cyan-300">
                        {Object.values(conceptMasteries).filter((c) => c.status === 'mastered' || c.status === 'strong').length} of {Object.values(conceptMasteries).length}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Readiness Section */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 shadow-glass">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-mono uppercase text-slate-300 tracking-wider">
                  Readiness Score
                </h3>
                <Link href="/readiness" className="text-xs text-cyan-400 hover:underline">
                  Readiness Engine &rarr;
                </Link>
              </div>

              {readiness.status === 'insufficient_data' || !readiness.overallScore ? (
                <div className="py-6 text-center space-y-3">
                  <div className="text-base sm:text-lg font-bold text-slate-300">
                    Not enough evidence yet.
                  </div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Complete learning and assessment activities to build your readiness profile.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <Link
                      href="/practice"
                      className="px-3.5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-neon-cyan transition-all"
                    >
                      Start Practice
                    </Link>
                    <Link
                      href="/exams"
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-all"
                    >
                      Take Mock Test
                    </Link>
                    <Link
                      href="/interview"
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-all"
                    >
                      Start AI Interview
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-extrabold font-mono text-cyan-300">
                      {readiness.overallScore}%
                    </span>
                    <span className="text-xs text-slate-400">
                      {readiness.statusMessage.split('—')[0]}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${readiness.overallScore}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW ALL UNFINISHED ACTIVITIES MODAL
         ───────────────────────────────────────────────────────────── */}
      {showAllActivitiesModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 animate-fadeIn shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Your Unfinished Learning Activities</h3>
              <button
                onClick={() => setShowAllActivitiesModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 pr-1 flex-1">
              {unfinishedActivities.map((act) => (
                <div
                  key={act.id}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-sm">{act.topic}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-slate-800 uppercase">
                        {act.source}
                      </span>
                    </div>
                    <div className="text-slate-400">
                      Subject: <strong className="text-slate-300">{act.subject}</strong> &bull;{' '}
                      {formatActivityDate(act.lastActivity)}
                    </div>
                    <div className="text-cyan-400 font-mono text-[11px]">{act.progress}</div>
                  </div>

                  <Link
                    href={act.actionRoute}
                    onClick={() => setShowAllActivitiesModal(false)}
                    className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase shadow-neon-cyan whitespace-nowrap text-center"
                  >
                    {act.actionLabel}
                  </Link>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowAllActivitiesModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
