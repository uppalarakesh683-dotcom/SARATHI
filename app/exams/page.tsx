'use client';

import React, { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ExamEngine } from '@/components/exams/ExamEngine';

export default function ExamsPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Exam Engine...</div>}>
        <ExamEngine />
      </Suspense>
    </AppShell>
  );
}

