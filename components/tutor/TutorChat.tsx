'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  MessageSquare,
  Sparkles,
  BookOpen,
  ListOrdered,
  Award,
  FileText,
  Target,
  Plus,
  RotateCcw,
  PanelLeft,
  ArrowRight,
  Lightbulb,
} from 'lucide-react';
import { ChatSession, ChatMessage as ChatMessageType, LearningMode } from '@/types/ai';
import { useProgress } from '@/hooks/use-progress';
import { ConversationList } from './ConversationList';
import { TutorModeSelector } from './TutorModeSelector';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

const STORAGE_KEY = 'sarathi_tutor_sessions_v2';

const SUGGESTIONS = [
  {
    category: 'Explain a concept',
    prompt: 'Explain the most foundational concept of my subject simply.',
    mode: 'simple' as LearningMode,
    icon: Sparkles,
    gradient: 'from-cyan-500/10 to-blue-500/10 border-cyan-500/30 text-cyan-300',
  },
  {
    category: 'Step-by-step',
    prompt: 'Guide me through a complex problem step-by-step.',
    mode: 'step_by_step' as LearningMode,
    icon: ListOrdered,
    gradient: 'from-blue-500/10 to-purple-500/10 border-blue-500/30 text-blue-300',
  },
  {
    category: 'Exam preparation',
    prompt: 'Give me the most important high-yield topics for my target assessment.',
    mode: 'exam' as LearningMode,
    icon: Award,
    gradient: 'from-purple-500/10 to-pink-500/10 border-purple-500/30 text-purple-300',
  },
  {
    category: 'Revision',
    prompt: 'Summarize key theorems and definitions for quick revision.',
    mode: 'summary' as LearningMode,
    icon: FileText,
    gradient: 'from-amber-500/10 to-orange-500/10 border-amber-500/30 text-amber-300',
  },
  {
    category: 'Practice',
    prompt: 'Test my conceptual understanding with an exam-level question.',
    mode: 'practice' as LearningMode,
    icon: Target,
    gradient: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/30 text-emerald-300',
  },
];

