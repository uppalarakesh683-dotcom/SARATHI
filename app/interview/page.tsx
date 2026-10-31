'use client';

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { InterviewEngine } from '@/components/interview/InterviewEngine';

export default function InterviewPage() {
  return (
    <AppShell>
      <InterviewEngine />
    </AppShell>
  );
}

