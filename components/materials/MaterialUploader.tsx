'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Upload,
  FileText,
  CheckCircle2,
  Trash2,
  Sparkles,
  HelpCircle,
  Eye,
  Loader2,
  AlertCircle,
  FileCheck,
  X,
  Copy,
  Check,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { useProgress } from '@/hooks/use-progress';
import { processUploadedDocument } from '@/lib/rag/ingestion';
import { getDatabase, saveDatabase, addActivity } from '@/lib/db/client';
import { DocumentMaterial } from '@/types/material';

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function MaterialUploader() {
  const router = useRouter();
  const { db, sync, isMounted } = useProgress();

  // Local state
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');

  // Save Notes state
  const [pasteDocName, setPasteDocName] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [noteSuccessMessage, setNoteSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [activeDocForView, setActiveDocForView] = useState<DocumentMaterial | null>(null);
  const [activeDocForSummary, setActiveDocForSummary] = useState<DocumentMaterial | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryContent, setSummaryContent] = useState<string | null>(null);
  const [summaryCopied, setSummaryCopied] = useState(false);

  // Questions Modal state
  const [activeDocForQuestions, setActiveDocForQuestions] = useState<DocumentMaterial | null>(null);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  // Hidden file input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Documents list (use empty array during SSR hydration)
  const materials: DocumentMaterial[] = isMounted ? db.materials || [] : [];

  // ==========================================
  // REAL FILE UPLOAD HANDLER
  // ==========================================
  const handleFileUpload = async (file: File) => {
    setUploadError(null);

    // 1. Validate File
    const validExtensions = ['pdf', 'docx', 'txt'];
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (!extension || !validExtensions.includes(extension)) {
      setUploadError('Unsupported file type. Please upload a PDF, DOCX, or TXT file.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setUploadError('File exceeds the 25 MB size limit.');
      return;
    }

    // 2. Add temporary entry with status: 'processing'
    const tempId = `mat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const tempMaterial: DocumentMaterial = {
      id: tempId,
      name: file.name,
      type: extension.toUpperCase(),
      size: file.size,
      uploadDate: new Date().toISOString(),
      status: 'processing',
      chunkCount: 0,
      topicsDetected: [],
      chunks: [],
    };

    const currentDb = getDatabase();
    currentDb.materials.unshift(tempMaterial);
    saveDatabase(currentDb);
    sync();

    setIsUploading(true);
    setUploadProgressText(`Uploading and extracting text from ${file.name}...`);

    try {
      // 3. Upload to /api/materials/extract
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/materials/extract', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to extract text from document.");
      }

      setUploadProgressText('Chunking and computing semantic vector embeddings...');

      // 4. Ingest and calculate semantic embeddings
      const processed = processUploadedDocument(
        data.fileName || file.name,
        data.fileType || extension.toUpperCase(),
        data.fileSize || file.size,
        data.extractedText,
        data.pageCount
      );

      // Preserve the temporary ID so UI stays deterministic
      processed.id = tempId;
      processed.status = 'ready';

      // 5. Update database and localStorage
      const updatedDb = getDatabase();
      const index = updatedDb.materials.findIndex((m) => m.id === tempId);
      if (index !== -1) {
        updatedDb.materials[index] = processed;
      } else {
        updatedDb.materials.unshift(processed);
      }
      saveDatabase(updatedDb);

      addActivity({
        type: 'material_rag',
        title: `Document Processed: ${processed.name}`,
        details: `${processed.chunkCount} vector chunks indexed into RAG store`,
      });

      sync();
      setIsUploading(false);
      setUploadProgressText('');
    } catch (err: any) {
      console.error('Upload & Processing error:', err);
      // Mark as error
      const failedDb = getDatabase();
      const index = failedDb.materials.findIndex((m) => m.id === tempId);
      if (index !== -1) {
        failedDb.materials[index] = {
          ...failedDb.materials[index],
          status: 'error',
          errorMessage: err.message || 'Processing failed.',
        };
        saveDatabase(failedDb);
        sync();
      }
      setUploadError(err.message || 'Failed to process document.');
      setIsUploading(false);
      setUploadProgressText('');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  // Trigger file picker
  const handleChooseFilesClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  // ==========================================
  // SAVE NOTES HANDLER
  // ==========================================
  const handleSaveNotes = () => {
    if (!pasteDocName.trim() || !pasteText.trim()) return;
    setIsSavingNotes(true);
    setNoteSuccessMessage(null);

    try {
      const fileName = pasteDocName.trim().endsWith('.txt')
        ? pasteDocName.trim()
        : `${pasteDocName.trim()}.txt`;

      const processed = processUploadedDocument(
        fileName,
        'TXT',
        new Blob([pasteText]).size,
        pasteText
      );

      const currentDb = getDatabase();
      currentDb.materials.unshift(processed);
      saveDatabase(currentDb);

      addActivity({
        type: 'material_rag',
        title: `Notes Saved: ${processed.name}`,
        details: `${processed.chunkCount} vector chunks indexed into RAG store`,
      });

      sync();
      setPasteDocName('');
      setPasteText('');
      setNoteSuccessMessage(`"${processed.name}" saved and indexed into your knowledge base.`);
      setTimeout(() => setNoteSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Save notes error:', err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  // ==========================================
  // ACTIONS ON UPLOADED DOCUMENTS
  // ==========================================
  const handleDeleteDocument = (docId: string, docName: string) => {
    if (confirm(`Are you sure you want to delete "${docName}" from your knowledge base?`)) {
      const currentDb = getDatabase();
      currentDb.materials = currentDb.materials.filter((m) => m.id !== docId);
      saveDatabase(currentDb);
      sync();
    }
  };

  // Open Document in AI Tutor
  const handleAskSarathi = (docId: string) => {
    router.push(`/tutor?materialId=${encodeURIComponent(docId)}`);
  };

  // Summarize Document
  const handleSummarizeDocument = async (doc: DocumentMaterial) => {
    setActiveDocForSummary(doc);
    setSummaryLoading(true);
    setSummaryContent(null);
    setSummaryCopied(false);

    try {
      const fullText = doc.chunks.map((c) => c.content).join('\n\n') || doc.summary || '';
      const res = await fetch('/api/materials/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentName: doc.name,
          textContent: fullText,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate summary.');
      }

      setSummaryContent(data.summary);
    } catch (err: any) {
      setSummaryContent(`### Error\n${err.message || 'Unable to generate summary at this time.'}`);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Generate Questions
  const handleGenerateQuestions = async (doc: DocumentMaterial) => {
    setActiveDocForQuestions(doc);
    setQuestionsLoading(true);
    setGeneratedQuestions([]);
    setSelectedAnswers({});
    setQuestionsError(null);

    try {
      const fullText = doc.chunks.map((c) => c.content).join('\n\n') || doc.summary || '';
      const res = await fetch('/api/materials/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentName: doc.name,
          textContent: fullText,
          count: 3,
          difficulty: 'medium',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate questions.');
      }

      setGeneratedQuestions(data.questions || []);
    } catch (err: any) {
      setQuestionsError(err.message || 'Unable to generate questions at this time.');
    } finally {
      setQuestionsLoading(false);
    }
  };

  const copySummaryToClipboard = () => {
    if (summaryContent) {
      navigator.clipboard.writeText(summaryContent);
      setSummaryCopied(true);
      setTimeout(() => setSummaryCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-10 animate-fadeIn pb-16">
      {/* ======================================================== */}
      {/* 1. DOCUMENTS SECTION: HEADER + UPLOAD CARD               */}
      {/* ======================================================== */}
      <section className="space-y-6">
        {/* Page Title & Subtitle */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-md bg-cyan-950/80 text-cyan-400 border border-cyan-800 text-[10px] font-mono tracking-wider uppercase font-semibold">
              KNOWLEDGE BASE & RAG
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            My Materials
          </h1>
          <p className="text-sm sm:text-base text-slate-300">
            Upload your study materials and let SARATHI learn from them.
          </p>
        </div>

        {/* Upload Error Banner */}
        {uploadError && (
          <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-200 text-xs sm:text-sm flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">Upload Failed</span>
              <span>{uploadError}</span>
            </div>
            <button
              onClick={() => setUploadError(null)}
              className="text-rose-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Large Upload Documents Card */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative p-8 sm:p-12 rounded-2xl border-2 border-dashed transition-all duration-200 text-center flex flex-col items-center justify-center space-y-4 shadow-glass ${
            isDragging
              ? 'border-cyan-400 bg-cyan-950/20 scale-[1.01]'
              : 'border-slate-700 hover:border-slate-600 bg-slate-900/60'
          }`}
        >
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {/* Upload Icon */}
          <div className="p-4 rounded-2xl bg-cyan-950/70 text-cyan-400 border border-cyan-800/60 shadow-neon-cyan">
            {isUploading ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <Upload className="w-8 h-8" />
            )}
          </div>

          <div className="space-y-1 max-w-md">
            <h3 className="text-lg sm:text-xl font-bold text-white">Upload Documents</h3>
            <p className="text-slate-300 text-sm">
              {isUploading ? (
                <span className="text-cyan-400 font-mono text-xs">{uploadProgressText}</span>
              ) : (
                'Drop your files here'
              )}
            </p>
          </div>

          {!isUploading && (
            <>
              <div className="text-xs text-slate-500 font-mono uppercase tracking-wider">or</div>

              <button
                type="button"
                onClick={handleChooseFilesClick}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-neon-cyan transition-all transform active:scale-95"
              >
                Choose Files
              </button>
            </>
          )}

          <div className="pt-2 border-t border-slate-800/80 w-full max-w-md space-y-1.5">
            <div className="text-xs font-mono font-semibold text-cyan-400 tracking-wide">
              PDF • DOCX • TXT
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400">
              Your documents will be processed and added to your personal SARATHI knowledge base.
            </p>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. UPLOADED DOCUMENTS SECTION                            */}
      {/* ======================================================== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Your Documents</span>
            {materials.length > 0 && (
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {materials.length}
              </span>
            )}
          </h2>

          {materials.length > 0 && (
            <Link
              href="/tutor"
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
            >
              <span>Ask in AI Tutor</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {/* Empty State for New Users */}
        {materials.length === 0 ? (
          <div className="p-8 sm:p-12 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800/70 mx-auto flex items-center justify-center text-slate-500">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">No documents uploaded yet</h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              Upload your first study material to start building your personal knowledge base.
            </p>
          </div>
        ) : (
          /* Documents Cards Grid */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {materials.map((doc) => {
              const isProcessing = doc.status === 'processing';
              const isError = doc.status === 'error';
              const isReady = doc.status === 'ready' || !doc.status;

              return (
                <div
                  key={doc.id}
                  className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4 shadow-glass transition-all hover:border-slate-700"
                >
                  {/* Top info row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-cyan-950/70 text-cyan-400 border border-cyan-800/50 shrink-0 mt-0.5">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-white truncate" title={doc.name}>
                          {doc.name}
                        </h3>
                        <div className="text-xs text-slate-400 font-mono flex items-center space-x-1.5 mt-0.5">
                          <span>{doc.type}</span>
                          <span>•</span>
                          <span>{formatFileSize(doc.size)}</span>
                          {doc.pageCount ? (
                            <>
                              <span>•</span>
                              <span>{doc.pageCount} pages</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {isProcessing && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800 text-[11px] font-mono">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Processing...</span>
                        </span>
                      )}

                      {isReady && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800 text-[11px] font-mono">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Ready</span>
                        </span>
                      )}

                      {isError && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-rose-950/60 text-rose-300 border border-rose-800 text-[11px] font-mono">
                          <AlertCircle className="w-3 h-3 text-rose-400" />
                          <span>Error</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Document summary / chunks stats */}
                  {isReady && doc.summary && (
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {doc.summary}
                    </p>
                  )}

                  {isError && doc.errorMessage && (
                    <p className="text-xs text-rose-300 bg-rose-950/30 p-2 rounded-lg border border-rose-900/50">
                      {doc.errorMessage}
                    </p>
                  )}

                  {/* Topics detected badges */}
                  {isReady && doc.topicsDetected && doc.topicsDetected.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {doc.topicsDetected.slice(0, 4).map((topic, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-slate-800"
                        >
                          {topic}
                        </span>
                      ))}
                      {doc.topicsDetected.length > 4 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-slate-800">
                          +{doc.topicsDetected.length - 4} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* View */}
                      <button
                        type="button"
                        onClick={() => setActiveDocForView(doc)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1 transition-colors"
                        title="View document details and chunks"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>View</span>
                      </button>

                      {/* Ask SARATHI */}
                      <button
                        type="button"
                        disabled={!isReady}
                        onClick={() => handleAskSarathi(doc.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-xs font-semibold flex items-center space-x-1 transition-colors disabled:opacity-40"
                        title="Open AI Tutor with this document"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Ask SARATHI</span>
                      </button>

                      {/* Summarize */}
                      <button
                        type="button"
                        disabled={!isReady}
                        onClick={() => handleSummarizeDocument(doc)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1 transition-colors disabled:opacity-40"
                        title="Generate high-yield AI summary"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                        <span>Summarize</span>
                      </button>

                      {/* Generate Questions */}
                      <button
                        type="button"
                        disabled={!isReady}
                        onClick={() => handleGenerateQuestions(doc)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1 transition-colors disabled:opacity-40"
                        title="Generate practice MCQs from document"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                        <span>Generate Questions</span>
                      </button>
                    </div>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(doc.id, doc.name)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* 3. SAVE NOTES SECTION (PRESERVED BELOW DOCUMENTS)        */}
      {/* ======================================================== */}
      <section className="space-y-4 pt-4 border-t border-slate-800/80">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <FileCheck className="w-5 h-5 text-cyan-400" />
            <span>Save Notes</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Paste textbook notes, class excerpts, or personal revision points directly into SARATHI.
          </p>
        </div>

        {noteSuccessMessage && (
          <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-200 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{noteSuccessMessage}</span>
          </div>
        )}

        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 shadow-glass">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">
                Document / Note Title
              </label>
              <input
                type="text"
                value={pasteDocName}
                onChange={(e) => setPasteDocName(e.target.value)}
                placeholder="e.g. Transactions & Concurrency Cheat Sheet"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-400"
              >
              </input>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">
                Notes Content
              </label>
              <textarea
                rows={5}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste your notes text, lecture highlights, or textbook excerpt here..."
                className="w-full p-4 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-white font-mono placeholder-slate-500 focus:outline-hidden focus:border-cyan-400 leading-relaxed"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] font-mono text-slate-500">
              {pasteText.length > 0 ? `${pasteText.length} characters` : 'Text will be chunked and indexed into RAG store'}
            </span>
            <button
              type="button"
              onClick={handleSaveNotes}
              disabled={!pasteText.trim() || !pasteDocName.trim() || isSavingNotes}
              className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 font-bold text-xs shadow-neon-cyan flex items-center space-x-2 transition-all"
            >
              {isSavingNotes ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Notes...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save & Index Notes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* MODAL: VIEW DOCUMENT DETAILS & CHUNKS                   */}
      {/* ======================================================== */}
      {activeDocForView && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl bg-slate-900 border border-slate-800 flex flex-col shadow-2xl animate-fadeIn overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-white truncate">
                    {activeDocForView.name}
                  </h3>
                  <div className="text-xs text-slate-400 font-mono">
                    {activeDocForView.type} • {formatFileSize(activeDocForView.size)} •{' '}
                    {activeDocForView.chunkCount} vector chunks
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveDocForView(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
              {activeDocForView.summary && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] font-mono text-cyan-400 uppercase font-semibold">
                    Knowledge Summary
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    {activeDocForView.summary}
                  </p>
                </div>
              )}

              {/* Topics */}
              {activeDocForView.topicsDetected && activeDocForView.topicsDetected.length > 0 && (
                <div>
                  <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold block mb-1.5">
                    Topics Detected
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeDocForView.topicsDetected.map((topic, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-cyan-950/60 text-cyan-300 border border-cyan-800 text-xs font-mono"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Chunks */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold block">
                  Indexed Semantic Chunks ({activeDocForView.chunks.length})
                </span>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {activeDocForView.chunks.map((chunk, idx) => (
                    <div
                      key={chunk.id || idx}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span className="text-cyan-400">Chunk #{idx + 1}</span>
                        <span>{chunk.topic}</span>
                        {chunk.pageNumber && <span>Page {chunk.pageNumber}</span>}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-mono">
                        {chunk.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex justify-end space-x-2 bg-slate-950">
              <button
                onClick={() => setActiveDocForView(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const id = activeDocForView.id;
                  setActiveDocForView(null);
                  handleAskSarathi(id);
                }}
                className="px-5 py-2 rounded-xl bg-cyan-400 text-slate-950 font-bold text-xs hover:bg-cyan-300 shadow-neon-cyan flex items-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ask SARATHI</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: AI DOCUMENT SUMMARY                               */}
      {/* ======================================================== */}
      {activeDocForSummary && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[85vh] rounded-2xl bg-slate-900 border border-slate-800 flex flex-col shadow-2xl animate-fadeIn overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-blue-950 text-blue-400 border border-blue-800">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Summary: {activeDocForSummary.name}
                  </h3>
                  <div className="text-xs text-slate-400">
                    High-yield academic synthesis generated by SARATHI
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveDocForSummary(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {summaryLoading ? (
                <div className="py-16 text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
                  <p className="text-sm font-medium text-white">
                    SARATHI is analyzing the material...
                  </p>
                  <p className="text-xs text-slate-400">
                    Extracting overview, core concepts, formulas, exam traps, and revision checklist.
                  </p>
                </div>
              ) : (
                <div className="prose prose-invert prose-cyan max-w-none text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line font-sans">
                  {summaryContent}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950">
              <button
                disabled={!summaryContent || summaryLoading}
                onClick={copySummaryToClipboard}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 flex items-center space-x-1.5 disabled:opacity-40"
              >
                {summaryCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Summary</span>
                  </>
                )}
              </button>

              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveDocForSummary(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const id = activeDocForSummary.id;
                    setActiveDocForSummary(null);
                    handleAskSarathi(id);
                  }}
                  className="px-5 py-2 rounded-xl bg-cyan-400 text-slate-950 font-bold text-xs hover:bg-cyan-300 shadow-neon-cyan flex items-center space-x-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ask in AI Tutor</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: GENERATE PRACTICE QUESTIONS                       */}
      {/* ======================================================== */}
      {activeDocForQuestions && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl bg-slate-900 border border-slate-800 flex flex-col shadow-2xl animate-fadeIn overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-purple-950 text-purple-400 border border-purple-800">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Practice Questions: {activeDocForQuestions.name}
                  </h3>
                  <div className="text-xs text-slate-400">
                    Exam-style practice questions generated specifically from this document
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveDocForQuestions(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {questionsLoading ? (
                <div className="py-16 text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" />
                  <p className="text-sm font-medium text-white">
                    Generating exam-focused questions...
                  </p>
                  <p className="text-xs text-slate-400">
                    Extracting key concepts and testing your understanding with detailed explanations.
                  </p>
                </div>
              ) : questionsError ? (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-200 text-xs">
                  {questionsError}
                </div>
              ) : (
                <div className="space-y-6">
                  {generatedQuestions.map((q, qIndex) => {
                    const answered = selectedAnswers[q.id];
                    const isCorrect = answered === q.correctOptionId;

                    return (
                      <div
                        key={q.id || qIndex}
                        className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-mono text-cyan-400 font-semibold">
                            Question {qIndex + 1}
                          </span>
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                            {q.difficulty || 'Medium'}
                          </span>
                        </div>

                        <p className="text-sm font-semibold text-white leading-relaxed">
                          {q.question}
                        </p>

                        <div className="space-y-2 pt-1">
                          {q.options?.map((opt: any) => {
                            const isSelected = answered === opt.id;
                            let btnStyle =
                              'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700';

                            if (answered) {
                              if (opt.id === q.correctOptionId) {
                                btnStyle = 'bg-emerald-950/80 border-emerald-600 text-emerald-200';
                              } else if (isSelected) {
                                btnStyle = 'bg-rose-950/80 border-rose-600 text-rose-200';
                              } else {
                                btnStyle = 'bg-slate-900/40 border-slate-800/40 text-slate-500';
                              }
                            }

                            return (
                              <button
                                key={opt.id}
                                disabled={Boolean(answered)}
                                onClick={() =>
                                  setSelectedAnswers((prev) => ({
                                    ...prev,
                                    [q.id]: opt.id,
                                  }))
                                }
                                className={`w-full p-3 rounded-xl border text-left text-xs flex items-center justify-between transition-colors ${btnStyle}`}
                              >
                                <span className="flex items-center space-x-2">
                                  <span className="font-mono font-bold">{opt.id}.</span>
                                  <span>{opt.text}</span>
                                </span>
                                {answered && opt.id === q.correctOptionId && (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {answered && (
                          <div
                            className={`p-3 rounded-xl text-xs space-y-1 ${
                              isCorrect
                                ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-200'
                                : 'bg-slate-900 border border-slate-800 text-slate-300'
                            }`}
                          >
                            <span className="font-semibold block font-mono text-[11px]">
                              {isCorrect ? '✓ Correct Answer' : `Incorrect (Correct: ${q.correctOptionId})`}
                            </span>
                            <p className="leading-relaxed">{q.explanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 flex justify-end space-x-2 bg-slate-950">
              <button
                onClick={() => setActiveDocForQuestions(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
