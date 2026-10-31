'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Network,
  Target,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  BookOpen,
  Zap,
  Clock,
  Mic,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  ArrowLeft,
  Info,
} from 'lucide-react';
import { useProgress } from '@/hooks/use-progress';
import { getRoleByIdOrTitle } from '@/config/roles';
import { PracticeSessionRecord } from '@/components/practice/PracticeEngine';
import { ExamAttemptRecord } from '@/components/exams/ExamEngine';
import { StoredInterviewRecord } from '@/types/interview';

const STORAGE_KEY_PRACTICE = 'sarathi_practice_history_v2';
const STORAGE_KEY_EXAMS = 'sarathi_mock_exam_history';
const STORAGE_KEY_INTERVIEWS = 'sarathi_interview_history_v2';

export type KnowledgeNodeStatus = 'strong' | 'developing' | 'needs_attention' | 'not_assessed';

export interface KnowledgeNode {
  id: string;
  name: string;
  category: string;
  description: string;
  status: KnowledgeNodeStatus;
  score: number | null; // null if not assessed
  attemptsCount: number;
  correctCount: number;
  mistakeCount: number;
  evidenceSources: string[];
  recommendedAction: {
    title: string;
    description: string;
    ctaText: string;
    href: string;
  };
}

const STATUS_CONFIG: Record<
  KnowledgeNodeStatus,
  { label: string; bg: string; border: string; text: string; badgeBg: string }
> = {
  strong: {
    label: 'Strong',
    bg: 'bg-emerald-950/30 hover:bg-emerald-950/40',
    border: 'border-emerald-500/40',
    text: 'text-emerald-300',
    badgeBg: 'bg-emerald-950 text-emerald-300 border-emerald-800',
  },
  developing: {
    label: 'Developing',
    bg: 'bg-amber-950/30 hover:bg-amber-950/40',
    border: 'border-amber-500/40',
    text: 'text-amber-300',
    badgeBg: 'bg-amber-950 text-amber-300 border-amber-800',
  },
  needs_attention: {
    label: 'Needs Attention',
    bg: 'bg-rose-950/30 hover:bg-rose-950/40',
    border: 'border-rose-500/40',
    text: 'text-rose-300',
    badgeBg: 'bg-rose-950 text-rose-300 border-rose-800',
  },
  not_assessed: {
    label: 'Not Assessed',
    bg: 'bg-slate-900/50 hover:bg-slate-900/70',
    border: 'border-slate-800',
    text: 'text-slate-400',
    badgeBg: 'bg-slate-800 text-slate-400 border-slate-700',
  },
};

