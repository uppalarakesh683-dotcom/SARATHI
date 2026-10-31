'use client';

import React, { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PracticeEngine } from '@/components/practice/PracticeEngine';

export default function PracticePage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Practice Engine...</div>}>
        <PracticeEngine />
      </Suspense>
    </AppShell>
  );
}

