'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useProgress } from '@/hooks/use-progress';
import { APP_CONFIG } from '@/config/app';
import { ExamType, LearnerLevel } from '@/types/user';
import {
  ROLE_CATEGORIES,
  ALL_ROLES,
  searchRoles,
  getRoleByIdOrTitle,
} from '@/config/roles';
import {
  Settings,
  Brain,
  Trash2,
  Plus,
  Key,
  Database,
  RotateCcw,
  CheckCircle2,
  Download,
  Target,
  Search,
  Briefcase,
  X,
  Sparkles,
  Bell,
  Volume2,
  Clock,
  BookOpen,
  Mic,
  ArrowRight,
  ShieldCheck,
  FileText,
  AlertTriangle,
  Play,
  LogOut,
  Info,
} from 'lucide-react';
import { addAIMemory, removeAIMemory, getDatabase, saveDatabase } from '@/lib/db/client';
import { DocumentMaterial } from '@/types/material';

const STORAGE_KEY_PRACTICE = 'sarathi_practice_history_v2';
const STORAGE_KEY_EXAMS = 'sarathi_mock_exam_history';
const STORAGE_KEY_INTERVIEWS = 'sarathi_interview_history_v2';
const STORAGE_KEY_COMMUNICATION = 'sarathi_communication_history_v2';

