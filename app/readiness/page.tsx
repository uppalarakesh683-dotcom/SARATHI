'use client';

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ReadinessScore } from '@/components/readiness/ReadinessScore';

export default function ReadinessPage() {
  return (
    <AppShell>
      <ReadinessScore />
    </AppShell>
  );
}

