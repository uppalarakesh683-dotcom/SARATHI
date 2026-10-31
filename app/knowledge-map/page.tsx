'use client';

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { KnowledgeMap } from '@/components/knowledge-map/KnowledgeMap';

export default function KnowledgeMapPage() {
  return (
    <AppShell>
      <KnowledgeMap />
    </AppShell>
  );
}

