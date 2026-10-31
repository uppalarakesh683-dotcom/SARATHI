'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, MicOff, AlertCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isThinking: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSendMessage,
  isThinking,
  placeholder = 'Ask SARATHI anything...',
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [attachmentNotice, setAttachmentNotice] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-resize textarea as text grows (up to 160px)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        160
      )}px`;
    }
  }, [text]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || isThinking) return;
    const msg = text.trim();
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    onSendMessage(msg);
  };

  // Voice Speech-to-Text Support via Web Speech API
  const handleToggleVoice = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceNotice('Voice input coming soon');
      setTimeout(() => setVoiceNotice(null), 3000);
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
        setVoiceNotice('Listening to your voice...');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = () => {
        setIsRecording(false);
        setVoiceNotice('Voice capture ended');
        setTimeout(() => setVoiceNotice(null), 2000);
      };

      recognition.onend = () => {
        setIsRecording(false);
        setTimeout(() => setVoiceNotice(null), 1500);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setIsRecording(false);
      setVoiceNotice('Voice input coming soon');
      setTimeout(() => setVoiceNotice(null), 3000);
    }
  };

  return (
    <div className="relative w-full">
      {/* Voice Notification Banner */}
      {voiceNotice && (
        <div className="absolute -top-10 left-4 z-20 px-3 py-1.5 rounded-lg bg-slate-900 border border-cyan-500/40 text-xs font-mono text-cyan-300 flex items-center space-x-2 shadow-lg animate-fadeIn">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>{voiceNotice}</span>
        </div>
      )}

      {/* Attachment Info Popover */}
      {attachmentNotice && (
        <div className="absolute -top-28 left-4 z-20 max-w-sm p-3.5 rounded-xl bg-slate-900/95 border border-slate-700 text-xs text-slate-300 shadow-xl space-y-2 animate-fadeIn backdrop-blur-md">
          <div className="flex items-center justify-between text-cyan-300 font-semibold">
            <span className="flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Document Materials (RAG)</span>
            </span>
            <button
              onClick={() => setAttachmentNotice(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Attach notes, PDFs, or slides via the Materials tab. SARATHI automatically indexes and cites your documents during tutoring.
          </p>
          <div className="pt-1">
            <Link
              href="/materials"
              className="text-xs text-cyan-400 hover:underline font-mono"
            >
              Open Materials Uploader &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Input Box Card */}
      <div className="relative flex flex-col rounded-2xl bg-slate-900/90 border border-slate-700/80 focus-within:border-cyan-400/80 focus-within:shadow-neon-cyan transition-all shadow-glass p-2 sm:p-3">
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={isThinking}
          className="w-full px-2 py-1 bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-500 resize-none focus:outline-hidden max-h-40 custom-scrollbar leading-relaxed"
        />

        {/* Bottom Toolbar: Attachment, Voice, Submit */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 mt-1">
          {/* Left Controls */}
          <div className="flex items-center space-x-1">
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => setAttachmentNotice(!attachmentNotice)}
              className="p-2 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 transition-colors"
              title="Attach study material / notes"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Voice Dictation Button */}
            <button
              type="button"
              onClick={handleToggleVoice}
              className={`p-2 rounded-xl transition-colors ${
                isRecording
                  ? 'bg-rose-500/20 text-rose-400 animate-pulse border border-rose-500/40'
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80'
              }`}
              title={isRecording ? 'Stop recording voice' : 'Voice input'}
            >
              {isRecording ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            <span className="text-[10px] font-mono text-slate-400 hidden sm:inline ml-2">
              Press <kbd className="px-1 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">Shift+Enter</kbd> for new line
            </span>
          </div>

          {/* Send Button */}
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!text.trim() || isThinking}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed shadow-neon-cyan transition-all"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

