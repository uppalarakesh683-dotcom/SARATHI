'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  X,
  Sparkles,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { ChatSession } from '@/types/ai';

interface ConversationListProps {
  conversations: ChatSession[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isOpenMobile,
  onCloseMobile,
}: ConversationListProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteConversation(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const content = (
    <div className="flex flex-col h-full bg-slate-950/95 border-r border-slate-800/80 text-slate-200">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-slate-950 font-black text-sm shadow-neon-cyan">
            S
          </div>
          <div>
            <div className="text-xs font-mono font-bold tracking-wider text-white">
              SARATHI
            </div>
            <div className="text-[10px] font-mono uppercase text-cyan-400 font-semibold">
              AI TUTOR
            </div>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label="Close conversation list"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* New Conversation Button */}
      <div className="p-3">
        <button
          onClick={() => {
            onNewConversation();
            onCloseMobile();
          }}
          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 font-medium text-xs flex items-center justify-center space-x-2 shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ New Conversation</span>
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1 custom-scrollbar">
        {conversations.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-2">
            <MessageSquare className="w-8 h-8 text-slate-700 mx-auto" />
            <p className="text-xs font-medium text-slate-400">No conversations yet</p>
            <p className="text-[11px] text-slate-400">
              Ask a question to start your first tutoring session.
            </p>
          </div>
        ) : (
          conversations.map((c) => {
            const isActive = c.id === activeConversationId;
            return (
              <div
                key={c.id}
                className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 border border-cyan-500/40 text-cyan-200 shadow-neon-cyan'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                }`}
                onClick={() => {
                  onSelectConversation(c.id);
                  onCloseMobile();
                }}
              >
                <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                  <MessageSquare
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-400'
                    }`}
                  />
                  <div className="truncate">
                    <span className="font-medium truncate block">
                      {c.title || 'Untitled Conversation'}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {c.messages.length} message{c.messages.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmId(c.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-all shrink-0"
                  title="Delete conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="p-3 m-2 rounded-xl bg-slate-900 border border-rose-500/40 text-xs space-y-2 animate-fadeIn shadow-xl">
          <div className="flex items-center space-x-1.5 text-rose-300 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Delete conversation?</span>
          </div>
          <p className="text-[11px] text-slate-400">
            This will permanently remove the chat history.
          </p>
          <div className="flex justify-end space-x-2 pt-1">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-[11px]"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[11px]"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Tutor Status Footnote */}
      <div className="p-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center justify-between">
        <span className="flex items-center space-x-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>SARATHI Active</span>
        </span>
        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:block w-72 h-full shrink-0">
        {content}
      </div>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-slideRight">
            {content}
          </div>
        </div>
      )}
    </>
  );
}

