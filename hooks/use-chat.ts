'use client';

import { useState, useCallback } from 'react';
import { ChatMessage, LearningMode, ChatSession } from '@/types/ai';
import { askSarathiTutor } from '@/lib/ai/provider';
import { getDatabase, saveDatabase, addActivity } from '@/lib/db/client';

export function useChat() {
  const [learningMode, setLearningMode] = useState<LearningMode>('detailed');
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'msg-welcome',
        sender: 'sarathi',
        content: `**SARATHI Intelligence Online.**\n\nI am your personalized AI tutor. I can break down complex topics, walk through mathematical proofs, examine GATE traps, or query your uploaded notes.\n\n*Try asking:* "Explain 3NF vs BCNF" or "Calculate attribute closure for AB -> C, C -> D".`,
        timestamp: '2026-01-01T00:00:00.000Z',
        suggestedPrompts: [
          'Explain 3NF vs BCNF with an example',
          'Explain normalization using my DBMS notes',
          'How to check if a schedule is conflict serializable?',
          'What is the formula for B+ tree internal node order?',
        ],
      },
    ];
  });
  const [isThinking, setIsThinking] = useState(false);

  const sendMessage = useCallback(
    async (text: string, customMode?: LearningMode) => {
      const activeMode = customMode || learningMode;
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}-user`,
        sender: 'user',
        content: text,
        timestamp: new Date().toISOString(),
        learningMode: activeMode,
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsThinking(true);

      try {
        const response = await askSarathiTutor(text, activeMode, messages);

        const aiMsg: ChatMessage = {
          id: `msg-${Date.now()}-ai`,
          sender: 'sarathi',
          content: response.content,
          timestamp: new Date().toISOString(),
          learningMode: activeMode,
          contextSources: response.sources,
          suggestedPrompts: response.suggestedPrompts,
        };

        setMessages((prev) => [...prev, aiMsg]);

        // Save to activity log
        addActivity({
          type: 'tutor',
          title: `Tutor Consultation: ${text.length > 40 ? text.substring(0, 40) + '...' : text}`,
          details: `Mode: ${activeMode.toUpperCase()} • ${response.sources.length} RAG source(s) referenced`,
        });
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-err`,
            sender: 'sarathi',
            content: `SARATHI encountered a temporary processing delay. Please try again or rephrase your question.`,
            timestamp: '2026-01-01T00:00:00.000Z',
          },
        ]);
      } finally {
        setIsThinking(false);
      }
    },
    [learningMode, messages]
  );

  const clearChat = useCallback(() => {
    setMessages([
      {
        id: 'msg-welcome-fresh',
        sender: 'sarathi',
        content: 'Chat session reset. What concept would you like to explore?',
        timestamp: '2026-01-01T00:00:00.000Z',
        suggestedPrompts: [
          'Explain Functional Dependencies',
          'How does Strict 2PL prevent cascading aborts?',
          'Explain Lossless Join with an example',
        ],
      },
    ]);
  }, []);

  return {
    messages,
    learningMode,
    setLearningMode,
    isThinking,
    sendMessage,
    clearChat,
  };
}

