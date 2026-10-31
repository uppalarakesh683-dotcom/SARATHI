'use client';

import React, { useState } from 'react';
import {
  Copy,
  Check,
  Sparkles,
  FileText,
  RotateCcw,
  BookOpen,
  ListOrdered,
  Lightbulb,
  FileCheck2,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import { ChatMessage as ChatMessageType, LearningMode } from '@/types/ai';

interface ChatMessageProps {
  message: ChatMessageType;
  onActionClick: (actionText: string, targetMode?: LearningMode) => void;
  onRetry?: () => void;
}

export function ChatMessage({ message, onActionClick, onRetry }: ChatMessageProps) {
  const isUser = message.sender === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isUser) {
    return (
      <div className="flex flex-col items-end space-y-1 max-w-3xl ml-auto animate-fadeIn">
        <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400 px-1">
          <span>You</span>
          <span>&bull;</span>
          <span>
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl rounded-br-xs bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 text-white text-xs sm:text-sm leading-relaxed shadow-neon-blue break-words font-medium">
          {message.content}
        </div>
      </div>
    );
  }

  // Error Message View
  if (message.isError) {
    return (
      <div className="flex flex-col items-start space-y-1 max-w-3xl mr-auto animate-fadeIn">
        <div className="flex items-center space-x-2 text-[10px] font-mono text-rose-400 px-1">
          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          <span>SARATHI Error</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl rounded-bl-xs bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs sm:text-sm space-y-3">
          <p>{message.content || "SARATHI couldn't complete that response."}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-mono font-semibold flex items-center space-x-1.5 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Try again</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // SARATHI Assistant Message View
  return (
    <div className="flex flex-col items-start space-y-1.5 max-w-3xl mr-auto animate-fadeIn w-full">
      {/* Sender Header */}
      <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400 px-1">
        <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-cyan-400 to-purple-500 flex items-center justify-center text-[9px] font-bold text-slate-950">
          S
        </div>
        <span className="font-semibold text-slate-300">SARATHI AI Tutor</span>
        {message.learningMode && (
          <span className="uppercase px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/40 text-[9px] font-mono">
            {message.learningMode}
          </span>
        )}
        <span>&bull;</span>
        <span>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      {/* Main Content Card */}
      <div className="w-full p-4 sm:p-6 rounded-2xl rounded-bl-xs bg-slate-900/90 border border-slate-800/90 text-slate-200 text-xs sm:text-sm leading-relaxed shadow-glass space-y-4">
        {/* Rich Formatted Markdown Content */}
        <div className="markdown-content space-y-3">
          <RenderMarkdown content={message.content} />
        </div>

        {/* Sources Section Underneath Answer */}
        {message.contextSources && message.contextSources.length > 0 && (
          <div className="pt-2.5 border-t border-slate-800/80 space-y-2">
            <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider font-bold flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Sources</span>
            </span>
            <div className="space-y-1">
              {message.contextSources.map((src, sIdx) => (
                <div
                  key={sIdx}
                  className="px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 font-mono flex items-center justify-between gap-2"
                >
                  <span className="truncate text-cyan-200">
                    {src.documentName}
                    {(src as any).pageNumber ? ` — Page ${(src as any).pageNumber}` : ''}
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {src.topic} &bull; {src.relevance}% relevance
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up Question Chips if provided */}
        {message.suggestedPrompts && message.suggestedPrompts.length > 0 && (
          <div className="pt-3 border-t border-slate-800/80 space-y-2">
            <span className="text-[11px] font-mono text-slate-400 block font-semibold">
              Suggested Follow-ups:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {message.suggestedPrompts.map((promptText, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => onActionClick(promptText)}
                  className="text-left text-xs px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-700/80 text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer"
                >
                  {promptText} &rarr;
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Toolbar Under Every Assistant Response */}
        <div className="pt-3 border-t border-slate-800/60 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
            title="Copy response to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-300 text-[11px]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span className="text-[11px]">Copy</span>
              </>
            )}
          </button>

          {/* Simplify Button */}
          <button
            onClick={() => onActionClick('Explain this in simpler terms with an everyday analogy.', 'simple')}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 transition-colors"
            title="Simplify explanation"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span className="text-[11px]">Simplify</span>
          </button>

          {/* Step-by-step Button */}
          <button
            onClick={() => onActionClick('Break this down into numbered sequential steps.', 'step_by_step')}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-blue-300 border border-slate-800 transition-colors"
            title="Explain step-by-step"
          >
            <ListOrdered className="w-3 h-3 text-blue-400" />
            <span className="text-[11px]">Explain step-by-step</span>
          </button>

          {/* Give example Button */}
          <button
            onClick={() => onActionClick('Give me a concrete, real-world example of this concept with realistic values.')}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-amber-300 border border-slate-800 transition-colors"
            title="Give example"
          >
            <Lightbulb className="w-3 h-3 text-amber-400" />
            <span className="text-[11px]">Give example</span>
          </button>

          {/* Summarize Button */}
          <button
            onClick={() => onActionClick('Summarize this into concise revision cheat-sheet notes.', 'summary')}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-purple-300 border border-slate-800 transition-colors"
            title="Summarize key points"
          >
            <FileText className="w-3 h-3 text-purple-400" />
            <span className="text-[11px]">Summarize</span>
          </button>

          {/* Ask me questions Button */}
          <button
            onClick={() => onActionClick('Test my understanding right now with a challenging practice question on this topic.', 'practice')}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-emerald-300 border border-slate-800 transition-colors"
            title="Test my understanding"
          >
            <HelpCircle className="w-3 h-3 text-emerald-400" />
            <span className="text-[11px]">Ask me questions</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Pure React Markdown renderer supporting headers, code blocks with syntax copy,
 * bullet lists, numbered steps, tables, blockquotes, and math formatting.
 */
function RenderMarkdown({ content }: { content: string }) {
  if (!content) return null;

  // Split into block segments: Code blocks vs Text blocks
  const segments = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3">
      {segments.map((segment, idx) => {
        if (segment.startsWith('```') && segment.endsWith('```')) {
          const match = segment.match(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/);
          const language = match ? match[1] : '';
          const code = match ? match[2] : segment.slice(3, -3);
          return <CodeBlock key={idx} code={code.trim()} language={language} />;
        }

        return <TextBlock key={idx} text={segment} />;
      })}
    </div>
  );
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 my-3">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-xs font-mono text-slate-400">
        <span className="text-cyan-400 uppercase text-[10px] font-bold">
          {language || 'code'}
        </span>
        <button
          onClick={copyCode}
          className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function TextBlock({ text }: { text: string }) {
  if (!text.trim()) return null;

  // Split lines
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = (key: string) => {
    if (tableRows.length > 0) {
      const headerRow = tableRows[0];
      const dataRows = tableRows.slice(1);
      elements.push(
        <div key={key} className="overflow-x-auto my-3 rounded-lg border border-slate-800">
          <table className="min-w-full text-xs text-left">
            <thead className="bg-slate-950 text-cyan-300 font-semibold border-b border-slate-800">
              <tr>
                {headerRow.map((cell, cIdx) => (
                  <th key={cIdx} className="px-3 py-2">
                    {formatInline(cell.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {dataRows.map((row, rIdx) => (
                <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-950/40'}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-2 text-slate-300">
                      {formatInline(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
    }
    inTable = false;
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Check if line is a table row
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const isDivider = trimmed.replace(/[|\s-:]/g, '').length === 0;
      if (!isDivider) {
        const cells = trimmed
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());
        tableRows.push(cells);
      }
      inTable = true;
      return;
    } else if (inTable) {
      flushTable(`table-${idx}`);
    }

    if (!trimmed) {
      elements.push(<div key={`sp-${idx}`} className="h-2" />);
      return;
    }

    // Heading 1 (#)
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h2 key={idx} className="text-base sm:text-lg font-bold text-white tracking-tight pt-2 border-b border-slate-800/80 pb-1">
          {formatInline(trimmed.slice(2))}
        </h2>
      );
      return;
    }

    // Heading 2 (##)
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={idx} className="text-sm sm:text-base font-bold text-cyan-300 pt-2">
          {formatInline(trimmed.slice(3))}
        </h3>
      );
      return;
    }

    // Heading 3 (###)
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={idx} className="text-xs sm:text-sm font-semibold text-slate-200 pt-1.5 flex items-center space-x-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
          <span>{formatInline(trimmed.slice(4))}</span>
        </h4>
      );
      return;
    }

    // Blockquote (> )
    if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote key={idx} className="pl-3 py-1 my-2 border-l-2 border-cyan-400 bg-cyan-950/20 text-slate-300 italic rounded-r-lg">
          {formatInline(trimmed.slice(2))}
        </blockquote>
      );
      return;
    }

    // Bullet points (- or * or •)
    if (/^[-*•]\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^[-*•]\s+/, '');
      elements.push(
        <div key={idx} className="flex items-start space-x-2 pl-2">
          <span className="text-cyan-400 font-bold text-xs mt-0.5">&bull;</span>
          <span className="text-slate-300 leading-relaxed flex-1">{formatInline(itemText)}</span>
        </div>
      );
      return;
    }

    // Numbered step (e.g. "1. " or "Step 1: ")
    if (/^\d+\.\s+/.test(trimmed) || /^step\s+\d+[:.]/i.test(trimmed)) {
      elements.push(
        <div key={idx} className="flex items-start space-x-2 pl-2 my-1">
          <span className="font-mono text-cyan-400 font-bold text-xs mt-0.5">
            {trimmed.split(/\s+/)[0]}
          </span>
          <span className="text-slate-200 leading-relaxed flex-1">
            {formatInline(trimmed.replace(/^(\d+\.|step\s+\d+[:.])\s*/i, ''))}
          </span>
        </div>
      );
      return;
    }

    // Regular paragraph
    elements.push(
      <p key={idx} className="text-slate-200 leading-relaxed">
        {formatInline(line)}
      </p>
    );
  });

  if (inTable) {
    flushTable('table-end');
  }

  return <>{elements}</>;
}

/**
 * Format inline markdown tokens: **bold**, *italic*, `code`, and $math$
 */
function formatInline(rawText: string): React.ReactNode {
  if (!rawText) return '';

  // Process bold (**...**) and inline code (`...`) and math ($...$)
  const parts = rawText.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\$[^$]+\$)/g);

  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-slate-950 text-cyan-300 border border-slate-800 font-mono text-[11px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={i} className="italic text-slate-300">
          {part.slice(1, -1)}
        </em>
      );
    }

    if (part.startsWith('$') && part.endsWith('$')) {
      return (
        <span
          key={i}
          className="font-mono text-cyan-200 bg-cyan-950/40 px-1 py-0.5 rounded border border-cyan-800/30 text-[11px]"
        >
          {part.slice(1, -1)}
        </span>
      );
    }

    return part;
  });
}

