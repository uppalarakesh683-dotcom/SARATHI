'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.08),rgba(255,255,255,0))] pointer-events-none" />
      <div className="fixed top-1/3 -right-48 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-10 left-10 w-96 h-96 bg-cyan-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Content wrapper with margin for desktop sidebar */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto relative z-10 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