export function KnowledgeMap() {
  const { profile, conceptMasteries, attempts, weaknesses } = useProgress();

  const [practiceHistory, setPracticeHistory] = useState<PracticeSessionRecord[]>([]);
  const [examHistory, setExamHistory] = useState<ExamAttemptRecord[]>([]);
  const [interviewHistory, setInterviewHistory] = useState<StoredInterviewRecord[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Load telemetry from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const rawPractice = localStorage.getItem(STORAGE_KEY_PRACTICE);
      if (rawPractice) {
        const parsed = JSON.parse(rawPractice);
        if (Array.isArray(parsed)) setPracticeHistory(parsed);
      }

      const rawExams = localStorage.getItem(STORAGE_KEY_EXAMS);
      if (rawExams) {
        const parsed = JSON.parse(rawExams);
        if (Array.isArray(parsed)) setExamHistory(parsed);
      }

      const rawInterviews = localStorage.getItem(STORAGE_KEY_INTERVIEWS);
      if (rawInterviews) {
        const parsed = JSON.parse(rawInterviews);
        if (Array.isArray(parsed)) setInterviewHistory(parsed);
      }
    } catch (e) {
      console.warn('Failed to load knowledge map telemetry:', e);
    } finally {
      setIsDataLoaded(true);
    }
  }, []);

  // 1. Target Role & Core Skills Mapping (Source of Truth: Profile)
  const activeRoleTitle = profile?.targetRole || profile?.primarySubject || profile?.targetExamLabel || null;

  const targetSkillsList: string[] = useMemo(() => {
    if (profile?.targetSkills && profile.targetSkills.length > 0) {
      return profile.targetSkills;
    }
    if (activeRoleTitle) {
      const roleDef = getRoleByIdOrTitle(activeRoleTitle);
      if (roleDef && roleDef.defaultSkills.length > 0) {
        return roleDef.defaultSkills;
      }
    }
    return ['Data Structures', 'Algorithms', 'System Design', 'Databases', 'Problem Solving', 'Communication'];
  }, [profile, activeRoleTitle]);

  // 2. Synthesize Real Evidence Nodes for each Target Skill
  const knowledgeNodes: KnowledgeNode[] = useMemo(() => {
    return targetSkillsList.map((skillName, index) => {
      const cleanSkill = skillName.toLowerCase().trim();

      let skillAttempts = 0;
      let skillCorrect = 0;
      let skillMistakes = 0;
      const sourcesUsed: string[] = [];

      // Check Practice Sessions
      for (const p of practiceHistory) {
        if (p.topic.toLowerCase().includes(cleanSkill)) {
          skillAttempts += p.totalQuestions || 0;
          skillCorrect += p.correctCount || 0;
          skillMistakes += p.incorrectCount || 0;
          if (!sourcesUsed.includes('Practice Session')) sourcesUsed.push('Practice Session');
        }
      }

      // Check DB Concept Masteries
      for (const m of Object.values(conceptMasteries)) {
        if (
          m.conceptName.toLowerCase().includes(cleanSkill) ||
          m.topic.toLowerCase().includes(cleanSkill)
        ) {
          skillAttempts += m.attemptsCount;
          skillCorrect += m.correctCount;
          skillMistakes += m.mistakeCount;
          if (!sourcesUsed.includes('Concept Drill')) sourcesUsed.push('Concept Drill');
        }
      }

      // Check Mock Exams
      for (const exam of examHistory) {
        for (const q of exam.questions || []) {
          if (q.topic.toLowerCase().includes(cleanSkill)) {
            skillAttempts += 1;
            const userAnswers = exam.answers[q.id] || [];
            const isCorrect =
              userAnswers.length === q.correctAnswers.length &&
              userAnswers.every((a) => q.correctAnswers.includes(a));
            if (isCorrect) skillCorrect += 1;
            else skillMistakes += 1;
            if (!sourcesUsed.includes('Mock Exam')) sourcesUsed.push('Mock Exam');
          }
        }
      }

      // Check AI Interview Question Reviews
      for (const interview of interviewHistory) {
        for (const qr of interview.report?.questionReviews || []) {
          if (
            (qr.relatedTopic && qr.relatedTopic.toLowerCase().includes(cleanSkill)) ||
            (interview.role && interview.role.toLowerCase().includes(cleanSkill))
          ) {
            skillAttempts += 1;
            if (qr.score >= 70) skillCorrect += 1;
            else skillMistakes += 1;
            if (!sourcesUsed.includes('AI Interview')) sourcesUsed.push('AI Interview');
          }
        }
      }

      // Check if explicitly flagged in detected weaknesses
      const isWeakness = weaknesses.some(
        (w) => w.conceptName.toLowerCase().includes(cleanSkill) || w.topic.toLowerCase().includes(cleanSkill)
      );

      // Determine Status & Recommended Action
      let status: KnowledgeNodeStatus = 'not_assessed';
      let score: number | null = null;

      if (skillAttempts === 0) {
        status = 'not_assessed';
        return {
          id: `node-${index}`,
          name: skillName,
          category: activeRoleTitle || 'Target Competency',
          description: `Core competency required for ${activeRoleTitle || 'your learning target'}. Awaiting first assessment.`,
          status,
          score: null,
          attemptsCount: 0,
          correctCount: 0,
          mistakeCount: 0,
          evidenceSources: ['No assessments recorded yet'],
          recommendedAction: {
            title: `Evaluate ${skillName}`,
            description: `Start a focused practice drill on ${skillName} to establish your baseline competency.`,
            ctaText: `Practice ${skillName}`,
            href: `/practice?topic=${encodeURIComponent(skillName)}`,
          },
        };
      }

      score = Math.round((skillCorrect / skillAttempts) * 100);

      if (isWeakness || score < 50) {
        status = 'needs_attention';
      } else if (score >= 75 && skillAttempts >= 2) {
        status = 'strong';
      } else {
        status = 'developing';
      }

      let actionTitle = `Practice ${skillName}`;
      let actionDesc = `Continue practicing ${skillName} to build speed and accuracy.`;
      let ctaText = 'Practice Concept';
      let href = `/practice?topic=${encodeURIComponent(skillName)}`;

      if (status === 'needs_attention') {
        actionTitle = `Remediate Weakness: ${skillName}`;
        actionDesc = `${skillName} has an accuracy of ${score}% with ${skillMistakes} error(s). Review detailed solutions and step-by-step guidance.`;
        ctaText = 'Launch Remediation Drill';
        href = `/practice?topic=${encodeURIComponent(skillName)}`;
      } else if (status === 'strong') {
        actionTitle = `Maintain Mastery: ${skillName}`;
        actionDesc = `Demonstrated high accuracy (${score}%). Test yourself under timed mock exam conditions.`;
        ctaText = 'Test in Mock Exam';
        href = '/exams';
      }

      return {
        id: `node-${index}`,
        name: skillName,
        category: activeRoleTitle || 'Target Competency',
        description: `Verified competency evaluated across ${sourcesUsed.join(', ')}.`,
        status,
        score,
        attemptsCount: skillAttempts,
        correctCount: skillCorrect,
        mistakeCount: skillMistakes,
        evidenceSources: sourcesUsed,
        recommendedAction: {
          title: actionTitle,
          description: actionDesc,
          ctaText,
          href,
        },
      };
    });
  }, [targetSkillsList, activeRoleTitle, practiceHistory, conceptMasteries, examHistory, interviewHistory, weaknesses]);

  // Selected Node State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return knowledgeNodes[0] || null;
    return knowledgeNodes.find((n) => n.id === selectedNodeId) || knowledgeNodes[0] || null;
  }, [selectedNodeId, knowledgeNodes]);

  // Overall Evidence Metrics
  const totalAssessedNodes = useMemo(() => {
    return knowledgeNodes.filter((n) => n.status !== 'not_assessed').length;
  }, [knowledgeNodes]);

  const strongNodesCount = useMemo(() => {
    return knowledgeNodes.filter((n) => n.status === 'strong').length;
  }, [knowledgeNodes]);

  const weakNodesCount = useMemo(() => {
    return knowledgeNodes.filter((n) => n.status === 'needs_attention').length;
  }, [knowledgeNodes]);

  const developingNodesCount = useMemo(() => {
    return knowledgeNodes.filter((n) => n.status === 'developing').length;
  }, [knowledgeNodes]);

  const isNewStudent = totalAssessedNodes === 0;

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto px-4 sm:px-6 py-4">
      {/* ------------------------------------------------------------- */}
      {/* Navigation & Header */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            className="inline-flex items-center px-3.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-all shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
            <span>← Back to Dashboard</span>
          </Link>
          {activeRoleTitle && (
            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <span>Target:</span>
              <span className="font-semibold text-cyan-300 px-2 py-0.5 rounded-md bg-cyan-950/70 border border-cyan-800/60 font-mono">
                {activeRoleTitle}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href="/profile"
            className="text-xs text-slate-400 hover:text-cyan-300 transition-colors flex items-center space-x-1 font-mono"
          >
            <Target className="w-3.5 h-3.5 text-cyan-400" />
            <span>Customize Target Skills</span>
          </Link>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Title Card */}
      {/* ------------------------------------------------------------- */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 shadow-glass space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="px-2.5 py-0.5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-mono uppercase tracking-wider">
              EVIDENCE-BASED KNOWLEDGE ARCHITECTURE
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-3">
              <Network className="w-8 h-8 text-cyan-400 shrink-0" />
              <span>Target Knowledge Map</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Maps your actual competency evidence across the skills required for{' '}
              <strong className="text-cyan-300 font-semibold">{activeRoleTitle || 'your selected target'}</strong>.
              Nodes reflect genuine assessment telemetry with zero placeholder data.
            </p>
          </div>

          {/* Real Diagnostic Badge Counters */}
          <div className="flex flex-wrap gap-2 text-[11px] font-mono">
            <div className="px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{strongNodesCount} Strong</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl border border-amber-500/40 bg-amber-950/40 text-amber-300 flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>{developingNodesCount} Developing</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl border border-rose-500/40 bg-rose-950/40 text-rose-300 flex items-center space-x-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{weakNodesCount} Attention</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900/60 text-slate-400 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{knowledgeNodes.length - totalAssessedNodes} Untested</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* STATE 1: NEW STUDENT (0 EVALUATED NODES)                      */}
      {/* ============================================================= */}
      {isNewStudent ? (
        <div className="space-y-8">
          {/* Honest Empty State Banner */}
          <div className="p-8 sm:p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-6 shadow-glass max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-800/80 text-cyan-400 flex items-center justify-center mx-auto shadow-sm">
              <Network className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Your knowledge map will develop as you learn and complete assessments.
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                SARATHI maps your real comprehension dynamically. As you practice questions, take mock tests, and complete interviews, each competency will activate with verified mastery evidence.
              </p>
            </div>

            {/* Three Primary CTA Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <Link
                href="/practice"
                className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs sm:text-sm shadow-neon-cyan transition-all"
              >
                <BookOpen className="w-4 h-4" />
                <span>Start Practice Drill</span>
              </Link>
              <Link
                href="/exams"
                className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm border border-slate-700 transition-all"
              >
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Take Mock Test</span>
              </Link>
              <Link
                href="/interview"
                className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm border border-slate-700 transition-all"
              >
                <Mic className="w-4 h-4 text-purple-400" />
                <span>Start AI Interview</span>
              </Link>
            </div>
          </div>

          {/* Competency Framework Waiting for Evaluation */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-mono uppercase text-slate-300 font-bold tracking-wider">
                  Target Competencies Awaiting Evaluation ({activeRoleTitle || 'General Target'})
                </h3>
                <p className="text-xs text-slate-400">
                  These {targetSkillsList.length} skills represent your target roadmap. No fake mastery scores are shown.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {knowledgeNodes.map((node) => (
                <div
                  key={node.id}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-xs">{node.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-500">
                      Not Assessed
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    {node.description}
                  </p>
                  <div className="pt-1">
                    <Link
                      href={node.recommendedAction.href}
                      className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 inline-flex items-center space-x-1"
                    >
                      <span>{node.recommendedAction.ctaText} &rarr;</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ============================================================= */
        /* STATE 2 & 3: PARTIAL / SUFFICIENT EVIDENCE INTERACTIVE MAP   */
        /* ============================================================= */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Interactive Competency Nodes Grid */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-mono uppercase text-slate-300 font-bold tracking-wider flex items-center space-x-2">
                <Target className="w-4 h-4 text-cyan-400" />
                <span>Competency Nodes ({knowledgeNodes.length} Total)</span>
              </h2>
              <span className="text-xs text-slate-500 font-mono">
                Click any node to inspect evidence
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {knowledgeNodes.map((node) => {
                const cfg = STATUS_CONFIG[node.status];
                const isSelected = selectedNode?.id === node.id;

                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`text-left p-5 rounded-2xl border transition-all relative overflow-hidden group cursor-pointer ${
                      cfg.bg
                    } ${cfg.border} ${
                      isSelected
                        ? 'ring-2 ring-cyan-400 scale-[1.01] shadow-lg'
                        : 'hover:scale-[1.005]'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md border font-bold ${cfg.badgeBg}`}
                        >
                          {cfg.label}
                        </span>
                        <span className="text-xs font-mono font-bold">
                          {node.score !== null ? (
                            <span className={cfg.text}>{node.score}% Accuracy</span>
                          ) : (
                            <span className="text-slate-500 font-normal">--</span>
                          )}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-white group-hover:text-cyan-200 transition-colors">
                        {node.name}
                      </h3>

                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {node.description}
                      </p>

                      <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-slate-500 border-t border-slate-800/60">
                        <span>{node.attemptsCount} Item(s) Attempted</span>
                        {node.mistakeCount > 0 && (
                          <span className="text-rose-400">{node.mistakeCount} Mistake(s)</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Col: Deep Diagnostic Evidence Inspector */}
          <div className="lg:col-span-1">
            {selectedNode ? (
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6 shadow-glass sticky top-24">
                <div className="space-y-2 pb-4 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-md border font-bold ${
                        STATUS_CONFIG[selectedNode.status].badgeBg
                      }`}
                    >
                      {STATUS_CONFIG[selectedNode.status].label}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      ID: {selectedNode.id}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    {selectedNode.name}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedNode.description}
                  </p>
                </div>

                {/* Evidence Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">
                      Assessed Accuracy
                    </span>
                    <span
                      className={`text-2xl font-bold font-mono ${
                        selectedNode.score !== null
                          ? STATUS_CONFIG[selectedNode.status].text
                          : 'text-slate-500'
                      }`}
                    >
                      {selectedNode.score !== null ? `${selectedNode.score}%` : 'N/A'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">
                      Total Evidence
                    </span>
                    <span className="text-2xl font-bold font-mono text-slate-200">
                      {selectedNode.attemptsCount}
                    </span>
                    <span className="text-[10px] text-slate-500 block">question attempts</span>
                  </div>
                </div>

                {/* Verified Evidence Sources */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    Diagnostic Evidence Sources
                  </span>
                  <div className="space-y-1.5">
                    {selectedNode.evidenceSources.map((source, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-300 flex items-center space-x-2"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{source}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended Next Action */}
                <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/40 space-y-2">
                  <div className="flex items-center space-x-1.5 text-cyan-300 text-xs font-semibold">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>{selectedNode.recommendedAction.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-normal">
                    {selectedNode.recommendedAction.description}
                  </p>
                  <div className="pt-2">
                    <Link
                      href={selectedNode.recommendedAction.href}
                      className="w-full py-2.5 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs shadow-neon-cyan transition-all flex items-center justify-center space-x-2"
                    >
                      <span>{selectedNode.recommendedAction.ctaText}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-500">
                Select a competency node on the left to inspect its real assessment evidence.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
