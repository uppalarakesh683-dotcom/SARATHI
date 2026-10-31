'use client';

import React, { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { TutorChat } from '@/components/tutor/TutorChat';

export default function TutorPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading AI Tutor...</div>}>
        <TutorChat />
      </Suspense>
    </AppShell>
  );
}