export default function SettingsPage() {
  const router = useRouter();
  const { profile, saveProfile, db, sync, resetAll, isMounted } = useProgress();

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'profile' | 'learning' | 'interview' | 'notifications' | 'knowledge_base' | 'data_privacy' | 'session'
  >('profile');

  // Confirmation Modals
  const [showClearAssessmentsModal, setShowClearAssessmentsModal] = useState(false);
  const [showClearMaterialsModal, setShowClearMaterialsModal] = useState(false);
  const [showFactoryResetModal, setShowFactoryResetModal] = useState(false);

  // Success Feedback
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const triggerSuccess = (msg: string) => {
    setSaveSuccessMessage(msg);
    setTimeout(() => setSaveSuccessMessage(null), 3500);
  };

  // -------------------------------------------------------------
  // 1. PROFILE STATE
  // -------------------------------------------------------------
  const [name, setName] = useState('');
  const [targetExam, setTargetExam] = useState<ExamType>('gate_cse');
  const [primarySubject, setPrimarySubject] = useState('');
  const [level, setLevel] = useState<LearnerLevel>('intermediate');
  const [dailyMinutes, setDailyMinutes] = useState(60);

  // Role & Skills configuration state
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('Software Engineer');
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [customRoleTitle, setCustomRoleTitle] = useState('');
  const [activeSkills, setActiveSkills] = useState<string[]>([
    'Data Structures',
    'Algorithms',
    'OOP',
    'DBMS',
    'System Design',
  ]);
  const [newSkillInput, setNewSkillInput] = useState('');

  // -------------------------------------------------------------
  // 2. LEARNING PREFERENCES STATE
  // -------------------------------------------------------------
  const [practiceQuestionCount, setPracticeQuestionCount] = useState<string>('5');
  const [practiceTimerMinutes, setPracticeTimerMinutes] = useState<string>('10');
  const [practiceDifficulty, setPracticeDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('medium');
  const [timerSoundAlert, setTimerSoundAlert] = useState<boolean>(true);

  // -------------------------------------------------------------
  // 3. INTERVIEW PREFERENCES STATE
  // -------------------------------------------------------------
  const [defaultInterviewMode, setDefaultInterviewMode] = useState<string>('technical');
  const [defaultInterviewDiff, setDefaultInterviewDiff] = useState<string>('medium');
  const [defaultInterviewCount, setDefaultInterviewCount] = useState<number>(5);

  // -------------------------------------------------------------
  // 4. NOTIFICATIONS STATE
  // -------------------------------------------------------------
  const [notificationPermission, setNotificationPermission] = useState<string>('default');
  const [notificationStatusMsg, setNotificationStatusMsg] = useState<string | null>(null);

  // -------------------------------------------------------------
  // 5. MEMORY STATE
  // -------------------------------------------------------------
  const [memCategory, setMemCategory] = useState<'goal' | 'weakness' | 'preference'>('preference');
  const [memContent, setMemContent] = useState('');

  // -------------------------------------------------------------
  // 6. TELEMETRY STATS & STORAGE CALCULATION
  // -------------------------------------------------------------
  const [practiceHistoryCount, setPracticeHistoryCount] = useState(0);
  const [examHistoryCount, setExamHistoryCount] = useState(0);
  const [interviewHistoryCount, setInterviewHistoryCount] = useState(0);
  const [storageUsageKb, setStorageUsageKb] = useState(0);

  // Load all saved settings and telemetry on client mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load Profile
    if (profile) {
      setName(profile.name || 'Aspirant');
      setTargetExam(profile.targetExam || 'gate_cse');
      setPrimarySubject(profile.primarySubject || '');
      setLevel(profile.currentLevel || 'intermediate');
      setDailyMinutes(profile.dailyStudyMinutes || 60);

      if (profile.targetRole) {
        setSelectedRole(profile.targetRole);
        const match = getRoleByIdOrTitle(profile.targetRole);
        if (!match) {
          setIsCustomRole(true);
          setCustomRoleTitle(profile.targetRole);
        }
      }

      if (profile.targetSkills && profile.targetSkills.length > 0) {
        setActiveSkills(profile.targetSkills);
      }
    } else {
      setName('Aspirant');
    }

    // Load Learning Preferences
    const savedPCount = localStorage.getItem('sarathi_pref_practice_count');
    if (savedPCount) setPracticeQuestionCount(savedPCount);

    const savedPTime = localStorage.getItem('sarathi_pref_practice_time');
    if (savedPTime) setPracticeTimerMinutes(savedPTime);

    const savedPDiff = localStorage.getItem('sarathi_pref_difficulty');
    if (savedPDiff && ['easy', 'medium', 'hard', 'mixed'].includes(savedPDiff)) {
      setPracticeDifficulty(savedPDiff as any);
    }

    const savedSound = localStorage.getItem('sarathi_pref_sound_alert');
    if (savedSound !== null) {
      setTimerSoundAlert(savedSound === 'true');
    }

    // Load Interview Preferences
    const savedIMode = localStorage.getItem('sarathi_pref_interview_mode');
    if (savedIMode) setDefaultInterviewMode(savedIMode);

    const savedIDiff = localStorage.getItem('sarathi_pref_interview_diff');
    if (savedIDiff) setDefaultInterviewDiff(savedIDiff);

    const savedICount = localStorage.getItem('sarathi_pref_interview_count');
    if (savedICount) setDefaultInterviewCount(parseInt(savedICount, 10) || 5);

    // Browser Notification permission status
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    // Telemetry Counts
    try {
      const pRaw = localStorage.getItem(STORAGE_KEY_PRACTICE);
      if (pRaw) {
        const pArr = JSON.parse(pRaw);
        if (Array.isArray(pArr)) setPracticeHistoryCount(pArr.length);
      }

      const eRaw = localStorage.getItem(STORAGE_KEY_EXAMS);
      if (eRaw) {
        const eArr = JSON.parse(eRaw);
        if (Array.isArray(eArr)) setExamHistoryCount(eArr.length);
      }

      const iRaw = localStorage.getItem(STORAGE_KEY_INTERVIEWS);
      if (iRaw) {
        const iArr = JSON.parse(iRaw);
        if (Array.isArray(iArr)) setInterviewHistoryCount(iArr.length);
      }

      // Storage usage
      let totalBytes = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) {
          totalBytes += (localStorage.getItem(k) || '').length * 2;
        }
      }
      setStorageUsageKb(Math.round(totalBytes / 1024));
    } catch (e) {
      console.warn('Failed to calculate telemetry size:', e);
    }
  }, [profile]);

  // Filtered roles based on search
  const filteredRoles = useMemo(() => {
    return searchRoles(roleSearchQuery);
  }, [roleSearchQuery]);

  // Handle Role Selection
  const handleSelectRole = (roleTitle: string) => {
    setSelectedRole(roleTitle);
    setIsCustomRole(false);
    const def = getRoleByIdOrTitle(roleTitle);
    if (def) {
      setActiveSkills(def.defaultSkills);
    }
    setRoleSearchQuery('');
  };

  // Add custom skill
  const handleAddSkill = () => {
    const clean = newSkillInput.trim();
    if (!clean) return;
    if (!activeSkills.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      setActiveSkills([...activeSkills, clean]);
    }
    setNewSkillInput('');
  };

  // Remove skill
  const handleRemoveSkill = (skillToRemove: string) => {
    setActiveSkills(activeSkills.filter((s) => s !== skillToRemove));
  };

  // -------------------------------------------------------------
  // SAVE HANDLERS
  // -------------------------------------------------------------

  // Save Profile Settings
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedExamObj = APP_CONFIG.supportedExams.find((ex) => ex.id === targetExam);
    const examLabel = selectedExamObj?.label || targetExam || 'My Target Assessment';
    const finalRole = isCustomRole ? customRoleTitle.trim() || 'Custom Role' : selectedRole;

    saveProfile({
      id: profile?.id || `usr-${Date.now()}`,
      name: name.trim() || 'Aspirant',
      email: profile?.email || 'student@sarathi.ai',
      targetExam,
      targetExamLabel: primarySubject.trim() ? `${examLabel} — ${primarySubject.trim()}` : examLabel,
      targetRole: finalRole,
      targetSkills: activeSkills,
      careerGoal: finalRole,
      primarySubject: primarySubject.trim() || undefined,
      currentLevel: level,
      targetDate: profile?.targetDate || '2026-03-01',
      dailyStudyMinutes: dailyMinutes,
      completedOnboarding: true,
      totalStudyMinutes: profile?.totalStudyMinutes || 0,
      streakDays: profile?.streakDays || 1,
      createdAt: profile?.createdAt || new Date().toISOString(),
    });

    triggerSuccess('✓ Profile, target goals, and skill competencies saved successfully!');
  };

  // Save Learning Preferences
  const handleSaveLearningPreferences = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('sarathi_pref_practice_count', practiceQuestionCount);
      localStorage.setItem('sarathi_pref_practice_time', practiceTimerMinutes);
      localStorage.setItem('sarathi_pref_difficulty', practiceDifficulty);
      localStorage.setItem('sarathi_pref_sound_alert', String(timerSoundAlert));
    }
    triggerSuccess('✓ Learning & practice preferences updated and applied!');
  };

  // Save Interview Preferences
  const handleSaveInterviewPreferences = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('sarathi_pref_interview_mode', defaultInterviewMode);
      localStorage.setItem('sarathi_pref_interview_diff', defaultInterviewDiff);
      localStorage.setItem('sarathi_pref_interview_count', String(defaultInterviewCount));
    }
    triggerSuccess('✓ AI Interviewer default parameters updated and saved!');
  };

  // Test Chime Sound
  const handleTestChime = () => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      console.warn('AudioContext not allowed without gesture:', e);
    }
  };

  // Request Browser Notification
  const handleRequestNotification = async () => {
    if (!('Notification' in window)) {
      setNotificationStatusMsg('Web Notifications are not supported in this browser.');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        new Notification('SARATHI Study Assistant', {
          body: 'Notifications active! You will receive timely alerts for study streaks and practice timers.',
          icon: '/icon.svg',
        });
        setNotificationStatusMsg('✓ Browser notifications enabled and test notification sent.');
      } else {
        setNotificationStatusMsg('Notification permission was declined in your browser.');
      }
    } catch (e) {
      setNotificationStatusMsg('Unable to request notification permission.');
    }
  };

  // Add / Delete Memory
  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memContent.trim()) return;
    addAIMemory(memCategory, memContent.trim(), 'User Configured');
    setMemContent('');
    sync();
    triggerSuccess('✓ Custom contextual memory stored for SARATHI AI Tutor!');
  };

  const handleDeleteMemory = (id: string) => {
    removeAIMemory(id);
    sync();
  };

  // Delete Individual Material
  const handleDeleteMaterial = (materialId: string) => {
    const currentDb = getDatabase();
    currentDb.materials = (currentDb.materials || []).filter((m) => m.id !== materialId);
    saveDatabase(currentDb);
    sync();
    triggerSuccess('✓ Document material removed from knowledge base.');
  };

  // Clear Assessment History (Practice + Exams + Interviews)
  const handleConfirmClearAssessments = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_PRACTICE);
      localStorage.removeItem(STORAGE_KEY_EXAMS);
      localStorage.removeItem(STORAGE_KEY_INTERVIEWS);
      localStorage.removeItem(STORAGE_KEY_COMMUNICATION);
    }

    const currentDb = getDatabase();
    currentDb.attempts = [];
    currentDb.examSessions = [];
    currentDb.interviewSessions = [];
    currentDb.conceptMasteries = {};
    currentDb.activeWeaknessFix = null;
    saveDatabase(currentDb);
    sync();

    setPracticeHistoryCount(0);
    setExamHistoryCount(0);
    setInterviewHistoryCount(0);
    setShowClearAssessmentsModal(false);
    triggerSuccess('✓ All assessment history has been cleared. Profile settings remain intact.');
  };

  // Clear All Learning Materials
  const handleConfirmClearMaterials = () => {
    const currentDb = getDatabase();
    currentDb.materials = [];
    saveDatabase(currentDb);
    sync();
    setShowClearMaterialsModal(false);
    triggerSuccess('✓ All uploaded study materials and indexed vectors removed.');
  };

  // Factory Reset
  const handleConfirmFactoryReset = () => {
    resetAll();
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
    window.location.href = '/';
  };

  // Export JSON
  const handleExportData = () => {
    const payload = {
      database: getDatabase(),
      practiceHistory: JSON.parse(localStorage.getItem(STORAGE_KEY_PRACTICE) || '[]'),
      examHistory: JSON.parse(localStorage.getItem(STORAGE_KEY_EXAMS) || '[]'),
      interviewHistory: JSON.parse(localStorage.getItem(STORAGE_KEY_INTERVIEWS) || '[]'),
      commHistory: JSON.parse(localStorage.getItem(STORAGE_KEY_COMMUNICATION) || '[]'),
      exportedAt: new Date().toISOString(),
      version: 'SARATHI 2.0',
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `sarathi_full_telemetry_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Replay Intro
  const handleReplayIntro = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('sarathi_intro_seen');
    }
    window.location.href = '/dashboard?intro=true';
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn pb-16 px-4 sm:px-6">
        {/* Header */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-mono uppercase tracking-wider">
              PLATFORM CONTROLS & SOURCE OF TRUTH
            </span>
            <span className="text-xs font-mono text-slate-500">
              Storage: ~{storageUsageKb} KB
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center space-x-2">
            <Settings className="w-6 h-6 text-cyan-400" />
            <span>Settings & Preferences</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Every setting below is connected to the real SARATHI learning engine and persists across sessions.
          </p>
        </div>

        {/* Global Save Success Banner */}
        {saveSuccessMessage && (
          <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs sm:text-sm text-center font-medium animate-fadeIn shadow-lg flex items-center justify-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* Navigation Tabs                                              */}
        {/* ------------------------------------------------------------- */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-slate-800/80 text-xs font-mono">
          {[
            { id: 'profile', label: 'Profile & Targets', icon: Target },
            { id: 'learning', label: 'Learning & Practice', icon: BookOpen },
            { id: 'interview', label: 'Interview Setup', icon: Mic },
            { id: 'knowledge_base', label: `Materials (${db.materials?.length || 0})`, icon: FileText },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'data_privacy', label: 'Data & Privacy', icon: ShieldCheck },
            { id: 'session', label: 'Account & Session', icon: Briefcase },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ============================================================= */}
        {/* TAB 1: PROFILE & DUAL TARGETS                                */}
        {/* ============================================================= */}
        {activeTab === 'profile' && (
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6 shadow-glass">
            <div>
              <h3 className="text-sm font-mono uppercase text-slate-300 font-bold tracking-wider">
                Student Profile & Target Architecture
              </h3>
              <p className="text-xs text-slate-400">
                SARATHI uses your configured target exam and career role as the primary source of truth across all features.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono text-slate-300">Student Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full mt-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-cyan-400 focus:outline-hidden"
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-300">Academic / Exam Target</label>
                  <select
                    value={targetExam}
                    onChange={(e) => setTargetExam(e.target.value as ExamType)}
                    className="w-full mt-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-cyan-400 focus:outline-hidden"
                  >
                    {APP_CONFIG.supportedExams.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-300">Primary Subject / Focus Area</label>
                  <input
                    type="text"
                    value={primarySubject}
                    onChange={(e) => setPrimarySubject(e.target.value)}
                    placeholder="e.g. Data Structures, Computer Networks, Operating Systems"
                    className="w-full mt-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-cyan-400 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-300">Current Knowledge Level</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value as LearnerLevel)}
                    className="w-full mt-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white capitalize focus:border-cyan-400 focus:outline-hidden"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              {/* TARGET CAREER ROLE */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 uppercase">
                    <Briefcase className="w-4 h-4" />
                    <span>Target Career Role</span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    Selected: <strong className="text-cyan-300 font-semibold">{isCustomRole ? customRoleTitle || 'Custom' : selectedRole}</strong>
                  </span>
                </div>

                {/* Role Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={roleSearchQuery}
                    onChange={(e) => setRoleSearchQuery(e.target.value)}
                    placeholder="Search roles... (e.g. Data Scientist, Cloud Engineer, Java Developer, Full Stack)"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm focus:border-cyan-400 focus:outline-hidden"
                  />
                </div>

                {/* Search Results */}
                {roleSearchQuery.trim() && (
                  <div className="max-h-52 overflow-y-auto space-y-1 p-2 rounded-xl bg-slate-900 border border-slate-800">
                    {filteredRoles.length === 0 ? (
                      <div className="p-3 text-xs text-slate-400 text-center">
                        No matching predefined roles. You can enter a custom role below.
                      </div>
                    ) : (
                      filteredRoles.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleSelectRole(r.title)}
                          className="w-full text-left p-2.5 rounded-lg hover:bg-slate-800 text-xs flex items-center justify-between text-slate-200 transition-colors"
                        >
                          <div>
                            <div className="font-semibold text-white">{r.title}</div>
                            <div className="text-[10px] text-slate-400">{r.category}</div>
                          </div>
                          <span className="text-[10px] font-mono text-cyan-400">Select &rarr;</span>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {/* Quick Role Selection */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-slate-400">Popular Role Presets:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      'Software Engineer',
                      'Full Stack Developer',
                      'Data Scientist',
                      'Backend Developer',
                      'Frontend Developer',
                      'AI / ML Engineer',
                      'DevOps Engineer',
                      'Android Developer',
                    ].map((rTitle) => (
                      <button
                        key={rTitle}
                        type="button"
                        onClick={() => handleSelectRole(rTitle)}
                        className={`p-2 rounded-lg border text-xs font-semibold text-left transition-all ${
                          selectedRole === rTitle && !isCustomRole
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {rTitle}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Role Option */}
                <div className="pt-2 border-t border-slate-800/80">
                  <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCustomRole}
                      onChange={(e) => setIsCustomRole(e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-400 bg-slate-900 border-slate-700"
                    />
                    <span>Target Other / Custom Role Title</span>
                  </label>

                  {isCustomRole && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={customRoleTitle}
                        onChange={(e) => setCustomRoleTitle(e.target.value)}
                        placeholder="e.g. Bioinformatics Analyst, Quantum Computing Researcher"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm focus:border-cyan-400 focus:outline-hidden"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* TARGET COMPETENCIES & SKILL MAP */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 uppercase">
                      <Sparkles className="w-4 h-4" />
                      <span>Role-Based Skill Map ({activeSkills.length} Skills Active)</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      These competencies feed directly into your Knowledge Map and Readiness index.
                    </p>
                  </div>
                </div>

                {/* Active Skill Tags */}
                <div className="flex flex-wrap gap-2">
                  {activeSkills.map((sk) => (
                    <span
                      key={sk}
                      className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-cyan-500/30 text-xs font-mono text-cyan-200"
                    >
                      <span>{sk}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(sk)}
                        className="text-slate-500 hover:text-rose-400 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Add New Skill Input */}
                <div className="flex items-center space-x-2 pt-2 border-t border-slate-800/80">
                  <input
                    type="text"
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    placeholder="Add a new skill (e.g. System Architecture, Kubernetes, Dynamic Programming)..."
                    className="flex-1 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-400 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    Add Skill
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-8 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-neon-cyan flex items-center space-x-2 cursor-pointer transition-all"
                >
                  <span>Save Profile Configuration</span>
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 2: LEARNING & PRACTICE PREFERENCES                       */}
        {/* ============================================================= */}
        {activeTab === 'learning' && (
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6 shadow-glass">
            <div>
              <h3 className="text-sm font-mono uppercase text-slate-300 font-bold tracking-wider">
                Practice Engine & Drill Preferences
              </h3>
              <p className="text-xs text-slate-400">
                These settings configure the default behavior of your practice sessions, timers, and question counts.
              </p>
            </div>

            <form onSubmit={handleSaveLearningPreferences} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">
                    Daily Study Target Commitment
                  </label>
                  <select
                    value={dailyMinutes}
                    onChange={(e) => setDailyMinutes(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-cyan-400 focus:outline-hidden"
                  >
                    <option value={30}>30 Minutes / day</option>
                    <option value={60}>1 Hour / day</option>
                    <option value={120}>2 Hours / day</option>
                    <option value={180}>3+ Hours / day</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">
                    Default Practice Question Count
                  </label>
                  <select
                    value={practiceQuestionCount}
                    onChange={(e) => setPracticeQuestionCount(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-cyan-400 focus:outline-hidden"
                  >
                    <option value="5">5 Questions (Quick Check)</option>
                    <option value="10">10 Questions (Standard Drill)</option>
                    <option value="15">15 Questions (Deep Drill)</option>
                    <option value="20">20 Questions (Intensive)</option>
                    <option value="30">30 Questions (Full Marathon)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">
                    Default Practice Timer Duration
                  </label>
                  <select
                    value={practiceTimerMinutes}
                    onChange={(e) => setPracticeTimerMinutes(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-cyan-400 focus:outline-hidden"
                  >
                    <option value="5">5 Minutes</option>
                    <option value="10">10 Minutes</option>
                    <option value="15">15 Minutes</option>
                    <option value="30">30 Minutes</option>
                    <option value="45">45 Minutes</option>
                    <option value="60">60 Minutes</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">
                    Default Question Difficulty
                  </label>
                  <select
                    value={practiceDifficulty}
                    onChange={(e) => setPracticeDifficulty(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-cyan-400 focus:outline-hidden"
                  >
                    <option value="easy">Easy (Concept Foundation)</option>
                    <option value="medium">Medium (Standard Exam Level)</option>
                    <option value="hard">Hard (Advanced Problem Solving)</option>
                    <option value="mixed">Mixed (Adaptive Challenge)</option>
                  </select>
                </div>
              </div>

              {/* Sound Alert Toggle with Working Test */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2 text-xs font-bold text-white">
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                    <span>Timer Expiry Sound Alert</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Play a gentle audio chime when your practice or mock exam countdown reaches zero.
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={handleTestChime}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center space-x-1 cursor-pointer"
                  >
                    <Play className="w-3 h-3 text-cyan-400" />
                    <span>Test Chime</span>
                  </button>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={timerSoundAlert}
                      onChange={(e) => setTimerSoundAlert(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-8 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-neon-cyan flex items-center space-x-2 cursor-pointer transition-all"
                >
                  <span>Save Learning Preferences</span>
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 3: AI INTERVIEW PREFERENCES                              */}
        {/* ============================================================= */}
        {activeTab === 'interview' && (
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6 shadow-glass">
            <div>
              <h3 className="text-sm font-mono uppercase text-slate-300 font-bold tracking-wider">
                AI Interviewer Setup Parameters
              </h3>
              <p className="text-xs text-slate-400">
                Configure default interview modes, difficulty, and question depth for your career simulations.
              </p>
            </div>

            <form onSubmit={handleSaveInterviewPreferences} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">
                    Default Interview Type
                  </label>
                  <select
                    value={defaultInterviewMode}
                    onChange={(e) => setDefaultInterviewMode(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-cyan-400 focus:outline-hidden capitalize"
                  >
                    <option value="technical">Technical Round</option>
                    <option value="coding">Coding & Algorithm Arena</option>
                    <option value="hr">HR & Behavioral Fit</option>
                    <option value="viva">Academic Viva Voce</option>
                    <option value="mixed">Mixed Full Simulation</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">
                    Default Interview Difficulty
                  </label>
                  <select
                    value={defaultInterviewDiff}
                    onChange={(e) => setDefaultInterviewDiff(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-cyan-400 focus:outline-hidden capitalize"
                  >
                    <option value="easy">Easy (Foundational Screening)</option>
                    <option value="medium">Medium (Standard Industry Round)</option>
                    <option value="hard">Hard (FAANG / High Bar)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">
                    Default Question Count
                  </label>
                  <select
                    value={defaultInterviewCount}
                    onChange={(e) => setDefaultInterviewCount(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-cyan-400 focus:outline-hidden"
                  >
                    <option value={3}>3 Questions (Express Screening)</option>
                    <option value={5}>5 Questions (Standard Round)</option>
                    <option value={8}>8 Questions (Comprehensive)</option>
                    <option value={10}>10 Questions (Rigorous)</option>
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/40 text-xs text-purple-200 flex items-center space-x-2.5">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                <span>
                  The interviewer automatically inherits your target role (
                  <strong className="text-purple-300 font-semibold">{profile?.targetRole || 'Software Engineer'}</strong>
                  ) and focuses question probes on your role skills map.
                </span>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-8 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-neon-cyan flex items-center space-x-2 cursor-pointer transition-all"
                >
                  <span>Save Interview Preferences</span>
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 4: NOTIFICATIONS (REAL & WORKING)                         */}
        {/* ============================================================= */}
        {activeTab === 'notifications' && (
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6 shadow-glass">
            <div>
              <h3 className="text-sm font-mono uppercase text-slate-300 font-bold tracking-wider">
                System & Browser Notifications
              </h3>
              <p className="text-xs text-slate-400">
                Manage real browser alert permissions for study schedules, mock test timers, and milestone notifications.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-bold text-white">Browser Push Notifications</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                        notificationPermission === 'granted'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {notificationPermission}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Receive local notifications when your test timers complete or when daily study goals are reached.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRequestNotification}
                  className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase tracking-wider shrink-0 cursor-pointer shadow-neon-cyan transition-all"
                >
                  {notificationPermission === 'granted' ? 'Send Test Notification' : 'Enable Notifications'}
                </button>
              </div>

              {notificationStatusMsg && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-800/40 text-xs text-cyan-200">
                  {notificationStatusMsg}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 5: KNOWLEDGE BASE & UPLOADED MATERIALS                   */}
        {/* ============================================================= */}
        {activeTab === 'knowledge_base' && (
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6 shadow-glass">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-mono uppercase text-slate-300 font-bold tracking-wider">
                  Knowledge Base & Indexed Materials
                </h3>
                <p className="text-xs text-slate-400">
                  Manage the notes, PDFs, and textbooks indexed for your personalized AI Tutor and practice drills.
                </p>
              </div>
              <Link
                href="/materials"
                className="px-3.5 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs shadow-neon-cyan flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload New Material</span>
              </Link>
            </div>

            {db.materials && db.materials.length > 0 ? (
              <div className="space-y-3">
                {db.materials.map((mat) => (
                  <div
                    key={mat.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 max-w-lg">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span className="font-bold text-white text-sm truncate">{mat.name}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-cyan-300">
                          {mat.type}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] line-clamp-1">
                        {mat.summary || 'Indexed for RAG retrieval and question generation.'}
                      </p>
                      <div className="flex items-center space-x-3 text-[10px] font-mono text-slate-500 pt-1">
                        <span>Chunks: {mat.chunkCount || 1}</span>
                        <span>Date: {new Date(mat.uploadDate).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteMaterial(mat.id)}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-mono flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                ))}

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowClearMaterialsModal(true)}
                    className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold flex items-center space-x-2 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All Uploaded Materials</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-slate-950/40 border border-slate-800 text-center space-y-3">
                <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="text-sm font-semibold text-slate-300">No materials uploaded yet</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Upload syllabus PDFs, lecture slides, or notes to ground AI Tutor answers and generate practice questions directly from your syllabus.
                </p>
                <div>
                  <Link
                    href="/materials"
                    className="inline-flex items-center px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                  >
                    <span>Go to Materials Hub</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 6: DATA & PRIVACY                                        */}
        {/* ============================================================= */}
        {activeTab === 'data_privacy' && (
          <div className="space-y-6">
            {/* Storage Summary */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 shadow-glass">
              <h3 className="text-sm font-mono uppercase text-slate-300 font-bold tracking-wider">
                Telemetry & Assessment Data Storage
              </h3>
              <p className="text-xs text-slate-400">
                All data is stored directly in your local browser sandbox without external tracking.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Practice Sessions</span>
                  <span className="text-xl font-bold font-mono text-cyan-300">{practiceHistoryCount}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Mock Exams</span>
                  <span className="text-xl font-bold font-mono text-cyan-300">{examHistoryCount}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">AI Interviews</span>
                  <span className="text-xl font-bold font-mono text-purple-300">{interviewHistoryCount}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Uploaded Docs</span>
                  <span className="text-xl font-bold font-mono text-blue-300">{db.materials?.length || 0}</span>
                </div>
              </div>

              {/* Data Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={handleExportData}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center space-x-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                  <span>Export Full Telemetry JSON</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowClearAssessmentsModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center space-x-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  <span>Clear Assessment History</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowFactoryResetModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold flex items-center space-x-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Factory Reset All Data</span>
                </button>
              </div>
            </div>

            {/* AI Contextual Memory Store */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6 shadow-glass">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-mono uppercase text-slate-300 font-bold tracking-wider">
                    AI Contextual Memory Store
                  </h3>
                  <p className="text-xs text-slate-400">
                    Explicit personal study habits and preferences remembered by the AI Tutor.
                  </p>
                </div>
                <span className="text-xs font-mono text-cyan-400">
                  {db.aiMemories?.length || 0} Memories Active
                </span>
              </div>

              <form onSubmit={handleAddMemory} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <select
                    value={memCategory}
                    onChange={(e) => setMemCategory(e.target.value as any)}
                    className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    <option value="goal">Goal</option>
                    <option value="weakness">Weakness</option>
                    <option value="preference">Preference</option>
                  </select>

                  <input
                    type="text"
                    value={memContent}
                    onChange={(e) => setMemContent(e.target.value)}
                    placeholder="Teach SARATHI a memory (e.g. 'Prefers step-by-step mathematical proofs')..."
                    className="sm:col-span-3 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-white"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Store Memory</span>
                  </button>
                </div>
              </form>

              {/* Memory List */}
              <div className="space-y-2 pt-2">
                {!db.aiMemories || db.aiMemories.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-center text-xs text-slate-500">
                    No active custom memories. SARATHI automatically adapts as you ask questions in AI Tutor.
                  </div>
                ) : (
                  db.aiMemories.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-slate-800 uppercase">
                          {m.category}
                        </span>
                        <p className="text-slate-300">{m.content}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteMemory(m.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 7: ACCOUNT / SESSION                                     */}
        {/* ============================================================= */}
        {activeTab === 'session' && (
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6 shadow-glass">
            <div>
              <h3 className="text-sm font-mono uppercase text-slate-300 font-bold tracking-wider">
                Session Lifecycle & Controls
              </h3>
              <p className="text-xs text-slate-400">
                Information about your current local session and presentation controls.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Session Mode:</span>
                  <span className="font-mono text-cyan-300 font-semibold">Active Local Sandbox</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Session ID:</span>
                  <span className="font-mono text-slate-300">{profile?.id || 'usr-local-default'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Registered Email:</span>
                  <span className="font-mono text-slate-300">{profile?.email || 'student@sarathi.ai'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Estimated Telemetry Footprint:</span>
                  <span className="font-mono text-slate-300">~{storageUsageKb} KB</span>
                </div>
              </div>

              {/* Replay Cinematic Intro Button */}
              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-cyan-200">Replay Cinematic Opening Intro</span>
                  <p className="text-[11px] text-slate-400">
                    Re-experience the full-screen cinematic SARATHI reveal sequence.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleReplayIntro}
                  className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs shadow-neon-cyan shrink-0 cursor-pointer transition-all"
                >
                  Replay Intro
                </button>
              </div>

              {/* Sign Out / Reset Session */}
              <div className="pt-2 flex justify-start">
                <button
                  type="button"
                  onClick={() => setShowFactoryResetModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-slate-400" />
                  <span>Reset Session & Clear Cache</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* CONFIRMATION MODALS FOR DESTRUCTIVE ACTIONS                   */}
        {/* ------------------------------------------------------------- */}

        {/* 1. Clear Assessment History Modal */}
        {showClearAssessmentsModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-2xl animate-fadeIn">
              <div className="w-12 h-12 rounded-full bg-amber-950/80 border border-amber-800 text-amber-400 flex items-center justify-center mx-auto">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1.5">
                <h3 className="text-lg font-bold text-white">Clear Assessment History?</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Are you sure you want to delete your assessment history? This will clear practice attempts, mock exam scores, and interview records while keeping your profile settings and uploaded materials intact.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearAssessmentsModal(false)}
                  className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClearAssessments}
                  className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. Clear All Materials Modal */}
        {showClearMaterialsModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-2xl animate-fadeIn">
              <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1.5">
                <h3 className="text-lg font-bold text-white">Clear All Uploaded Materials?</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Are you sure you want to remove all indexed textbooks and notes from your knowledge base?
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearMaterialsModal(false)}
                  className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClearMaterials}
                  className="py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs"
                >
                  Delete All Materials
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. Factory Reset Modal */}
        {showFactoryResetModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-2xl animate-fadeIn">
              <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1.5">
                <h3 className="text-lg font-bold text-white">Factory Reset SARATHI?</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  This will completely reset the application, clear your profile, assessment history, and all stored preferences. This action cannot be undone.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFactoryResetModal(false)}
                  className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmFactoryReset}
                  className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                >
                  Reset Everything
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