export function TutorChat() {
  const searchParams = useSearchParams();
  const materialParam = searchParams.get('materialId');
  const teachPromptParam = searchParams.get('teachPrompt') || searchParams.get('initialPrompt');
  const teachPromptTriggeredRef = useRef(false);
  const { db, profile } = useProgress();

  const [conversations, setConversations] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<LearningMode>('explain');
  const [useMaterials, setUseMaterials] = useState<boolean>(Boolean(materialParam));
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(materialParam);
  const [isThinking, setIsThinking] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const materialCount = isMounted
    ? db.materials.filter((m) => m.status === 'ready').length
    : 0;

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const userScrolledUpRef = useRef(false);

  // If URL changes with materialId, automatically activate it
  useEffect(() => {
    if (materialParam) {
      setUseMaterials(true);
      setSelectedMaterialId(materialParam);
    }
  }, [materialParam]);

  // ── Load persisted conversations on client mount ─────────────────────────
  useEffect(() => {
    setIsMounted(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: ChatSession[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setConversations(parsed);
          setActiveId(parsed[0].id);
          setActiveMode(parsed[0].learningMode || 'explain');
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to load tutor conversations:', e);
    }
  }, []);

  // ── Save conversations to localStorage whenever changed ──────────────────
  const persistConversations = useCallback((updated: ChatSession[]) => {
    setConversations(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to persist tutor conversations:', e);
      }
    }
  }, []);

  // Current active conversation
  const currentConversation = conversations.find((c) => c.id === activeId) || null;
  const messages = currentConversation?.messages || [];

  // Scroll to bottom on new message if user hasn't scrolled up
  useEffect(() => {
    if (!userScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // If user is more than 150px away from the bottom, mark as userScrolledUp
    userScrolledUpRef.current = scrollHeight - scrollTop - clientHeight > 150;
  };

  // ── Create New Conversation ──────────────────────────────────────────────
  const handleNewConversation = useCallback(() => {
    const newSession: ChatSession = {
      id: `chat-${Date.now()}`,
      title: 'New Conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      learningMode: activeMode,
      messages: [],
    };

    const updated = [newSession, ...conversations];
    persistConversations(updated);
    setActiveId(newSession.id);
    userScrolledUpRef.current = false;
  }, [conversations, activeMode, persistConversations]);

  // ── Delete Conversation ──────────────────────────────────────────────────
  const handleDeleteConversation = useCallback(
    (id: string) => {
      const updated = conversations.filter((c) => c.id !== id);
      persistConversations(updated);

      if (activeId === id) {
        if (updated.length > 0) {
          setActiveId(updated[0].id);
          setActiveMode(updated[0].learningMode || 'explain');
        } else {
          setActiveId(null);
        }
      }
    },
    [conversations, activeId, persistConversations]
  );

  // ── Clear Current Chat ───────────────────────────────────────────────────
  const handleClearChat = useCallback(() => {
    if (!activeId) return;
    const updated = conversations.map((c) =>
      c.id === activeId
        ? {
            ...c,
            title: 'New Conversation',
            messages: [],
            updatedAt: new Date().toISOString(),
          }
        : c
    );
    persistConversations(updated);
  }, [activeId, conversations, persistConversations]);

  // ── Generate Auto Title from First User Prompt ───────────────────────────
  const generateConversationTitle = (promptText: string): string => {
    let clean = promptText
      .replace(/^(explain|teach me|tell me about|what is|how does|summarize|give me)\s+/i, '')
      .replace(/[?.!]+$/, '')
      .trim();

    if (!clean) return 'Study Session';

    // Capitalize words
    const words = clean.split(/\s+/).slice(0, 4);
    return words
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  // ── Send Message to Backend API ──────────────────────────────────────────
  const handleSendMessage = async (text: string, overrideMode?: LearningMode) => {
    if (!text.trim() || isThinking) return;

    const modeToUse = overrideMode || activeMode;
    userScrolledUpRef.current = false;

    // Ensure we have an active conversation
    let session = currentConversation;
    let updatedConversations = [...conversations];

    if (!session) {
      session = {
        id: `chat-${Date.now()}`,
        title: generateConversationTitle(text),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        learningMode: modeToUse,
        messages: [],
      };
      updatedConversations = [session, ...conversations];
      setActiveId(session.id);
    }

    const userMessage: ChatMessageType = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
      learningMode: modeToUse,
    };

    // Update title on first message
    const isFirstMessage = session.messages.length === 0;
    const title = isFirstMessage ? generateConversationTitle(text) : session.title;

    const currentHistory = session.messages;

    const updatedSession: ChatSession = {
      ...session,
      title,
      learningMode: modeToUse,
      updatedAt: new Date().toISOString(),
      messages: [...session.messages, userMessage],
    };

    updatedConversations = updatedConversations.map((c) =>
      c.id === updatedSession.id ? updatedSession : c
    );
    persistConversations(updatedConversations);
    setIsThinking(true);

    const isGeneralKnowledgeRequest = text.trim() === 'Ask SARATHI using general knowledge';
    const effectiveUseMaterials = isGeneralKnowledgeRequest ? false : useMaterials;
    if (isGeneralKnowledgeRequest) {
      setUseMaterials(false);
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text.trim(),
          mode: modeToUse,
          useMaterials: effectiveUseMaterials,
          materialId: selectedMaterialId || undefined,
          history: currentHistory.slice(-8).map((m) => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.content) {
        const errorContent =
          data.error === 'AI_NOT_CONFIGURED'
            ? "AI service isn't configured yet."
            : "SARATHI couldn't complete that response.";

        const errorMessage: ChatMessageType = {
          id: `err-${Date.now()}`,
          sender: 'sarathi',
          content: errorContent,
          timestamp: new Date().toISOString(),
          isError: true,
          learningMode: modeToUse,
        };

        const failedSession: ChatSession = {
          ...updatedSession,
          messages: [...updatedSession.messages, errorMessage],
        };

        persistConversations(
          updatedConversations.map((c) =>
            c.id === failedSession.id ? failedSession : c
          )
        );
        return;
      }

      const assistantMessage: ChatMessageType = {
        id: `ai-${Date.now()}`,
        sender: 'sarathi',
        content: data.content,
        timestamp: new Date().toISOString(),
        learningMode: modeToUse,
        contextSources: data.sources || [],
        suggestedPrompts: data.suggestedPrompts || [],
      };

      const completedSession: ChatSession = {
        ...updatedSession,
        messages: [...updatedSession.messages, assistantMessage],
      };

      persistConversations(
        updatedConversations.map((c) =>
          c.id === completedSession.id ? completedSession : c
        )
      );
    } catch (err) {
      console.error('Failed to communicate with AI Tutor:', err);
      const errorMessage: ChatMessageType = {
        id: `err-${Date.now()}`,
        sender: 'sarathi',
        content: "SARATHI couldn't complete that response.",
        timestamp: new Date().toISOString(),
        isError: true,
        learningMode: modeToUse,
      };

      const failedSession: ChatSession = {
        ...updatedSession,
        messages: [...updatedSession.messages, errorMessage],
      };

      persistConversations(
        updatedConversations.map((c) =>
          c.id === failedSession.id ? failedSession : c
        )
      );
    } finally {
      setIsThinking(false);
    }
  };

  // Auto-send initial prompt if routed from "Teach Me This" in Practice / Exam
  useEffect(() => {
    if (isMounted && teachPromptParam && !teachPromptTriggeredRef.current) {
      teachPromptTriggeredRef.current = true;
      try {
        const decoded = decodeURIComponent(teachPromptParam);
        handleSendMessage(decoded, 'step_by_step');
      } catch {
        handleSendMessage(teachPromptParam, 'step_by_step');
      }
    }
  }, [isMounted, teachPromptParam]);

  // Retry last failed query
  const handleRetryLast = () => {
    if (!currentConversation || currentConversation.messages.length === 0) return;
    const lastUser = [...currentConversation.messages]
      .reverse()
      .find((m) => m.sender === 'user');
    if (lastUser) {
      handleSendMessage(lastUser.content);
    }
  };

  return (
    <div className="flex h-[calc(100vh-6.5rem)] rounded-2xl bg-slate-950/80 border border-slate-800/80 shadow-glass overflow-hidden animate-fadeIn">
      {/* ── Left Sidebar: Conversation History ───────────────────────────── */}
      <ConversationList
        conversations={conversations}
        activeConversationId={activeId}
        onSelectConversation={(id) => {
          setActiveId(id);
          const found = conversations.find((c) => c.id === id);
          if (found?.learningMode) setActiveMode(found.learningMode);
        }}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        isOpenMobile={mobileDrawerOpen}
        onCloseMobile={() => setMobileDrawerOpen(false)}
      />

      {/* ── Main Chat Area ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-900/40 relative">
        {/* Top Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            {/* Mobile open conversation drawer button */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 shrink-0"
              title="Open conversation history"
            >
              <PanelLeft className="w-4 h-4" />
            </button>

            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                AI Tutor
              </h1>
              <p className="text-xs text-slate-400 truncate">
                Your personal AI learning companion
              </p>
            </div>
          </div>

          {/* Right Header Buttons: New Chat & Clear Chat */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleNewConversation}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Start a new chat session"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              <span>New Chat</span>
            </button>

            <button
              onClick={handleClearChat}
              disabled={messages.length === 0}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Clear current conversation messages"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Chat</span>
            </button>
          </div>
        </div>

        {/* Mode Selector Row + Use My Materials Toggle */}
        <div className="px-4 py-2 sm:px-6 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <TutorModeSelector
            currentMode={activeMode}
            onSelectMode={(mode) => setActiveMode(mode)}
            disabled={isThinking}
          />

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                if (materialCount === 0 && !useMaterials) {
                  // If no materials, toggle with info
                  setUseMaterials(true);
                } else {
                  setUseMaterials(!useMaterials);
                }
              }}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                useMaterials
                  ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border border-cyan-400/80 shadow-neon-cyan'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
              title={
                materialCount > 0
                  ? `Ground answers in your ${materialCount} uploaded study document(s)`
                  : 'Toggle grounding in your uploaded study material'
              }
            >
              <FileText className={`w-3.5 h-3.5 ${useMaterials ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span>Use My Materials</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                  useMaterials
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {useMaterials ? 'ON' : materialCount}
              </span>
            </button>
          </div>
        </div>

        {/* Messages Container or Empty State */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar"
        >
          {messages.length === 0 ? (
            /* ── Empty State: What would you like to learn? ─────────────── */
            <div className="max-w-2xl mx-auto py-8 sm:py-12 space-y-8 animate-fadeIn">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-xs font-mono text-cyan-300 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Personalized Academic Tutor</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  What would you like to learn?
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                  Ask SARATHI anything about your studies, exams or technical subjects.
                </p>
              </div>

              {/* Five Suggestion Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {SUGGESTIONS.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(item.prompt, item.mode)}
                      className={`text-left p-4 rounded-xl border bg-slate-900/60 hover:bg-slate-900 transition-all space-y-2 group cursor-pointer shadow-glass ${item.gradient}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono uppercase font-bold tracking-wider">
                          {item.category}
                        </span>
                        <Icon className="w-4 h-4 opacity-75 group-hover:opacity-100 group-hover:scale-110 transition-transform" />
                      </div>
                      <p className="text-xs sm:text-sm text-slate-200 font-medium leading-snug group-hover:text-white">
                        &ldquo;{item.prompt}&rdquo;
                      </p>
                      <div className="text-[10px] text-cyan-400 flex items-center space-x-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Ask SARATHI</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── Chat Messages Stream ──────────────────────────────────── */
            messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onActionClick={(actionText, targetMode) =>
                  handleSendMessage(actionText, targetMode)
                }
                onRetry={handleRetryLast}
              />
            ))
          )}

          {/* Thinking / Formulating State */}
          {isThinking && (
            <div className="flex items-start space-x-3 animate-fadeIn">
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-400 to-purple-500 flex items-center justify-center text-[10px] font-bold text-slate-950 mt-1">
                S
              </div>
              <div className="p-3.5 rounded-2xl rounded-bl-xs bg-slate-900/90 border border-cyan-500/30 text-xs text-cyan-300 flex items-center space-x-2 shadow-neon-cyan">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="font-mono">SARATHI is thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-slate-950/90 border-t border-slate-800/80 shrink-0">
          <ChatInput
            onSendMessage={(msg) => handleSendMessage(msg)}
            isThinking={isThinking}
            placeholder="Ask SARATHI anything..."
          />
        </div>
      </div>
    </div>
  );
}
