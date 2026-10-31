'use client';

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { MaterialUploader } from '@/components/materials/MaterialUploader';

export default function MaterialsPage() {
  return (
    <AppShell>
      <MaterialUploader />
    </AppShell>
  );
}

