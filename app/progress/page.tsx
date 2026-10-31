'use client';

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProgressOverview } from '@/components/progress/ProgressOverview';

export default function ProgressPage() {
  return (
    <AppShell>
      <ProgressOverview />
    </AppShell>
  );
}

